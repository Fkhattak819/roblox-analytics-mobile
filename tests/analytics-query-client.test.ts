import assert from 'node:assert/strict';
import test from 'node:test';

import { RobloxAnalyticsQueryClient, RobloxAnalyticsQueryError } from '../backend/src/modules/analytics/roblox-analytics-query';

test('analytics query client sends a server-side metric query without leaking credentials in the URL', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = new RobloxAnalyticsQueryClient({
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({
        path: 'v1/universes/10009166512/operations/metrics/op-1',
        done: true,
        response: { values: [{ breakdowns: [], dataPoints: [{ time: '2026-09-01T00:00:00Z', value: 287 }] }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch,
  });

  const result = await client.queryMetric('server-only-key', '10009166512', {
    metric: 'DailyActiveUsers',
    granularity: 'OneDay',
    startTime: '2026-08-26T00:00:00Z',
    endTime: '2026-09-02T00:00:00Z',
  });

  assert.equal(result.values[0].dataPoints[0].value, 287);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://apis.roblox.com/analytics-query-api/v1/universes/10009166512/metrics');
  assert.equal(new Headers(calls[0].init?.headers).get('x-api-key'), 'server-only-key');
  assert.equal(calls[0].url.includes('server-only-key'), false);
});

test('analytics query client polls a validated long-running operation path', async () => {
  let call = 0;
  const client = new RobloxAnalyticsQueryClient({
    maxPolls: 2,
    sleep: async () => undefined,
    fetchImpl: (async () => {
      call += 1;
      return new Response(JSON.stringify(call === 1
        ? { path: 'v1/universes/10009166512/operations/metrics/op-2', done: false }
        : { path: 'v1/universes/10009166512/operations/metrics/op-2', done: true, response: { values: [] } }), {
        status: call === 1 ? 202 : 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
  });

  const result = await client.queryMetric('server-only-key', '10009166512', {
    metric: 'ForwardD1Retention',
    granularity: 'OneDay',
    startTime: '2026-08-26T00:00:00Z',
    endTime: '2026-09-02T00:00:00Z',
  });
  assert.deepEqual(result.values, []);
  assert.equal(call, 2);
});

test('analytics query client preserves documented dimension discovery options', async () => {
  let capturedBody: unknown;
  const client = new RobloxAnalyticsQueryClient({
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        path: 'v1/universes/10009166512/operations/dimension-values/op-3',
        done: true,
        response: { values: [{ dimension: 'Country', values: [{ value: 'US' }] }] },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch,
  });

  const result = await client.queryDimensionValues('server-only-key', '10009166512', {
    metric: 'DailyActiveUsers',
    dimensions: ['Country'],
    startTime: '2026-08-26T00:00:00Z',
    endTime: '2026-09-02T00:00:00Z',
    granularity: 'None',
    limit: 10,
    filter: [
      { dimension: 'Platform', values: ['Phone', 'Tablet'], operation: 'In' },
      { dimension: 'AccountAge', values: [30], operation: 'GreaterThanOrEqual' },
    ],
  });

  assert.equal(result.values[0].values[0].value, 'US');
  assert.deepEqual(capturedBody, {
    metric: 'DailyActiveUsers',
    dimensions: ['Country'],
    startTime: '2026-08-26T00:00:00Z',
    endTime: '2026-09-02T00:00:00Z',
    granularity: 'None',
    limit: 10,
    filter: [
      { dimension: 'Platform', values: ['Phone', 'Tablet'], operation: 'In' },
      { dimension: 'AccountAge', values: [30], operation: 'GreaterThanOrEqual' },
    ],
  });
});

test('analytics query client marks Roblox throttling as retryable', async () => {
  const client = new RobloxAnalyticsQueryClient({
    fetchImpl: (async () => new Response('{}', { status: 429 })) as typeof fetch,
  });

  await assert.rejects(
    () => client.queryMetric('server-only-key', '10009166512', {
      metric: 'DailyActiveUsers',
      granularity: 'OneDay',
      startTime: '2026-08-26T00:00:00Z',
      endTime: '2026-09-02T00:00:00Z',
    }),
    (error: unknown) => error instanceof RobloxAnalyticsQueryError && error.status === 429 && error.retryable,
  );
});
