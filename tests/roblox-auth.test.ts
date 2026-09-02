import assert from 'node:assert/strict';
import test from 'node:test';

import {
  connectRobloxIdentity,
  RobloxSignInCancelledError,
} from '@/services/roblox-auth-core';

const API_BASE_URL = 'https://api.example.test';
const CALLBACK_URI = 'robloxanalyticsmobile://oauth/callback';
const EXCHANGE_CODE = 'a'.repeat(43);
const SESSION_TOKEN = 'b'.repeat(43);

test('Roblox identity flow exchanges the callback once and stores only the app session token', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let storedToken: string | undefined;
  const session = await connectRobloxIdentity({
    apiBaseUrl: API_BASE_URL,
    appCallbackUri: CALLBACK_URI,
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/v1/auth/roblox/start')) {
        return Response.json({
          authorizationUrl: 'https://apis.roblox.com/oauth/v1/authorize?client_id=123',
        });
      }
      return Response.json({
        token: SESSION_TOKEN,
        expiresAt: '2026-10-01T00:00:00.000Z',
        user: { sub: '123456', preferredUsername: 'creator_name' },
      });
    },
    openAuthSession: async (authorizationUrl, callbackUri) => {
      assert.match(authorizationUrl, /^https:\/\/apis\.roblox\.com\/oauth\/v1\/authorize/);
      assert.equal(callbackUri, CALLBACK_URI);
      return { type: 'success', url: `${CALLBACK_URI}?code=${EXCHANGE_CODE}` };
    },
    saveSessionToken: async (token) => {
      storedToken = token;
    },
  });

  assert.equal(session.user.sub, '123456');
  assert.equal(storedToken, SESSION_TOKEN);
  assert.equal(requests.length, 2);
  assert.equal(requests[1]?.url, `${API_BASE_URL}/v1/auth/session/exchange`);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), { code: EXCHANGE_CODE });
});

test('Roblox identity flow rejects a non-Roblox authorization destination', async () => {
  let opened = false;
  await assert.rejects(
    connectRobloxIdentity({
      apiBaseUrl: API_BASE_URL,
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

