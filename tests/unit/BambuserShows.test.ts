/* eslint-disable */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { BambuserShows } from '../../nodes/BambuserShows/BambuserShows.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { startMockServer } from '../helpers/mockServer';

const showGetManyFixture = JSON.parse(
  readFileSync(new URL('../fixtures/show.getMany.json', import.meta.url), 'utf8'),
);

describe('BambuserShows', () => {
  let server: Awaited<ReturnType<typeof startMockServer>>;

  beforeEach(async () => {
    server = await startMockServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('show:getMany — sends GET /v1/shows with limit, returns { results } per spec', async () => {
    server.on('GET', '/v1/shows', () => ({ body: showGetManyFixture }));

    const node = new BambuserShows();
    const ctx = buildExecuteContext({
      credential: { apiKey: 'test-key', region: 'eu', baseUrl: server.url },
      parameters: { resource: 'show', operation: 'getMany', limit: 5 },
    });

    const result = await node.execute.call(ctx);
    const json = result[0][0].json as typeof showGetManyFixture;

    assert.deepEqual(json, showGetManyFixture);
    assert.ok(Array.isArray(json.results));
    assert.equal(json.results[0].id, '0WB2n43mpsIV2PX21d3j');

    const req = server.requests[0]!;
    assert.equal(req.path, '/v1/shows');
    assert.equal(req.query.limit, '5');
    assert.equal(req.headers.authorization, 'Token test-key');
  });
});
