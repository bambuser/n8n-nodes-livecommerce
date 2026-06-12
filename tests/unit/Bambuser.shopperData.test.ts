/* eslint-disable */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { Bambuser } from '../../nodes/Bambuser/Bambuser.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { startMockServer } from '../helpers/mockServer';

const getManyFixture = JSON.parse(
  readFileSync(new URL('../fixtures/shopperData.getMany.json', import.meta.url), 'utf8'),
);

describe('Bambuser — shopperData resource', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeEach(async () => {
    server = await startMockServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('shopperData:getMany — passes limit/after through and returns the spec response shape', async () => {
    server.on('GET', '/v1/shopper-data', () => ({ body: getManyFixture }));

    const node = new Bambuser();
    const ctx = buildExecuteContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { resource: 'shopperData', operation: 'getMany', limit: 25, after: '' },
    });

    const result = await node.execute.call(ctx);

    assert.equal(result[0].length, 1);
    const json = result[0][0].json as typeof getManyFixture;
    assert.deepEqual(json, getManyFixture, 'node should pass the API response through unchanged');
    assert.equal(json.data[0].id, '123');
    assert.equal(json.pagination.pageSize, 25);

    assert.equal(server.requests.length, 1);
    const req = server.requests[0]!;
    assert.equal(req.method, 'GET');
    assert.equal(req.path, '/v1/shopper-data');
    assert.equal(req.query.limit, '25');
    assert.equal(req.headers.authorization, 'Token test-key');
  });

  it('shopperData:delete — sends DELETE to /v1/shopper-data/{id}, 204 No Content', async () => {
    server.on('DELETE', '/v1/shopper-data/rec_abc', () => ({ status: 204 }));

    const node = new Bambuser();
    const ctx = buildExecuteContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { resource: 'shopperData', operation: 'delete', recordId: 'rec_abc' },
    });

    await node.execute.call(ctx);

    assert.equal(server.requests.length, 1);
    const req = server.requests[0]!;
    assert.equal(req.method, 'DELETE');
    assert.equal(req.path, '/v1/shopper-data/rec_abc');
  });
});
