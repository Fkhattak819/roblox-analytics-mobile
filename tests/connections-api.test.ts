import assert from 'node:assert/strict';
import test from 'node:test';

import { loadConnectionStatus } from '@/services/connections-api';

test('connection status uses the app session and parses safe backend metadata', async () => {
  let authorization = '';
  const result = await loadConnectionStatus({
    universeId: '10009166512',
    sessionToken: 'x'.repeat(32),
    environment: { dataMode: 'aws_dev', apiBaseUrl: 'https://example.test/' },
    fetchImpl: async (_input, init) => {
      authorization = new Headers(init?.headers).get('authorization') ?? '';
      return new Response(JSON.stringify({
        identity: { status: 'connected', username: 'creator_name' },
        analytics: {
          status: 'active',
          scope: 'universe.analytics:read',
          universeId: '10009166512',
          lastSyncedAt: '2026-09-02T20:00:00Z',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  assert.equal(authorization, `Bearer ${'x'.repeat(32)}`);
  assert.equal(result.analytics.status, 'active');
  assert.equal(result.identity.username, 'creator_name');
});
