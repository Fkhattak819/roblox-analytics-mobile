import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import test from 'node:test';
import { createLoginProof } from '@/services/roblox-auth-proof';

import {
  connectRobloxIdentity,
  RobloxSignInCancelledError,
} from '@/services/roblox-auth-core';

const API_BASE_URL = 'https://api.example.test';
const CALLBACK_URI = 'robloxanalyticsmobile://oauth/callback';
const EXCHANGE_CODE = 'a'.repeat(43);
const SESSION_TOKEN = 'b'.repeat(43);
const CLIENT_VERIFIER = 'v'.repeat(64);
const CLIENT_STATE = 's'.repeat(64);
const CLIENT_CHALLENGE = createHash('sha256').update(CLIENT_VERIFIER).digest('base64url');
const createProof = async () => ({ verifier: CLIENT_VERIFIER, challenge: CLIENT_CHALLENGE, state: CLIENT_STATE });

test('mobile proof uses two independent random values and the S256 digest', async () => {
  const values = [randomBytes(32), randomBytes(32)];
  let index = 0;
  const proof = await createLoginProof(async () => values[index++]!, async (value) =>
    createHash('sha256').update(value).digest('base64'));
  assert.equal(proof.verifier, values[0]!.toString('hex'));
  assert.equal(proof.state, values[1]!.toString('hex'));
  assert.equal(proof.challenge, createHash('sha256').update(proof.verifier).digest('base64url'));
  assert.equal(index, 2);
});

test('cryptographic failure aborts sign-in before network or storage', async () => {
  await assert.rejects(connectRobloxIdentity({
    apiBaseUrl: API_BASE_URL, appCallbackUri: CALLBACK_URI,
    createProof: async () => { throw new Error('native entropy unavailable'); },
    fetchImpl: async () => assert.fail('unexpected network'),
    openAuthSession: async () => assert.fail('unexpected browser'),
    saveSessionToken: async () => assert.fail('unexpected storage'),
  }), /native entropy unavailable/);
});

for (const url of ['http://api.example.test', 'http://localhost', 'https://user:password@api.example.test',
  'https://api.example.test?redirect=elsewhere', 'https://api.example.test#fragment']) {
  test(`rejects unsafe backend configuration: ${url}`, async () => {
    await assert.rejects(connectRobloxIdentity({
      apiBaseUrl: url, appCallbackUri: CALLBACK_URI, createProof,
      fetchImpl: async () => assert.fail('unsafe configuration reached network'),
      openAuthSession: async () => assert.fail('unexpected browser'),
      saveSessionToken: async () => assert.fail('unexpected storage'),
    }), /requires HTTPS/);
  });
}

for (const query of [
  `code=${EXCHANGE_CODE}`,
  `code=${EXCHANGE_CODE}&state=${'x'.repeat(64)}`,
  `code=${EXCHANGE_CODE}&state=${CLIENT_STATE}&state=${CLIENT_STATE}`,
  `code=${EXCHANGE_CODE}&code=${EXCHANGE_CODE}&state=${CLIENT_STATE}`,
  `error=denied&state=${'x'.repeat(64)}`,
  `error=denied&code=${EXCHANGE_CODE}&state=${CLIENT_STATE}`,
]) {
  test(`invalid or ambiguous callback is rejected before exchange (${query.split('&').length} fields: ${query.slice(0, 12)})`, async () => {
    let requests = 0;
    await assert.rejects(connectRobloxIdentity({
      apiBaseUrl: API_BASE_URL, appCallbackUri: CALLBACK_URI, createProof,
      fetchImpl: async () => {
        requests++;
        assert.equal(requests, 1);
        return Response.json({ authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?state=backend' });
      },
      openAuthSession: async () => ({ type: 'success', url: `${CALLBACK_URI}?${query}` }),
      saveSessionToken: async () => assert.fail('unexpected storage'),
    }), /Invalid sign-in callback/);
    assert.equal(requests, 1);
  });
}

test('expired mobile response is rejected after a valid correlated callback', async () => {
  let requests = 0;
  await assert.rejects(connectRobloxIdentity({
    apiBaseUrl: API_BASE_URL, appCallbackUri: CALLBACK_URI, createProof,
    fetchImpl: async () => ++requests === 1
      ? Response.json({ authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?state=backend' })
      : Response.json({ token: SESSION_TOKEN, expiresAt: '2000-01-01T00:00:00Z', user: { sub: '123' }, authorizedUniverseIds: ['10009166512'] }),
    openAuthSession: async () => ({ type: 'success', url: `${CALLBACK_URI}?code=${EXCHANGE_CODE}&state=${CLIENT_STATE}` }),
    saveSessionToken: async () => assert.fail('expired token stored'),
  }), /Invalid session response/);
  assert.equal(requests, 2);
});

test('Roblox identity flow exchanges the callback once and stores only the app session token', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let storedToken: string | undefined;
  const session = await connectRobloxIdentity({
    apiBaseUrl: API_BASE_URL,
    createProof,
    appCallbackUri: CALLBACK_URI,
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if (new URL(String(url)).pathname === '/v2/auth/roblox/start') {
        return Response.json({
          authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?client_id=123',
        });
      }
      return Response.json({
        token: SESSION_TOKEN,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { sub: '123456', preferredUsername: 'creator_name' },
        authorizedUniverseIds: ['10009166512'],
      });
    },
    openAuthSession: async (authorizationUrl, callbackUri) => {
      assert.match(authorizationUrl, /^https:\/\/apis\.roblox\.com\/oauth\/v1\/authorize/);
      assert.equal(callbackUri, CALLBACK_URI);
      return { type: 'success', url: `${CALLBACK_URI}?code=${EXCHANGE_CODE}&state=${CLIENT_STATE}` };
    },
    saveSessionToken: async (token) => {
      storedToken = token;
    },
  });

  assert.equal(session.user.sub, '123456');
  assert.deepEqual(session.authorizedUniverseIds, ['10009166512']);
  assert.equal(storedToken, SESSION_TOKEN);
  assert.equal(requests.length, 2);
  const startUrl = new URL(requests[0]!.url);
  assert.equal(startUrl.searchParams.get('clientChallenge'), CLIENT_CHALLENGE);
  assert.equal(startUrl.searchParams.get('clientState'), CLIENT_STATE);
  assert.ok(!startUrl.toString().includes(CLIENT_VERIFIER));
  assert.equal(requests[1]?.url, `${API_BASE_URL}/v2/auth/session/exchange`);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), { code: EXCHANGE_CODE, clientVerifier: CLIENT_VERIFIER });
});

test('Roblox identity flow rejects a non-Roblox authorization destination', async () => {
  let opened = false;
  await assert.rejects(
    connectRobloxIdentity({
      apiBaseUrl: API_BASE_URL,
      createProof,
      appCallbackUri: CALLBACK_URI,
      fetchImpl: async () => Response.json({ authorizationUrl: 'https://attacker.example/sign-in' }),
      openAuthSession: async () => {
        opened = true;
        return { type: 'cancel' };
      },
      saveSessionToken: async () => undefined,
    }),
    /Invalid sign-in destination/,
  );
  assert.equal(opened, false);
});

test('Roblox identity cancellation never creates or stores an app session', async () => {
  let requestCount = 0;
  let stored = false;
  await assert.rejects(
    connectRobloxIdentity({
      apiBaseUrl: API_BASE_URL,
      createProof,
      appCallbackUri: CALLBACK_URI,
      fetchImpl: async () => {
        requestCount += 1;
        return Response.json({
          authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?client_id=123',
        });
      },
      openAuthSession: async () => ({ type: 'cancel' }),
      saveSessionToken: async () => {
        stored = true;
      },
    }),
    RobloxSignInCancelledError,
  );
  assert.equal(requestCount, 1);
  assert.equal(stored, false);
});
