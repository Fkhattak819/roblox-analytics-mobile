import type { RobloxUserProfile } from "./auth-store.js";
import type { RobloxOAuthCredentials } from "./oauth-credentials.js";

const TOKEN_ENDPOINT = "https://apis.roblox.com/oauth/v1/token";
const USERINFO_ENDPOINT = "https://apis.roblox.com/oauth/v1/userinfo";
const RESOURCES_ENDPOINT = "https://apis.roblox.com/oauth/v1/token/resources";
const REVOKE_ENDPOINT = "https://apis.roblox.com/oauth/v1/token/revoke";
const ANALYTICS_SCOPE = "universe.analytics:read";
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60_000;

export type RobloxOAuthAuthorization = Readonly<{
  user: RobloxUserProfile;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  universeIds: string[];
}>;

export type RefreshedRobloxOAuthAuthorization = Omit<RobloxOAuthAuthorization, "user">;

type TokenResponse = Omit<RefreshedRobloxOAuthAuthorization, "universeIds">;

export class RobloxOAuthApi {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly budget = { workMs: 6_000, cleanupMs: 2_000 },
  ) {}

  async exchangeCodeForAuthorization(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    credentials: RobloxOAuthCredentials;
    remainingTimeMs?: () => number;
  }): Promise<RobloxOAuthAuthorization> {
    const available = Math.min(this.budget.workMs + this.budget.cleanupMs,
      (input.remainingTimeMs?.() ?? 10_000) - 1_000);
    const workMs = available - this.budget.cleanupMs;
    if (workMs <= 0) throw new RobloxOAuthUpstreamError("deadline_exceeded");
    const deadline = performance.now() + workMs;
    let tokens: TokenResponse | undefined;
    try {
      tokens = await this.bounded(deadline, (signal) => this.exchangeCode(input, signal));
      const exchangedTokens = tokens;
      const user = await this.bounded(deadline, (signal) => this.getUserInfo(exchangedTokens.accessToken, signal));
      const universeIds = await this.bounded(deadline,
        (signal) => this.getAuthorizedUniverseIds(exchangedTokens.accessToken, input.credentials, signal));
      return { user, ...exchangedTokens, universeIds };
    } catch (error) {
      if (tokens) {
        const refreshToken = tokens.refreshToken;
        await this.bounded(performance.now() + this.budget.cleanupMs,
          (signal) => this.revoke(refreshToken, input.credentials, signal));
      }
      throw error;
    }
  }

  async refreshAuthorization(input: {
    refreshToken: string;
    credentials: RobloxOAuthCredentials;
    remainingTimeMs?: () => number;
  }): Promise<RefreshedRobloxOAuthAuthorization> {
    const available = Math.min(this.budget.workMs + this.budget.cleanupMs,
      (input.remainingTimeMs?.() ?? 10_000) - 1_000);
    const workMs = available - this.budget.cleanupMs;
    if (workMs <= 0) throw new RobloxOAuthUpstreamError("deadline_exceeded");
    const deadline = performance.now() + workMs;
    let tokens: TokenResponse | undefined;
    try {
      tokens = await this.bounded(deadline,
        (signal) => this.exchangeRefreshToken(input.refreshToken, input.credentials, signal));
      const refreshedTokens = tokens;
      const universeIds = await this.bounded(deadline,
        (signal) => this.getAuthorizedUniverseIds(refreshedTokens.accessToken, input.credentials, signal));
      return { ...refreshedTokens, universeIds };
    } catch (error) {
      if (tokens) {
        const refreshToken = tokens.refreshToken;
        await this.bounded(performance.now() + this.budget.cleanupMs,
          (signal) => this.revoke(refreshToken, input.credentials, signal));
      }
      throw error;
    }
  }

  async revokeRefreshToken(refreshToken: string, credentials: RobloxOAuthCredentials): Promise<void> {
    await this.bounded(performance.now() + this.budget.cleanupMs,
      (signal) => this.revoke(refreshToken, credentials, signal));
  }

  private async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    credentials: RobloxOAuthCredentials;
  }, signal: AbortSignal): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    });
    const response = await this.request(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: basicAuthorization(input.credentials),
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
      signal,
    });
    if (!response.ok) throw new RobloxOAuthUpstreamError("token_exchange_failed");

    const payload: unknown = await readJson(response);
    if (!isTokenResponse(payload)) throw new RobloxOAuthUpstreamError("invalid_token_response");
    return tokenResponse(payload);
  }

  private async exchangeRefreshToken(
    refreshToken: string,
    credentials: RobloxOAuthCredentials,
    signal: AbortSignal,
  ): Promise<TokenResponse> {
    const response = await this.request(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: basicAuthorization(credentials),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
      signal,
    });
    if (!response.ok) throw new RobloxOAuthUpstreamError("token_refresh_failed");
    const payload: unknown = await readJson(response);
    if (!isTokenResponse(payload)) throw new RobloxOAuthUpstreamError("invalid_token_response");
    return tokenResponse(payload);
  }

  private async getUserInfo(accessToken: string, signal: AbortSignal): Promise<RobloxUserProfile> {
    const response = await this.request(USERINFO_ENDPOINT, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      signal,
    });
    if (!response.ok) throw new RobloxOAuthUpstreamError("userinfo_failed");

    const payload: unknown = await readJson(response);
    if (!isUserInfo(payload)) throw new RobloxOAuthUpstreamError("invalid_userinfo_response");
    return {
      sub: payload.sub,
      name: optionalShortString(payload.name),
      nickname: optionalShortString(payload.nickname),
      preferredUsername: optionalShortString(payload.preferred_username),
      profileUrl: optionalHttpsUrl(payload.profile),
      pictureUrl: optionalHttpsUrl(payload.picture),
    };
  }

  private async getAuthorizedUniverseIds(
    accessToken: string,
    credentials: RobloxOAuthCredentials,
    signal: AbortSignal,
  ): Promise<string[]> {
    const response = await this.request(RESOURCES_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: basicAuthorization(credentials),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: accessToken }),
      signal,
    });
    if (!response.ok) throw new RobloxOAuthUpstreamError("token_resources_failed");
    const payload: unknown = await readJson(response);
    return parseUniverseIds(payload);
  }

  private async revoke(
    refreshToken: string,
    credentials: RobloxOAuthCredentials,
    signal: AbortSignal,
  ): Promise<void> {
    const response = await this.request(REVOKE_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: basicAuthorization(credentials),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: refreshToken }),
      signal,
    });
    if (!response.ok) throw new RobloxOAuthUpstreamError("token_revoke_failed");
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchImpl(url, { ...init, redirect: "error" });
    } catch {
      throw new RobloxOAuthUpstreamError("network_failed");
    }
  }

  private async bounded<T>(deadline: number, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new RobloxOAuthUpstreamError("deadline_exceeded");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new RobloxOAuthUpstreamError("deadline_exceeded"));
        controller.abort();
      }, remaining);
    });
    try {
      // Include body consumption, not just response headers, in the deadline.
      return await Promise.race([work(controller.signal), timeout]);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}

export class RobloxOAuthUpstreamError extends Error {
  constructor(readonly code: string) {
    super("Roblox OAuth request failed");
    this.name = "RobloxOAuthUpstreamError";
  }
}

function basicAuthorization(credentials: RobloxOAuthCredentials): string {
  return `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`;
}

function isTokenResponse(value: unknown): value is {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.access_token === "string" && candidate.access_token.length <= 8_192
    && typeof candidate.refresh_token === "string" && candidate.refresh_token.length <= 8_192
    && typeof candidate.expires_in === "number" && Number.isFinite(candidate.expires_in)
    && candidate.expires_in > 0 && candidate.expires_in <= 86_400
    && typeof candidate.scope === "string"
    && candidate.scope.split(/\s+/).includes(ANALYTICS_SCOPE);
}

function tokenResponse(payload: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}): TokenResponse {
  const now = Date.now();
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    accessExpiresAt: now + payload.expires_in * 1_000,
    refreshExpiresAt: now + REFRESH_TOKEN_TTL_MS,
  };
}

function parseUniverseIds(value: unknown): string[] {
  if (!value || typeof value !== "object") throw new RobloxOAuthUpstreamError("invalid_resources_response");
  const infos = (value as Record<string, unknown>).resource_infos;
  if (!Array.isArray(infos) || infos.length > 1_000) throw new RobloxOAuthUpstreamError("invalid_resources_response");
  const ids = new Set<string>();
  for (const info of infos) {
    if (!info || typeof info !== "object") throw new RobloxOAuthUpstreamError("invalid_resources_response");
    const resources = (info as Record<string, unknown>).resources;
    if (!resources || typeof resources !== "object") continue;
    const universe = (resources as Record<string, unknown>).universe;
    if (!universe || typeof universe !== "object") continue;
    const universeIds = (universe as Record<string, unknown>).ids;
    if (!Array.isArray(universeIds)) throw new RobloxOAuthUpstreamError("invalid_resources_response");
    for (const id of universeIds) {
      // Roblox uses "U" for an unrestricted creator grant. This app fails closed
      // until a concrete universe ID is returned and never expands that wildcard.
      if (typeof id === "string" && /^\d{1,20}$/.test(id)) ids.add(id);
    }
  }
  return [...ids].sort();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new RobloxOAuthUpstreamError("invalid_json_response");
  }
}

function isUserInfo(value: unknown): value is Record<string, unknown> & { sub: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sub === "string" && /^\d+$/.test(candidate.sub);
}

function optionalShortString(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 200 ? value : undefined;
}

function optionalHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
