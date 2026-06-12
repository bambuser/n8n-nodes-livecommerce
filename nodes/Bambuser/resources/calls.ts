import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  INodeProperties,
} from 'n8n-workflow';
import type { HandlerMap } from '../shared/types';
import { filterEmpty } from '../shared/filterEmpty';

export const handlers = (ctx: IExecuteFunctions, baseUrl: string): HandlerMap => ({

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

  // ─── Call Stats ───────────────────────────────────────────────────────────

  'callStats:getAccepted': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/calls/accepted`,
    qs: filterEmpty({
      from: ctx.getNodeParameter('from', i) as string,
      to: ctx.getNodeParameter('to', i, '') as string,
      excludeShortCalls: ctx.getNodeParameter('excludeShortCalls', i, '') as string,
      excludeTestCalls: ctx.getNodeParameter('excludeTestCalls', i, '') as string,
    }),
  }),

  'callStats:getMissed': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/calls/missed`,
    qs: filterEmpty({
      from: ctx.getNodeParameter('from', i) as string,
      to: ctx.getNodeParameter('to', i, '') as string,
      excludeShortQueueTime: ctx.getNodeParameter('excludeShortQueueTime', i, '') as string,
    }),
  }),
});

export const properties: INodeProperties[] = [
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

  // ── Operation: Call Stats ──────────────────────────────────────────────
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['callStats'] } },
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

  // ── from / to (callStats) ──────────────────────────────────────────────
  {
    displayName: 'From',
    name: 'from',
    type: 'string',
    required: true,
    default: '',
    placeholder: '2024-01-01T00:00:00Z',
    description: 'ISO date string — start of range (required)',
    displayOptions: { show: { resource: ['callStats'], operation: ['getAccepted', 'getMissed'] } },
  },
  {
    displayName: 'To',
    name: 'to',
    type: 'string',
    default: '',
    placeholder: '2024-12-31T23:59:59Z',
    description: 'ISO date string — end of range (defaults to now)',
    displayOptions: { show: { resource: ['callStats'], operation: ['getAccepted', 'getMissed'] } },
  },

  // ── excludeShortCalls / excludeTestCalls (callStats:getAccepted) ───────
  {
    displayName: 'Exclude Short Calls',
    name: 'excludeShortCalls',
    type: 'options',
    options: [
      { name: 'No', value: '' },
      { name: 'Yes', value: 'true' },
    ],
    default: '',
    displayOptions: { show: { resource: ['callStats'], operation: ['getAccepted'] } },
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
    displayOptions: { show: { resource: ['callStats'], operation: ['getAccepted'] } },
  },

  // ── excludeShortQueueTime (callStats:getMissed) ────────────────────────
  {
    displayName: 'Exclude Short Queue Time',
    name: 'excludeShortQueueTime',
    type: 'options',
    options: [
      { name: 'No', value: '' },
      { name: 'Yes', value: 'true' },
    ],
    default: '',
    displayOptions: { show: { resource: ['callStats'], operation: ['getMissed'] } },
  },
];
