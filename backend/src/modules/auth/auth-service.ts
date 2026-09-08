import { createHash, randomBytes } from "node:crypto";
import type { Config } from "../../config.js";
import type { AppSessionRecord, AuthStore } from "./auth-store.js";
import { OAuthConfigurationError, type RobloxOAuthCredentialsProvider } from "./oauth-credentials.js";
import { createOAuthStart } from "./roblox-oauth.js";
import { RobloxOAuthApi, RobloxOAuthUpstreamError } from "./roblox-oauth-api.js";

const STATE_TTL_MS = 10 * 60_000;
const EXCHANGE_TTL_MS = 2 * 60_000;
const OPAQUE_VALUE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export class AuthService {
  constructor(
    private readonly config: Config,
    private readonly store: AuthStore,
    private readonly credentialProvider: RobloxOAuthCredentialsProvider,
    private readonly robloxApi = new RobloxOAuthApi(),
  ) {}

  async startRobloxOAuth(input: { clientChallenge: unknown; clientState: unknown }): Promise<{ authorizationUrl: string }> {
    if (typeof input.clientChallenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(input.clientChallenge)
      || typeof input.clientState !== "string" || !OPAQUE_VALUE_PATTERN.test(input.clientState)) {
      throw new AuthServiceError(400, "invalid_client_proof", "A valid S256 client challenge and state are required");
    }
    try {
      const credentials = await this.credentialProvider.getCredentials();
      const flow = createOAuthStart({
        clientId: credentials.clientId,
        redirectUri: this.config.robloxOAuthRedirectUri,
        scopes: this.config.robloxOAuthScopes,
      });
      await this.store.putOAuthState(flow.state, {
        codeVerifier: flow.codeVerifier,
        sessionEpoch: this.config.sessionEpoch,
        clientChallenge: input.clientChallenge,
        clientState: input.clientState,
        expiresAt: Date.now() + STATE_TTL_MS,
      });
      return { authorizationUrl: flow.authorizationUrl };
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async completeRobloxOAuth(input: { code: string; state: string; remainingTimeMs?: () => number }): Promise<string> {
    if (
      !OPAQUE_VALUE_PATTERN.test(input.state)
      || !input.code
      || input.code.length > 4_096
    ) {
      throw new AuthServiceError(400, "invalid_oauth_callback", "Invalid OAuth callback");
    }

    const state = await this.store.consumeOAuthState(input.state);
    if (!state?.clientChallenge || !state.clientState || state.sessionEpoch !== this.config.sessionEpoch) {
      throw new AuthServiceError(400, "invalid_oauth_state", "OAuth state is invalid or expired");
    }

    try {
      const credentials = await this.credentialProvider.getCredentials();
      const user = await this.robloxApi.exchangeCodeForProfile({
        code: input.code,
        codeVerifier: state.codeVerifier,
        redirectUri: this.config.robloxOAuthRedirectUri,
        credentials,
        remainingTimeMs: input.remainingTimeMs,
      });
      const exchangeCode = randomOpaqueValue();
      await this.store.putOAuthExchange(exchangeCode, {
        user,
        clientChallenge: state.clientChallenge,
        authGeneration: await this.store.getAuthGeneration(user.sub),
        sessionEpoch: this.config.sessionEpoch,
        expiresAt: Date.now() + EXCHANGE_TTL_MS,
      });
      return appRedirect(this.config.appOAuthCallbackUri, { code: exchangeCode, state: state.clientState });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async cancelRobloxOAuth(stateValue: string | undefined): Promise<string> {
    if (!stateValue || !OPAQUE_VALUE_PATTERN.test(stateValue)) {
      throw new AuthServiceError(400, "invalid_oauth_state", "OAuth state is invalid or expired");
    }
    const state = await this.store.consumeOAuthState(stateValue);
    if (!state?.clientState || !state.clientChallenge || state.sessionEpoch !== this.config.sessionEpoch) {
      throw new AuthServiceError(400, "invalid_oauth_state", "OAuth state is invalid or expired");
    }
    return appRedirect(this.config.appOAuthCallbackUri, { error: "authorization_denied", state: state.clientState });
  }

  async exchangeAppSession(code: unknown, clientVerifier: unknown): Promise<{ token: string; session: AppSessionRecord }> {
    if (typeof code !== "string" || !OPAQUE_VALUE_PATTERN.test(code)) {
      throw new AuthServiceError(400, "invalid_exchange_code", "Invalid session exchange code");
    }
    if (typeof clientVerifier !== "string" || !/^[A-Za-z0-9._~-]{43,128}$/.test(clientVerifier)) {
      throw new AuthServiceError(400, "invalid_client_proof", "A valid client verifier is required");
    }
    const clientChallenge = createHash("sha256").update(clientVerifier, "ascii").digest("base64url");
    const exchange = await this.store.consumeOAuthExchange(code, clientChallenge);
    if (!exchange || exchange.sessionEpoch !== this.config.sessionEpoch
      || exchange.authGeneration !== await this.store.getAuthGeneration(exchange.user.sub)) {
      throw new AuthServiceError(401, "invalid_exchange_code", "Session exchange code is invalid or expired");
    }

    const token = randomOpaqueValue();
    const session = {
      user: exchange.user,
      authGeneration: exchange.authGeneration,
      sessionEpoch: this.config.sessionEpoch,
      expiresAt: Date.now() + this.config.sessionTtlSeconds * 1_000,
    };
    await this.store.putSession(token, session);
    return { token, session };
  }

  async getSession(authorization: string | undefined): Promise<AppSessionRecord> {
    const token = bearerToken(authorization);
    const session = await this.store.getSession(token);
    if (!session || session.sessionEpoch !== this.config.sessionEpoch
      || session.authGeneration !== await this.store.getAuthGeneration(session.user.sub)) {
      throw new AuthServiceError(401, "invalid_session", "Session is invalid or expired");
    }
    return session;
  }

  async logout(authorization: string | undefined): Promise<void> {
    const token = bearerToken(authorization);
    await this.store.deleteSession(token);
  }

  async logoutAll(authorization: string | undefined): Promise<void> {
    const session = await this.getSession(authorization);
    // A random replacement avoids lost increments during concurrent revocations.
    // This record has no TTL: expiring it could revive old sessions.
    await this.store.setAuthGeneration(session.user.sub, randomOpaqueValue());
    await this.store.deleteSession(bearerToken(authorization));
  }
}

export class AuthServiceError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function randomOpaqueValue(): string {
  return randomBytes(32).toString("base64url");
}

function bearerToken(value: string | undefined): string {
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(value ?? "");
  if (!match?.[1]) throw new AuthServiceError(401, "missing_session", "A valid session is required");
  return match[1];
}

function appRedirect(callbackUri: string, params: Record<string, string>): string {
  const url = new URL(callbackUri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function normalizeError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) return error;
  if (error instanceof OAuthConfigurationError) {
    return new AuthServiceError(503, "oauth_not_configured", error.message);
  }
  if (error instanceof RobloxOAuthUpstreamError) {
    return new AuthServiceError(502, "roblox_oauth_failed", "Roblox OAuth could not be completed");
  }
  return new AuthServiceError(500, "auth_service_failed", "Authentication service failed");
}
