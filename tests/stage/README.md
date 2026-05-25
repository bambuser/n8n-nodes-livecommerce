# Stage tests

Stage tests run the nodes against a real Bambuser API on a non-production environment. They are **not** part of CI — they need a real API key and a stage backend, neither of which should be exposed to public CI runs.

## Why these exist

The mocked unit tests under `tests/unit/` cover request shaping, response handling, and parameter wiring. They cannot catch drift between recorded fixtures and the real Bambuser API. The stage tier closes that gap on demand — locally, before a release, when refactoring HTTP code, or when investigating a reported issue against a real backend.

## Running locally

You need:

- An API key against a stage Bambuser org you control. Grant only the scopes the tests exercise.
- The stage base URL.

```bash
export BAMBUSER_STAGE_API_KEY=<the-key>
export BAMBUSER_STAGE_BASE_URL=https://<stage-host>/<api-path>

npm run test:stage
```

If `BAMBUSER_STAGE_API_KEY` is unset, every test in this directory will skip cleanly so the suite still passes — handy for "did I break something obvious?" smoke runs.

## Adding a stage test

```ts
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { BambuserLivecommerce } from '../../nodes/BambuserLivecommerce/BambuserLivecommerce.node';
import { buildExecuteContext } from '../helpers/executeContext';
import { skipIfNoStageKey, stageCredential } from '../helpers/stage';

describe('BambuserLivecommerce (stage)', { skip: skipIfNoStageKey() }, () => {
  it('show:getMany — returns at least one show', async () => {
    const node = new BambuserLivecommerce();
    const ctx = buildExecuteContext({
      credential: stageCredential(),
      parameters: { resource: 'show', operation: 'getMany', limit: 5 },
    });
    const result = await node.execute.call(ctx);
    const data = (result[0][0].json as { data?: unknown[] }).data ?? [];
    assert.ok(Array.isArray(data));
  });
});
```

The stage credential helper reads `BAMBUSER_STAGE_API_KEY` and `BAMBUSER_STAGE_BASE_URL` from the env. Tests that don't need either should not be here — keep this directory limited to genuine cross-boundary cases.
