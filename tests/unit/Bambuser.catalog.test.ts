/* eslint-disable */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Bambuser } from '../../nodes/Bambuser/Bambuser.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { startMockServer } from '../helpers/mockServer';

describe('Bambuser — catalogProduct resource', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeEach(async () => {
    server = await startMockServer();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('feedId path scoping for create/get/update/delete', () => {
    it('catalogProduct:create — no feedId routes through /products', async () => {
      server.on('POST', '/v1/product-catalog/products', () => ({ status: 201, body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: {
          resource: 'catalogProduct',
          operation: 'create',
          feedId: '',
          productBody: '{"title":"X","link":"https://e.x","image_link":"https://e.x/i.png","id":"p1"}',
        },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'POST');
      assert.equal(req.path, '/v1/product-catalog/products');
    });

    it('catalogProduct:create — with feedId routes through /feeds/{feedId}/products', async () => {
      server.on('POST', '/v1/product-catalog/feeds/feed_abc/products', () => ({ status: 201, body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: {
          resource: 'catalogProduct',
          operation: 'create',
          feedId: 'feed_abc',
          productBody: '{"title":"X","link":"https://e.x","image_link":"https://e.x/i.png","id":"p1"}',
        },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'POST');
      assert.equal(req.path, '/v1/product-catalog/feeds/feed_abc/products');
    });

    it('catalogProduct:get — no feedId routes through /products/{productId}', async () => {
      server.on('GET', '/v1/product-catalog/products/p1', () => ({ body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: { resource: 'catalogProduct', operation: 'get', productId: 'p1', feedId: '' },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'GET');
      assert.equal(req.path, '/v1/product-catalog/products/p1');
    });

    it('catalogProduct:get — with feedId routes through /feeds/{feedId}/products/{productId}', async () => {
      server.on('GET', '/v1/product-catalog/feeds/feed_abc/products/p1', () => ({ body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: { resource: 'catalogProduct', operation: 'get', productId: 'p1', feedId: 'feed_abc' },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'GET');
      assert.equal(req.path, '/v1/product-catalog/feeds/feed_abc/products/p1');
    });

    it('catalogProduct:update — with feedId routes PATCH through the feed-scoped path', async () => {
      server.on('PATCH', '/v1/product-catalog/feeds/feed_abc/products/p1', () => ({ body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: {
          resource: 'catalogProduct',
          operation: 'update',
          productId: 'p1',
          feedId: 'feed_abc',
          productBody: '{"title":"Updated"}',
        },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'PATCH');
      assert.equal(req.path, '/v1/product-catalog/feeds/feed_abc/products/p1');
    });

    it('catalogProduct:delete — with feedId routes DELETE through the feed-scoped path', async () => {
      server.on('DELETE', '/v1/product-catalog/feeds/feed_abc/products/p1', () => ({ status: 204 }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: { resource: 'catalogProduct', operation: 'delete', productId: 'p1', feedId: 'feed_abc' },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.method, 'DELETE');
      assert.equal(req.path, '/v1/product-catalog/feeds/feed_abc/products/p1');
    });

    it('encodes special characters in feedId so they survive the path', async () => {
      server.on('GET', '/v1/product-catalog/feeds/feed%20with%20space/products/p1', () => ({ body: { id: 'p1' } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: { resource: 'catalogProduct', operation: 'get', productId: 'p1', feedId: 'feed with space' },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.path, '/v1/product-catalog/feeds/feed%20with%20space/products/p1');
    });
  });

  describe('feedId query filter for search/count (unchanged)', () => {
    it('catalogProduct:search — passes feedId as a query parameter, not a path segment', async () => {
      server.on('GET', '/v1/product-catalog/products', () => ({ body: { data: [], pagination: {} } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: {
          resource: 'catalogProduct',
          operation: 'search',
          q: '',
          limit: 10,
          page: 1,
          sort: '',
          feedId: 'feed_a,feed_b',
          locale: 'en-US',
          format: 'raw',
          unifyVariantTitles: false,
          groupBySignificantAttributes: false,
        },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.path, '/v1/product-catalog/products');
      assert.equal(req.query.feedId, 'feed_a,feed_b');
    });

    it('catalogProduct:count — passes feedId as a query parameter', async () => {
      server.on('GET', '/v1/product-catalog/products/count', () => ({ body: { total: 0 } }));

      const node = new Bambuser();
      const ctx = buildExecuteContext({
        credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
        parameters: {
          resource: 'catalogProduct',
          operation: 'count',
          q: '',
          feedId: 'feed_a',
          locale: 'en-US',
        },
      });

      await node.execute.call(ctx);

      const req = server.requests[0]!;
      assert.equal(req.path, '/v1/product-catalog/products/count');
      assert.equal(req.query.feedId, 'feed_a');
    });
  });
});
