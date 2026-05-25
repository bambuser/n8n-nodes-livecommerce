import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { resolveOrigin } from '../../lib/resolveOrigin';

type CallOp = 'get' | 'getTranscriptions';
type ConnectLinkOp =
  | 'get' | 'getByExternalId'
  | 'create' | 'update' | 'updateByExternalId'
  | 'delete' | 'deleteByExternalId';
type OneToOneStatsOp = 'getAccepted' | 'getMissed';

type OperationKey =
  | `call:${CallOp}`
  | `connectLink:${ConnectLinkOp}`
  | `stats:${OneToOneStatsOp}`;

type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;

const filterEmpty = (obj: Record<string, unknown>): IDataObject =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as IDataObject;

const buildOperationHandlers = (
  ctx: IExecuteFunctions,
  baseUrl: string,
): Record<OperationKey, OperationHandler> => ({

  // ─── Call ─────────────────────────────────────────────────────────────────

  'call:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/calls/${ctx.getNodeParameter('callId', i) as string}`,
  }),

  'call:getTranscriptions': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/calls/${ctx.getNodeParameter('callId', i) as string}/transcriptions`,
    qs: filterEmpty({ cursor: ctx.getNodeParameter('cursor', i, '') as string }),
  }),

  // ─── Connect Link ─────────────────────────────────────────────────────────

  'connectLink:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links/${ctx.getNodeParameter('connectLinkId', i) as string}`,
  }),

  'connectLink:getByExternalId': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links`,
    qs: { externalId: ctx.getNodeParameter('externalId', i) as string },
  }),

  'connectLink:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('connectLinkBody', i, '{}') as string) as IDataObject,
  }),

  'connectLink:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links/${ctx.getNodeParameter('connectLinkId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('connectLinkBody', i, '{}') as string) as IDataObject,
  }),

  'connectLink:updateByExternalId': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links`,
    qs: { externalId: ctx.getNodeParameter('externalId', i) as string },
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('connectLinkBody', i, '{}') as string) as IDataObject,
  }),

  'connectLink:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links/${ctx.getNodeParameter('connectLinkId', i) as string}`,
  }),

  'connectLink:deleteByExternalId': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/connect-links`,
    qs: { externalId: ctx.getNodeParameter('externalId', i) as string },
  }),

  // ─── Stats ────────────────────────────────────────────────────────────────

  'stats:getAccepted': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/calls/accepted`,
    qs: filterEmpty({
      from: ctx.getNodeParameter('from', i) as string,
      to: ctx.getNodeParameter('to', i, '') as string,
      excludeShortCalls: ctx.getNodeParameter('excludeShortCalls', i, '') as string,
      excludeTestCalls: ctx.getNodeParameter('excludeTestCalls', i, '') as string,
    }),
  }),

  'stats:getMissed': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/calls/missed`,
    qs: filterEmpty({
      from: ctx.getNodeParameter('from', i) as string,
      to: ctx.getNodeParameter('to', i, '') as string,
      excludeShortQueueTime: ctx.getNodeParameter('excludeShortQueueTime', i, '') as string,
    }),
  }),
});

export class BambuserOneToOne implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser One-to-One',
    name: 'bambuserOneToOne',
    icon: 'file:bambuser-live.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Bambuser One-to-One API',
    defaults: { name: 'Bambuser One-to-One' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'bambuserApi', required: true }],
    properties: [
      // ── Resource ───────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Call', value: 'call' },
          { name: 'Connect Link', value: 'connectLink' },
          { name: 'Stat', value: 'stats' },
        ],
        default: 'call',
      },

      // ── Operation: Call ────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['call'] } },
        options: [
          { name: 'Get', value: 'get', action: 'Get a call by ID' },
          { name: 'Get Transcriptions', value: 'getTranscriptions', action: 'Get transcriptions for a call' },
        ],
        default: 'get',
      },

      // ── Operation: Connect Link ────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['connectLink'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a connect link' },
          { name: 'Delete', value: 'delete', action: 'Delete a connect link by ID' },
          { name: 'Delete by External ID', value: 'deleteByExternalId', action: 'Delete a connect link by external ID' },
          { name: 'Get', value: 'get', action: 'Get a connect link by ID' },
          { name: 'Get by External ID', value: 'getByExternalId', action: 'Get a connect link by external ID' },
          { name: 'Update', value: 'update', action: 'Update a connect link by ID' },
          { name: 'Update by External ID', value: 'updateByExternalId', action: 'Update a connect link by external ID' },
        ],
        default: 'get',
      },

      // ── Operation: Stats ───────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['stats'] } },
        options: [
          { name: 'Get Accepted Calls', value: 'getAccepted', action: 'Get statistics for accepted calls' },
          { name: 'Get Missed Calls', value: 'getMissed', action: 'Get statistics for missed calls' },
        ],
        default: 'getAccepted',
      },

      // ── callId ─────────────────────────────────────────────────────────────
      {
        displayName: 'Call ID',
        name: 'callId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['call'], operation: ['get', 'getTranscriptions'] } },
      },

      // ── connectLinkId ──────────────────────────────────────────────────────
      {
        displayName: 'Connect Link ID',
        name: 'connectLinkId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['connectLink'], operation: ['get', 'update', 'delete'] },
        },
      },

      // ── externalId ─────────────────────────────────────────────────────────
      {
        displayName: 'External ID',
        name: 'externalId',
        type: 'string',
        required: true,
        default: '',
        description: 'Caller-supplied external ID for the connect link',
        displayOptions: {
          show: { resource: ['connectLink'], operation: ['getByExternalId', 'updateByExternalId', 'deleteByExternalId'] },
        },
      },

      // ── connectLinkBody (create) ───────────────────────────────────────────
      {
        displayName: 'Connect Link Data (JSON)',
        name: 'connectLinkBody',
        type: 'string',
        required: true,
        default: '{}',
        placeholder: '{"externalId": "my-ID", "title": "My Link", "validTo": "2024-12-31T23:59:59Z"}',
        description: 'JSON body. Supported fields: externalId, title, validFrom, validTo, firstName, lastName, email, queue.',
        typeOptions: { rows: 3 },
        displayOptions: { show: { resource: ['connectLink'], operation: ['create'] } },
      },

      // ── connectLinkBody (update) ───────────────────────────────────────────
      {
        displayName: 'Fields to Update (JSON)',
        name: 'connectLinkBody',
        type: 'string',
        required: true,
        default: '{}',
        placeholder: '{"title": "New Title", "validTo": "2024-12-31T23:59:59Z"}',
        description: 'JSON object with fields to update. Supported fields: title, validFrom, validTo, firstName, lastName, email, queue.',
        typeOptions: { rows: 3 },
        displayOptions: { show: { resource: ['connectLink'], operation: ['update', 'updateByExternalId'] } },
      },

      // ── cursor (call:getTranscriptions) ────────────────────────────────────
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        default: '',
        description: 'Pagination cursor from the previous response',
        displayOptions: { show: { resource: ['call'], operation: ['getTranscriptions'] } },
      },

      // ── from / to (stats) ─────────────────────────────────────────────────
      {
        displayName: 'From',
        name: 'from',
        type: 'string',
        required: true,
        default: '',
        placeholder: '2024-01-01T00:00:00Z',
        description: 'ISO date string — start of range (required)',
        displayOptions: { show: { resource: ['stats'], operation: ['getAccepted', 'getMissed'] } },
      },
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        placeholder: '2024-12-31T23:59:59Z',
        description: 'ISO date string — end of range (defaults to now)',
        displayOptions: { show: { resource: ['stats'], operation: ['getAccepted', 'getMissed'] } },
      },

      // ── excludeShortCalls / excludeTestCalls (stats:getAccepted) ──────────
      {
        displayName: 'Exclude Short Calls',
        name: 'excludeShortCalls',
        type: 'options',
        options: [
          { name: 'No', value: '' },
          { name: 'Yes', value: 'true' },
        ],
        default: '',
        displayOptions: { show: { resource: ['stats'], operation: ['getAccepted'] } },
      },
      {
        displayName: 'Exclude Test Calls',
        name: 'excludeTestCalls',
        type: 'options',
        options: [
          { name: 'No', value: '' },
          { name: 'Yes', value: 'true' },
        ],
        default: '',
        displayOptions: { show: { resource: ['stats'], operation: ['getAccepted'] } },
      },

      // ── excludeShortQueueTime (stats:getMissed) ────────────────────────────
      {
        displayName: 'Exclude Short Queue Time',
        name: 'excludeShortQueueTime',
        type: 'options',
        options: [
          { name: 'No', value: '' },
          { name: 'Yes', value: 'true' },
        ],
        default: '',
        displayOptions: { show: { resource: ['stats'], operation: ['getMissed'] } },
      },
    ],
		usableAsTool: true,
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
