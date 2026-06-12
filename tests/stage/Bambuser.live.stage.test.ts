/* eslint-disable */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { Bambuser } from '../../nodes/Bambuser/Bambuser.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { skipIfNoStageKey, stageCredential } from '../helpers/stage';

describe('Bambuser — live resources (stage)', { skip: skipIfNoStageKey() }, () => {
  it('liveShow:getMany — fixture org responds with a data array', async () => {
    const node = new Bambuser();
    const ctx = buildExecuteContext({
      credential: stageCredential(),
      parameters: { resource: 'liveShow', operation: 'getMany', limit: 5 },
    });

    const result = await node.execute.call(ctx);

    assert.equal(result.length, 1);
    const json = result[0][0].json as { results?: unknown[] };
    assert.ok(Array.isArray(json.results), 'expected response.results to be an array');
  });
});
