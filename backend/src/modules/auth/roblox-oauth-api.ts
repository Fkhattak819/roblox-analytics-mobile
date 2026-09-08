import type { RobloxUserProfile } from "./auth-store.js";
import type { RobloxOAuthCredentials } from "./oauth-credentials.js";

const TOKEN_ENDPOINT = "https://apis.roblox.com/oauth/v1/token";
const USERINFO_ENDPOINT = "https://apis.roblox.com/oauth/v1/userinfo";
const REVOKE_ENDPOINT = "https://apis.roblox.com/oauth/v1/token/revoke";

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export class RobloxOAuthApi {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly budget = { workMs: 6_000, cleanupMs: 2_000 },
  ) {}

  async exchangeCodeForProfile(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
    credentials: RobloxOAuthCredentials;
    remainingTimeMs?: () => number;
  }): Promise<RobloxUserProfile> {
    const available = Math.min(this.budget.workMs + this.budget.cleanupMs,
      (input.remainingTimeMs?.() ?? 10_000) - 1_000);
    const workMs = available - this.budget.cleanupMs;
    if (workMs <= 0) throw new RobloxOAuthUpstreamError("deadline_exceeded");
    const deadline = performance.now() + workMs;
    const tokens = await this.bounded(deadline, (signal) => this.exchangeCode(input, signal));
    let profile: RobloxUserProfile;
    try {
      profile = await this.bounded(deadline, (signal) => this.getUserInfo(tokens.accessToken, signal));
    } finally {
      await this.bounded(performance.now() + this.budget.cleanupMs,
        (signal) => this.revoke(tokens.refreshToken, input.credentials, signal));
    }
    return profile;
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
    return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
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

function isTokenResponse(value: unknown): value is { access_token: string; refresh_token: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.access_token === "string" && typeof candidate.refresh_token === "string";
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
