import type { Config } from "./config.js";
import {
  analyticsSectionIds,
  type AnalyticsDateRange,
  type AnalyticsSectionId,
} from "../../contracts/src/analytics.js";
import { AuthService, AuthServiceError } from "./modules/auth/auth-service.js";
import {
  ANALYTICS_SCOPE,
  fingerprintSecret,
  validateConnectionInput,
} from "./modules/analytics/connection.js";
import type { AnalyticsSnapshotStore } from "./modules/analytics/snapshot-store.js";
import type { AnalyticsConnectionStatusStore } from "./modules/analytics/connection-status-store.js";
import { isSyncableAnalyticsSection } from "./modules/analytics/snapshot-sync.js";
import type { AnalyticsSyncJobService } from "./modules/analytics/sync-jobs.js";
import { sampleHome } from "./modules/sample/sample.js";

export type AppRequest = {
  method: string;
  path: string;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: unknown;
};

export type AppResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

export type RuntimeMode = "local" | "aws";

export type RouteDependencies = Readonly<{
  authService?: AuthService;
  analyticsSnapshotStore?: AnalyticsSnapshotStore;
  analyticsSyncJobService?: AnalyticsSyncJobService;
  analyticsConnectionStatusStore?: AnalyticsConnectionStatusStore;
}>;

function response(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): AppResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
    body,
  };
}

export async function routeRequest(
  request: AppRequest,
  config: Config,
  mode: RuntimeMode,
  dependencies: RouteDependencies = {},
): Promise<AppResponse> {
  if (request.method === "GET" && request.path === "/v1/health") {
    return response(200, {
      ok: true,
      service: "roblox-analytics-mobile-backend",
      mode,
    });
  }

  if (request.method === "GET" && request.path === "/v1/sample/home") {
    return response(200, sampleHome());
  }

  if (request.method === "GET" && request.path === "/v1/auth/roblox/start") {
    return withAuth(dependencies.authService, async (auth) => {
      const result = await auth.startRobloxOAuth();
      return response(200, result);
    });
  }

  if (request.method === "GET" && request.path === "/v1/auth/roblox/callback") {
    return withAuth(dependencies.authService, async (auth) => {
      const redirectUrl = request.query?.error
        ? await auth.cancelRobloxOAuth(request.query.state)
        : await auth.completeRobloxOAuth({
            code: request.query?.code ?? "",
            state: request.query?.state ?? "",
          });
      return response(302, { status: "redirecting" }, { location: redirectUrl });
    });
  }

  if (request.method === "POST" && request.path === "/v1/auth/session/exchange") {
    return withAuth(dependencies.authService, async (auth) => {
      const code = getObjectProperty(request.body, "code");
      const result = await auth.exchangeAppSession(code);
      return response(200, {
        token: result.token,
        expiresAt: new Date(result.session.expiresAt).toISOString(),
        user: result.session.user,
      });
    });
  }

  if (request.method === "GET" && request.path === "/v1/auth/session") {
    return withAuth(dependencies.authService, async (auth) => {
      const session = await auth.getSession(request.headers?.authorization);
      return response(200, {
        expiresAt: new Date(session.expiresAt).toISOString(),
        user: session.user,
      });
    });
  }

  const analyticsRoute = /^\/v1\/analytics\/([a-z-]+)$/.exec(request.path);
  if (request.method === "GET" && analyticsRoute?.[1]) {
    return readAnalyticsSnapshot(
      request,
      analyticsRoute[1],
      dependencies.authService,
      dependencies.analyticsSnapshotStore,
    );
  }

  if (request.method === "POST" && request.path === "/v1/sync-jobs") {
    return requestAnalyticsSync(
      request,
      config,
      dependencies.authService,
      dependencies.analyticsSyncJobService,
    );
  }

  if (request.method === "GET" && request.path === "/v1/connections") {
    return readConnections(
      request,
      config,
      dependencies.authService,
      dependencies.analyticsConnectionStatusStore,
    );
  }

  if (request.method === "POST" && request.path === "/v1/auth/logout") {
    return withAuth(dependencies.authService, async (auth) => {
      await auth.logout(request.headers?.authorization);
      return response(204, null);
    });
  }

  if (request.method === "POST" && request.path === "/v1/connections/analytics/validate") {
    if (mode === "aws") {
      return response(503, {
        status: "not_configured",
        message: "Roblox credential submission is disabled in the development AWS scaffold.",
      });
    }

    const result = validateConnectionInput(request.body);
    if (!result.ok) return response(400, { error: result.error });

    // This first AWS slice deliberately does not call Roblox or persist credentials.
    return response(501, {
      status: "not_configured",
      scope: ANALYTICS_SCOPE,
      universeIds: result.value.universeIds,
      fingerprint: fingerprintSecret(result.value.apiKey),
      message: "Cloud credential validation is not enabled in this scaffold.",
    });
  }

  return response(404, { error: "Not found" });
}

async function readConnections(
  request: AppRequest,
  config: Config,
  authService: AuthService | undefined,
  statusStore: AnalyticsConnectionStatusStore | undefined,
): Promise<AppResponse> {
  if (!authService) {
    return response(503, { error: "oauth_not_configured", message: "Roblox OAuth is not configured" });
  }
  try {
    const session = await authService.getSession(request.headers?.authorization);
    const universeId = parseUniverseId(request.query?.universeId);
    if (!config.analyticsUniverseIds.includes(universeId)) {
      return response(403, { error: "analytics_universe_not_allowed", message: "This experience is not enabled." });
    }
    const stored = statusStore ? await statusStore.get(session.user.sub, universeId) : null;
    return response(200, {
      identity: {
        status: "connected",
        username: session.user.preferredUsername ?? session.user.name ?? session.user.sub,
      },
      analytics: {
        status: stored?.status ?? "pending",
        scope: "universe.analytics:read",
        universeId,
        ...(stored?.lastAttemptAt ? { lastAttemptAt: stored.lastAttemptAt } : {}),
        ...(stored?.lastSyncedAt ? { lastSyncedAt: stored.lastSyncedAt } : {}),
      },
    });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response(error.statusCode, { error: error.code, message: error.message });
    }
    if (error instanceof AnalyticsRequestError) {
      return response(400, { error: error.code, message: error.message });
    }
    return response(500, { error: "connection_status_failed", message: "Connection status could not be loaded." });
  }
}

async function requestAnalyticsSync(
  request: AppRequest,
  config: Config,
  authService: AuthService | undefined,
  syncService: AnalyticsSyncJobService | undefined,
): Promise<AppResponse> {
  if (!authService) {
    return response(503, { error: "oauth_not_configured", message: "Roblox OAuth is not configured" });
  }
  if (!syncService || config.analyticsUniverseIds.length === 0) {
    return response(503, {
      error: "analytics_sync_not_configured",
      message: "Official analytics synchronization is not configured.",
    });
  }

  try {
    const session = await authService.getSession(request.headers?.authorization);
    const universeId = parseUniverseId(asString(getObjectProperty(request.body, "universeId")));
    const section = parseAnalyticsSection(asString(getObjectProperty(request.body, "section")) ?? "");
    const range = parseAnalyticsRange(asString(getObjectProperty(request.body, "range")));
    if (!config.analyticsUniverseIds.includes(universeId)) {
      return response(403, {
        error: "analytics_universe_not_allowed",
        message: "This experience is not enabled for official analytics synchronization.",
      });
    }
    if (!isSyncableAnalyticsSection(section)) {
      return response(422, {
        error: "analytics_section_not_syncable",
        message: "This analytics section does not yet have a safe official-data mapping.",
      });
    }
    const result = await syncService.request({
      ownerSub: session.user.sub,
      universeId,
      section,
      range,
    });
    return response(202, result, { "retry-after": String(result.retryAfterSeconds) });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response(error.statusCode, { error: error.code, message: error.message });
    }
    if (error instanceof AnalyticsRequestError) {
      return response(400, { error: error.code, message: error.message });
    }
    return response(500, {
      error: "analytics_sync_failed",
      message: "Analytics synchronization could not be requested.",
    });
  }
}

async function readAnalyticsSnapshot(
  request: AppRequest,
  sectionValue: string,
  authService: AuthService | undefined,
  snapshotStore: AnalyticsSnapshotStore | undefined,
): Promise<AppResponse> {
  if (!authService) {
    return response(503, { error: "oauth_not_configured", message: "Roblox OAuth is not configured" });
  }

  try {
    const session = await authService.getSession(request.headers?.authorization);
    if (!snapshotStore) {
      return response(503, {
        error: "analytics_store_not_configured",
        message: "The analytics snapshot store is not configured.",
      });
    }

    const section = parseAnalyticsSection(sectionValue);
    const universeId = parseUniverseId(request.query?.universeId);
    const range = parseAnalyticsRange(request.query?.range);
    const snapshot = await snapshotStore.getSnapshot({
      ownerSub: session.user.sub,
      universeId,
      section,
      range,
    });
    if (!snapshot) {
      return response(404, {
        error: "analytics_snapshot_not_found",
        message: "Official analytics have not been synchronized for this experience and date range yet.",
      });
    }
    return response(200, snapshot);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response(error.statusCode, { error: error.code, message: error.message });
    }
    if (error instanceof AnalyticsRequestError) {
      return response(400, { error: error.code, message: error.message });
    }
    return response(500, {
      error: "analytics_snapshot_failed",
      message: "Analytics could not be loaded.",
    });
  }
}

class AnalyticsRequestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

function parseAnalyticsSection(value: string): AnalyticsSectionId {
  if (!(analyticsSectionIds as readonly string[]).includes(value)) {
    throw new AnalyticsRequestError("invalid_analytics_section", "Unsupported analytics section.");
  }
  return value as AnalyticsSectionId;
}

function parseUniverseId(value: string | undefined): string {
  if (!value || !/^\d+$/.test(value)) {
    throw new AnalyticsRequestError("invalid_universe_id", "A numeric universeId is required.");
  }
  return value;
}

function parseAnalyticsRange(value: string | undefined): AnalyticsDateRange {
  if (value !== "24H" && value !== "7D" && value !== "28D" && value !== "56D" && value !== "90D") {
    throw new AnalyticsRequestError("invalid_analytics_range", "A supported analytics range is required.");
  }
  return value;
}

async function withAuth(
  authService: AuthService | undefined,
  operation: (auth: AuthService) => Promise<AppResponse>,
): Promise<AppResponse> {
  if (!authService) {
    return response(503, {
      error: "oauth_not_configured",
      message: "Roblox OAuth is not configured",
    });
  }

  try {
    return await operation(authService);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return response(error.statusCode, { error: error.code, message: error.message });
    }
    return response(500, { error: "auth_service_failed", message: "Authentication service failed" });
  }
}

function getObjectProperty(value: unknown, property: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[property]
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
