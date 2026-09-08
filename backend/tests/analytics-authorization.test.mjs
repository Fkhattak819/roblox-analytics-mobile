import test from 'node:test';
import assert from 'node:assert/strict';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { routeRequest } from '../dist/backend/src/router.js';
import { loadConfig } from '../dist/backend/src/config.js';
import { AnalyticsAccessDenied, DynamoAnalyticsAuthorizer } from '../dist/backend/src/modules/analytics/authorization.js';
import { AnalyticsSyncJobService } from '../dist/backend/src/modules/analytics/sync-jobs.js';
import { DynamoDbAnalyticsSnapshotStore } from '../dist/backend/src/modules/analytics/dynamodb-snapshot-store.js';

function access() {
  const grants = new Set(['1:100', '2:200']);
  return { grants, requireAccess: async (owner, universe) => { if (!grants.has(`${owner}:${universe}`)) throw new AnalyticsAccessDenied(); } };
}
test('independent users cannot read or queue each others universes by changing IDs', async () => {
  const authorizer = access();
  let reads = 0; let jobs = 0;
  const deps = { authService: { getSession: async () => ({ user: { sub: '1' } }) },
    analyticsAuthorizer: authorizer,
    analyticsSnapshotStore: { getSnapshot: async key => { reads++; assert.equal(key.ownerSub, '1'); return { universeId: key.universeId }; } },
    analyticsSyncJobService: { request: async () => { jobs++; return { retryAfterSeconds: 60 }; } } };
  for (const universeId of ['200', '999']) {
    assert.equal((await routeRequest({ method: 'GET', path: '/v1/analytics/engagement', query: { universeId, range: '7D' } }, loadConfig({}), 'aws', deps)).statusCode, 403);
    assert.equal((await routeRequest({ method: 'POST', path: '/v1/sync-jobs', body: { universeId, range: '7D', section: 'engagement', ownerSub: '2' } }, loadConfig({}), 'aws', deps)).statusCode, 403);
  }
  assert.equal(reads, 0); assert.equal(jobs, 0);
  assert.equal((await routeRequest({ method: 'GET', path: '/v1/analytics/engagement', query: { universeId: '100', range: '7D' } }, loadConfig({}), 'aws', deps)).statusCode, 200);
  authorizer.grants.clear();
  assert.equal((await routeRequest({ method: 'GET', path: '/v1/analytics/engagement', query: { universeId: '100', range: '7D' } }, loadConfig({}), 'aws', deps)).statusCode, 403);
});

test('revocation while acquiring a sync gate prevents enqueue', async () => {
  const authorizer = access();
  const service = new AnalyticsSyncJobService({ tryAcquire: async () => { authorizer.grants.clear(); return true; } },
    { enqueue: async () => assert.fail('revoked job must not be queued') }, authorizer);
  await assert.rejects(service.request({ ownerSub: '1', universeId: '100', section: 'engagement', range: '7D' }), AnalyticsAccessDenied);
});

test('DynamoDB membership is read consistently and missing or disabled grants deny access', async () => {
  let authorized = false;
  const authorizer = new DynamoAnalyticsAuthorizer({ send: async command => {
    assert.equal(command.input.ConsistentRead, true);
    assert.deepEqual(unmarshall(command.input.Key), { PK: 'AUTH#OAUTH#6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', SK: 'AUTH' });
    return { Item: marshall({ type: 'roblox-oauth-authorization', refreshExpiresAt: Date.now() + 60_000,
      universeIds: authorized ? ['100'] : [] }) };
  } }, 'test');
  await assert.rejects(authorizer.requireAccess('1', '100'), AnalyticsAccessDenied);
  authorized = true;
  await authorizer.requireAccess('1', '100');
});

test('snapshot publication checks the grant in the same transaction as its write', async () => {
  const store = new DynamoDbAnalyticsSnapshotStore({ send: async command => {
    assert.equal(command.constructor.name, 'TransactWriteItemsCommand');
    const [check, write] = command.input.TransactItems;
    assert.deepEqual(unmarshall(check.ConditionCheck.Key), { PK: 'AUTH#OAUTH#6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', SK: 'AUTH' });
    assert.equal(check.ConditionCheck.ConditionExpression, '#type = :type AND refreshExpiresAt > :now AND contains(universeIds, :universe)');
    const values = unmarshall(check.ConditionCheck.ExpressionAttributeValues);
    assert.equal(values[':type'], 'roblox-oauth-authorization');
    assert.equal(values[':universe'], '100');
    assert.ok(values[':now'] <= Date.now());
    assert.equal(unmarshall(write.Put.Item).PK, 'TENANT#1');
    throw Object.assign(new Error('synthetic revoked grant'), { name: 'TransactionCanceledException' });
  } }, 'test');
  const key = { ownerSub: '1', universeId: '100', section: 'engagement', range: '7D' };
  await assert.rejects(store.putSnapshot(key, { mode: 'connected', source: 'roblox_open_cloud', freshness: 'fresh',
    universeId: '100', section: 'engagement', range: '7D', asOf: new Date().toISOString(), metrics: [], charts: [], breakdowns: [], message: 'synthetic' }),
    { name: 'TransactionCanceledException' });
});

test('connections metadata requires membership and does not return after revocation', async () => {
  const authorizer = access();
  const request = { method: 'GET', path: '/v1/connections', query: { universeId: '200' } };
  let reads = 0;
  const deps = { authService: { getSession: async () => ({ user: { sub: '1' } }) }, analyticsAuthorizer: authorizer,
    analyticsConnectionStatusStore: { get: async () => { reads++; authorizer.grants.clear(); return { status: 'active' }; } } };
  assert.equal((await routeRequest(request, loadConfig({}), 'aws', deps)).statusCode, 403);
  assert.equal(reads, 0);
  request.query.universeId = '100';
  assert.equal((await routeRequest(request, loadConfig({}), 'aws', deps)).statusCode, 403);
  assert.equal(reads, 1);
});
