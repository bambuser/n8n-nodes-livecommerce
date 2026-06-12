import type { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export type OperationHandler = (i: number) => Promise<IHttpRequestOptions>;
export type HandlerMap = Record<string, OperationHandler>;
export type HandlerFactory = (ctx: IExecuteFunctions, baseUrl: string) => HandlerMap;
