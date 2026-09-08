import type { LoginProof } from './roblox-auth-proof';

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
  authorizedUniverseIds: string[];
}>;

export type SessionMetadata = Omit<AppSession, 'token'>;

type AuthBrowserResult =
  | Readonly<{ type: 'success'; url: string }>
  | Readonly<{ type: string; url?: string }>;

export type ConnectRobloxOptions = Readonly<{
  apiBaseUrl: string;
  appCallbackUri: string;
  fetchImpl: typeof fetch;
  openAuthSession: (authorizationUrl: string, callbackUri: string) => Promise<AuthBrowserResult>;
  saveSessionToken: (token: string) => Promise<void>;
  createProof: () => Promise<LoginProof>;
  allowLocalHttp?: boolean;
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
  createProof,
  allowLocalHttp = false,
}: ConnectRobloxOptions): Promise<AppSession> {
  const baseUrl = validateAuthBaseUrl(apiBaseUrl, allowLocalHttp);
  const proof = await createProof();
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(proof.verifier)
    || !/^[A-Za-z0-9_-]{43}$/.test(proof.challenge)
    || !/^[A-Za-z0-9_-]{32,128}$/.test(proof.state)) throw new Error('Invalid login proof');
  const startUrl = new URL(`${baseUrl}/v2/auth/roblox/start`);
  startUrl.searchParams.set('clientChallenge', proof.challenge);
  startUrl.searchParams.set('clientState', proof.state);

  const startResponse = await fetchImpl(startUrl.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!startResponse.ok) throw new Error('Roblox sign-in is not ready yet');
  const authorizationUrl = parseAuthorizationUrl(await startResponse.json());

  const browserResult = await openAuthSession(authorizationUrl, appCallbackUri);
  if (browserResult.type !== 'success' || !browserResult.url) {
    throw new RobloxSignInCancelledError();
  }

  const callback = parseAppCallback(browserResult.url, appCallbackUri, proof.state);
  const exchangeResponse = await fetchImpl(`${baseUrl}/v2/auth/session/exchange`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code: callback.code, clientVerifier: proof.verifier }),
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
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

export function validateAuthBaseUrl(value: string, allowLocalHttp = false): string {
  if (!value.trim()) throw new Error('The backend URL is not configured');
  const url = new URL(value.trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(allowLocalHttp && local && url.protocol === 'http:'))
    || url.username || url.password || url.search || url.hash) {
    throw new Error('The authentication backend requires HTTPS');
  }
  return url.toString().replace(/\/$/, '');
}

function parseAppCallback(value: string, expectedCallback: string, expectedState: string): { code: string } {
  const url = new URL(value);
  const expected = new URL(expectedCallback);
  if (
    url.protocol !== expected.protocol
    || url.hostname !== expected.hostname
    || url.pathname !== expected.pathname
    || url.port !== expected.port
    || url.username || url.password || url.hash
    || url.searchParams.getAll('state').length !== 1
    || url.searchParams.get('state') !== expectedState
  ) {
    throw new Error('Invalid sign-in callback');
  }
  if (url.searchParams.has('error')) {
    if (url.searchParams.getAll('error').length !== 1 || url.searchParams.has('code')) {
      throw new Error('Invalid sign-in callback');
    }
    throw new RobloxSignInCancelledError();
  }
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.getAll('code').length !== 1 || !/^[A-Za-z0-9_-]{32,128}$/.test(code)) {
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
    || Date.parse(candidate.expiresAt) <= Date.now()
    || !candidate.user
  ) {
    throw new Error('Invalid session response');
  }
  const user = parseRobloxProfile(candidate.user);
  return {
    token: candidate.token,
    expiresAt: candidate.expiresAt,
    user,
    authorizedUniverseIds: parseUniverseIds(candidate.authorizedUniverseIds),
  };
}

export function parseSessionMetadata(value: unknown): SessionMetadata {
  if (!value || typeof value !== 'object') throw new Error('Invalid session response');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.expiresAt !== 'string' || !Number.isFinite(Date.parse(candidate.expiresAt))
    || Date.parse(candidate.expiresAt) <= Date.now()) throw new Error('Invalid session response');
  return { expiresAt: candidate.expiresAt, user: parseRobloxProfile(candidate.user),
    authorizedUniverseIds: parseUniverseIds(candidate.authorizedUniverseIds) };
}

function parseUniverseIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 1_000
    || value.some((id) => typeof id !== 'string' || !/^\d{1,20}$/.test(id))) {
    throw new Error('Invalid session response');
  }
  return [...new Set(value)];
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
