import { createHash, randomBytes } from "node:crypto";
import type { Config } from "../../config.js";

export type RobloxOAuthState = {
  state: string;
  codeVerifier: string;
  nonce: string;
  expiresAt: number;
};

export function createOAuthStart(config: Config): {
  authorizationUrl?: string;
  state?: RobloxOAuthState;
  error?: string;
} {
  if (!config.robloxOAuthClientId) {
    return { error: "Roblox OAuth is not configured" };
  }

  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const query = new URLSearchParams({
    client_id: config.robloxOAuthClientId,
    redirect_uri: config.robloxOAuthRedirectUri,
    scope: config.robloxOAuthScopes,
    response_type: "code",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return {
    authorizationUrl: `https://apis.roblox.com/oauth/v1/authorize?${query}`,
    state: { state, codeVerifier, nonce, expiresAt: Date.now() + 10 * 60_000 },
  };
}
