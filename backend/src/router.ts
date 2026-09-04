import type { Config } from "./config.js";
import { AuthService, AuthServiceError } from "./modules/auth/auth-service.js";
import {
  ANALYTICS_SCOPE,
  fingerprintSecret,
  validateConnectionInput,
} from "./modules/analytics/connection.js";
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
