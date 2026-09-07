import test from 'node:test';
import assert from 'node:assert/strict';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoLoginLimiter } from '../dist/backend/src/modules/auth/login-limiter.js';
import { routeRequest } from '../dist/backend/src/router.js';
import { loadConfig } from '../dist/backend/src/config.js';

test('atomic buckets bound concurrent starts and isolate clients and windows', async () => {
  const counts = new Map();
  let now = 60000;
  const client = { send: async (command, options) => {
    assert.equal(command.constructor.name, 'UpdateItemCommand');
    assert.equal(command.input.ConditionExpression, 'attribute_not_exists(#count) OR #count < :limit');
    assert.equal(command.input.UpdateExpression, 'SET #ttl = :ttl ADD #count :one');
    assert.ok(options.abortSignal);
    const key = unmarshall(command.input.Key);
    const values = unmarshall(command.input.ExpressionAttributeValues);
    assert.equal(key.SK, 'LIMIT');
    assert.ok(values[':ttl'] > now / 1000);
    assert.ok(!key.PK.includes('192.0.2.1'));
    const count = counts.get(key.PK) ?? 0;
    if (count >= values[':limit']) throw Object.assign(new Error(), { name: 'ConditionalCheckFailedException' });
    counts.set(key.PK, count + values[':one']);
    return {};
  } };
  const limiter = new DynamoLoginLimiter(client, 'test', () => now);
  const attempts = await Promise.all(Array.from({ length: 50 }, () => limiter.consume('192.0.2.1', 'start')));
  assert.equal(attempts.filter(result => result.allowed).length, 10);
  assert.equal((await limiter.consume('192.0.2.2', 'start')).allowed, true);
  assert.equal((await limiter.consume('192.0.2.1', 'exchange')).allowed, true);
  now += 60000;
  assert.equal((await limiter.consume('192.0.2.1', 'start')).allowed, true);
});

test('rate limit rejects before OAuth and uses trusted source instead of forwarded headers', async () => {
  const response = await routeRequest({ method: 'GET', path: '/v2/auth/roblox/start',
    headers: { 'x-forwarded-for': 'attacker-selected' } }, loadConfig({}), 'aws', {
    authService: { startRobloxOAuth: () => assert.fail('OAuth must not run') },
    sourceAddress: '192.0.2.1', loginLimiter: { consume: async (source, action) => {
      assert.equal(source, '192.0.2.1'); assert.equal(action, 'start');
      return { allowed: false, retryAfter: 15 };
    } },
  });
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['retry-after'], '15');
});

test('limiter outages fail closed with stable public errors', async () => {
  const response = await routeRequest({ method: 'POST', path: '/v2/auth/session/exchange' }, loadConfig({}), 'aws', {
    loginLimiter: { consume: async () => { throw new Error('synthetic-private-fragment'); } },
  });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { error: 'login_protection_unavailable' });
});

test('invalid client address makes no database request', async () => {
  const limiter = new DynamoLoginLimiter({ send: () => assert.fail('must not write') }, 'test');
  await assert.rejects(limiter.consume('', 'start'));
});

test('security logging uses fixed labels and rejects unrecognized data', async () => {
  const { securityEvent } = await import('../dist/backend/src/modules/auth/security-event.js');
  assert.deepEqual(JSON.parse(securityEvent('GET', '/v2/auth/roblox/start', 503)),
    { event: 'auth_result', action: 'start', status: 503, outcome: 'failure' });
  assert.equal(securityEvent('GET', '/unknown/synthetic-private-fragment', 500), undefined);
  assert.equal(securityEvent('GET', '/v2/auth/roblox/start', 'synthetic-private-fragment'), undefined);
});
