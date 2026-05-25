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

type ProductOp = 'search' | 'count' | 'get' | 'create' | 'update' | 'delete';
type OperationKey = `product:${ProductOp}`;
type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;

const filterEmpty = (obj: Record<string, unknown>): IDataObject =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as IDataObject;

const buildOperationHandlers = (
  ctx: IExecuteFunctions,
  baseUrl: string,
): Record<OperationKey, OperationHandler> => ({

  'product:search': async (i) => ({
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

  'product:count': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products/count`,
    qs: filterEmpty({
      q: ctx.getNodeParameter('q', i, '') as string,
      feedId: ctx.getNodeParameter('feedId', i, '') as string,
      locale: ctx.getNodeParameter('locale', i, 'en-US') as string,
    }),
  }),

  'product:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products/${ctx.getNodeParameter('productId', i) as string}`,
  }),

  'product:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('productBody', i) as string) as IDataObject,
  }),

  'product:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products/${ctx.getNodeParameter('productId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('productBody', i) as string) as IDataObject,
  }),

  'product:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/product-catalog/products/${ctx.getNodeParameter('productId', i) as string}`,
  }),
});

export class BambuserProductCatalog implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser Product Catalog',
    name: 'bambuserProductCatalog',
    icon: 'file:bambuser-vod.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Manage products in the Bambuser product catalog',
    defaults: { name: 'Bambuser Product Catalog' },
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
          { name: 'Product', value: 'product' },
        ],
        default: 'product',
      },

      // ── Operation ─────────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['product'] } },
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
        displayOptions: { show: { resource: ['product'], operation: ['get', 'update', 'delete'] } },
      },

      // ── search query params ────────────────────────────────────────────────
      {
        displayName: 'Query',
        name: 'q',
        type: 'string',
        default: '',
        description: 'Free-text search query',
        displayOptions: { show: { resource: ['product'], operation: ['search', 'count'] } },
      },
      {
        displayName: 'Feed ID',
        name: 'feedId',
        type: 'string',
        default: '',
        description: 'Comma-separated feed IDs to scope the search',
        displayOptions: { show: { resource: ['product'], operation: ['search', 'count'] } },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
								description: 'Max number of results to return',
        typeOptions: { minValue: 1, maxValue: 1000 },
        default: 50,
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
      },
      {
        displayName: 'Page',
        name: 'page',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 1,
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
      },
      {
        displayName: 'Sort',
        name: 'sort',
        type: 'string',
        default: '',
        placeholder: 'title:asc',
        description: 'Sort by field, optionally with :asc or :desc suffix',
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
      },
      {
        displayName: 'Locale',
        name: 'locale',
        type: 'string',
        default: 'en-US',
        displayOptions: { show: { resource: ['product'], operation: ['search', 'count'] } },
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
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
      },
      {
        displayName: 'Unify Variant Titles',
        name: 'unifyVariantTitles',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
      },
      {
        displayName: 'Group by Significant Attributes',
        name: 'groupBySignificantAttributes',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['product'], operation: ['search'] } },
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
        displayOptions: { show: { resource: ['product'], operation: ['create'] } },
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
        displayOptions: { show: { resource: ['product'], operation: ['update'] } },
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
