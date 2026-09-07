import test from 'node:test';
import assert from 'node:assert/strict';
import { RobloxAnalyticsQueryClient } from '../dist/backend/src/modules/analytics/roblox-analytics-query.js';

const query = { metric: 'DailyActiveUsers', granularity: 'OneDay', startTime: '2026-09-01T00:00:00Z', endTime: '2026-09-02T00:00:00Z' };
const run = client => client.queryMetric('synthetic-fixture-only', '100', query);
const stalled = () => new Promise(() => {});

test('deadline bounds stalled headers and body, aborting the transport', async () => {
  for (const stage of ['headers', 'body']) {
    let signal;
    const client = new RobloxAnalyticsQueryClient({ timeoutMs: 20, fetchImpl: async (_url, init) => {
      signal = init.signal;
      assert.equal(init.redirect, 'error');
      return stage === 'headers' ? stalled() : { ok: true, status: 200, json: stalled };
    } });
    await assert.rejects(run(client), error => error.status === 504 && error.retryable === false);
    assert.equal(signal.aborted, true);
  }
});

test('poll delay shares the request deadline and cannot issue a later request', async () => {
  let calls = 0;
  const client = new RobloxAnalyticsQueryClient({ timeoutMs: 20, sleep: stalled, fetchImpl: async () => {
    calls++;
    return { ok: true, status: 202, json: async () => ({ done: false, path: 'v1/universes/100/operations/metrics/abc' }) };
  } });
  await assert.rejects(run(client), /deadline exceeded/);
  assert.equal(calls, 1);
});

test('operation paths reject encoding, query strings and other universes before polling', async () => {
  for (const path of ['v1/universes/200/operations/metrics/abc', 'v1/universes/100/operations/metrics/%2e%2e', 'v1/universes/100/operations/metrics/abc?target=other']) {
    let calls = 0;
    const client = new RobloxAnalyticsQueryClient({ fetchImpl: async () => {
      calls++;
      return { ok: true, json: async () => ({ done: false, path }) };
    } });
    await assert.rejects(run(client), /unexpected operation path/);
    assert.equal(calls, 1);
  }
});

test('upstream error text is excluded from thrown diagnostics', async () => {
  const client = new RobloxAnalyticsQueryClient({ fetchImpl: async () => ({ ok: true,
    json: async () => ({ done: true, error: { message: 'synthetic-private-upstream-detail' } }),
  }) });
  await assert.rejects(run(client), error => error.message === 'Roblox analytics operation failed');
});
