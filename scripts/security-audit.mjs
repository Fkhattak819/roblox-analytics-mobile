// Local audit observations, not a security approval or a replacement for regression tests.
// Run: node node_modules/typescript/bin/tsc -p backend/tsconfig.json
//      node scripts/security-audit.mjs
// All identities, tokens, browser responses, and network responses below are synthetic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { AuthService } from '../backend/dist/backend/src/modules/auth/auth-service.js';
import { InMemoryAuthStore } from '../backend/dist/backend/src/modules/auth/in-memory-auth-store.js';
import { StaticOAuthCredentialsProvider } from '../backend/dist/backend/src/modules/auth/oauth-credentials.js';
import { RobloxOAuthApi } from '../backend/dist/backend/src/modules/auth/roblox-oauth-api.js';
import { loadConfig } from '../backend/dist/backend/src/config.js';
import { routeRequest } from '../backend/dist/backend/src/router.js';

// Prevent accidental outgoing requests, including AWS credential discovery.
globalThis.fetch = async () => { throw new Error('Network disabled for security audit'); };
delete process.env.TABLE_NAME;
delete process.env.ROBLOX_OAUTH_SECRET_ARN;
delete process.env.ROBLOX_OAUTH_CLIENT_ID;
delete process.env.ROBLOX_OAUTH_CLIENT_SECRET;
process.env.PORT = '8787';
process.env.SESSION_TTL_SECONDS = '300';
const { handler } = await import('../backend/dist/backend/src/lambda/api-handler.js');
const mobileSource = stripTypeScriptTypes(readFileSync(
  new URL('../services/roblox-auth-core.ts', import.meta.url), 'utf8',
));
const { connectRobloxIdentity } = await import(
  `data:text/javascript;base64,${Buffer.from(mobileSource).toString('base64')}`
);
const observations = [];
function record(check, protectedBehavior, detail) {
  observations.push({ check, result: protectedBehavior ? 'protected' : 'finding', detail });
}
const config = loadConfig({});
const store = new InMemoryAuthStore();
const authService = new AuthService(config, store,
  new StaticOAuthCredentialsProvider({ clientId: 'audit-client', clientSecret: 'audit-dummy' }),
  { exchangeCodeForProfile: async () => ({ sub: '123456' }) },
);
const route = (request) => routeRequest(request, config, 'local', { authService });
const opaque = (character) => character.repeat(43);
const verifier = 'v'.repeat(64);
const clientState = 's'.repeat(64);
const clientChallenge = createHash('sha256').update(verifier).digest('base64url');

const anonymous = await route({ method: 'GET', path: '/v1/auth/session' });
record('anonymous session access', anonymous.statusCode === 401, `HTTP ${anonymous.statusCode}`);
await store.putSession(opaque('a'), { user: { sub: '123456' }, authGeneration: 'initial', sessionEpoch: '1', expiresAt: Date.now() - 1 });
const expired = await route({ method: 'GET', path: '/v1/auth/session', headers: { authorization: `Bearer ${opaque('a')}` } });
record('expired session access', expired.statusCode === 401, `HTTP ${expired.statusCode}`);
await store.putSession(opaque('b'), { user: { sub: '123456' }, authGeneration: 'initial', sessionEpoch: '1', expiresAt: Date.now() + 60_000 });
const headers = { authorization: `Bearer ${opaque('b')}` };
const logout = await route({ method: 'POST', path: '/v1/auth/logout', headers });
const revoked = await route({ method: 'GET', path: '/v1/auth/session', headers });
record('revoked session access', logout.statusCode === 204 && revoked.statusCode === 401,
  `logout ${logout.statusCode}; subsequent read ${revoked.statusCode}`);

await store.putOAuthExchange(opaque('c'), { user: { sub: '123456' }, authGeneration: 'initial', sessionEpoch: '1', clientChallenge, expiresAt: Date.now() + 60_000 });
const codeOnly = await route({ method: 'POST', path: '/v2/auth/session/exchange', body: { code: opaque('c') } });
record('client proof required for exchange', codeOnly.statusCode === 400, `code-only request: HTTP ${codeOnly.statusCode}`);
const race = await Promise.all(Array.from({ length: 20 }, () => route({
  method: 'POST', path: '/v2/auth/session/exchange', body: { code: opaque('c'), clientVerifier: verifier },
})));
const successes = race.filter((result) => result.statusCode === 200).length;
record('concurrent exchange single use', successes === 1 && race.filter((r) => r.statusCode === 401).length === 19,
  `${successes} sessions from 20 concurrent in-memory requests`);


await store.putOAuthExchange(opaque('d'), { user: { sub: '123456' }, authGeneration: 'initial', sessionEpoch: '1', clientChallenge, expiresAt: Date.now() - 1 });
const expiredExchange = await route({ method: 'POST', path: '/v2/auth/session/exchange', body: { code: opaque('d'), clientVerifier: verifier } });
record('expired exchange rejection', expiredExchange.statusCode === 401, `HTTP ${expiredExchange.statusCode}`);
await store.putOAuthState(opaque('e'), { codeVerifier: opaque('f'), sessionEpoch: '1', clientChallenge, clientState, expiresAt: Date.now() - 1 });
const expiredState = await route({ method: 'GET', path: '/v1/auth/roblox/callback', query: { state: opaque('e'), code: 'audit-code' } });
record('expired OAuth state rejection', expiredState.statusCode === 400, `HTTP ${expiredState.statusCode}`);

const start = await authService.startRobloxOAuth({ clientChallenge, clientState });
const state = new URL(start.authorizationUrl).searchParams.get('state');
const cancel = await route({ method: 'GET', path: '/v1/auth/roblox/callback', query: { state, error: 'access_denied' } });
const afterCancel = await route({ method: 'GET', path: '/v1/auth/roblox/callback', query: { state, code: 'audit-code' } });
record('cancelled OAuth state reuse', cancel.statusCode === 302 && afterCancel.statusCode === 400,
  `cancel ${cancel.statusCode}; reuse ${afterCancel.statusCode}`);

const marker = 'AUDIT';
for (const base64 of [false, true]) {
  const malformed = `{"apiKey":${marker}}`;
  const result = await handler({ rawPath: '/v1/connections/analytics/validate',
    requestContext: { http: { method: 'POST' } },
    body: base64 ? Buffer.from(malformed).toString('base64') : malformed,
    isBase64Encoded: base64,
  });
  record(`malformed JSON redaction (${base64 ? 'base64' : 'plain'})`, !result.body.includes(marker),
    `HTTP ${result.statusCode}; marker echoed: ${result.body.includes(marker)}`);
}
const disabled = await handler({ rawPath: '/v1/connections/analytics/validate',
  requestContext: { http: { method: 'POST' } }, body: JSON.stringify({ apiKey: marker, universeIds: ['123'] }),
});
record('AWS credential route disabled for valid JSON', disabled.statusCode === 503 && !disabled.body.includes(marker),
  `HTTP ${disabled.statusCode}; no submitted marker in response`);
const oversized = await handler({ rawPath: '/v1/connections/analytics/validate',
  requestContext: { http: { method: 'POST' } }, body: JSON.stringify({ apiKey: 'x'.repeat(65_536) }),
});
record('oversized body rejection', oversized.statusCode === 413, `HTTP ${oversized.statusCode}`);

async function mobileProbe({ baseUrl = 'https://api.example.test', callbackState = clientState, expiresAt = new Date(Date.now() + 60_000).toISOString() } = {}) {
  let stored = false;
  let requests = 0;
  let exchangeFields = [];
  let rejected = false;
  try {
    await connectRobloxIdentity({ apiBaseUrl: baseUrl, createProof: async () => ({ verifier, challenge: clientChallenge, state: clientState }), appCallbackUri: 'robloxanalyticsmobile://oauth/callback',
      fetchImpl: async (_url, init) => {
        requests += 1;
        if (requests === 1) return Response.json({ authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?state=initiating' });
        exchangeFields = Object.keys(JSON.parse(init.body));
        return Response.json({ token: opaque('g'), expiresAt, user: { sub: '123456' } });
      },
      openAuthSession: async () => ({ type: 'success', url: `robloxanalyticsmobile://oauth/callback?code=${opaque('h')}&state=${callbackState}` }),
      saveSessionToken: async () => { stored = true; },
    });
  } catch { rejected = true; }
  return { stored, requests, exchangeFields, rejected };
}
const valid = await mobileProbe();
record('valid proof-bound mobile flow', !valid.rejected && valid.stored && valid.requests === 2 && valid.exchangeFields.includes('clientVerifier'), 'valid callback exchanges and stores a session');
const unrelated = await mobileProbe({ callbackState: 'unrelated' });
record('mobile callback flow correlation', unrelated.rejected && !unrelated.stored,
  `unrelated callback accepted: ${!unrelated.rejected}; exchange fields: ${unrelated.exchangeFields.join(',')}`);
const http = await mobileProbe({ baseUrl: 'http://api.example.test' });
record('nonlocal HTTP rejection', http.rejected && http.requests === 0,
  `${http.requests} transport calls; stored session: ${http.stored}; mocked transport only`);
const stale = await mobileProbe({ expiresAt: '2000-01-01T00:00:00.000Z' });
record('mobile rejects already expired session response', stale.rejected && !stale.stored && stale.requests === 2,
  `stored expired session: ${stale.stored}; backend expiry protection tested separately`);

for (const profileFails of [true, false]) {
  const calls = [];
  const api = new RobloxOAuthApi(async (url) => {
    const path = new URL(url).pathname;
    calls.push(path);
    if (path.endsWith('/token')) return Response.json({ access_token: 'audit-access', refresh_token: 'audit-refresh' });
    if (path.endsWith('/userinfo')) return Response.json(profileFails ? {} : { sub: '123456' }, { status: profileFails ? 500 : 200 });
    if (path.endsWith('/revoke')) return new Response(null, { status: profileFails ? 200 : 500 });
    throw new Error('Unexpected mock endpoint');
  });
  let rejected = false;
  try {
    await api.exchangeCodeForProfile({ code: 'audit-code', codeVerifier: opaque('i'),
      redirectUri: config.robloxOAuthRedirectUri, credentials: { clientId: 'audit-client', clientSecret: 'audit-dummy' },
    });
  } catch { rejected = true; }
  record(profileFails ? 'profile failure attempts revocation' : 'revocation failure rejects login',
    rejected && calls.at(-1).endsWith('/revoke'), `rejected: ${rejected}; revoke attempted: ${calls.at(-1).endsWith('/revoke')}`);
}
assert.equal(observations.length, 18);
console.log(JSON.stringify({ scope: 'local synthetic audit; no live services', observations,
  findings: observations.filter((r) => r.result === 'finding').length }, null, 2));
// Exit 2 explicitly signals unresolved findings, not a passing security gate.
process.exitCode = observations.some((r) => r.result === 'finding') ? 2 : 0;
