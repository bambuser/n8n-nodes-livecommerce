import type {
  IDataObject,
  IExecuteFunctions,
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
    credentials: [{ name: 'bambuserApi', required: true }],
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
