/* eslint-disable */
import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { BambuserShopperData } from '../../nodes/BambuserShopperData/BambuserShopperData.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { startMockServer } from '../helpers/mockServer';

describe('BambuserShopperData', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeEach(async () => {
    server = await startMockServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('shopperData:getMany — sends limit and after, returns the data array', async () => {
    server.on('GET', '/v1/shopper-data', () => ({
      body: { data: [{ id: 'rec_1', shopperId: 's1' }, { id: 'rec_2', shopperId: 's2' }] },
    }));

    const node = new BambuserShopperData();
    const ctx = buildExecuteContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { resource: 'shopperData', operation: 'getMany', limit: 25, after: '' },
    });

    const result = await node.execute.call(ctx);

    assert.equal(result[0].length, 1);
    const json = result[0][0].json as { data: Array<{ id: string }> };
    assert.deepEqual(json.data.map((r) => r.id), ['rec_1', 'rec_2']);

    assert.equal(server.requests.length, 1);
    const req = server.requests[0]!;
    assert.equal(req.method, 'GET');
    assert.equal(req.path, '/v1/shopper-data');
    assert.equal(req.query.limit, '25');
    assert.equal(req.headers.authorization, 'Token test-key');
  });

  it('shopperData:delete — sends DELETE with the record ID in the path', async () => {
    server.on('DELETE', '/v1/shopper-data/rec_abc', () => ({ status: 204 }));

    const node = new BambuserShopperData();
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