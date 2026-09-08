export type Config = {
  port: number;
  tableName?: string;
  syncQueueUrl?: string;
  robloxAnalyticsSecretArn?: string;
  analyticsUniverseIds: string[];
  robloxOAuthSecretArn?: string;
  robloxOAuthTokenKeyArn?: string;
  robloxOAuthClientId?: string;
  robloxOAuthClientSecret?: string;
  robloxOAuthRedirectUri: string;
  robloxOAuthScopes: string;
  appOAuthCallbackUri: string;
  appBaseUrl: string;
  sessionTtlSeconds: number;
  sessionEpoch: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  const sessionTtlSeconds = Number(env.SESSION_TTL_SECONDS ?? 30 * 24 * 60 * 60);
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 300) {
    throw new Error("SESSION_TTL_SECONDS must be an integer of at least 300");
  }

  const sessionEpoch = env.SESSION_EPOCH ?? "1";
  const analyticsUniverseIds: string[] = (env.ANALYTICS_UNIVERSE_IDS ?? '').split(',').map((value: string) => value.trim()).filter(Boolean);
  if (analyticsUniverseIds.some((value: string) => !/^\d+$/.test(value))) throw new Error('Invalid analytics universe allowlist');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionEpoch)) {
    throw new Error("SESSION_EPOCH must be a nonempty deployment identifier");
  }

  return {
    port,
    tableName: env.TABLE_NAME || undefined,
    syncQueueUrl: env.SYNC_QUEUE_URL || undefined,
    robloxAnalyticsSecretArn: env.ROBLOX_ANALYTICS_SECRET_ARN || undefined,
    analyticsUniverseIds,
    robloxOAuthSecretArn: env.ROBLOX_OAUTH_SECRET_ARN || undefined,
    robloxOAuthTokenKeyArn: env.ROBLOX_OAUTH_TOKEN_KEY_ARN || undefined,
    robloxOAuthClientId: env.ROBLOX_OAUTH_CLIENT_ID || undefined,
    robloxOAuthClientSecret: env.ROBLOX_OAUTH_CLIENT_SECRET || undefined,
    robloxOAuthRedirectUri:
      env.ROBLOX_OAUTH_REDIRECT_URI ?? "http://localhost:8787/v1/auth/roblox/callback",
    robloxOAuthScopes: env.ROBLOX_OAUTH_SCOPES ?? "openid profile universe.analytics:read",
    appOAuthCallbackUri:
      env.APP_OAUTH_CALLBACK_URI ?? "robloxanalyticsmobile://oauth/callback",
    appBaseUrl: env.APP_BASE_URL ?? `http://localhost:${port}`,
    sessionTtlSeconds,
    sessionEpoch,
  };
}
