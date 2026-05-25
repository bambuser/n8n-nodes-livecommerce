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

type VideoOp = 'get' | 'getMany' | 'create' | 'update' | 'delete' | 'query' | 'getCount' | 'getViewsCount' | 'clip' | 'updatePreview';
type MediaAssetOp = 'get' | 'getMany' | 'create' | 'update' | 'delete' | 'createUploadTicket' | 'updateUploadStatus' | 'getCaptions' | 'createCaption' | 'updateCaption' | 'deleteCaption';
type VideoPlaylistOp = 'get' | 'getMany' | 'create' | 'update' | 'delete';
type OperationKey = `video:${VideoOp}` | `mediaAsset:${MediaAssetOp}` | `videoPlaylist:${VideoPlaylistOp}`;

type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;

const buildVideoListQs = (ctx: IExecuteFunctions, i: number): IDataObject => {
  const qs: IDataObject = {
    pageSize: ctx.getNodeParameter('pageSize', i, 50) as number,
    sortBy: ctx.getNodeParameter('sortBy', i, 'createdAt') as string,
    sortOrder: ctx.getNodeParameter('sortOrder', i, 'DESC') as string,
  };
  const cursor = ctx.getNodeParameter('cursor', i, '') as string;
  const search = ctx.getNodeParameter('search', i, '') as string;
  if (cursor) qs.cursor = cursor;
  if (search) qs.search = search;
  return qs;
};

const buildVideoDetails = (ctx: IExecuteFunctions, i: number): IDataObject => {
  const details: IDataObject = {
    title: ctx.getNodeParameter('title', i) as string,
    description: ctx.getNodeParameter('description', i) as string,
  };
  const locale = ctx.getNodeParameter('locale', i, '') as string;
  if (locale) details.locale = locale;
  return details;
};

const buildListQs = (ctx: IExecuteFunctions, i: number): IDataObject => {
  const qs: IDataObject = {
    pageSize: ctx.getNodeParameter('pageSize', i, 50) as number,
  };
  const cursor = ctx.getNodeParameter('cursor', i, '') as string;
  if (cursor) qs.cursor = cursor;
  return qs;
};

const buildVideoPlaylistBody = (ctx: IExecuteFunctions, i: number): IDataObject => {
  const body: IDataObject = {};
  const title = ctx.getNodeParameter('playlistTitle', i, '') as string;
  const description = ctx.getNodeParameter('playlistDescription', i, '') as string;
  const published = ctx.getNodeParameter('published', i, false) as boolean;
  const videoOrderRaw = ctx.getNodeParameter('videoOrder', i, '[]') as string | string[];
  const videoOrder = typeof videoOrderRaw === 'string' ? (JSON.parse(videoOrderRaw) as string[]) : videoOrderRaw;

  if (title) body.title = title;
  if (description) body.description = description;
  body.published = published;
  if (videoOrder.length > 0) body.videoOrder = videoOrder;
  return body;
};

const buildOperationHandlers = (
  ctx: IExecuteFunctions,
  baseUrl: string,
): Record<OperationKey, OperationHandler> => ({
  // ── Video ──────────────────────────────────────────────────────────────────
  'video:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/videos`,
    qs: buildVideoListQs(ctx, i),
  }),

  'video:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/videos/${ctx.getNodeParameter('videoId', i) as string}`,
  }),

  'video:create': async (i) => {
    const sourceUrl = ctx.getNodeParameter('sourceUrl', i, '') as string;
    const inputJson = ctx.getInputData()[i]?.json ?? {};
    const broadcastLength = typeof inputJson.broadcastLength === 'number' ? inputJson.broadcastLength : undefined;
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/videos`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        data: {
          filename: ctx.getNodeParameter('filename', i) as string,
          ...(sourceUrl ? { sourceUrl } : {}),
          ...(broadcastLength !== undefined ? { broadcastLength } : {}),
          videoDetails: buildVideoDetails(ctx, i),
        },
      },
    };
  },

  'video:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/videos/${ctx.getNodeParameter('videoId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      data: {
        videoDetails: buildVideoDetails(ctx, i),
      },
    },
  }),

  'video:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/videos/${ctx.getNodeParameter('videoId', i) as string}`,
  }),

  'video:query': async (i) => {
    const queryBodyRaw = ctx.getNodeParameter('queryBody', i, '{}') as string | IDataObject;
    const queryBody = typeof queryBodyRaw === 'string' ? (JSON.parse(queryBodyRaw) as IDataObject) : queryBodyRaw;
    const qs = buildListQs(ctx, i);
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/videos/query`,
      headers: { 'Content-Type': 'application/json' },
      qs,
      body: queryBody,
    };
  },

  'video:getCount': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/videos/count`,
    qs: {
      includeExampleVideos: ctx.getNodeParameter('includeExampleVideos', i, false) as boolean,
    },
  }),

  'video:getViewsCount': async () => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/videos/views-count`,
  }),

  'video:clip': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/videos/${ctx.getNodeParameter('videoId', i) as string}/clip`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      data: {
        broadcastId: ctx.getNodeParameter('broadcastId', i) as string,
        start: ctx.getNodeParameter('clipStart', i) as number,
        end: ctx.getNodeParameter('clipEnd', i) as number,
        importCaptions: ctx.getNodeParameter('importCaptions', i, false) as boolean,
      },
    },
  }),

  'video:updatePreview': async (i) => ({
    method: 'PUT' as IHttpRequestMethods,
    url: `${baseUrl}/videos/${ctx.getNodeParameter('videoId', i) as string}/preview`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      data: {
        fileId: ctx.getNodeParameter('fileId', i) as string,
      },
    },
  }),

  // ── Media Asset ────────────────────────────────────────────────────────────
  'mediaAsset:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/media-assets`,
    qs: buildListQs(ctx, i),
  }),

  'mediaAsset:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}`,
  }),

  'mediaAsset:create': async (i) => {
    const sourceUrl = ctx.getNodeParameter('sourceUrl', i, '') as string;
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/media-assets`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        ref: {
          videoId: ctx.getNodeParameter('refVideoId', i) as string,
        },
        data: {
          type: ctx.getNodeParameter('mediaType', i, 'image') as string,
          data: {
            filename: ctx.getNodeParameter('filename', i) as string,
            ...(sourceUrl ? { sourceUrl } : {}),
          },
        },
      },
    };
  },

  'mediaAsset:update': async (i) => {
    const vendorUploadId = ctx.getNodeParameter('vendorUploadId', i, '') as string;
    return {
      method: 'PATCH' as IHttpRequestMethods,
      url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        data: {
          ...(vendorUploadId ? { vendorUploadId } : {}),
        },
      },
    };
  },

  'mediaAsset:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}`,
  }),

  'mediaAsset:createUploadTicket': async () => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/image-upload-ticket`,
    headers: { 'Content-Type': 'application/json' },
    body: {},
  }),

  'mediaAsset:updateUploadStatus': async (i) => {
    const vendorUploadId = ctx.getNodeParameter('vendorUploadId', i, '') as string;
    const uploadState = ctx.getNodeParameter('uploadState', i, 'completed') as string;
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}/upload-status`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        state: uploadState,
        ...(vendorUploadId ? { vendorUploadId } : {}),
      },
    };
  },

  'mediaAsset:getCaptions': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}/captions`,
  }),

  'mediaAsset:createCaption': async (i) => {
    const sourceLanguageCode = ctx.getNodeParameter('sourceLanguageCode', i, '') as string;
    return {
      method: 'POST' as IHttpRequestMethods,
      url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}/captions`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        data: {
          languageCode: ctx.getNodeParameter('captionLanguageCode', i) as string,
          ...(sourceLanguageCode ? { sourceLanguageCode } : {}),
        },
      },
    };
  },

  'mediaAsset:updateCaption': async (i) => {
    const captionBodyRaw = ctx.getNodeParameter('captionBody', i, '{}') as string | IDataObject;
    const captionBody = typeof captionBodyRaw === 'string' ? (JSON.parse(captionBodyRaw) as IDataObject) : captionBodyRaw;
    return {
      method: 'PUT' as IHttpRequestMethods,
      url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}/captions/${ctx.getNodeParameter('languageCode', i) as string}`,
      headers: { 'Content-Type': 'application/json' },
      body: { data: captionBody },
    };
  },

  'mediaAsset:deleteCaption': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/media-assets/${ctx.getNodeParameter('mediaAssetId', i) as string}/captions/${ctx.getNodeParameter('languageCode', i) as string}`,
  }),

  // ── Video Playlist ─────────────────────────────────────────────────────────
  'videoPlaylist:getMany': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/video-playlists`,
    qs: buildListQs(ctx, i),
  }),

  'videoPlaylist:get': async (i) => ({
    method: 'GET' as IHttpRequestMethods,
    url: `${baseUrl}/video-playlists/${ctx.getNodeParameter('playlistId', i) as string}`,
  }),

  'videoPlaylist:create': async (i) => ({
    method: 'POST' as IHttpRequestMethods,
    url: `${baseUrl}/video-playlists`,
    headers: { 'Content-Type': 'application/json' },
    body: buildVideoPlaylistBody(ctx, i),
  }),

  'videoPlaylist:update': async (i) => ({
    method: 'PATCH' as IHttpRequestMethods,
    url: `${baseUrl}/video-playlists/${ctx.getNodeParameter('playlistId', i) as string}`,
    headers: { 'Content-Type': 'application/json' },
    body: buildVideoPlaylistBody(ctx, i),
  }),

  'videoPlaylist:delete': async (i) => ({
    method: 'DELETE' as IHttpRequestMethods,
    url: `${baseUrl}/video-playlists/${ctx.getNodeParameter('playlistId', i) as string}`,
  }),
});

export class BambuserOnDemand implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser On Demand',
    name: 'bambuserOnDemand',
    icon: 'file:bambuser-vod.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Manage VOD videos, media assets, and playlists via the Bambuser public API. Requires VOD_MANAGE scope.',
    defaults: { name: 'Bambuser On Demand' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'bambuserApi', required: true }],
    properties: [
      // ── Resource ──────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Video', value: 'video' },
          { name: 'Media Asset', value: 'mediaAsset' },
          { name: 'Video Playlist', value: 'videoPlaylist' },
        ],
        default: 'video',
      },

      // ── Operations ────────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['video'] } },
        options: [
          { name: 'Clip', value: 'clip', action: 'Create a clip from a broadcast' },
          { name: 'Create', value: 'create', action: 'Create a video' },
          { name: 'Delete', value: 'delete', action: 'Delete a video' },
          { name: 'Get', value: 'get', action: 'Get a video by ID' },
          { name: 'Get Count', value: 'getCount', action: 'Get total video count' },
          { name: 'Get Many', value: 'getMany', action: 'List videos' },
          { name: 'Get Views Count', value: 'getViewsCount', action: 'Get total views count for the org' },
          { name: 'Query', value: 'query', action: 'Query videos with filters' },
          { name: 'Update', value: 'update', action: 'Update a video' },
          { name: 'Update Preview', value: 'updatePreview', action: 'Update the preview image of a video' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['mediaAsset'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a media asset' },
          { name: 'Create Caption', value: 'createCaption', action: 'Trigger transcription for a language' },
          { name: 'Create Upload Ticket', value: 'createUploadTicket', action: 'Get a ticket to upload an image' },
          { name: 'Delete', value: 'delete', action: 'Delete a media asset' },
          { name: 'Delete Caption', value: 'deleteCaption', action: 'Delete a caption track' },
          { name: 'Get', value: 'get', action: 'Get a media asset by ID' },
          { name: 'Get Captions', value: 'getCaptions', action: 'List captions for a media asset' },
          { name: 'Get Many', value: 'getMany', action: 'List media assets' },
          { name: 'Update', value: 'update', action: 'Update a media asset' },
          { name: 'Update Caption', value: 'updateCaption', action: 'Update caption content' },
          { name: 'Update Upload Status', value: 'updateUploadStatus', action: 'Report upload progress or completion' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['videoPlaylist'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a playlist' },
          { name: 'Delete', value: 'delete', action: 'Delete a playlist' },
          { name: 'Get', value: 'get', action: 'Get a playlist by ID' },
          { name: 'Get Many', value: 'getMany', action: 'List playlists' },
          { name: 'Update', value: 'update', action: 'Update a playlist' },
        ],
        default: 'getMany',
      },

      // ── Video ID ──────────────────────────────────────────────────────────
      {
        displayName: 'Video ID',
        name: 'videoId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['video'], operation: ['get', 'update', 'delete', 'clip', 'updatePreview'] } },
      },

      // ── Media Asset ID ────────────────────────────────────────────────────
      {
        displayName: 'Media Asset ID',
        name: 'mediaAssetId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['get', 'update', 'delete', 'updateUploadStatus', 'getCaptions', 'createCaption', 'updateCaption', 'deleteCaption'] } },
      },

      // ── Playlist ID ───────────────────────────────────────────────────────
      {
        displayName: 'Playlist ID',
        name: 'playlistId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['videoPlaylist'], operation: ['get', 'update', 'delete'] } },
      },

      // ── Video create fields ───────────────────────────────────────────────
      {
        displayName: 'Filename',
        name: 'filename',
        type: 'string',
        required: true,
        default: '',
        description: 'File label (e.g. my-show.mp4)',
        displayOptions: { show: { resource: ['video', 'mediaAsset'], operation: ['create'] } },
      },
      {
        displayName: 'Source URL',
        name: 'sourceUrl',
        type: 'string',
        default: '',
        placeholder: 'https://cdn.bambuser.net/broadcasts/…',
        description: 'Import from URL instead of uploading a file',
        displayOptions: { show: { resource: ['video', 'mediaAsset'], operation: ['create'] } },
      },

      // ── Video create / update ─────────────────────────────────────────────
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['video'], operation: ['create', 'update'] } },
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['video'], operation: ['create', 'update'] } },
      },
      {
        displayName: 'Locale',
        name: 'locale',
        type: 'string',
        default: '',
        placeholder: 'en-US',
        description: 'BCP-47 locale tag (e.g. en-US, sv-SE)',
        displayOptions: { show: { resource: ['video'], operation: ['create', 'update'] } },
      },

      // ── Video list / pagination ───────────────────────────────────────────
      {
        displayName: 'Page Size',
        name: 'pageSize',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['video'], operation: ['getMany'] } },
      },
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        default: '',
        description: 'Pagination cursor from a previous response',
        displayOptions: { show: { resource: ['video'], operation: ['getMany'] } },
      },
      {
        displayName: 'Sort By',
        name: 'sortBy',
        type: 'options',
        options: [
          { name: 'Created At', value: 'createdAt' },
          { name: 'Updated At', value: 'updatedAt' },
          { name: 'Title', value: 'title' },
          { name: 'Duration', value: 'duration' },
        ],
        default: 'createdAt',
        displayOptions: { show: { resource: ['video'], operation: ['getMany'] } },
      },
      {
        displayName: 'Sort Order',
        name: 'sortOrder',
        type: 'options',
        options: [
          { name: 'Descending', value: 'DESC' },
          { name: 'Ascending', value: 'ASC' },
        ],
        default: 'DESC',
        displayOptions: { show: { resource: ['video'], operation: ['getMany'] } },
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['video'], operation: ['getMany'] } },
      },

      // ── Video query ───────────────────────────────────────────────────────
      {
        displayName: 'Query Body',
        name: 'queryBody',
        type: 'json',
        default: '{}',
        description: 'JSON filter expression for the query endpoint',
        displayOptions: { show: { resource: ['video'], operation: ['query'] } },
      },
      {
        displayName: 'Page Size',
        name: 'pageSize',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 500 },
        default: 25,
        displayOptions: { show: { resource: ['video'], operation: ['query'] } },
      },
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        default: '',
        description: 'Pagination cursor from a previous response',
        displayOptions: { show: { resource: ['video'], operation: ['query'] } },
      },

      // ── Video getCount ────────────────────────────────────────────────────
      {
        displayName: 'Include Example Videos',
        name: 'includeExampleVideos',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['video'], operation: ['getCount'] } },
      },

      // ── Video clip ────────────────────────────────────────────────────────
      {
        displayName: 'Broadcast ID',
        name: 'broadcastId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['video'], operation: ['clip'] } },
      },
      {
        displayName: 'Start (Seconds)',
        name: 'clipStart',
        type: 'number',
        required: true,
        default: 0,
        displayOptions: { show: { resource: ['video'], operation: ['clip'] } },
      },
      {
        displayName: 'End (Seconds)',
        name: 'clipEnd',
        type: 'number',
        required: true,
        default: 60,
        displayOptions: { show: { resource: ['video'], operation: ['clip'] } },
      },
      {
        displayName: 'Import Captions',
        name: 'importCaptions',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['video'], operation: ['clip'] } },
      },

      // ── Video updatePreview ───────────────────────────────────────────────
      {
        displayName: 'File ID',
        name: 'fileId',
        type: 'string',
        required: true,
        default: '',
        description: 'ID of an uploaded image to use as the video preview',
        displayOptions: { show: { resource: ['video'], operation: ['updatePreview'] } },
      },

      // ── MediaAsset create ─────────────────────────────────────────────────
      {
        displayName: 'Video ID (Reference)',
        name: 'refVideoId',
        type: 'string',
        required: true,
        default: '',
        description: 'The video this media asset belongs to',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['create'] } },
      },
      {
        displayName: 'Asset Type',
        name: 'mediaType',
        type: 'options',
        options: [
          { name: 'Image', value: 'image' },
          { name: 'Video', value: 'video' },
        ],
        default: 'image',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['create'] } },
      },

      // ── MediaAsset update / uploadStatus ──────────────────────────────────
      {
        displayName: 'Vendor Upload ID',
        name: 'vendorUploadId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['update', 'updateUploadStatus'] } },
      },

      // ── MediaAsset updateUploadStatus ─────────────────────────────────────
      {
        displayName: 'Upload State',
        name: 'uploadState',
        type: 'options',
        options: [
          { name: 'Completed', value: 'completed' },
          { name: 'Created', value: 'created' },
          { name: 'Processing', value: 'processing' },
          { name: 'Uploading', value: 'uploading' },
          { name: 'Waiting', value: 'waiting' },
        ],
        default: 'completed',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['updateUploadStatus'] } },
      },

      // ── MediaAsset / VideoPlaylist pagination ─────────────────────────────
      {
        displayName: 'Page Size',
        name: 'pageSize',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['mediaAsset', 'videoPlaylist'], operation: ['getMany'] } },
      },
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        default: '',
        description: 'Pagination cursor from a previous response',
        displayOptions: { show: { resource: ['mediaAsset', 'videoPlaylist'], operation: ['getMany'] } },
      },

      // ── MediaAsset createCaption ──────────────────────────────────────────
      {
        displayName: 'Language Code',
        name: 'captionLanguageCode',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'en',
        description: 'BCP-47 language code. Triggers AI transcription for this language.',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['createCaption'] } },
      },
      {
        displayName: 'Source Language Code',
        name: 'sourceLanguageCode',
        type: 'string',
        default: '',
        placeholder: 'sv',
        description: 'When set, translates from this language instead of transcribing from audio',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['createCaption'] } },
      },

      // ── MediaAsset updateCaption / deleteCaption ──────────────────────────
      {
        displayName: 'Language Code',
        name: 'languageCode',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'en',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['updateCaption', 'deleteCaption'] } },
      },
      {
        displayName: 'Caption Body',
        name: 'captionBody',
        type: 'json',
        default: '{"title":"","editAccessibility":[]}',
        description: 'Caption data with optional title and array of {startTime, endTime, content} segments',
        displayOptions: { show: { resource: ['mediaAsset'], operation: ['updateCaption'] } },
      },

      // ── VideoPlaylist create / update ─────────────────────────────────────
      {
        displayName: 'Title',
        name: 'playlistTitle',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['videoPlaylist'], operation: ['create', 'update'] } },
      },
      {
        displayName: 'Description',
        name: 'playlistDescription',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['videoPlaylist'], operation: ['create', 'update'] } },
      },
      {
        displayName: 'Published',
        name: 'published',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['videoPlaylist'], operation: ['create', 'update'] } },
      },
      {
        displayName: 'Video Order',
        name: 'videoOrder',
        type: 'json',
        default: '[]',
        description: 'Ordered array of video IDs',
        displayOptions: { show: { resource: ['videoPlaylist'], operation: ['create', 'update'] } },
      },
    ],
		usableAsTool: true,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const credentials = await this.getCredentials('bambuserApi');
    const origin = resolveOrigin(credentials.baseUrl as string, credentials.region as string);
    const handlers = buildOperationHandlers(this, `${origin}/v1/vod`);

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
        );

        return { json: responseData as IDataObject };
      }),
    );

    return [results];
  }
}
