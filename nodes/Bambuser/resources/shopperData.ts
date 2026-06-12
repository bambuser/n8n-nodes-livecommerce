import type {
  IExecuteFunctions,
  IHttpRequestMethods,
  INodeProperties,
} from 'n8n-workflow';
import type { HandlerMap } from '../shared/types';
import { filterEmpty } from '../shared/filterEmpty';

export const handlers = (ctx: IExecuteFunctions, baseUrl: string): HandlerMap => ({

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

export const properties: INodeProperties[] = [
  // ── Operation ─────────────────────────────────────────────────────────
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['shopperData'] } },
    options: [
      { name: 'Delete', value: 'delete', action: 'Delete a shopper data record by ID' },
      { name: 'Delete by Filter', value: 'deleteByFilter', action: 'Delete shopper data records matching a filter gdpr erasure' },
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
    description: 'Max number of results to return',
    typeOptions: { minValue: 1, maxValue: 100 },
    default: 50,
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
];
