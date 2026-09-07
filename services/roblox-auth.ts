import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { appEnvironment } from '@/services/backend-api';
import { connectRobloxIdentity } from '@/services/roblox-auth-core';
import { createLoginProof } from '@/services/roblox-auth-proof';
import { SessionController } from '@/services/session-controller';

const SESSION_TOKEN_KEY = 'roblox-analytics-mobile.app-session-v1';
export const APP_OAUTH_CALLBACK_URI = 'robloxanalyticsmobile://oauth/callback';

async function performRobloxSignIn() {
  if (!appEnvironment.apiBaseUrl) throw new Error('The backend URL is not configured');
  return connectRobloxIdentity({
    apiBaseUrl: appEnvironment.apiBaseUrl,
    appCallbackUri: APP_OAUTH_CALLBACK_URI,
    fetchImpl: fetch,
    allowLocalHttp: __DEV__,
    createProof: () => createLoginProof(
      () => Crypto.getRandomBytesAsync(32),
      (value) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
        encoding: Crypto.CryptoEncoding.BASE64,
      }),
    ),
    openAuthSession: (authorizationUrl, callbackUri) =>
      WebBrowser.openAuthSessionAsync(authorizationUrl, callbackUri),
    // The controller commits secure storage only if this login is still current.
    saveSessionToken: async () => undefined,
  });
}

export function getStoredSessionToken() {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export function clearStoredSessionToken() {
  return SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

export const sessionController = new SessionController({
  apiBaseUrl: appEnvironment.apiBaseUrl,
  allowLocalHttp: __DEV__,
  fetchImpl: fetch,
  readToken: getStoredSessionToken,
  deleteToken: clearStoredSessionToken,
  writeToken: (token) => SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  login: performRobloxSignIn,
});

export const signInWithRoblox = () => sessionController.signIn();

