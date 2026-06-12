import type {
  ICredentialsDecrypted,
  ICredentialTestFunctions,
  IDataObject,
  IExecuteFunctions,
  INodeCredentialTestResult,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { resolveOrigin } from '../../lib/resolveOrigin';
import type { HandlerMap } from './shared/types';
import * as live from './resources/live';
import * as vod from './resources/vod';
import * as calls from './resources/calls';
import * as catalog from './resources/catalog';
import * as shopperData from './resources/shopperData';

const RESOURCE_OPTIONS = [
  { name: 'Call', value: 'call' },
  { name: 'Call Statistic', value: 'callStats' },
  { name: 'Catalog Product', value: 'catalogProduct' },
  { name: 'Connect Link', value: 'connectLink' },
  { name: 'Live Broadcast', value: 'liveBroadcast' },
  { name: 'Live Channel', value: 'liveChannel' },
  { name: 'Live Product', value: 'liveProduct' },
  { name: 'Live Show', value: 'liveShow' },
  { name: 'Live Statistic', value: 'liveStats' },
  { name: 'Live Tag', value: 'liveTag' },
  { name: 'Live User', value: 'liveUser' },
  { name: 'Live Webhook', value: 'liveWebhook' },
  { name: 'Media Asset', value: 'mediaAsset' },
  { name: 'Shopper Data', value: 'shopperData' },
  { name: 'Video', value: 'video' },
  { name: 'Video Playlist', value: 'videoPlaylist' },
];

export class Bambuser implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser',
    name: 'bambuser',
    icon: 'file:bambuser.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interact with the Bambuser Live Commerce API: live shopping, on-demand video, video calls, product catalog, and shopper data',
    defaults: { name: 'Bambuser' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'bambuserApi', required: true, testedBy: 'bambuserApiTest' }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: RESOURCE_OPTIONS,
        default: 'liveShow',
      },
      ...live.properties,
      ...vod.properties,
      ...calls.properties,
      ...catalog.properties,
      ...shopperData.properties,
    ],
    usableAsTool: true,
  };

  // Custom credential test. Used because the Bambuser API has no scope-free
  // authenticated endpoint — every route is scope-gated, so a declarative test
  // would 403 for keys scoped to one service area. This method treats 401 as
  // the only "invalid key" signal and 403 (auth ok, scope insufficient) as valid.
  methods = {
    credentialTest: {
      async bambuserApiTest(
        this: ICredentialTestFunctions,
        credential: ICredentialsDecrypted,
      ): Promise<INodeCredentialTestResult> {
        const data = credential.data as { apiKey?: string; region?: string; baseUrl?: string };
        const apiKey = data.apiKey ?? '';
        const origin = resolveOrigin(data.baseUrl ?? '', data.region ?? '');
        // Global fetch — ICredentialTestFunctions only exposes the deprecated
        // `helpers.request`, and we require Node 24+ so the global is available.
        let res: Response;
        try {
          res = await fetch(`${origin}/v1/shows?limit=1`, {
            method: 'GET',
            headers: { Authorization: `Token ${apiKey}` },
          });
        } catch (err) {
          return { status: 'Error', message: `Connection failed: ${(err as Error).message}` };
        }
        if (res.status === 401) {
          return { status: 'Error', message: 'Invalid API key' };
        }
        // 200 = key is valid AND has READ_SHOWS scope. 403 = key is valid but
        // lacks READ_SHOWS, which is fine — the credential itself is usable.
        if (res.status === 200 || res.status === 403) {
          return { status: 'OK', message: 'Authentication successful' };
        }
        return { status: 'Error', message: `Connection failed (HTTP ${res.status})` };
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = await this.getCredentials('bambuserApi');
    const origin = resolveOrigin(credentials.baseUrl as string, credentials.region as string);
    const baseUrl = `${origin}/v1`;
    const handlers: HandlerMap = {
      ...live.handlers(this, baseUrl),
      ...vod.handlers(this, baseUrl),
      ...calls.handlers(this, baseUrl),
      ...catalog.handlers(this, baseUrl),
      ...shopperData.handlers(this, baseUrl),
    };

    const results = await Promise.all(
      items.map(async (_, i) => {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;
        const key = `${resource}:${operation}`;
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
