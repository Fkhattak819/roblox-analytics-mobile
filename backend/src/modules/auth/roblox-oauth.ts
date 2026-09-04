import { createHash, randomBytes } from "node:crypto";

export type RobloxOAuthStart = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
};

export function createOAuthStart(input: {
  clientId: string;
  redirectUri: string;
  scopes: string;
}): RobloxOAuthStart {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: input.scopes,
    response_type: "code",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return {
    authorizationUrl: `https://apis.roblox.com/oauth/v1/authorize?${query}`,
    state,
    codeVerifier,
  };
}
