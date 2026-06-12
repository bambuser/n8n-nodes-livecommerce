/* eslint-disable */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { BambuserWebhookTrigger } from '../../nodes/BambuserWebhookTrigger/BambuserWebhookTrigger.node';
import { buildHookContext } from '../helpers/hookContext';
import { startMockServer } from '../helpers/mockServer';

const createFixture = JSON.parse(
  readFileSync(new URL('../fixtures/webhook.create.json', import.meta.url), 'utf8'),
);

describe('BambuserWebhookTrigger', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;
  const webhookUrl = 'https://n8n.example.com/webhook/abc';

  beforeEach(async () => {
    server = await startMockServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('create — POSTs name/url/topics to /v1/webhooks, stores id + url in static data', async () => {
    server.on('POST', '/v1/webhooks', () => ({ status: 201, body: createFixture }));

    const node = new BambuserWebhookTrigger();
    const { ctx, staticData } = buildHookContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { topics: ['show'], subscriptionName: 'n8n' },
      webhookUrl,
    });

    const created = await node.webhookMethods.default.create.call(ctx);
    assert.equal(created, true);
    assert.equal(staticData.webhookId, createFixture.id);
    assert.equal(staticData.webhookUrl, webhookUrl);

    const req = server.requests[0]!;
    assert.equal(req.method, 'POST');
    assert.equal(req.path, '/v1/webhooks');
    const body = req.body as { name: string; url: string; topics: string[] };
    assert.equal(body.name, 'n8n');
    assert.equal(body.url, webhookUrl);
    assert.deepEqual(body.topics, ['show']);
  });

  it('create — PUTs to /v1/webhooks/{id} when a webhookId is already stored (URL drifted)', async () => {
    server.on('PUT', '/v1/webhooks/wh_existing', () => ({ status: 200, body: { id: 'wh_existing', url: webhookUrl } }));

    const node = new BambuserWebhookTrigger();
    const { ctx, staticData } = buildHookContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { topics: ['show'], subscriptionName: 'n8n' },
      webhookUrl,
      staticData: { webhookId: 'wh_existing', webhookUrl: 'https://stale-tunnel.example.com/webhook/abc' },
    });

    const created = await node.webhookMethods.default.create.call(ctx);
    assert.equal(created, true);
    assert.equal(staticData.webhookId, 'wh_existing', 'must not overwrite the existing webhookId');
    assert.equal(staticData.webhookUrl, webhookUrl, 'must record the new URL');

    assert.equal(server.requests.length, 1, 'must not also POST');
    const req = server.requests[0]!;
    assert.equal(req.method, 'PUT');
    assert.equal(req.path, '/v1/webhooks/wh_existing');
    const body = req.body as { name: string; url: string; topics: string[] };
    assert.equal(body.url, webhookUrl);
    assert.equal(body.name, 'n8n');
    assert.deepEqual(body.topics, ['show']);
  });

  it('checkExists — returns false when stored url differs from current (triggers re-register)', async () => {
    const node = new BambuserWebhookTrigger();
    const { ctx } = buildHookContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { topics: ['show'], subscriptionName: 'n8n' },
      webhookUrl,
      staticData: { webhookId: 'wh_1', webhookUrl: 'https://stale-tunnel.example.com/webhook/abc' },
    });

    const exists = await node.webhookMethods.default.checkExists.call(ctx);
    assert.equal(exists, false);
  });

  it('delete — DELETEs /v1/webhooks/{id} and clears the stored id', async () => {
    server.on('DELETE', '/v1/webhooks/wh_1', () => ({ status: 204 }));

    const node = new BambuserWebhookTrigger();
    const { ctx, staticData } = buildHookContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: {},
      webhookUrl,
      staticData: { webhookId: 'wh_1', webhookUrl },
    });

    await node.webhookMethods.default.delete.call(ctx);
    assert.equal(staticData.webhookId, undefined, 'should clear webhookId');
    assert.equal(staticData.webhookUrl, undefined, 'should also clear webhookUrl');
    assert.equal(server.requests[0]!.path, '/v1/webhooks/wh_1');
  });
});
