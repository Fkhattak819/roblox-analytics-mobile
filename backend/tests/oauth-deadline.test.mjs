import test from 'node:test';
import assert from 'node:assert/strict';
import { RobloxOAuthApi } from '../dist/backend/src/modules/auth/roblox-oauth-api.js';

const input = { code: 'synthetic', codeVerifier: 'synthetic', redirectUri: 'https://example.test/callback',
  credentials: { clientId: 'synthetic', clientSecret: 'synthetic' } };
const tokens = () => Response.json({ access_token: 'synthetic-access', refresh_token: 'synthetic-refresh',
  expires_in: 899, scope: 'openid profile universe.analytics:read' });
const resources = () => Response.json({ resource_infos: [{ resources: { universe: { ids: ['10009166512'] } } }] });
const never = () => new Promise(() => {});

test('slow profile body is bounded and cleanup receives a fresh unexpired signal', async () => {
  const calls = [];
  const api = new RobloxOAuthApi(async (url, init) => {
    calls.push(url);
    assert.equal(init.redirect, 'error');
    if (url.endsWith('/token')) return tokens();
    if (url.endsWith('/userinfo')) return { ok: true, json: never };
    assert.equal(init.signal.aborted, false);
    return new Response(null, { status: 200 });
  }, { workMs: 100, cleanupMs: 100 });
  await assert.rejects(api.exchangeCodeForAuthorization(input), { code: 'deadline_exceeded' });
  assert.equal(calls.length, 3);
  assert.ok(calls[2].endsWith('/token/revoke'));
});

test('slow token exchange aborts without starting profile or inventing a revocation token', async () => {
  let signal;
  let calls = 0;
  const api = new RobloxOAuthApi(async (_, init) => { calls++; signal = init.signal; return never(); },
    { workMs: 20, cleanupMs: 20 });
  await assert.rejects(api.exchangeCodeForAuthorization(input), { code: 'deadline_exceeded' });
  assert.equal(calls, 1);
  assert.equal(signal.aborted, true);
});

test('cleanup timeout fails login even when the profile was valid', async () => {
  const api = new RobloxOAuthApi(async (url) => {
    if (url.endsWith('/token')) return tokens();
    if (url.endsWith('/userinfo')) return Response.json({ sub: '123' });
    return never();
  }, { workMs: 100, cleanupMs: 20 });
  await assert.rejects(api.exchangeCodeForAuthorization(input), { code: 'deadline_exceeded' });
});

test('insufficient Lambda time rejects before requesting upstream tokens', async () => {
  const api = new RobloxOAuthApi(async () => assert.fail('must not contact upstream'));
  await assert.rejects(api.exchangeCodeForAuthorization({ ...input, remainingTimeMs: () => 2_500 }),
    { code: 'deadline_exceeded' });
});

test('valid bounded flow returns identity and delegated universes without revoking the live grant', async () => {
  let revoked = false;
  const api = new RobloxOAuthApi(async (url) => {
    if (url.endsWith('/token')) return tokens();
    if (url.endsWith('/userinfo')) return Response.json({ sub: '123' });
    if (url.endsWith('/token/resources')) return resources();
    revoked = true;
    return new Response(null, { status: 200 });
  });
  const authorization = await api.exchangeCodeForAuthorization(input);
  assert.equal(authorization.user.sub, '123');
  assert.deepEqual(authorization.universeIds, ['10009166512']);
  assert.equal(revoked, false);
});

test('profile shares the time already consumed by token exchange', async () => {
  let profileStarted;
  let profileAborted;
  const api = new RobloxOAuthApi(async (url, init) => {
    if (url.endsWith('/token')) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return tokens();
    }
    if (url.endsWith('/userinfo')) {
      profileStarted = performance.now();
      init.signal.addEventListener('abort', () => { profileAborted = performance.now(); });
      return never();
    }
    return new Response(null, { status: 200 });
  }, { workMs: 120, cleanupMs: 50 });
  await assert.rejects(api.exchangeCodeForAuthorization(input), { code: 'deadline_exceeded' });
  assert.ok(profileAborted - profileStarted < 100, 'profile must not receive a fresh work budget');
});
