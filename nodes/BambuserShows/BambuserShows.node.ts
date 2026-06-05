import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  GenericValue,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { resolveOrigin } from '../../lib/resolveOrigin';

type ShowOp =
  | 'get' | 'getMany' | 'create' | 'update' | 'delete' | 'getBroadcasts'
  | 'getChatMessages' | 'sendChatMessage' | 'updateChatMessage' | 'getChatTranscripts'
  | 'getPinnedComments' | 'createPinnedComment' | 'updatePinnedComment' | 'deletePinnedComment'
  | 'getHighlights' | 'addHighlight' | 'updateHighlight' | 'deleteHighlight'
  | 'getProducts' | 'addProduct' | 'addProductsBatch' | 'reorderProducts' | 'removeProduct'
  | 'getAssets' | 'deleteAsset'
  | 'addChannel' | 'updateChannels' | 'removeChannel'
  | 'addTag' | 'updateTags' | 'removeTag'
  | 'getExamples';

type ProductOp =
  | 'get' | 'getMany' | 'update' | 'delete'
  | 'getHighlighted' | 'getHighlightedShows' | 'getHighlightedShowsByRefs' | 'getHighlightedShowsById';

type ChannelOp = 'create' | 'get';
type TagOp = 'getMany' | 'create' | 'get' | 'update';
type UserOp = 'getMany' | 'invite' | 'update' | 'delete' | 'getAssets' | 'deleteAsset';
type StatsOp = 'getShow' | 'getShows' | 'getActivity' | 'getShowOrders' | 'getShowsOrders' | 'getActivityOrders' | 'getShowTraffic' | 'getShowsTraffic';
type WebhookOp = 'create' | 'getEvent';
type BroadcastOp = 'download' | 'getTranscriptions';

type OperationKey =
  | `show:${ShowOp}`
  | `product:${ProductOp}`
  | `channel:${ChannelOp}`
  | `tag:${TagOp}`
  | `user:${UserOp}`
  | `stats:${StatsOp}`
  | `webhook:${WebhookOp}`
  | `broadcast:${BroadcastOp}`;

type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;

const splitList = (s: string): string[] => s.split(',').map(t => t.trim()).filter(Boolean);

const filterEmpty = (obj: Record<string, unknown>): IDataObject =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as IDataObject;

const parseBoolOption = (v: string): boolean | undefined =>
  v === 'true' ? true : v === 'false' ? false : undefined;

const buildOperationHandlers = (
  ctx: IExecuteFunctions,
  baseUrl: string,
): Record<OperationKey, OperationHandler> => ({

  // ─── Show ─────────────────────────────────────────────────────────────────

  'show:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}`,
  }),

  'show:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 10) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      state: ctx.getNodeParameter('state', i, '') as string,
      contributor: ctx.getNodeParameter('contributor', i, '') as string,
      tag: ctx.getNodeParameter('filterTag', i, '') as string,
      isPublished: ctx.getNodeParameter('isPublished', i, '') as string,
      isTestShow: ctx.getNodeParameter('isTestShow', i, '') as string,
    }),
  }),

  'show:create': async (i) => {
    const fields = ctx.getNodeParameter('fields', i) as { values?: Record<string, unknown> };
    const extra = filterEmpty(fields.values ?? {});
    if (typeof extra.published === 'string') extra.published = parseBoolOption(extra.published as string);
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/shows`,
      headers: { 'Content-Type': 'application/json' },
      body: { title: ctx.getNodeParameter('title', i) as string, ...extra },
    };
  },

  'show:update': async (i) => {
    const showId = ctx.getNodeParameter('showId', i) as string;
    const fields = ctx.getNodeParameter('fields', i) as { values?: Record<string, unknown> };
    const body = filterEmpty(fields.values ?? {});
    if (typeof body.published === 'string') body.published = parseBoolOption(body.published as string);
    if (typeof body.allowArchivedPlayback === 'string') body.allowArchivedPlayback = parseBoolOption(body.allowArchivedPlayback as string);
    return {
      method: 'PATCH' as IHttpRequestMethods,
      url: `${baseUrl}/shows/${showId}`,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  },

  'show:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}`,
    qs: { removeMedia: true, removeChatlog: true },
  }),

  'show:getBroadcasts': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/broadcasts`,
  }),

  'show:getChatMessages': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/chat-messages`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
    }),
  }),

  'show:sendChatMessage': async (i) => {
    const replyToId = ctx.getNodeParameter('replyToId', i, '') as string;
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/chat-messages`,
      headers: { 'Content-Type': 'application/json' },
      body: filterEmpty({
        userId: ctx.getNodeParameter('userId', i) as string,
        message: ctx.getNodeParameter('message', i) as string,
        status: ctx.getNodeParameter('chatStatus', i, '') as string,
        ...(replyToId ? { replyTo: { id: replyToId } } : {}),
      }),
    };
  },

  'show:updateChatMessage': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/chat-messages/${ctx.getNodeParameter('chatMessageId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: { status: ctx.getNodeParameter('chatStatus', i) as string },
  }),

  'show:getChatTranscripts': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/chat-transcripts`,
  }),

  'show:getPinnedComments': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/pinned-comments`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      filter: ctx.getNodeParameter('filter', i, '') as string,
    }),
  }),

  'show:createPinnedComment': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/pinned-comments`,
    headers: { 'Content-Type': 'application/json' },
    body: { chatMessage: { id: ctx.getNodeParameter('chatMessageId', i) as string } },
  }),

  'show:updatePinnedComment': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/pinned-comments/${ctx.getNodeParameter('pinnedCommentId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: { chatMessage: { id: ctx.getNodeParameter('chatMessageId', i) as string } },
  }),

  'show:deletePinnedComment': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/pinned-comments/${ctx.getNodeParameter('pinnedCommentId', i) as string}`,
  }),

  'show:getHighlights': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/highlights`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      filter: ctx.getNodeParameter('filter', i, '') as string,
    }),
  }),

  'show:addHighlight': async (i) => {
    const startRel = ctx.getNodeParameter('startRel', i, '') as number | '';
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/highlights`,
      headers: { 'Content-Type': 'application/json' },
      body: filterEmpty({
        products: splitList(ctx.getNodeParameter('products', i, '') as string),
        startRel: startRel !== '' ? startRel : undefined,
      }),
    };
  },

  'show:updateHighlight': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/highlights/${ctx.getNodeParameter('highlightId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: { products: splitList(ctx.getNodeParameter('products', i, '') as string) },
  }),

  'show:deleteHighlight': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/highlights/${ctx.getNodeParameter('highlightId', i) as string}`,
  }),

  'show:getProducts': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/products`,
  }),

  'show:addProduct': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/products`,
    headers: { 'Content-Type': 'application/json' },
    body: { publicUrl: ctx.getNodeParameter('publicUrl', i) as string },
  }),

  'show:addProductsBatch': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/products/batch`,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.parse(ctx.getNodeParameter('productsJson', i) as string) as GenericValue[],
  }),

  'show:reorderProducts': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/products`,
    headers: { 'Content-Type': 'application/json' },
    body: { products: splitList(ctx.getNodeParameter('products', i) as string) },
  }),

  'show:removeProduct': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/products/${ctx.getNodeParameter('productId', i) as string}`,
  }),

  'show:getAssets': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/assets`,
  }),

  'show:deleteAsset': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/assets/${ctx.getNodeParameter('assetId', i) as string}`,
  }),

  'show:addChannel': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/channels`,
    headers: { 'Content-Type': 'application/json' },
    body: { id: ctx.getNodeParameter('channelId', i) as string },
  }),

  'show:updateChannels': async (i) => ({
    method: 'PUT' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/channels`,
    headers: { 'Content-Type': 'application/json' },
    body: { data: splitList(ctx.getNodeParameter('channelIds', i) as string).map(id => ({ id })) },
  }),

  'show:removeChannel': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/channels/${ctx.getNodeParameter('channelId', i) as string}`,
  }),

  'show:addTag': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/tags`,
    headers: { 'Content-Type': 'application/json' },
    body: { id: ctx.getNodeParameter('tagId', i) as string },
  }),

  'show:updateTags': async (i) => ({
    method: 'PUT' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/tags`,
    headers: { 'Content-Type': 'application/json' },
    body: { data: splitList(ctx.getNodeParameter('tagIds', i) as string).map(id => ({ id })) },
  }),

  'show:removeTag': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/tags/${ctx.getNodeParameter('tagId', i) as string}`,
  }),

  'show:getExamples': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/shows/${ctx.getNodeParameter('showId', i) as string}/examples`,
  }),

  // ─── Product ──────────────────────────────────────────────────────────────

  'product:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products/${ctx.getNodeParameter('productId', i) as string}`,
  }),

  'product:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
    }),
  }),

  'product:update': async (i) => {
    const fields = ctx.getNodeParameter('fields', i) as { values?: Record<string, unknown> };
    return {
      method: 'PATCH' as IHttpRequestMethods,
      url: `${baseUrl}/products/${ctx.getNodeParameter('productId', i) as string}`,
      headers: { 'Content-Type': 'application/json' },
      body: filterEmpty(fields.values ?? {}),
    };
  },

  'product:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/products/${ctx.getNodeParameter('productId', i) as string}`,
  }),

  'product:getHighlighted': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products/highlighted`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      showId: ctx.getNodeParameter('filterShowId', i, '') as string,
    }),
  }),

  'product:getHighlightedShows': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products/highlighted/shows`,
    qs: { productReference: ctx.getNodeParameter('productReference', i) as string },
  }),

  'product:getHighlightedShowsByRefs': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products/highlighted/shows/by-references`,
    qs: { productReference: splitList(ctx.getNodeParameter('productReferences', i) as string) },
  }),

  'product:getHighlightedShowsById': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/products/${ctx.getNodeParameter('productId', i) as string}/highlighted/shows`,
  }),

  // ─── Channel ──────────────────────────────────────────────────────────────

  'channel:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/channels`,
    headers: { 'Content-Type': 'application/json' },
    body: { title: ctx.getNodeParameter('title', i) as string },
  }),

  'channel:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/channels/${ctx.getNodeParameter('channelId', i) as string}`,
  }),

  // ─── Tag ──────────────────────────────────────────────────────────────────

  'tag:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/tags`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
    }),
  }),

  'tag:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/tags`,
    headers: { 'Content-Type': 'application/json' },
    body: { name: ctx.getNodeParameter('name', i) as string },
  }),

  'tag:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/tags/${ctx.getNodeParameter('tagId', i) as string}`,
  }),

  'tag:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/tags/${ctx.getNodeParameter('tagId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: { name: ctx.getNodeParameter('name', i) as string },
  }),

  // ─── User ─────────────────────────────────────────────────────────────────

  'user:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/users`,
    qs: filterEmpty({
      limit: ctx.getNodeParameter('limit', i, 100) as number,
      after: ctx.getNodeParameter('after', i, '') as string,
      id: ctx.getNodeParameter('filterUserId', i, '') as string,
      email: ctx.getNodeParameter('email', i, '') as string,
      externalReferenceId: ctx.getNodeParameter('externalReferenceId', i, '') as string,
    }),
  }),

  'user:invite': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/users`,
    headers: { 'Content-Type': 'application/json' },
    body: filterEmpty({
      email: ctx.getNodeParameter('email', i) as string,
      displayName: ctx.getNodeParameter('displayName', i) as string,
      fullName: ctx.getNodeParameter('fullName', i, '') as string,
      roles: splitList(ctx.getNodeParameter('roles', i) as string),
      externalReferenceId: ctx.getNodeParameter('externalReferenceId', i, '') as string,
      omitWelcomeEmail: ctx.getNodeParameter('omitWelcomeEmail', i, false) as boolean | '',
    }),
  }),

  'user:update': async (i) => {
    const fields = ctx.getNodeParameter('fields', i) as { values?: Record<string, unknown> };
    const body: Record<string, unknown> = filterEmpty(fields.values ?? {});
    if (typeof body.roles === 'string') body.roles = splitList(body.roles as string);
    return {
      method: 'PATCH' as IHttpRequestMethods,
      url: `${baseUrl}/users/${ctx.getNodeParameter('userId', i) as string}`,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  },

  'user:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/users/${ctx.getNodeParameter('userId', i) as string}`,
  }),

  'user:getAssets': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/users/${ctx.getNodeParameter('userId', i) as string}/assets`,
  }),

  'user:deleteAsset': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/users/${ctx.getNodeParameter('userId', i) as string}/assets/${ctx.getNodeParameter('assetId', i) as string}`,
  }),

  // ─── Stats ────────────────────────────────────────────────────────────────

  'stats:getShow': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/show/${ctx.getNodeParameter('showId', i) as string}`,
  }),

  'stats:getShows': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/shows`,
    qs: filterEmpty({ from: ctx.getNodeParameter('from', i, '') as string, to: ctx.getNodeParameter('to', i, '') as string }),
  }),

  'stats:getActivity': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/activity`,
    qs: filterEmpty({ from: ctx.getNodeParameter('from', i, '') as string, to: ctx.getNodeParameter('to', i, '') as string }),
  }),

  'stats:getShowOrders': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/show/${ctx.getNodeParameter('showId', i) as string}/orders`,
    qs: filterEmpty({ limit: ctx.getNodeParameter('limit', i, 10) as number, after: ctx.getNodeParameter('after', i, '') as string }),
  }),

  'stats:getShowsOrders': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/shows/orders`,
    qs: filterEmpty({ from: ctx.getNodeParameter('from', i, '') as string, to: ctx.getNodeParameter('to', i, '') as string, limit: ctx.getNodeParameter('limit', i, 10) as number, after: ctx.getNodeParameter('after', i, '') as string }),
  }),

  'stats:getActivityOrders': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/activity/orders`,
    qs: filterEmpty({ from: ctx.getNodeParameter('from', i, '') as string, to: ctx.getNodeParameter('to', i, '') as string, limit: ctx.getNodeParameter('limit', i, 10) as number, after: ctx.getNodeParameter('after', i, '') as string }),
  }),

  'stats:getShowTraffic': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/show/${ctx.getNodeParameter('showId', i) as string}/traffic-acquisition`,
  }),

  'stats:getShowsTraffic': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/stats/traffic-acquisition`,
    qs: filterEmpty({ from: ctx.getNodeParameter('from', i, '') as string, to: ctx.getNodeParameter('to', i, '') as string }),
  }),

  // ─── Webhook ──────────────────────────────────────────────────────────────

  'webhook:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/webhooks`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: ctx.getNodeParameter('name', i) as string,
      url: ctx.getNodeParameter('webhookUrl', i) as string,
      topics: splitList(ctx.getNodeParameter('webhookTopics', i) as string),
      headers: {},
    },
  }),

  'webhook:getEvent': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/webhooks/${ctx.getNodeParameter('eventId', i) as string}`,
  }),

  // ─── Broadcast ────────────────────────────────────────────────────────────

  'broadcast:download': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/broadcasts/${ctx.getNodeParameter('broadcastId', i) as string}/download`,
    qs: filterEmpty({ format: ctx.getNodeParameter('downloadFormat', i, '') as string }),
  }),

  'broadcast:getTranscriptions': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/broadcasts/${ctx.getNodeParameter('broadcastId', i) as string}/transcriptions`,
    qs: filterEmpty({ cursor: ctx.getNodeParameter('transcriptionCursor', i, '') as string }),
  }),
});

// ─── Shared displayOptions helpers ────────────────────────────────────────────

// Show operations that require a single showId path param
const SHOW_ID_OPS: ShowOp[] = [
  'get', 'update', 'delete', 'getBroadcasts',
  'getChatMessages', 'sendChatMessage', 'updateChatMessage', 'getChatTranscripts',
  'getPinnedComments', 'createPinnedComment', 'updatePinnedComment', 'deletePinnedComment',
  'getHighlights', 'addHighlight', 'updateHighlight', 'deleteHighlight',
  'getProducts', 'addProduct', 'addProductsBatch', 'reorderProducts', 'removeProduct',
  'getAssets', 'deleteAsset',
  'addChannel', 'updateChannels', 'removeChannel',
  'addTag', 'updateTags', 'removeTag',
  'getExamples',
];

const STATS_SHOW_ID_OPS: StatsOp[] = ['getShow', 'getShowOrders', 'getShowTraffic'];

export class BambuserShows implements INodeType {
  description: INodeTypeDescription = {
    // `displayName` is the UI label and may follow public product branding freely.
    // `name` is the persisted node type (`<package>.<name>`) baked into every saved
    // workflow — changing it breaks existing flows, so it is frozen to the internal
    // concept (shows) and must NOT track marketing renames.
    displayName: 'Bambuser Live',
    name: 'bambuserShows',
    icon: 'file:bambuser-live.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with the Bambuser Live API',
    defaults: { name: 'Bambuser Live' },
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
          { name: 'Broadcast', value: 'broadcast' },
          { name: 'Channel', value: 'channel' },
          { name: 'Product', value: 'product' },
          { name: 'Show', value: 'show' },
          { name: 'Stat', value: 'stats' },
          { name: 'Tag', value: 'tag' },
          { name: 'User', value: 'user' },
          { name: 'Webhook', value: 'webhook' },
        ],
        default: 'show',
      },

      // ── Operation: Broadcast ───────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['broadcast'] } },
        options: [
          { name: 'Download', value: 'download', action: 'Get a download link for a broadcast recording' },
          { name: 'Get Transcriptions', value: 'getTranscriptions', action: 'Get transcriptions for a broadcast' },
        ],
        default: 'download',
      },

      // ── Operation: Show ────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['show'] } },
        options: [
          { name: 'Add Channel', value: 'addChannel', action: 'Add a channel to a show' },
          { name: 'Add Highlight', value: 'addHighlight', action: 'Add a product highlight to a show' },
          { name: 'Add Product', value: 'addProduct', action: 'Add a product to a show' },
          { name: 'Add Products Batch', value: 'addProductsBatch', action: 'Add up to 100 products to a show' },
          { name: 'Add Tag', value: 'addTag', action: 'Add a tag to a show' },
          { name: 'Create', value: 'create', action: 'Create a show' },
          { name: 'Create Pinned Comment', value: 'createPinnedComment', action: 'Create a pinned comment' },
          { name: 'Delete', value: 'delete', action: 'Delete a show' },
          { name: 'Delete Asset', value: 'deleteAsset', action: 'Delete a show asset' },
          { name: 'Delete Highlight', value: 'deleteHighlight', action: 'Delete a highlight from a show' },
          { name: 'Delete Pinned Comment', value: 'deletePinnedComment', action: 'Delete a pinned comment' },
          { name: 'Get', value: 'get', action: 'Get a show by ID' },
          { name: 'Get Assets', value: 'getAssets', action: 'List show assets' },
          { name: 'Get Broadcasts', value: 'getBroadcasts', action: 'Get broadcasts for a show' },
          { name: 'Get Chat Messages', value: 'getChatMessages', action: 'Get chat messages for a show' },
          { name: 'Get Chat Transcripts', value: 'getChatTranscripts', action: 'Get chat transcripts for a show' },
          { name: 'Get Examples', value: 'getExamples', action: 'Get demo embed URL for a show' },
          { name: 'Get Highlights', value: 'getHighlights', action: 'Get highlights for a show' },
          { name: 'Get Many', value: 'getMany', action: 'List shows' },
          { name: 'Get Pinned Comments', value: 'getPinnedComments', action: 'Get pinned comments for a show' },
          { name: 'Get Products', value: 'getProducts', action: 'Get products in a show' },
          { name: 'Remove Channel', value: 'removeChannel', action: 'Remove a channel from a show' },
          { name: 'Remove Product', value: 'removeProduct', action: 'Remove a product from a show' },
          { name: 'Remove Tag', value: 'removeTag', action: 'Remove a tag from a show' },
          { name: 'Reorder Products', value: 'reorderProducts', action: 'Reorder products in a show' },
          { name: 'Send Chat Message', value: 'sendChatMessage', action: 'Send a chat message to a show' },
          { name: 'Update', value: 'update', action: 'Update a show' },
          { name: 'Update Channels', value: 'updateChannels', action: 'Replace all channels on a show' },
          { name: 'Update Chat Message', value: 'updateChatMessage', action: 'Update a chat message status' },
          { name: 'Update Highlight', value: 'updateHighlight', action: 'Update highlight products' },
          { name: 'Update Pinned Comment', value: 'updatePinnedComment', action: 'Update a pinned comment' },
          { name: 'Update Tags', value: 'updateTags', action: 'Replace all tags on a show' },
        ],
        default: 'getMany',
      },

      // ── Operation: Product ─────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['product'] } },
        options: [
          { name: 'Delete', value: 'delete', action: 'Delete a product' },
          { name: 'Get', value: 'get', action: 'Get a product by ID' },
          { name: 'Get Highlighted', value: 'getHighlighted', action: 'List highlighted products' },
          { name: 'Get Highlighted Shows By ID', value: 'getHighlightedShowsById', action: 'Get show appearances for a product by internal ID' },
          { name: 'Get Highlighted Shows By Ref', value: 'getHighlightedShows', action: 'Get show appearances for a product by reference' },
          { name: 'Get Highlighted Shows By Refs', value: 'getHighlightedShowsByRefs', action: 'Get show appearances for multiple product references' },
          { name: 'Get Many', value: 'getMany', action: 'List all products' },
          { name: 'Update', value: 'update', action: 'Update a product' },
        ],
        default: 'getMany',
      },

      // ── Operation: Channel ─────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['channel'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a channel' },
          { name: 'Get', value: 'get', action: 'Get a channel by ID' },
        ],
        default: 'get',
      },

      // ── Operation: Tag ─────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['tag'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a tag' },
          { name: 'Get', value: 'get', action: 'Get a tag by ID' },
          { name: 'Get Many', value: 'getMany', action: 'List tags' },
          { name: 'Update', value: 'update', action: 'Update a tag' },
        ],
        default: 'getMany',
      },

      // ── Operation: User ────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['user'] } },
        options: [
          { name: 'Delete', value: 'delete', action: 'Remove a user' },
          { name: 'Delete Asset', value: 'deleteAsset', action: 'Delete a user asset' },
          { name: 'Get Assets', value: 'getAssets', action: 'List user assets' },
          { name: 'Get Many', value: 'getMany', action: 'List users' },
          { name: 'Invite', value: 'invite', action: 'Invite a user' },
          { name: 'Update', value: 'update', action: 'Update user data' },
        ],
        default: 'getMany',
      },

      // ── Operation: Stats ───────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['stats'] } },
        options: [
          { name: 'Get Activity', value: 'getActivity', action: 'Get show activity in a time period' },
          { name: 'Get Activity Orders', value: 'getActivityOrders', action: 'Get orders by activity period' },
          { name: 'Get Show', value: 'getShow', action: 'Get statistics for a show' },
          { name: 'Get Show Orders', value: 'getShowOrders', action: 'Get order data for a show' },
          { name: 'Get Show Traffic', value: 'getShowTraffic', action: 'Get traffic acquisition for a show' },
          { name: 'Get Shows', value: 'getShows', action: 'Get statistics for multiple shows' },
          { name: 'Get Shows Orders', value: 'getShowsOrders', action: 'Get order data for multiple shows' },
          { name: 'Get Shows Traffic', value: 'getShowsTraffic', action: 'Get traffic acquisition for multiple shows' },
        ],
        default: 'getShow',
      },

      // ── Operation: Webhook ─────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['webhook'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a webhook subscription' },
          { name: 'Get Event', value: 'getEvent', action: 'Get a webhook event by ID' },
        ],
        default: 'create',
      },

      // ── broadcastId ────────────────────────────────────────────────────────
      {
        displayName: 'Broadcast ID',
        name: 'broadcastId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['broadcast'], operation: ['download', 'getTranscriptions'] } },
      },
      {
        displayName: 'Format',
        name: 'downloadFormat',
        type: 'options',
        options: [
          { name: 'MP4 H.264', value: 'MP4H264' },
          { name: 'FLV H.264', value: 'FLVH264' },
          { name: 'Default', value: '' },
        ],
        default: 'MP4H264',
        description: 'Video format for the download link',
        displayOptions: { show: { resource: ['broadcast'], operation: ['download'] } },
      },
      {
        displayName: 'Cursor',
        name: 'transcriptionCursor',
        type: 'string',
        default: '',
        description: 'Pagination cursor from the previous response',
        displayOptions: { show: { resource: ['broadcast'], operation: ['getTranscriptions'] } },
      },

      // ── showId ─────────────────────────────────────────────────────────────
      {
        displayName: 'Show ID',
        name: 'showId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['show'],
            operation: SHOW_ID_OPS,
          },
        },
      },
      {
        displayName: 'Show ID',
        name: 'showId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['stats'],
            operation: STATS_SHOW_ID_OPS,
          },
        },
      },

      // ── productId ──────────────────────────────────────────────────────────
      {
        displayName: 'Product ID',
        name: 'productId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['product'],
            operation: ['get', 'update', 'delete', 'getHighlightedShowsById'],
          },
        },
      },
      {
        displayName: 'Product ID',
        name: 'productId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['removeProduct'] },
        },
      },

      // ── channelId ──────────────────────────────────────────────────────────
      {
        displayName: 'Channel ID',
        name: 'channelId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: {
            resource: ['channel'],
            operation: ['get'],
          },
        },
      },
      {
        displayName: 'Channel ID',
        name: 'channelId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['addChannel', 'removeChannel'] },
        },
      },

      // ── tagId ──────────────────────────────────────────────────────────────
      {
        displayName: 'Tag ID',
        name: 'tagId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['tag'], operation: ['get', 'update'] },
        },
      },
      {
        displayName: 'Tag ID',
        name: 'tagId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['addTag', 'removeTag'] },
        },
      },

      // ── userId ─────────────────────────────────────────────────────────────
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['user'], operation: ['update', 'delete', 'getAssets', 'deleteAsset'] },
        },
      },
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        required: true,
        default: '',
        description: 'Bambuser user ID of the message sender',
        displayOptions: {
          show: { resource: ['show'], operation: ['sendChatMessage'] },
        },
      },

      // ── chatMessageId ──────────────────────────────────────────────────────
      {
        displayName: 'Chat Message ID',
        name: 'chatMessageId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['updateChatMessage', 'createPinnedComment', 'updatePinnedComment'] },
        },
      },

      // ── pinnedCommentId ────────────────────────────────────────────────────
      {
        displayName: 'Pinned Comment ID',
        name: 'pinnedCommentId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['updatePinnedComment', 'deletePinnedComment'] },
        },
      },

      // ── highlightId ────────────────────────────────────────────────────────
      {
        displayName: 'Highlight ID',
        name: 'highlightId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['updateHighlight', 'deleteHighlight'] },
        },
      },

      // ── assetId ────────────────────────────────────────────────────────────
      {
        displayName: 'Asset ID',
        name: 'assetId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show'], operation: ['deleteAsset'] },
        },
      },
      {
        displayName: 'Asset ID',
        name: 'assetId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['user'], operation: ['deleteAsset'] },
        },
      },

      // ── eventId ────────────────────────────────────────────────────────────
      {
        displayName: 'Event ID',
        name: 'eventId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['webhook'], operation: ['getEvent'] } },
      },

      // ── title ──────────────────────────────────────────────────────────────
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['show', 'channel'], operation: ['create'] },
        },
      },

      // ── name ───────────────────────────────────────────────────────────────
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        required: true,
        default: '',
        displayOptions: {
          show: { resource: ['tag'], operation: ['create', 'update'] },
        },
      },

      // ── limit / after ──────────────────────────────────────────────────────
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
								description: 'Max number of results to return',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: {
          show: {
            resource: ['show', 'product', 'tag', 'user', 'stats'],
            operation: ['getMany', 'getChatMessages', 'getPinnedComments', 'getHighlights', 'getHighlighted', 'getShowOrders', 'getShowsOrders', 'getActivityOrders'],
          },
        },
      },
      {
        displayName: 'After Cursor',
        name: 'after',
        type: 'string',
        default: '',
        description: 'Pagination cursor from the previous response "next" field',
        displayOptions: {
          show: {
            resource: ['show', 'product', 'tag', 'user', 'stats'],
            operation: ['getMany', 'getChatMessages', 'getPinnedComments', 'getHighlights', 'getHighlighted', 'getShowOrders', 'getShowsOrders', 'getActivityOrders'],
          },
        },
      },

      // ── from / to ──────────────────────────────────────────────────────────
      {
        displayName: 'From',
        name: 'from',
        type: 'string',
        default: '',
        placeholder: '2024-01-01T00:00:00Z',
        description: 'ISO date string — start of range',
        displayOptions: {
          show: {
            resource: ['stats'],
            operation: ['getShows', 'getActivity', 'getShowsOrders', 'getActivityOrders', 'getShowsTraffic'],
          },
        },
      },
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        placeholder: '2024-12-31T23:59:59Z',
        description: 'ISO date string — end of range',
        displayOptions: {
          show: {
            resource: ['stats'],
            operation: ['getShows', 'getActivity', 'getShowsOrders', 'getActivityOrders', 'getShowsTraffic'],
          },
        },
      },

      // ── show:getMany filters ───────────────────────────────────────────────
      {
        displayName: 'State',
        name: 'state',
        type: 'options',
        options: [
          { name: 'All', value: '' },
          { name: 'Ended', value: 'ended' },
          { name: 'Live', value: 'live' },
          { name: 'Scheduled', value: 'scheduled' },
          { name: 'Upcoming', value: 'upcoming' },
        ],
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['getMany'] } },
      },
      {
        displayName: 'Contributor User ID',
        name: 'contributor',
        type: 'string',
        default: '',
        description: 'Filter by contributor user ID',
        displayOptions: { show: { resource: ['show'], operation: ['getMany'] } },
      },
      {
        displayName: 'Tag ID Filter',
        name: 'filterTag',
        type: 'string',
        default: '',
        description: 'Filter shows by tag ID',
        displayOptions: { show: { resource: ['show'], operation: ['getMany'] } },
      },
      {
        displayName: 'Is Published',
        name: 'isPublished',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Yes', value: 'true' },
          { name: 'No', value: 'false' },
        ],
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['getMany'] } },
      },
      {
        displayName: 'Is Test Show',
        name: 'isTestShow',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Yes', value: 'true' },
          { name: 'No', value: 'false' },
        ],
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['getMany'] } },
      },

      // ── show:create optional fields ────────────────────────────────────────
      {
        displayName: 'Optional Fields',
        name: 'fields',
        type: 'fixedCollection',
        typeOptions: { multipleValues: false },
        default: {},
        displayOptions: { show: { resource: ['show'], operation: ['create'] } },
        options: [
          {
            displayName: 'Values',
            name: 'values',
            values: [
											{
												displayName: 'Allow Archived Playback',
												name: 'allowArchivedPlayback',
												type: 'options',
												options: [
													{
														name: 'True',
														value: 'true',
													},
													{
														name: 'False',
														value: 'false',
													},
												],
												default: 'true',
											},
											{
												displayName: 'Description',
												name: 'description',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Is Test Show',
												name: 'isTestShow',
												type: 'boolean',
												default: false,
											},
											{
												displayName: 'Published',
												name: 'published',
												type: 'options',
												options: [
													{
														name: 'True',
														value: 'true',
													},
													{
														name: 'False',
														value: 'false',
													},
													],
												default: 'true',
											},
											{
												displayName: 'Scheduled Start At',
												name: 'scheduledStartAt',
												type: 'string',
												default: '',
												placeholder: '2024-06-01T10:00:00Z',
											},
									],
          },
        ],
      },

      // ── show:update fields ─────────────────────────────────────────────────
      {
        displayName: 'Fields to Update',
        name: 'fields',
        type: 'fixedCollection',
        typeOptions: { multipleValues: false },
        default: {},
        displayOptions: { show: { resource: ['show'], operation: ['update'] } },
        options: [
          {
            displayName: 'Values',
            name: 'values',
            values: [
											{
												displayName: 'Allow Archived Playback',
												name: 'allowArchivedPlayback',
												type: 'options',
												options: [
													{
														name: '—	No Change	—',
														value: '',
													},
													{
														name: 'True',
														value: 'true',
													},
													{
														name: 'False',
														value: 'false',
													},
												],
												default: '',
											},
											{
												displayName: 'Description',
												name: 'description',
												type: 'string',
												default: '',
											},
											{
												displayName: 'Published',
												name: 'published',
												type: 'options',
												options: [
													{
														name: '—	No Change	—',
														value: '',
													},
													{
														name: 'True',
														value: 'true',
													},
													{
														name: 'False',
														value: 'false',
													},
													],
												default: '',
											},
											{
												displayName: 'Scheduled Start At',
												name: 'scheduledStartAt',
												type: 'string',
												default: '',
												placeholder: '2024-06-01T10:00:00Z',
											},
											{
												displayName: 'Title',
												name: 'title',
												type: 'string',
												default: '',
											},
									],
          },
        ],
      },

      // ── product:update fields ──────────────────────────────────────────────
      {
        displayName: 'Fields to Update',
        name: 'fields',
        type: 'fixedCollection',
        typeOptions: { multipleValues: false },
        default: {},
        displayOptions: { show: { resource: ['product'], operation: ['update'] } },
        options: [
          {
            displayName: 'Values',
            name: 'values',
            values: [
              { displayName: 'Title', name: 'title', type: 'string', default: '' },
              { displayName: 'Brand', name: 'brand', type: 'string', default: '' },
              { displayName: 'Thumbnail URL', name: 'thumbnail', type: 'string', default: '' },
              { displayName: 'Product Reference', name: 'productReference', type: 'string', default: '' },
            ],
          },
        ],
      },

      // ── user:update fields ─────────────────────────────────────────────────
      {
        displayName: 'Fields to Update',
        name: 'fields',
        type: 'fixedCollection',
        typeOptions: { multipleValues: false },
        default: {},
        displayOptions: { show: { resource: ['user'], operation: ['update'] } },
        options: [
          {
            displayName: 'Values',
            name: 'values',
            values: [
              { displayName: 'Display Name', name: 'displayName', type: 'string', default: '' },
              { displayName: 'Full Name', name: 'fullName', type: 'string', default: '' },
              { displayName: 'Roles (Comma-Separated)', name: 'roles', type: 'string', default: '', placeholder: 'admin,host' },
              { displayName: 'External Reference ID', name: 'externalReferenceId', type: 'string', default: '' },
            ],
          },
        ],
      },

      // ── show:sendChatMessage ───────────────────────────────────────────────
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['sendChatMessage'] } },
      },
      {
        displayName: 'Status',
        name: 'chatStatus',
        type: 'options',
        options: [
          { name: 'Published', value: 'published' },
          { name: 'Unpublished', value: 'unpublished' },
        ],
        default: 'published',
        displayOptions: { show: { resource: ['show'], operation: ['sendChatMessage'] } },
      },
      {
        displayName: 'Reply To Message ID',
        name: 'replyToId',
        type: 'string',
        default: '',
        description: 'Optional — ID of the message to reply to',
        displayOptions: { show: { resource: ['show'], operation: ['sendChatMessage'] } },
      },

      // ── show:updateChatMessage ─────────────────────────────────────────────
      {
        displayName: 'Status',
        name: 'chatStatus',
        type: 'options',
        options: [
          { name: 'Published', value: 'published' },
          { name: 'Unpublished', value: 'unpublished' },
        ],
        default: 'unpublished',
        displayOptions: { show: { resource: ['show'], operation: ['updateChatMessage'] } },
      },

      // ── getPinnedComments / getHighlights filter ───────────────────────────
      {
        displayName: 'Filter',
        name: 'filter',
        type: 'options',
        options: [
          { name: 'All', value: '' },
          { name: 'Latest', value: 'latest' },
        ],
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['getPinnedComments', 'getHighlights'] } },
      },

      // ── show:addHighlight / updateHighlight ────────────────────────────────
      {
        displayName: 'Product IDs',
        name: 'products',
        type: 'string',
        default: '',
        placeholder: 'tpl:abc123, tpl:def456',
        description: 'Comma-separated list of product IDs to highlight',
        displayOptions: { show: { resource: ['show'], operation: ['addHighlight', 'updateHighlight'] } },
      },
      {
        displayName: 'Start Relative (Seconds)',
        name: 'startRel',
        type: 'number',
        default: '',
        description: 'Position in archived show (seconds from start). Leave empty for live shows.',
        displayOptions: { show: { resource: ['show'], operation: ['addHighlight'] } },
      },

      // ── show:addProduct ────────────────────────────────────────────────────
      {
        displayName: 'Public URL',
        name: 'publicUrl',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['show'], operation: ['addProduct'] } },
      },

      // ── show:addProductsBatch ──────────────────────────────────────────────
      {
        displayName: 'Products JSON',
        name: 'productsJson',
        type: 'string',
        required: true,
        default: '',
        placeholder: '[{"publicUrl":"https://example.com/product"}]',
        description: 'JSON array of product objects — each requires at least publicUrl',
        typeOptions: { rows: 4 },
        displayOptions: { show: { resource: ['show'], operation: ['addProductsBatch'] } },
      },

      // ── show:reorderProducts ───────────────────────────────────────────────
      {
        displayName: 'Product IDs',
        name: 'products',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'tpl:abc123, tpl:def456',
        description: 'Comma-separated product IDs in desired order',
        displayOptions: { show: { resource: ['show'], operation: ['reorderProducts'] } },
      },

      // ── show:updateChannels ────────────────────────────────────────────────
      {
        displayName: 'Channel IDs',
        name: 'channelIds',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'id1, id2',
        description: 'Comma-separated channel IDs — replaces all current channels',
        displayOptions: { show: { resource: ['show'], operation: ['updateChannels'] } },
      },

      // ── show:updateTags ────────────────────────────────────────────────────
      {
        displayName: 'Tag IDs',
        name: 'tagIds',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'id1, id2',
        description: 'Comma-separated tag IDs — replaces all current tags',
        displayOptions: { show: { resource: ['show'], operation: ['updateTags'] } },
      },

      // ── product:getHighlightedShows ────────────────────────────────────────
      {
        displayName: 'Product Reference',
        name: 'productReference',
        type: 'string',
        required: true,
        default: '',
        description: 'SKU or product reference string',
        displayOptions: { show: { resource: ['product'], operation: ['getHighlightedShows'] } },
      },
      {
        displayName: 'Product References',
        name: 'productReferences',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'sku1, sku2, sku3',
        description: 'Comma-separated product references (max 20)',
        displayOptions: { show: { resource: ['product'], operation: ['getHighlightedShowsByRefs'] } },
      },
      {
        displayName: 'Show ID Filter',
        name: 'filterShowId',
        type: 'string',
        default: '',
        description: 'Optional — filter highlighted products by show ID',
        displayOptions: { show: { resource: ['product'], operation: ['getHighlighted'] } },
      },

      // ── user:getMany filters ───────────────────────────────────────────────
      {
        displayName: 'User ID Filter',
        name: 'filterUserId',
        type: 'string',
        default: '',
        description: 'Filter by exact user ID',
        displayOptions: { show: { resource: ['user'], operation: ['getMany'] } },
      },
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
								placeholder: 'name@email.com',
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['getMany'] } },
      },
      {
        displayName: 'External Reference ID',
        name: 'externalReferenceId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['getMany'] } },
      },

      // ── user:invite ────────────────────────────────────────────────────────
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
								placeholder: 'name@email.com',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },
      {
        displayName: 'Display Name',
        name: 'displayName',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },
      {
        displayName: 'Roles',
        name: 'roles',
        type: 'string',
        required: true,
        default: 'host',
        placeholder: 'admin, showCreator, host',
        description: 'Comma-separated roles',
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },
      {
        displayName: 'Full Name',
        name: 'fullName',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },
      {
        displayName: 'External Reference ID',
        name: 'externalReferenceId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },
      {
        displayName: 'Omit Welcome Email',
        name: 'omitWelcomeEmail',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['user'], operation: ['invite'] } },
      },

      // ── webhook:create ─────────────────────────────────────────────────────
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
      },
      {
        displayName: 'URL',
        name: 'webhookUrl',
        type: 'string',
        required: true,
        default: '',
        description: 'HTTPS callback URL for webhook delivery',
        displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
      },
      {
        displayName: 'Topics',
        name: 'webhookTopics',
        type: 'string',
        required: true,
        default: 'show',
        placeholder: 'show, product, user, product-highlight, broadcast',
        description: 'Comma-separated list of topics to subscribe to',
        displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
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
