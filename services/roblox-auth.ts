import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { appEnvironment } from '@/services/backend-api';
import { connectRobloxIdentity } from '@/services/roblox-auth-core';
import { signOutAppSession } from '@/services/roblox-signout-core';

const SESSION_TOKEN_KEY = 'roblox-analytics-mobile.app-session-v1';
export const APP_OAUTH_CALLBACK_URI = 'robloxanalyticsmobile://oauth/callback';

export async function signInWithRoblox() {
  if (!appEnvironment.apiBaseUrl) throw new Error('The backend URL is not configured');
  return connectRobloxIdentity({
    apiBaseUrl: appEnvironment.apiBaseUrl,
    appCallbackUri: APP_OAUTH_CALLBACK_URI,
    fetchImpl: fetch,
    openAuthSession: (authorizationUrl, callbackUri) =>
      WebBrowser.openAuthSessionAsync(authorizationUrl, callbackUri),
    saveSessionToken: (token) =>
      SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
  });
}

export function getStoredSessionToken() {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export function clearStoredSessionToken() {
  return SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

export async function signOutOfRoblox() {
  const sessionToken = await getStoredSessionToken();
  return signOutAppSession({
    apiBaseUrl: appEnvironment.apiBaseUrl,
    sessionToken,
    fetchImpl: fetch,
    clearSessionToken: clearStoredSessionToken,
  });
}
