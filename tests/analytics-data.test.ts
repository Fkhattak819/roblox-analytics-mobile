import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAnalyticsSnapshot, type AnalyticsSnapshot } from '@/domain/analytics';
import {
  AnalyticsApiError,
  loadAnalyticsSnapshot,
  requestAnalyticsSync,
} from '@/services/analytics-api';

const sampleSnapshot: AnalyticsSnapshot = {
  mode: 'sample',
  source: 'sample_data',
  freshness: 'fixture',
  universeId: '10009166512',
  section: 'overview',
  range: '28D',
  metrics: [{ id: 'dau', label: 'Daily active users', displayValue: '287', rawValue: 287 }],
  charts: [],
  breakdowns: [],
  message: 'Sample fixture',
};

const connectedSnapshot: AnalyticsSnapshot = {
  ...sampleSnapshot,
  mode: 'connected',
  source: 'roblox_open_cloud',
  freshness: 'fresh',
  asOf: '2026-09-02T20:00:00Z',
  message: 'Official Roblox analytics · updated Sep 2',
};

test('analytics snapshot parser enforces source and freshness truth', () => {
  assert.deepEqual(parseAnalyticsSnapshot(sampleSnapshot), sampleSnapshot);
  assert.deepEqual(parseAnalyticsSnapshot(connectedSnapshot), connectedSnapshot);
  assert.throws(
    () => parseAnalyticsSnapshot({ ...connectedSnapshot, asOf: undefined }),
    /connected data requires asOf/,
  );
  assert.throws(
    () => parseAnalyticsSnapshot({ ...sampleSnapshot, source: 'roblox_open_cloud' }),
    /sample data must be labeled as a fixture/,
  );
});

test('analytics Sample Mode stays offline', async () => {
  let networkCalled = false;
  const result = await loadAnalyticsSnapshot({
    universeId: sampleSnapshot.universeId,
    section: sampleSnapshot.section,
    range: sampleSnapshot.range,
    sampleSnapshot,
    environment: { dataMode: 'sample' },
    fetchImpl: async () => {
      networkCalled = true;
      throw new Error('Sample Mode must stay offline');
    },
  });

  assert.equal(networkCalled, false);
  assert.equal(result.transport, 'offline');
  assert.equal(result.snapshot.source, 'sample_data');
});

test('connected analytics uses the authenticated cached snapshot route', async () => {
  let requestedUrl = '';
  let authorization = '';
  const result = await loadAnalyticsSnapshot({
    universeId: connectedSnapshot.universeId,
    section: connectedSnapshot.section,
    range: connectedSnapshot.range,
    sampleSnapshot,
    sessionToken: 'a'.repeat(32),
    environment: { dataMode: 'aws_dev', apiBaseUrl: 'https://example.test/' },
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify(connectedSnapshot), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(requestedUrl, 'https://example.test/v1/analytics/overview?universeId=10009166512&range=28D');
  assert.equal(authorization, `Bearer ${'a'.repeat(32)}`);
  assert.equal(result.transport, 'aws');
  assert.equal(result.snapshot.source, 'roblox_open_cloud');
});

test('connected analytics never falls back to sample data after a backend error', async () => {
  await assert.rejects(
    () => loadAnalyticsSnapshot({
      universeId: sampleSnapshot.universeId,
      section: sampleSnapshot.section,
      range: sampleSnapshot.range,
      sampleSnapshot,
      sessionToken: 'a'.repeat(32),
      environment: { dataMode: 'aws_dev', apiBaseUrl: 'https://example.test' },
      fetchImpl: async () => new Response(JSON.stringify({
        error: 'analytics_snapshot_not_found',
        message: 'Official analytics have not been synchronized yet.',
      }), { status: 404, headers: { 'content-type': 'application/json' } }),
    }),
    (error: unknown) => error instanceof AnalyticsApiError
      && error.status === 404
      && error.code === 'analytics_snapshot_not_found',
  );
});

test('analytics sync request is authenticated and contains no tenant or credential', async () => {
  let requestedBody = '';
  let authorization = '';
  const result = await requestAnalyticsSync({
    universeId: '10009166512',
    section: 'overview',
    range: '28D',
    sessionToken: 'z'.repeat(32),
    environment: { dataMode: 'aws_dev', apiBaseUrl: 'https://example.test/' },
    fetchImpl: async (_input, init) => {
      requestedBody = String(init?.body);
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify({
        status: 'queued',
        jobId: 'job-1',
        retryAfterSeconds: 60,
      }), { status: 202, headers: { 'content-type': 'application/json' } });
    },
  });

  assert.equal(result.status, 'queued');
  assert.equal(authorization, `Bearer ${'z'.repeat(32)}`);
  assert.deepEqual(JSON.parse(requestedBody), {
    universeId: '10009166512',
    section: 'overview',
    range: '28D',
  });
  assert.doesNotMatch(requestedBody, /ownerSub|apiKey|secret/i);
});
