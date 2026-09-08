import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AuthService } from '../dist/backend/src/modules/auth/auth-service.js';
import { InMemoryAuthStore } from '../dist/backend/src/modules/auth/in-memory-auth-store.js';
import { DynamoDbAuthStore } from '../dist/backend/src/modules/auth/dynamodb-auth-store.js';
import { loadConfig } from '../dist/backend/src/config.js';
import { routeRequest } from '../dist/backend/src/router.js';
import { handler } from '../dist/backend/src/lambda/api-handler.js';
import { publicHttpError, RequestBodyTooLargeError } from '../dist/backend/src/http.js';

const verifier = 'v'.repeat(64);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const clientState = 's'.repeat(64);
const code = 'c'.repeat(43);
function setup() {
  const store = new InMemoryAuthStore();
  const config = loadConfig({ ANALYTICS_UNIVERSE_IDS: '10009166512' });
  let upstreamCalls = 0;
  const authService = new AuthService(config, store,
    { getCredentials: async () => ({ clientId: 'test-client', clientSecret: 'synthetic' }) },
    { exchangeCodeForAuthorization: async () => { upstreamCalls++; return {
      user: { sub: '123' }, accessToken: 'access', refreshToken: 'refresh',
      accessExpiresAt: Date.now() + 60_000, refreshExpiresAt: Date.now() + 90 * 86400_000,
      universeIds: ['10009166512'],
    }; }, revokeRefreshToken: async () => undefined });
  return { store, authService, calls: () => upstreamCalls,
    route: (request) => routeRequest(request, config, 'local', { authService }) };
}

test('S256 handoff survives wrong proof, creates one session, and prevents replay', async () => {
  const { authService, route } = setup();
  const start = await authService.startRobloxOAuth({ clientChallenge: challenge, clientState });
  const state = new URL(start.authorizationUrl).searchParams.get('state');
  const callback = new URL(await authService.completeRobloxOAuth({ state, code: 'synthetic-roblox-code' }));
  assert.equal(callback.searchParams.get('state'), clientState);
  const exchangeCode = callback.searchParams.get('code');
  const exchange = (clientVerifier) => route({ method: 'POST', path: '/v2/auth/session/exchange',
    body: { code: exchangeCode, clientVerifier } });
  assert.equal((await exchange(undefined)).statusCode, 400);
  assert.equal((await exchange('x'.repeat(64))).statusCode, 401);
  const outcomes = await Promise.all(Array.from({ length: 20 }, () => exchange(verifier)));
  assert.equal(outcomes.filter((r) => r.statusCode === 200).length, 1);
  assert.equal(outcomes.filter((r) => r.statusCode === 401).length, 19);
  assert.equal((await exchange(verifier)).statusCode, 401);
});

test('public routes cannot start legacy or missing-proof logins', async () => {
  const { route, calls } = setup();
  for (const request of [
    { method: 'GET', path: '/v1/auth/roblox/start' },
    { method: 'POST', path: '/v1/auth/session/exchange', body: { code } },
  ]) assert.equal((await route(request)).statusCode, 410);
  for (const query of [undefined, {}, { clientChallenge: 'short', clientState },
    { clientChallenge: challenge, clientState: 'short' }]) {
    assert.equal((await route({ method: 'GET', path: '/v2/auth/roblox/start', query })).statusCode, 400);
  }
  assert.equal(calls(), 0);
});

test('proof-bound expiry and cancellation fail closed', async () => {
  const { authService, store, calls } = setup();
  await store.putOAuthExchange(code, { user: { sub: '123' }, authorizedUniverseIds: ['10009166512'], authGeneration: 'initial', sessionEpoch: '1', clientChallenge: challenge, expiresAt: Date.now() - 1 });
  await assert.rejects(authService.exchangeAppSession(code, verifier), { code: 'invalid_exchange_code' });
  await store.putOAuthState(code, { codeVerifier: verifier, sessionEpoch: '1', clientChallenge: challenge, clientState, expiresAt: Date.now() - 1 });
  await assert.rejects(authService.completeRobloxOAuth({ state: code, code: 'test' }), { code: 'invalid_oauth_state' });
  const start = await authService.startRobloxOAuth({ clientChallenge: challenge, clientState });
  const state = new URL(start.authorizationUrl).searchParams.get('state');
  const cancel = new URL(await authService.cancelRobloxOAuth(state));
  assert.equal(cancel.searchParams.get('state'), clientState);
  assert.equal(cancel.searchParams.has('code'), false);
  await assert.rejects(authService.completeRobloxOAuth({ state, code: 'test' }), { code: 'invalid_oauth_state' });
  assert.equal(calls(), 0);
});

test('old persisted states without client binding cannot finish OAuth', async () => {
  const { authService, store, calls } = setup();
  await store.putOAuthState(code, { codeVerifier: verifier, expiresAt: Date.now() + 60_000 });
  await assert.rejects(authService.completeRobloxOAuth({ state: code, code: 'test' }), { code: 'invalid_oauth_state' });
  assert.equal(calls(), 0);
});

test('DynamoDB binds proof and expiry in the atomic delete request', async () => {
  const calls = [];
  const store = new DynamoDbAuthStore({ send: async (command) => {
    calls.push(command);
    return { Attributes: marshall({ type: 'oauth-exchange', clientChallenge: challenge,
      expiresAt: Date.now() + 60_000, user: { sub: '123' }, authorizedUniverseIds: ['10009166512'], authGeneration: 'initial', sessionEpoch: '1' }) };
  } }, 'test-table');
  const result = await store.consumeOAuthExchange(code, challenge);
  assert.equal(result.user.sub, '123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].constructor.name, 'DeleteItemCommand');
  const input = calls[0].input;
  assert.equal(input.ReturnValues, 'ALL_OLD');
  assert.equal(input.ConditionExpression, '#challenge = :challenge AND #expires > :now AND #type = :type');
  assert.deepEqual(input.ExpressionAttributeNames, { '#challenge': 'clientChallenge', '#expires': 'expiresAt', '#type': 'type' });
  const values = unmarshall(input.ExpressionAttributeValues);
  assert.equal(values[':challenge'], challenge);
  assert.equal(values[':type'], 'oauth-exchange');
  assert.ok(Math.abs(values[':now'] - Date.now()) < 5000);
  assert.ok(!JSON.stringify(input.Key).includes(code));
});

test('DynamoDB condition failure denies redemption; infrastructure errors still propagate', async () => {
  const conditional = Object.assign(new Error('synthetic'), { name: 'ConditionalCheckFailedException' });
  const store = new DynamoDbAuthStore({ send: async () => { throw conditional; } }, 'test-table');
  assert.equal(await store.consumeOAuthExchange(code, challenge), null);
  const outage = new DynamoDbAuthStore({ send: async () => { throw new Error('synthetic outage'); } }, 'test-table');
  await assert.rejects(outage.consumeOAuthExchange(code, challenge), /synthetic outage/);
});

for (const base64 of [false, true]) {
  test(`Lambda malformed body never echoes submitted fragments (base64=${base64})`, async () => {
    const raw = '{"apiKey":AUDIT}';
    const response = await handler({ rawPath: '/v1/connections/analytics/validate',
      requestContext: { http: { method: 'POST' } },
      body: base64 ? Buffer.from(raw).toString('base64') : raw, isBase64Encoded: base64 });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(JSON.parse(response.body), { error: 'invalid_json' });
    assert.doesNotMatch(response.body, /AUDIT|apiKey/);
    assert.equal(response.headers['cache-control'], 'no-store');
  });
}

test('shared public errors contain stable codes only', () => {
  assert.deepEqual(publicHttpError(new Error('synthetic-private-details')), { statusCode: 500, body: { error: 'internal_error' } });
  assert.deepEqual(publicHttpError(new SyntaxError('synthetic-request-fragment')), { statusCode: 400, body: { error: 'invalid_json' } });
  assert.deepEqual(publicHttpError(new RequestBodyTooLargeError()), { statusCode: 413, body: { error: 'request_body_too_large' } });
});

test('account-wide revocation invalidates all sessions and pending exchanges for that user only', async () => {
  const { authService, store, route } = setup();
  const session = { user: { sub: '123' }, authGeneration: 'initial', sessionEpoch: '1', expiresAt: Date.now() + 60_000 };
  await store.putSession('a'.repeat(43), session);
  await store.putSession('b'.repeat(43), session);
  await store.putSession('z'.repeat(43), { ...session, user: { sub: '999' } });
  await store.putOAuthExchange(code, { ...session, clientChallenge: challenge });
  const result = await route({ method: 'POST', path: '/v1/auth/logout-all', headers: { authorization: `Bearer ${'a'.repeat(43)}` } });
  assert.equal(result.statusCode, 204);
  for (const value of ['a', 'b']) await assert.rejects(authService.getSession(`Bearer ${value.repeat(43)}`), { code: 'invalid_session' });
  assert.equal((await authService.getSession(`Bearer ${'z'.repeat(43)}`)).user.sub, '999');
  await assert.rejects(authService.exchangeAppSession(code, verifier), { code: 'invalid_exchange_code' });
  assert.equal((await route({ method: 'POST', path: '/v1/auth/logout-all' })).statusCode, 401);
});

test('session write racing logout-all cannot revive the old account generation', async () => {
  const { authService, store } = setup();
  const record = { user: { sub: '123' }, authGeneration: 'initial', sessionEpoch: '1', expiresAt: Date.now() + 60_000 };
  await store.putSession('a'.repeat(43), record);
  await store.putOAuthExchange(code, { ...record, clientChallenge: challenge });
  let resume;
  let entered;
  const writing = new Promise((resolve) => { entered = resolve; });
  const pause = new Promise((resolve) => { resume = resolve; });
  const originalPut = store.putSession.bind(store);
  store.putSession = async (...args) => { entered(); await pause; return originalPut(...args); };
  const exchange = authService.exchangeAppSession(code, verifier);
  await writing;
  await authService.logoutAll(`Bearer ${'a'.repeat(43)}`);
  resume();
  const issued = await exchange;
  await assert.rejects(authService.getSession(`Bearer ${issued.token}`), { code: 'invalid_session' });
});

test('changing the recovery epoch rejects restored sessions and pending exchanges', async () => {
  const { store } = setup();
  const record = { user: { sub: '123' }, authGeneration: 'initial', sessionEpoch: '1', expiresAt: Date.now() + 60_000 };
  await store.putSession('a'.repeat(43), record);
  await store.putOAuthExchange(code, { ...record, clientChallenge: challenge });
  const recovered = new AuthService(loadConfig({ SESSION_EPOCH: 'restored-2' }), store, { getCredentials: async () => assert.fail('unexpected OAuth') });
  await assert.rejects(recovered.getSession(`Bearer ${'a'.repeat(43)}`), { code: 'invalid_session' });
  await assert.rejects(recovered.exchangeAppSession(code, verifier), { code: 'invalid_exchange_code' });
});

test('DynamoDB generation markers use consistent reads and never expire', async () => {
  const calls = [];
  const store = new DynamoDbAuthStore({ send: async (command) => { calls.push(command); return {}; } }, 'test-table');
  assert.equal(await store.getAuthGeneration('123'), 'initial');
  await store.setAuthGeneration('123', 'revoked-generation');
  assert.equal(calls[0].input.ConsistentRead, true);
  const item = unmarshall(calls[1].input.Item);
  assert.equal(item.generation, 'revoked-generation');
  assert.equal('ttl' in item, false);
  assert.equal('expiresAt' in item, false);
});
