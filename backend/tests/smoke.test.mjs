import test from "node:test";
import assert from "node:assert/strict";
import { parseHomeSnapshot } from "../dist/contracts/src/home.js";
import { fingerprintSecret, validateConnectionInput } from "../dist/backend/src/modules/analytics/connection.js";
import { sampleHome } from "../dist/backend/src/modules/sample/sample.js";
import { loadConfig } from "../dist/backend/src/config.js";
import { handler } from "../dist/backend/src/lambda/api-handler.js";
import { AuthService } from "../dist/backend/src/modules/auth/auth-service.js";
import { InMemoryAuthStore } from "../dist/backend/src/modules/auth/in-memory-auth-store.js";
import { StaticOAuthCredentialsProvider } from "../dist/backend/src/modules/auth/oauth-credentials.js";
import { routeRequest } from "../dist/backend/src/router.js";

test("validates an analytics connection and supports safe fingerprinting", () => {
  const result = validateConnectionInput({ apiKey: "secret-key-value", universeIds: ["123"] });
  assert.equal(result.ok, true);
  assert.equal(fingerprintSecret("secret-key-value"), "...alue");
});

test("sample mode is deterministic and labeled", () => {
  const data = sampleHome();
  assert.deepEqual(parseHomeSnapshot(data), data);
  assert.equal(data.mode, "sample");
  assert.equal(data.source, "sample_data");
  assert.match(data.message, /Sample Data/);
});

test("shared router serves health in local mode", async () => {
  const response = await routeRequest(
    { method: "GET", path: "/v1/health" },
    loadConfig({}),
    "local",
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    ok: true,
    service: "roblox-analytics-mobile-backend",
    mode: "local",
  });
});

test("Lambda adapter serves the same deterministic sample payload", async () => {
  const response = await handler({
    rawPath: "/v1/sample/home",
    requestContext: { http: { method: "GET" } },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).source, "sample_data");
});

test("AWS scaffold rejects Roblox credentials before inspecting them", async () => {
  const response = await handler({
    rawPath: "/v1/connections/analytics/validate",
    body: JSON.stringify({ apiKey: "do-not-process-this", universeIds: ["123"] }),
    requestContext: { http: { method: "POST" } },
  });
  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).status, "not_configured");
  assert.doesNotMatch(response.body, /do-not-process-this/);
});

test("OAuth start persists PKCE state and exposes only the authorization URL", async () => {
  const { authService } = testAuthService();
  const response = await routeRequest(
    { method: "GET", path: "/v1/auth/roblox/start" },
    loadConfig({}),
    "local",
    { authService },
  );
  const payload = JSON.stringify(response.body);
  assert.equal(response.statusCode, 200);
  assert.match(payload, /authorizationUrl/);
  assert.doesNotMatch(payload, /codeVerifier|clientSecret|configured-secret/);

  const authorizationUrl = new URL(response.body.authorizationUrl);
  assert.equal(authorizationUrl.origin, "https://apis.roblox.com");
  assert.equal(authorizationUrl.searchParams.get("client_id"), "configured-client");
  assert.equal(authorizationUrl.searchParams.get("scope"), "openid profile");
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
});

test("OAuth callback creates a one-time app exchange and revocable session", async () => {
  const { authService, calls } = testAuthService();
  const config = loadConfig({});
  const dependencies = { authService };

  const start = await routeRequest(
    { method: "GET", path: "/v1/auth/roblox/start" },
    config,
    "local",
    dependencies,
  );
  const state = new URL(start.body.authorizationUrl).searchParams.get("state");
  assert.ok(state);

  const callback = await routeRequest(
    {
      method: "GET",
      path: "/v1/auth/roblox/callback",
      query: { code: "roblox-authorization-code", state },
    },
    config,
    "local",
    dependencies,
  );
  assert.equal(callback.statusCode, 302);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].code, "roblox-authorization-code");
  assert.ok(calls[0].codeVerifier.length >= 43);
  assert.equal(calls[0].credentials.clientSecret, "configured-secret");

  const appRedirect = new URL(callback.headers.location);
  assert.equal(appRedirect.protocol, "robloxanalyticsmobile:");
  const exchangeCode = appRedirect.searchParams.get("code");
  assert.ok(exchangeCode);

  const exchange = await routeRequest(
    {
      method: "POST",
      path: "/v1/auth/session/exchange",
      body: { code: exchangeCode },
    },
    config,
    "local",
    dependencies,
  );
  assert.equal(exchange.statusCode, 200);
  assert.equal(exchange.body.user.sub, "123456");
  assert.ok(exchange.body.token);

  const replayedExchange = await routeRequest(
    {
      method: "POST",
      path: "/v1/auth/session/exchange",
      body: { code: exchangeCode },
    },
    config,
    "local",
    dependencies,
  );
  assert.equal(replayedExchange.statusCode, 401);

  const authorization = `Bearer ${exchange.body.token}`;
  const session = await routeRequest(
    { method: "GET", path: "/v1/auth/session", headers: { authorization } },
    config,
    "local",
    dependencies,
  );
  assert.equal(session.statusCode, 200);
  assert.equal(session.body.user.preferredUsername, "creator_name");

  const logout = await routeRequest(
    { method: "POST", path: "/v1/auth/logout", headers: { authorization } },
    config,
    "local",
    dependencies,
  );
  assert.equal(logout.statusCode, 204);

  const afterLogout = await routeRequest(
    { method: "GET", path: "/v1/auth/session", headers: { authorization } },
    config,
    "local",
    dependencies,
  );
  assert.equal(afterLogout.statusCode, 401);
});

test("OAuth state is consumed before the authorization code can be replayed", async () => {
  const { authService, calls } = testAuthService();
  const config = loadConfig({});
  const dependencies = { authService };
  const start = await routeRequest(
    { method: "GET", path: "/v1/auth/roblox/start" },
    config,
    "local",
    dependencies,
  );
  const state = new URL(start.body.authorizationUrl).searchParams.get("state");
  assert.ok(state);

  const request = {
    method: "GET",
    path: "/v1/auth/roblox/callback",
    query: { code: "single-use-code", state },
  };
  assert.equal((await routeRequest(request, config, "local", dependencies)).statusCode, 302);
  assert.equal((await routeRequest(request, config, "local", dependencies)).statusCode, 400);
  assert.equal(calls.length, 1);
});

function testAuthService() {
  const calls = [];
  const config = loadConfig({});
  const authService = new AuthService(
    config,
    new InMemoryAuthStore(),
    new StaticOAuthCredentialsProvider({
      clientId: "configured-client",
      clientSecret: "configured-secret",
    }),
    {
      async exchangeCodeForProfile(input) {
        calls.push(input);
        return {
          sub: "123456",
          name: "Creator Name",
          preferredUsername: "creator_name",
          profileUrl: "https://www.roblox.com/users/123456/profile",
        };
      },
    },
  );
  return { authService, calls };
}
