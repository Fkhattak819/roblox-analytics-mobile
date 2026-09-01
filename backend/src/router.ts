import type { Config } from "./config.js";
import { createOAuthStart } from "./modules/auth/roblox-oauth.js";
import {
  ANALYTICS_SCOPE,
  fingerprintSecret,
  validateConnectionInput,
} from "./modules/analytics/connection.js";
import { sampleHome } from "./modules/sample/sample.js";

export type AppRequest = {
  method: string;
  path: string;
  body?: unknown;
};

export type AppResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

export type RuntimeMode = "local" | "aws";

function response(statusCode: number, body: unknown): AppResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body,
  };
}

export async function routeRequest(
  request: AppRequest,
  config: Config,
  mode: RuntimeMode,
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
    const result = createOAuthStart(config);
    return result.error ? response(503, result) : response(200, result);
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
