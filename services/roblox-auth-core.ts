export type RobloxProfile = Readonly<{
  sub: string;
  name?: string;
  nickname?: string;
  preferredUsername?: string;
  profileUrl?: string;
  pictureUrl?: string;
}>;

export type AppSession = Readonly<{
  token: string;
  expiresAt: string;
  user: RobloxProfile;
}>;

type AuthBrowserResult =
  | Readonly<{ type: 'success'; url: string }>
  | Readonly<{ type: string; url?: string }>;

export type ConnectRobloxOptions = Readonly<{
  apiBaseUrl: string;
  appCallbackUri: string;
  fetchImpl: typeof fetch;
  openAuthSession: (authorizationUrl: string, callbackUri: string) => Promise<AuthBrowserResult>;
  saveSessionToken: (token: string) => Promise<void>;
}>;

export class RobloxSignInCancelledError extends Error {
  constructor() {
    super('Roblox sign-in was cancelled');
    this.name = 'RobloxSignInCancelledError';
  }
}

export async function connectRobloxIdentity({
  apiBaseUrl,
  appCallbackUri,
  fetchImpl,
  openAuthSession,
  saveSessionToken,
}: ConnectRobloxOptions): Promise<AppSession> {
  const baseUrl = apiBaseUrl.trim().replace(/\/$/, '');
  if (!baseUrl) throw new Error('The backend URL is not configured');

  const startResponse = await fetchImpl(`${baseUrl}/v1/auth/roblox/start`, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  if (!startResponse.ok) throw new Error('Roblox sign-in is not ready yet');
  const authorizationUrl = parseAuthorizationUrl(await startResponse.json());

  const browserResult = await openAuthSession(authorizationUrl, appCallbackUri);
  if (browserResult.type !== 'success' || !browserResult.url) {
    throw new RobloxSignInCancelledError();
  }

  const callback = parseAppCallback(browserResult.url, appCallbackUri);
  const exchangeResponse = await fetchImpl(`${baseUrl}/v1/auth/session/exchange`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code: callback.code }),
  });
  if (!exchangeResponse.ok) throw new Error('The Roblox sign-in expired. Please try again.');

  const session = parseSession(await exchangeResponse.json());
  await saveSessionToken(session.token);
  return session;
}

function parseAuthorizationUrl(value: unknown): string {
  if (!value || typeof value !== 'object') throw new Error('Invalid sign-in response');
  const authorizationUrl = (value as Record<string, unknown>).authorizationUrl;
  if (typeof authorizationUrl !== 'string') throw new Error('Invalid sign-in response');
  const url = new URL(authorizationUrl);
  if (url.origin !== 'https://apis.roblox.com' || url.pathname !== '/oauth/v1/authorize') {
    throw new Error('Invalid sign-in destination');
  }
  return url.toString();
}

function parseAppCallback(value: string, expectedCallback: string): { code: string } {
  const url = new URL(value);
  const expected = new URL(expectedCallback);
  if (
    url.protocol !== expected.protocol
    || url.hostname !== expected.hostname
    || url.pathname !== expected.pathname
  ) {
    throw new Error('Invalid sign-in callback');
  }
  if (url.searchParams.has('error')) throw new RobloxSignInCancelledError();
  const code = url.searchParams.get('code');
  if (!code || !/^[A-Za-z0-9_-]{32,128}$/.test(code)) {
    throw new Error('Invalid sign-in callback');
  }
  return { code };
}

function parseSession(value: unknown): AppSession {
  if (!value || typeof value !== 'object') throw new Error('Invalid session response');
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.token !== 'string'
    || !/^[A-Za-z0-9_-]{32,256}$/.test(candidate.token)
    || typeof candidate.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(candidate.expiresAt))
    || !candidate.user
  ) {
    throw new Error('Invalid session response');
  }
  const user = parseRobloxProfile(candidate.user);
  return {
    token: candidate.token,
    expiresAt: candidate.expiresAt,
    user,
  };
}

function parseRobloxProfile(value: unknown): RobloxProfile {
  if (!value || typeof value !== 'object') throw new Error('Invalid session response');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.sub !== 'string' || !/^\d+$/.test(candidate.sub)) {
    throw new Error('Invalid session response');
  }

  return {
    sub: candidate.sub,
    name: optionalString(candidate.name),
    nickname: optionalString(candidate.nickname),
    preferredUsername: optionalString(candidate.preferredUsername),
    profileUrl: optionalHttpsUrl(candidate.profileUrl),
    pictureUrl: optionalHttpsUrl(candidate.pictureUrl),
  };
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 200) {
    throw new Error('Invalid session response');
  }
  return value;
}

function optionalHttpsUrl(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 2_048) {
    throw new Error('Invalid session response');
  }
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Invalid session response');
  return url.toString();
}
