import { loadConfig } from "../config.js";
import { createAwsAuthService } from "../modules/auth/auth-runtime.js";
import type { AuthService } from "../modules/auth/auth-service.js";
import {
  createAwsAnalyticsConnectionStatusStore,
  createAwsAnalyticsSnapshotStore,
} from "../modules/analytics/snapshot-runtime.js";
import type { AnalyticsConnectionStatusStore } from "../modules/analytics/connection-status-store.js";
import type { AnalyticsSnapshotStore } from "../modules/analytics/snapshot-store.js";
import { createAwsAnalyticsSyncJobService } from "../modules/analytics/sync-runtime.js";
import type { AnalyticsSyncJobService } from "../modules/analytics/sync-jobs.js";
import { routeRequest } from "../router.js";

type HttpApiEvent = {
  rawPath?: string;
  path?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
  httpMethod?: string;
};

type HttpApiResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: false;
};

const MAX_BODY_BYTES = 64 * 1024;
let cachedAuthService: AuthService | undefined;
let cachedAuthConfigKey: string | undefined;
let cachedAnalyticsSnapshotStore: AnalyticsSnapshotStore | undefined;
let cachedAnalyticsSyncJobService: AnalyticsSyncJobService | undefined;
let cachedAnalyticsConnectionStatusStore: AnalyticsConnectionStatusStore | undefined;

function parseBody(event: HttpApiEvent): unknown {
  if (!event.body) return undefined;

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw new Error("Request body too large");
  }

  return JSON.parse(raw);
}

export async function handler(event: HttpApiEvent): Promise<HttpApiResponse> {
  try {
    const config = loadConfig();
    const authService = getAuthService(config);
    const analyticsSnapshotStore = getAnalyticsSnapshotStore(config);
    const analyticsSyncJobService = getAnalyticsSyncJobService(config);
    const analyticsConnectionStatusStore = getAnalyticsConnectionStatusStore(config);
    const result = await routeRequest(
      {
        method: event.requestContext?.http?.method ?? event.httpMethod ?? "GET",
        path: event.rawPath ?? event.path ?? "/",
        query: event.queryStringParameters ?? undefined,
        headers: lowerCaseHeaders(event.headers),
        body: parseBody(event),
      },
      config,
      "aws",
      {
        authService,
        analyticsSnapshotStore,
        analyticsSyncJobService,
        analyticsConnectionStatusStore,
      },
    );

    return {
      statusCode: result.statusCode,
      headers: result.headers,
      body: JSON.stringify(result.body),
      isBase64Encoded: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return {
      statusCode: message === "Request body too large" ? 413 : 400,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body: JSON.stringify({ error: message }),
      isBase64Encoded: false,
    };
  }
}

function getAnalyticsConnectionStatusStore(config: ReturnType<typeof loadConfig>) {
  if (!cachedAnalyticsConnectionStatusStore) {
    cachedAnalyticsConnectionStatusStore = createAwsAnalyticsConnectionStatusStore(config);
  }
  return cachedAnalyticsConnectionStatusStore;
}

function getAnalyticsSyncJobService(config: ReturnType<typeof loadConfig>): AnalyticsSyncJobService | undefined {
  if (!cachedAnalyticsSyncJobService) {
    cachedAnalyticsSyncJobService = createAwsAnalyticsSyncJobService(config);
  }
  return cachedAnalyticsSyncJobService;
}

function getAnalyticsSnapshotStore(config: ReturnType<typeof loadConfig>): AnalyticsSnapshotStore | undefined {
  if (!cachedAnalyticsSnapshotStore) {
    cachedAnalyticsSnapshotStore = createAwsAnalyticsSnapshotStore(config);
  }
  return cachedAnalyticsSnapshotStore;
}

function getAuthService(config: ReturnType<typeof loadConfig>): AuthService | undefined {
  const key = `${config.tableName ?? ""}\0${config.robloxOAuthSecretArn ?? ""}`;
  if (key !== cachedAuthConfigKey) {
    cachedAuthConfigKey = key;
    cachedAuthService = createAwsAuthService(config);
  }
  return cachedAuthService;
}

function lowerCaseHeaders(
  headers: Record<string, string | undefined> | undefined,
): Record<string, string | undefined> | undefined {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
