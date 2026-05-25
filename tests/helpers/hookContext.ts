import type { IHookFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { type BambuserCredentialData } from './executeContext';

export interface HookHarnessOptions {
  credential: BambuserCredentialData;
  parameters: Record<string, unknown>;
  webhookUrl: string;
  staticData?: Record<string, unknown>;
}

const evaluateRequest = async (
  options: IHttpRequestOptions,
  credential: BambuserCredentialData,
): Promise<unknown> => {
  const url = new URL(options.url ?? '');
  if (options.qs) {
    for (const [key, value] of Object.entries(options.qs as Record<string, unknown>)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: (options.method ?? 'GET') as string,
    headers: {
      Authorization: `Token ${credential.apiKey}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const parsed = text === '' ? undefined : (() => {
    try { return JSON.parse(text); } catch { return text; }
  })();

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${text}`) as Error & { statusCode: number };
    error.statusCode = response.status;
    throw error;
  }
  return parsed;
};

export interface HookHarness {
  ctx: IHookFunctions;
  staticData: Record<string, unknown>;
}

export const buildHookContext = (opts: HookHarnessOptions): HookHarness => {
  const staticData: Record<string, unknown> = { ...(opts.staticData ?? {}) };

  const ctx = {
    getWorkflowStaticData: () => staticData,
    getNodeWebhookUrl: () => opts.webhookUrl,
    getNodeParameter: (name: string, fallback?: unknown) =>
      name in opts.parameters ? opts.parameters[name] : fallback,
    getCredentials: async () => opts.credential,
    helpers: {
      httpRequestWithAuthentication: {
        call: (_ctx: unknown, _credName: string, requestOptions: IHttpRequestOptions) =>
          evaluateRequest(requestOptions, opts.credential),
      },
    },
  } as unknown as IHookFunctions;

  return { ctx, staticData };
};
