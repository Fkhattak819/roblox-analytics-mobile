import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkBudget, WorkDeadlineExceeded, budgetClient } from '../dist/backend/src/modules/analytics/work-budget.js';
import { handler } from '../dist/backend/src/lambda/analytics-worker.js';
import { RobloxAnalyticsQueryClient } from '../dist/backend/src/modules/analytics/roblox-analytics-query.js';

test('stalled SDK resolution expires and later writes cannot start', async () => {
  const budget = new WorkBudget(20);
  let calls = 0;
  let signal;
  const client = budgetClient({ send: async (_command, options) => {
    calls++; signal = options.abortSignal;
    return new Promise(() => {});
  } }, budget);
  try {
    await assert.rejects(client.send({}), WorkDeadlineExceeded);
    await assert.rejects(client.send({ write: true }), WorkDeadlineExceeded);
    assert.equal(calls, 1);
    assert.equal(signal.aborted, true);
  } finally { budget.close(); }
});

test('one invocation deadline cancels parallel upstream queries', async () => {
  const budget = new WorkBudget(20);
  const signals = [];
  const client = new RobloxAnalyticsQueryClient({ signal: budget.signal, fetchImpl: async (_url, init) => {
    signals.push(init.signal);
    return new Promise(() => {});
  } });
  const query = { metric: 'DailyActiveUsers', granularity: 'OneDay', startTime: '2026-09-01', endTime: '2026-09-02' };
  try {
    const results = await Promise.allSettled([1, 2].map(() => client.queryMetric('synthetic-only-fixture', '100', query)));
    assert.ok(results.every(result => result.status === 'rejected'));
    assert.equal(signals.length, 2);
    assert.ok(signals.every(signal => signal.aborted));
  } finally { budget.close(); }
});

test('insufficient Lambda time fails every record without starting work', async () => {
  const result = await handler({ Records: [{ messageId: 'a', body: '{}' }, { messageId: 'b', body: '{}' }] }, {
    getRemainingTimeInMillis: () => 1000,
  });
  assert.deepEqual(result, { batchItemFailures: [{ itemIdentifier: 'a' }, { itemIdentifier: 'b' }] });
});
