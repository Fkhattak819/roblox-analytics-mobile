import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { processAnalyticsMessage } from '../dist/backend/src/lambda/analytics-worker.js';
import { AnalyticsAccessDenied } from '../dist/backend/src/modules/analytics/authorization.js';
import { loadConfig } from '../dist/backend/src/config.js';

const config = loadConfig({ ANALYTICS_UNIVERSE_IDS: '100,200' });
const message = (ownerSub = '1', universeId = '100') => JSON.stringify({
  version: 1, jobId: randomUUID(), ownerSub, universeId, section: 'engagement', range: '7D', requestedAt: new Date().toISOString(),
});
function setup() {
  const grants = new Set(['1:100', '2:200']);
  const calls = [];
  const deps = {
    authorizer: { requireAccess: async (owner, universe) => { if (!grants.has(`${owner}:${universe}`)) throw new AnalyticsAccessDenied(); } },
    apiKeyProvider: { getApiKey: async () => { calls.push('credential'); return 'synthetic'; } },
    syncService: { sync: async input => { calls.push(`sync:${input.ownerSub}:${input.universeId}`); return { asOf: new Date().toISOString() }; } },
    statusStore: { get: async () => null, put: async () => { calls.push('status'); } },
  };
  return { grants, calls, deps };
}
test('worker rejects forged cross-account jobs before retrieving credentials', async () => {
  for (const [owner, universe] of [['1', '200'], ['2', '100']]) {
    const { deps, calls } = setup();
    await assert.rejects(processAnalyticsMessage(message(owner, universe), config, deps), AnalyticsAccessDenied);
    assert.deepEqual(calls, []);
  }
});
test('revocation during credential lookup prevents the analytics query', async () => {
  const { grants, calls, deps } = setup();
  deps.apiKeyProvider.getApiKey = async () => { grants.clear(); return 'synthetic'; };
  await assert.rejects(processAnalyticsMessage(message(), config, deps), AnalyticsAccessDenied);
  assert.deepEqual(calls, []);
});
test('revocation during synchronization prevents connection status publication', async () => {
  const { grants, calls, deps } = setup();
  deps.syncService.sync = async () => { grants.clear(); return { asOf: new Date().toISOString() }; };
  await assert.rejects(processAnalyticsMessage(message(), config, deps), AnalyticsAccessDenied);
  assert.deepEqual(calls, ['credential']);
});
test('authorized independent workers retain their own account and universe', async () => {
  for (const [owner, universe] of [['1', '100'], ['2', '200']]) {
    const { deps, calls } = setup();
    await processAnalyticsMessage(message(owner, universe), config, deps);
    assert.deepEqual(calls, ['credential', `sync:${owner}:${universe}`, 'status']);
  }
});
