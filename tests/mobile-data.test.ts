import assert from 'node:assert/strict';
import test from 'node:test';

import { offlineSampleHome } from '@/data/sample-home';
import { parseHomeSnapshot } from '@/domain/home';
import { loadHomeSnapshot } from '@/services/backend-api';

test('validates the Home payload at the mobile boundary', () => {
  assert.deepEqual(parseHomeSnapshot(offlineSampleHome), offlineSampleHome);
  assert.throws(
    () => parseHomeSnapshot({ ...offlineSampleHome, source: 'unknown' }),
    /unsupported home snapshot metadata/,
  );
});

test('Sample Mode stays offline', async () => {
  let networkCalled = false;
  const result = await loadHomeSnapshot({
    environment: { dataMode: 'sample' },
    fetchImpl: async () => {
      networkCalled = true;
      throw new Error('Sample Mode must not call the network');
    },
  });

  assert.equal(networkCalled, false);
  assert.equal(result.transport, 'offline');
  assert.equal(result.snapshot.source, 'sample_data');
});

test('AWS dev mode validates a successful backend response', async () => {
  const result = await loadHomeSnapshot({
    environment: { dataMode: 'aws_dev', apiBaseUrl: 'https://example.test' },
    fetchImpl: async () =>
      new Response(JSON.stringify(offlineSampleHome), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(result.transport, 'aws');
  assert.equal(result.snapshot.portfolio.dailyActiveUsers, 12840);
});
