import {
  digestOpaqueValue,
  type AppSessionRecord,
  type AuthStore,
  type OAuthExchangeRecord,
  type OAuthStateRecord,
} from "./auth-store.js";

export class InMemoryAuthStore implements AuthStore {
  readonly #states = new Map<string, OAuthStateRecord>();
  readonly #exchanges = new Map<string, OAuthExchangeRecord>();
  readonly #sessions = new Map<string, AppSessionRecord>();

  async putOAuthState(state: string, record: OAuthStateRecord): Promise<void> {
    this.#states.set(digestOpaqueValue(state), record);
  }

  async consumeOAuthState(state: string): Promise<OAuthStateRecord | null> {
    const key = digestOpaqueValue(state);
    const record = this.#states.get(key) ?? null;
    this.#states.delete(key);
    return isCurrent(record);
  }

  async putOAuthExchange(code: string, record: OAuthExchangeRecord): Promise<void> {
    this.#exchanges.set(digestOpaqueValue(code), record);
  }

  async consumeOAuthExchange(code: string): Promise<OAuthExchangeRecord | null> {
    const key = digestOpaqueValue(code);
    const record = this.#exchanges.get(key) ?? null;
    this.#exchanges.delete(key);
    return isCurrent(record);
  }

  async putSession(token: string, record: AppSessionRecord): Promise<void> {
    this.#sessions.set(digestOpaqueValue(token), record);
  }

  async getSession(token: string): Promise<AppSessionRecord | null> {
    const key = digestOpaqueValue(token);
    const record = isCurrent(this.#sessions.get(key) ?? null);
    if (!record) this.#sessions.delete(key);
    return record;
  }

  async deleteSession(token: string): Promise<void> {
    this.#sessions.delete(digestOpaqueValue(token));
  }
}

function isCurrent<T extends { expiresAt: number }>(record: T | null): T | null {
  return record && record.expiresAt > Date.now() ? record : null;
}

