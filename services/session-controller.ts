import { parseSessionMetadata, validateAuthBaseUrl, type AppSession, type SessionMetadata } from './roblox-auth-core';
import { fetchWithTimeout } from './fetch-with-timeout';

export type SessionState = Readonly<{
  status: 'sample' | 'checking' | 'authenticated' | 'unavailable' | 'signed_out';
  session?: SessionMetadata;
  revision: number;
}>;
export type SessionDependencies = Readonly<{
  apiBaseUrl?: string;
  allowLocalHttp?: boolean;
  fetchImpl: typeof fetch;
  readToken: () => Promise<string | null>;
  writeToken: (token: string) => Promise<void>;
  deleteToken: () => Promise<void>;
  login: () => Promise<AppSession>;
}>;

export class SessionChangedError extends Error {
  constructor() { super('The session changed. Please try again.'); }
}

// Tokens never enter React state. Operation numbers discard late results after
// sign-out/account changes; the storage queue orders native keychain mutations.
export class SessionController {
  private state: SessionState = { status: 'sample', revision: 0 };
  private token: string | undefined;
  private operation = 0;
  private storageQueue: Promise<unknown> = Promise.resolve();
  private pendingSignIn: Promise<SessionMetadata> | undefined;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly dependencies: SessionDependencies) {}

  getSnapshot = (): SessionState => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(status: SessionState['status'], session?: SessionMetadata, reset = false) {
    this.state = { status, session, revision: this.state.revision + (reset ? 1 : 0) };
    for (const listener of this.listeners) listener();
  }

  private storage<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.storageQueue.then(operation);
    this.storageQueue = result.catch(() => undefined);
    return result;
  }

  private async request(path: string, token: string, method = 'GET') {
    const baseUrl = validateAuthBaseUrl(this.dependencies.apiBaseUrl ?? '', this.dependencies.allowLocalHttp);
    if (!/^\/v[12]\/[a-zA-Z0-9/_-]+$/.test(path)) throw new Error('Invalid API path');
    return fetchWithTimeout(this.dependencies.fetchImpl, `${baseUrl}${path}`, {
      method, headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      redirect: 'error',
    }, 15_000);
  }

  async restore(): Promise<void> {
    const operation = ++this.operation;
    this.token = undefined;
    // Clear the previous account's mounted state before any asynchronous work.
    this.publish('checking', undefined, true);
    try {
      const token = await this.storage(this.dependencies.readToken);
      if (operation !== this.operation) return;
      if (!token) { this.publish('sample'); return; }
      if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) {
        await this.clear(operation, 'signed_out');
        return;
      }
      const response = await this.request('/v1/auth/session', token);
      if (operation !== this.operation) return;
      if (response.status === 401) { await this.clear(operation, 'signed_out'); return; }
      if (!response.ok) throw new Error('Session verification is unavailable');
      const session = parseSessionMetadata(await response.json());
      if (operation !== this.operation) return;
      this.token = token;
      this.publish('authenticated', session);
    } catch {
      if (operation === this.operation) this.publish('unavailable');
      // A network/storage outage is not a valid identity. Keep secure storage for retry.
    }
  }

  signIn(): Promise<SessionMetadata> {
    if (this.pendingSignIn) return this.pendingSignIn;
    // Own the flow outside React: resetting account state remounts the screens.
    const pending = Promise.resolve().then(() => this.performSignIn()).finally(() => {
      if (this.pendingSignIn === pending) this.pendingSignIn = undefined;
    });
    this.pendingSignIn = pending;
    return pending;
  }

  private async performSignIn(): Promise<SessionMetadata> {
    const operation = ++this.operation;
    const previousToken = this.token;
    this.token = undefined;
    this.publish('checking', undefined, true);
    try {
      const storedToken = previousToken ?? await this.storage(this.dependencies.readToken);
      await this.storage(async () => {
        if (operation !== this.operation) throw new SessionChangedError();
        await this.dependencies.deleteToken();
      });
      if (operation !== this.operation) throw new SessionChangedError();
      if (storedToken) await this.bestEffortRevoke(storedToken);
      if (operation !== this.operation) throw new SessionChangedError();
      const result = await this.dependencies.login();
      if (operation !== this.operation) {
        await this.bestEffortRevoke(result.token);
        throw new SessionChangedError();
      }
      const session = parseSessionMetadata(result);
      try {
        await this.storage(async () => {
          if (operation !== this.operation) throw new SessionChangedError();
          await this.dependencies.writeToken(result.token);
        });
      } catch (error) {
        await this.bestEffortRevoke(result.token);
        throw error;
      }
      if (operation !== this.operation) {
        await this.bestEffortRevoke(result.token);
        throw new SessionChangedError();
      }
      this.token = result.token;
      this.publish('authenticated', session);
      return session;
    } catch (error) {
      if (operation === this.operation) this.publish('signed_out');
      throw error;
    }
  }

  private async clear(operation: number, status: 'signed_out' | 'sample') {
    if (operation !== this.operation) return;
    this.token = undefined;
    // The caller has already hidden account state, even if native storage fails.
    await this.storage(async () => {
      if (operation === this.operation) await this.dependencies.deleteToken();
    });
    if (operation === this.operation) this.publish(status);
  }

  async signOut(allSessions = false): Promise<'revoked' | 'local_only'> {
    const operation = ++this.operation;
    const activeToken = this.token;
    this.token = undefined;
    this.publish('signed_out', undefined, true);
    let token: string | null = activeToken ?? null;
    try {
      if (!token) token = await this.storage(this.dependencies.readToken);
      await this.clear(operation, 'signed_out');
    } catch {
      if (operation === this.operation) this.publish('unavailable');
      throw new Error('Secure storage could not be cleared. Please retry sign-out.');
    }
    if (!token) return allSessions ? 'local_only' : 'revoked';
    try {
      const response = await this.request(allSessions ? '/v1/auth/logout-all' : '/v1/auth/logout', token, 'POST');
      // A 401 confirms only this token's invalidity, not account-wide revocation.
      return response.ok || (!allSessions && response.status === 401) ? 'revoked' : 'local_only';
    } catch { return 'local_only'; }
  }

  async useSample(): Promise<void> {
    const operation = ++this.operation;
    this.token = undefined;
    this.publish('sample', undefined, true);
    try { await this.clear(operation, 'sample'); }
    catch {
      if (operation === this.operation) this.publish('unavailable');
      throw new Error('Secure storage could not be cleared. Please retry.');
    }
    // Deliberately offline; choosing samples does not claim server revocation.
  }

  async authenticatedRead<T>(path: string, parse: (payload: unknown) => T): Promise<T> {
    const operation = this.operation;
    const token = this.token;
    if (!token || this.state.status !== 'authenticated') throw new Error('Sign-in is required');
    if (Date.parse(this.state.session!.expiresAt) <= Date.now()) {
      await this.useSample();
      throw new Error('The session expired. Please sign in again.');
    }
    const response = await this.request(path, token);
    if (operation !== this.operation) throw new SessionChangedError();
    if (response.status === 401) {
      this.publish('signed_out', undefined, true);
      await this.clear(++this.operation, 'signed_out');
      throw new Error('The session expired. Please sign in again.');
    }
    if (!response.ok) throw new Error('The request could not be completed');
    const payload: unknown = await response.json();
    if (operation !== this.operation) throw new SessionChangedError();
    return parse(payload);
  }

  private async bestEffortRevoke(token: string) {
    try { await this.request('/v1/auth/logout', token, 'POST'); } catch { /* No identity is adopted. */ }
  }
}
