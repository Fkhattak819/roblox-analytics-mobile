import { securityEvent } from '../modules/auth/security-event.js';
import { loadConfig } from "../config.js";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoLoginLimiter } from '../modules/auth/login-limiter.js';
import { publicHttpError, RequestBodyTooLargeError } from "../http.js";
import { createAwsAuthService } from "../modules/auth/auth-runtime.js";
import type { AuthService } from "../modules/auth/auth-service.js";
import { routeRequest } from "../router.js";
import { DynamoAnalyticsAuthorizer } from '../modules/analytics/authorization.js';
import { createAwsAnalyticsSnapshotStore, createAwsAnalyticsConnectionStatusStore } from '../modules/analytics/snapshot-runtime.js';
import { createAwsAnalyticsSyncJobService } from '../modules/analytics/sync-runtime.js';

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
      sourceIp?: string;
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
const limiterClient = new DynamoDBClient({ maxAttempts: 1 });

function parseBody(event: HttpApiEvent): unknown {
  if (!event.body) return undefined;

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  return JSON.parse(raw);
}

export async function handler(event: HttpApiEvent, context?: { getRemainingTimeInMillis: () => number }): Promise<HttpApiResponse> {
  try {
    const config = loadConfig();
    const authService = getAuthService(config);
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
        authService, remainingTimeMs: context ? () => context.getRemainingTimeInMillis() : undefined,
        loginLimiter: config.tableName ? new DynamoLoginLimiter(limiterClient, config.tableName) : undefined,
        sourceAddress: event.requestContext?.http?.sourceIp,
        analyticsAuthorizer: config.tableName ? new DynamoAnalyticsAuthorizer(limiterClient, config.tableName) : undefined,
        analyticsSnapshotStore: createAwsAnalyticsSnapshotStore(config),
        analyticsConnectionStatusStore: createAwsAnalyticsConnectionStatusStore(config),
        analyticsSyncJobService: createAwsAnalyticsSyncJobService(config),
      },
    );

    return {
      statusCode: result.statusCode,
      headers: result.headers,
      body: auditedBody(event, result.statusCode, result.body),
      isBase64Encoded: false,
    };
  } catch (error) {
    const result = publicHttpError(error);
    return {
      statusCode: result.statusCode,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
      body: auditedBody(event, result.statusCode, result.body),
      isBase64Encoded: false,
    };
  }
}

function getAuthService(config: ReturnType<typeof loadConfig>): AuthService | undefined {
  const key = `${config.tableName ?? ""}\0${config.robloxOAuthSecretArn ?? ""}\0${config.sessionEpoch}`;
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

function auditedBody(event: HttpApiEvent, status: number, body: unknown): string {
  const audit = securityEvent(event.requestContext?.http?.method ?? event.httpMethod ?? 'GET', event.rawPath ?? event.path ?? '/', status);
  if (audit) console.info(audit);
  return JSON.stringify(body);
}
