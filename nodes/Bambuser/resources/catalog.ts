import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  INodeProperties,
} from 'n8n-workflow';
import type { HandlerMap } from '../shared/types';
import { filterEmpty } from '../shared/filterEmpty';

const productsPath = (baseUrl: string, feedId: string): string =>
  feedId
    ? `${baseUrl}/product-catalog/feeds/${encodeURIComponent(feedId)}/products`
    : `${baseUrl}/product-catalog/products`;

export const handlers = (ctx: IExecuteFunctions, baseUrl: string): HandlerMap => ({

  'catalogProduct:search': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products`,
    qs: filterEmpty({
      q: ctx.getNodeParameter('q', i, '') as string,
      limit: ctx.getNodeParameter('limit', i, 10) as number,
      page: ctx.getNodeParameter('page', i, 1) as number,
      sort: ctx.getNodeParameter('sort', i, '') as string,
      feedId: ctx.getNodeParameter('feedId', i, '') as string,
      locale: ctx.getNodeParameter('locale', i, 'en-US') as string,
      format: ctx.getNodeParameter('format', i, 'raw') as string,
      unifyVariantTitles: ctx.getNodeParameter('unifyVariantTitles', i, false) as boolean || undefined,
      groupBySignificantAttributes: ctx.getNodeParameter('groupBySignificantAttributes', i, false) as boolean || undefined,
    }),
  }),

  'catalogProduct:count': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products/count`,
    qs: filterEmpty({
      q: ctx.getNodeParameter('q', i, '') as string,
      feedId: ctx.getNodeParameter('feedId', i, '') as string,
      locale: ctx.getNodeParameter('locale', i, 'en-US') as string,
    }),
  }),

  'catalogProduct:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${productsPath(baseUrl, ctx.getNodeParameter('feedId', i, '') as string)}/${ctx.getNodeParameter('productId', i) as string}`,
  }),

  'catalogProduct:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: productsPath(baseUrl, ctx.getNodeParameter('feedId', i, '') as string),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('productBody', i) as string) as IDataObject,
  }),

  'catalogProduct:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${productsPath(baseUrl, ctx.getNodeParameter('feedId', i, '') as string)}/${ctx.getNodeParameter('productId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('productBody', i) as string) as IDataObject,
  }),

  'catalogProduct:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${productsPath(baseUrl, ctx.getNodeParameter('feedId', i, '') as string)}/${ctx.getNodeParameter('productId', i) as string}`,
  }),
});

export const properties: INodeProperties[] = [
  // ── Operation ─────────────────────────────────────────────────────────
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['catalogProduct'] } },
    options: [
      { name: 'Count', value: 'count', action: 'Count products matching a search query' },
      { name: 'Create', value: 'create', action: 'Create a product in the catalog' },
      { name: 'Delete', value: 'delete', action: 'Delete a product from the catalog' },
      { name: 'Get', value: 'get', action: 'Get a product by ID' },
      { name: 'Search', value: 'search', action: 'Search and list products' },
      { name: 'Update', value: 'update', action: 'Update a product in the catalog' },
    ],
    default: 'search',
  },

  // ── productId ──────────────────────────────────────────────────────────
  {
    displayName: 'Product ID',
    name: 'productId',
    type: 'string',
    required: true,
    default: '',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['get', 'update', 'delete'] } },
  },

  // ── search query params ────────────────────────────────────────────────
  {
    displayName: 'Query',
    name: 'q',
    type: 'string',
    default: '',
    description: 'Free-text search query',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search', 'count'] } },
  },
  {
    displayName: 'Feed ID',
    name: 'feedId',
    type: 'string',
    default: '',
    description: 'Comma-separated feed IDs to scope the search',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search', 'count'] } },
  },
  {
    displayName: 'Feed ID',
    name: 'feedId',
    type: 'string',
    default: '',
    description: 'Optional. When set, scopes the operation to a specific feed (routes through /product-catalog/feeds/{feedId}/products). Leave empty to operate on the org-level catalog.',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['get', 'create', 'update', 'delete'] } },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    description: 'Max number of results to return',
    typeOptions: { minValue: 1, maxValue: 1000 },
    default: 50,
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },
  {
    displayName: 'Page',
    name: 'page',
    type: 'number',
    typeOptions: { minValue: 1 },
    default: 1,
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },
  {
    displayName: 'Sort',
    name: 'sort',
    type: 'string',
    default: '',
    placeholder: 'title:asc',
    description: 'Sort by field, optionally with :asc or :desc suffix',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },
  {
    displayName: 'Locale',
    name: 'locale',
    type: 'string',
    default: 'en-US',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search', 'count'] } },
  },
  {
    displayName: 'Format',
    name: 'format',
    type: 'options',
    options: [
      { name: 'Raw', value: 'raw' },
      { name: 'psV1', value: 'psV1' },
    ],
    default: 'raw',
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },
  {
    displayName: 'Unify Variant Titles',
    name: 'unifyVariantTitles',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },
  {
    displayName: 'Group by Significant Attributes',
    name: 'groupBySignificantAttributes',
    type: 'boolean',
    default: false,
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['search'] } },
  },

  // ── productBody (create / update) ──────────────────────────────────────
  {
    displayName: 'Product Data (JSON)',
    name: 'productBody',
    type: 'string',
    required: true,
    default: '{}',
    placeholder: '{"title": "My Product", "uri": "https://example.com/product"}',
    description: 'JSON object representing the product. Required fields for create: title, uri.',
    typeOptions: { rows: 4 },
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['create'] } },
  },
  {
    displayName: 'Fields to Update (JSON)',
    name: 'productBody',
    type: 'string',
    required: true,
    default: '{}',
    placeholder: '{"title": "Updated Title"}',
    description: 'JSON object with fields to update. All fields are optional.',
    typeOptions: { rows: 4 },
    displayOptions: { show: { resource: ['catalogProduct'], operation: ['update'] } },
  },
];
