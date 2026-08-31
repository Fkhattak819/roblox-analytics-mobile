export type Config = {
  port: number;
  robloxOAuthClientId?: string;
  robloxOAuthRedirectUri: string;
  robloxOAuthScopes: string;
  appBaseUrl: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return {
    port,
    robloxOAuthClientId: env.ROBLOX_OAUTH_CLIENT_ID || undefined,
    robloxOAuthRedirectUri:
      env.ROBLOX_OAUTH_REDIRECT_URI ?? "http://localhost:8787/v1/auth/roblox/callback",
    robloxOAuthScopes: env.ROBLOX_OAUTH_SCOPES ?? "openid profile",
    appBaseUrl: env.APP_BASE_URL ?? `http://localhost:${port}`,
  };
}
