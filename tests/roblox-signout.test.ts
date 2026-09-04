import assert from 'node:assert/strict';
import test from 'node:test';

import { signOutAppSession } from '@/services/roblox-signout-core';

const API_BASE_URL = 'https://api.example.test';
const SESSION_TOKEN = 'session-token';

test('sign out revokes the backend session and clears the local token', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let cleared = false;

  const result = await signOutAppSession({
    apiBaseUrl: `${API_BASE_URL}/`,
    sessionToken: SESSION_TOKEN,
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(null, { status: 204 });
    },
    clearSessionToken: async () => {
      cleared = true;
    },
  });

  assert.equal(result.remoteSessionRevoked, true);
  assert.equal(result.warning, undefined);
  assert.equal(cleared, true);
  assert.equal(requests[0]?.url, `${API_BASE_URL}/v1/auth/logout`);
  assert.equal(requests[0]?.init?.method, 'POST');
  assert.equal(new Headers(requests[0]?.init?.headers).get('authorization'), `Bearer ${SESSION_TOKEN}`);
});

test('sign out still clears the local token when the backend is unreachable', async () => {
  let cleared = false;

  const result = await signOutAppSession({
    apiBaseUrl: API_BASE_URL,
    sessionToken: SESSION_TOKEN,
    fetchImpl: async () => {
      throw new Error('offline');
    },
    clearSessionToken: async () => {
      cleared = true;
    },
  });

  assert.equal(result.remoteSessionRevoked, false);
  assert.match(result.warning ?? '', /only this device was signed out/i);
  assert.equal(cleared, true);
});

test('sign out treats an expired backend session as already revoked', async () => {
  let cleared = false;

  const result = await signOutAppSession({
    apiBaseUrl: API_BASE_URL,
    sessionToken: SESSION_TOKEN,
    fetchImpl: async () => Response.json({ error: 'invalid_session' }, { status: 401 }),
    clearSessionToken: async () => {
      cleared = true;
    },
  });

  assert.equal(result.remoteSessionRevoked, true);
  assert.equal(result.warning, undefined);
  assert.equal(cleared, true);
});
