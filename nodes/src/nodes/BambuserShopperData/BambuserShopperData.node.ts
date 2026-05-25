import type {
  ICredentialTestFunctions,
  ICredentialsDecrypted,
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { resolveOrigin } from '../../lib/resolveOrigin';

type ShopperDataOp = 'getMany' | 'get' | 'deleteByFilter' | 'delete';
type OperationKey = `shopperData:${ShopperDataOp}`;
type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;

const filterEmpty = (obj: Record<string, unknown>): IDataObject =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as IDataObject;

const buildOperationHandlers = (
  ctx: IExecuteFunctions,
  baseUrl: string,
): Record<OperationKey, OperationHandler> => ({

  'shopperData:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shopper-data`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 25) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      matchField: ctx.getNodeParameter('matchField', i, '') as string,
      matchValue: ctx.getNodeParameter('matchValue', i, '') as string,
      createdDateFrom: ctx.getNodeParameter('createdDateFrom', i, '') as string,
      createdDateTo: ctx.getNodeParameter('createdDateTo', i, '') as string,
    }),
  }),

  'shopperData:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shopper-data/${ctx.getNodeParameter('recordId', i) as string}`,
  }),

  'shopperData:deleteByFilter': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shopper-data`,
    qs: filterEmpty({
      matchField: ctx.getNodeParameter('matchField', i, '') as string,
      matchValue: ctx.getNodeParameter('matchValue', i, '') as string,
      createdDateFrom: ctx.getNodeParameter('createdDateFrom', i, '') as string,
      createdDateTo: ctx.getNodeParameter('createdDateTo', i, '') as string,
    }),
  }),

  'shopperData:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shopper-data/${ctx.getNodeParameter('recordId', i) as string}`,
  }),
});

export class BambuserShopperData implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser Shopper Data',
    name: 'bambuserShopperData',
    icon: 'file:bambuser-vod.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Manage GDPR shopper data records collected during Bambuser shows',
    defaults: { name: 'Bambuser Shopper Data' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'bambuserApi', required: true, testedBy: 'bambuserApiTest' }],
    properties: [
      // ── Resource ───────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Shopper Data', value: 'shopperData' },
        ],
        default: 'shopperData',
      },

      // ── Operation ─────────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['shopperData'] } },
        options: [
          { name: 'Delete', value: 'delete', action: 'Delete a shopper data record by ID' },
          { name: 'Delete by Filter', value: 'deleteByFilter', action: 'Delete shopper data records matching a filter (GDPR erasure)' },
          { name: 'Get', value: 'get', action: 'Get a shopper data record by ID' },
          { name: 'Get Many', value: 'getMany', action: 'List shopper data records' },
        ],
        default: 'getMany',
      },

      // ── recordId ───────────────────────────────────────────────────────────
      {
        displayName: 'Record ID',
        name: 'recordId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['shopperData'], operation: ['get', 'delete'] } },
      },

      // ── limit / after ──────────────────────────────────────────────────────
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 25,
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany'] } },
      },
      {
        displayName: 'After Cursor',
        name: 'after',
        type: 'string',
        default: '',
        description: 'Pagination cursor from the previous response',
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany'] } },
      },

      // ── matchField / matchValue ────────────────────────────────────────────
      {
        displayName: 'Match Field',
        name: 'matchField',
        type: 'options',
        options: [
          { name: 'None', value: '' },
          { name: 'Email', value: 'data.email' },
          { name: 'Phone', value: 'data.phone' },
        ],
        default: '',
        description: 'Filter records by this field. Must be set together with Match Value.',
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany', 'deleteByFilter'] } },
      },
      {
        displayName: 'Match Value',
        name: 'matchValue',
        type: 'string',
        default: '',
        description: 'Exact value to match against the selected Match Field',
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany', 'deleteByFilter'] } },
      },

      // ── createdDateFrom / createdDateTo ────────────────────────────────────
      {
        displayName: 'Created Date From',
        name: 'createdDateFrom',
        type: 'string',
        default: '',
        placeholder: '2024-01-01T00:00:00Z',
        description: 'Only include records created on or after this date',
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany', 'deleteByFilter'] } },
      },
      {
        displayName: 'Created Date To',
        name: 'createdDateTo',
        type: 'string',
        default: '',
        placeholder: '2024-12-31T23:59:59Z',
        description: 'Only include records created before this date',
        displayOptions: { show: { resource: ['shopperData'], operation: ['getMany', 'deleteByFilter'] } },
      },
    ],
  };

  methods = {
    credentialTest: {
      async bambuserApiTest(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted,
      ): Promise<INodeCredentialTestResult> {
        const { apiKey, region, baseUrl } = credential.data as {
          apiKey: string;
          region: string;
          baseUrl?: string;
        };
        const origin = resolveOrigin(baseUrl ?? '', region);

        return this.helpers
          .request({
            method: 'GET',
            uri: `${origin}/v1/shows`,
            qs: { limit: 1 },
            headers: { Authorization: `Token ${apiKey}` },
            json: true,
          })
          .then(() => ({ status: 'OK' as const, message: `Connected to ${origin}` }))
          .catch((error: unknown) => {
            const err = error as { statusCode?: number; error?: unknown };
            if (err.statusCode === 403) {
              return { status: 'OK' as const, message: `Connected to ${origin} (key valid, limited scope)` };
            }
            const body = err.error;
            const detail = body
              ? (typeof body === 'string' ? body : JSON.stringify(body))
              : String(error);
            return {
              status: 'Error' as const,
              message: `${origin} — HTTP ${err.statusCode ?? 'connection error'}: ${detail}`,
            };
          });
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = await this.getCredentials('bambuserApi');
    const origin = resolveOrigin(credentials.baseUrl as string, credentials.region as string);
    const handlers = buildOperationHandlers(this, `${origin}/v1`);

    const results = await Promise.all(
      items.map(async (_, i) => {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;
        const key = `${resource}:${operation}` as OperationKey;
        const handler = handlers[key];

        if (!handler) {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation "${operation}" for resource "${resource}"`,
            { itemIndex: i },
          );
        }

        const requestOptions = await handler(i);
        const responseData = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'bambuserApi',
          requestOptions,
        ) ?? { success: true };

        return { json: responseData as IDataObject };
      }),
    );

    return [results];
  }
}
