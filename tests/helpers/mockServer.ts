/* eslint-disable */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export type RouteHandler = (req: RecordedRequest) => {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
};

interface MockServerHandle {
  url: string;
  on: (method: string, path: string, handler: RouteHandler) => void;
  requests: ReadonlyArray<RecordedRequest>;
  close: () => Promise<void>;
}

const parseBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });

export const startMockServer = async (): Promise<MockServerHandle> => {
  const routes = new Map<string, RouteHandler>();
  const requests: RecordedRequest[] = [];

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const query: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const recorded: RecordedRequest = {
      method: req.method ?? 'GET',
      path: url.pathname,
      query,
      headers: req.headers,
      body: await parseBody(req),
    };
    requests.push(recorded);

    const route = routes.get(`${recorded.method} ${recorded.path}`);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no route registered', method: recorded.method, path: recorded.path }));
      return;
    }

    const result = route(recorded);
    res.writeHead(result.status ?? 200, {
      'Content-Type': 'application/json',
      ...(result.headers ?? {}),
    });
    res.end(result.body === undefined ? '' : JSON.stringify(result.body));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    on: (method, path, handler) => routes.set(`${method.toUpperCase()} ${path}`, handler),
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
};