/* eslint-disable */
import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  INode,
  INodeExecutionData,
  IRequestOptions,
} from 'n8n-workflow';

export interface BambuserCredentialData extends IDataObject {
  apiKey: string;
  region: string;
  baseUrl: string;
}

export interface ExecuteHarnessOptions {
  credential: BambuserCredentialData;
  parameters: Record<string, unknown>;
  inputItems?: INodeExecutionData[];
}

const evaluateRequest = async (
  options: IHttpRequestOptions | IRequestOptions,
  credential: BambuserCredentialData,
): Promise<unknown> => {
  const opts = options as IHttpRequestOptions;
  const url = new URL(opts.url ?? '');
  if (opts.qs) {
    for (const [key, value] of Object.entries(opts.qs as IDataObject)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Token ${credential.apiKey}`,
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  const response = await fetch(url.toString(), {
    method: (opts.method ?? 'GET') as string,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

  const text = await response.text();
  const parsed = text === '' ? undefined : (() => {
    try { return JSON.parse(text); } catch { return text; }
  })();

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${text}`) as Error & {
      statusCode: number;
      response?: { body?: unknown };
    };
    error.statusCode = response.status;
    error.response = { body: parsed };
    throw error;
  }
  return parsed;
};

export const buildExecuteContext = (opts: ExecuteHarnessOptions): IExecuteFunctions => {
  const node: INode = {
    id: 'test-node',
    name: 'Bambuser Test',
    type: 'bambuser-test',
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  };

  const inputItems = opts.inputItems ?? [{ json: {} }];

  return {
    getInputData: () => inputItems,
    getCredentials: async () => opts.credential,
    getNodeParameter: (name: string, _i: number, fallback?: unknown) => {
      if (name in opts.parameters) return opts.parameters[name];
      return fallback;
    },
    getNode: () => node,
    helpers: {
      httpRequestWithAuthentication: {
        call: (_ctx: unknown, _credName: string, requestOptions: IHttpRequestOptions) =>
          evaluateRequest(requestOptions, opts.credential),
      },
      httpRequest: async (requestOptions: IHttpRequestOptions) =>
        evaluateRequest(requestOptions, opts.credential),
    },
  } as unknown as IExecuteFunctions;
};