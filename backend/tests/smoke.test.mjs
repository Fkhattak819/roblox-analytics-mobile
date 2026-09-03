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
import { InMemoryAnalyticsSnapshotStore } from "../dist/backend/src/modules/analytics/snapshot-store.js";
import { AnalyticsSnapshotSyncService } from "../dist/backend/src/modules/analytics/snapshot-sync.js";
import { AnalyticsSyncJobService } from "../dist/backend/src/modules/analytics/sync-jobs.js";
import {
  AnalyticsConfigurationError,
  StaticAnalyticsApiKeyProvider,
} from "../dist/backend/src/modules/analytics/analytics-credentials.js";

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

test("analytics snapshot route requires a session and reads only the session tenant", async () => {
  const config = loadConfig({});
  const authStore = new InMemoryAuthStore();
  const sessionToken = "s".repeat(32);
  await authStore.putSession(sessionToken, {
    user: { sub: "123456", preferredUsername: "creator_name" },
    expiresAt: Date.now() + 60_000,
  });
  const authService = new AuthService(
    config,
    authStore,
    new StaticOAuthCredentialsProvider({
      clientId: "configured-client",
      clientSecret: "configured-secret",
    }),
  );
  const analyticsSnapshotStore = new InMemoryAnalyticsSnapshotStore();
  const snapshot = {
    mode: "connected",
    source: "roblox_open_cloud",
    freshness: "fresh",
    asOf: "2026-09-02T20:00:00Z",
    universeId: "10009166512",
    section: "overview",
    range: "28D",
    metrics: [{ id: "dau", label: "Daily active users", displayValue: "287", rawValue: 287 }],
    charts: [],
    breakdowns: [],
    message: "Official Roblox analytics",
  };
  await analyticsSnapshotStore.putSnapshot({
    ownerSub: "123456",
    universeId: snapshot.universeId,
    section: snapshot.section,
    range: snapshot.range,
  }, snapshot);

  const path = "/v1/analytics/overview";
  const query = { universeId: snapshot.universeId, range: snapshot.range };
  const unauthorized = await routeRequest(
    { method: "GET", path, query },
    config,
    "local",
    { authService, analyticsSnapshotStore },
  );
  assert.equal(unauthorized.statusCode, 401);

  const authorized = await routeRequest(
    { method: "GET", path, query, headers: { authorization: `Bearer ${sessionToken}` } },
    config,
    "local",
    { authService, analyticsSnapshotStore },
  );
  assert.equal(authorized.statusCode, 200);
  assert.equal(authorized.body.source, "roblox_open_cloud");

  const otherTenantToken = "t".repeat(32);
  await authStore.putSession(otherTenantToken, {
    user: { sub: "999999" },
    expiresAt: Date.now() + 60_000,
  });
  const isolated = await routeRequest(
    { method: "GET", path, query, headers: { authorization: `Bearer ${otherTenantToken}` } },
    config,
    "local",
    { authService, analyticsSnapshotStore },
  );
  assert.equal(isolated.statusCode, 404);
});

test("analytics sync jobs derive the tenant from the authenticated session", async () => {
  const config = loadConfig({ ANALYTICS_UNIVERSE_IDS: "10009166512" });
  const authStore = new InMemoryAuthStore();
  const sessionToken = "q".repeat(32);
  await authStore.putSession(sessionToken, {
    user: { sub: "123456", preferredUsername: "creator_name" },
    expiresAt: Date.now() + 60_000,
  });
  const authService = new AuthService(
    config,
    authStore,
    new StaticOAuthCredentialsProvider({
      clientId: "configured-client",
      clientSecret: "configured-secret",
    }),
  );
  const requested = [];
  const analyticsSyncJobService = {
    async request(input) {
      requested.push(input);
      return { status: "queued", jobId: "job-1", retryAfterSeconds: 60 };
    },
  };
  const response = await routeRequest(
    {
      method: "POST",
      path: "/v1/sync-jobs",
      headers: { authorization: `Bearer ${sessionToken}` },
      body: {
        ownerSub: "attacker-controlled",
        universeId: "10009166512",
        section: "overview",
        range: "28D",
      },
    },
    config,
    "local",
    { authService, analyticsSyncJobService },
  );
  assert.equal(response.statusCode, 202);
  assert.equal(response.headers["retry-after"], "60");
  assert.equal(requested[0].ownerSub, "123456");
  assert.equal(requested[0].universeId, "10009166512");

  const denied = await routeRequest(
    {
      method: "POST",
      path: "/v1/sync-jobs",
      headers: { authorization: `Bearer ${sessionToken}` },
      body: { universeId: "999999", section: "overview", range: "28D" },
    },
    config,
    "local",
    { authService, analyticsSyncJobService },
  );
  assert.equal(denied.statusCode, 403);
});

test("connection status exposes backend metadata without secret material", async () => {
  const config = loadConfig({ ANALYTICS_UNIVERSE_IDS: "10009166512" });
  const authStore = new InMemoryAuthStore();
  const sessionToken = "c".repeat(32);
  await authStore.putSession(sessionToken, {
    user: { sub: "123456", preferredUsername: "creator_name" },
    expiresAt: Date.now() + 60_000,
  });
  const authService = new AuthService(
    config,
    authStore,
    new StaticOAuthCredentialsProvider({ clientId: "configured-client", clientSecret: "configured-secret" }),
  );
  const analyticsConnectionStatusStore = {
    async get(ownerSub, universeId) {
      assert.equal(ownerSub, "123456");
      return {
        status: "active",
        universeId,
        lastAttemptAt: "2026-09-02T20:00:00Z",
        lastSyncedAt: "2026-09-02T20:00:00Z",
      };
    },
  };
  const result = await routeRequest(
    {
      method: "GET",
      path: "/v1/connections",
      query: { universeId: "10009166512" },
      headers: { authorization: `Bearer ${sessionToken}` },
    },
    config,
    "local",
    { authService, analyticsConnectionStatusStore },
  );
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.identity.username, "creator_name");
  assert.equal(result.body.analytics.status, "active");
  assert.doesNotMatch(JSON.stringify(result.body), /apiKey|fingerprint|secret/i);
});

test("analytics sync jobs are cooldown-gated before queueing", async () => {
  let acquired = true;
  const queued = [];
  const service = new AnalyticsSyncJobService(
    { async tryAcquire() { return acquired; } },
    { async enqueue(message) { queued.push(message); } },
    () => new Date("2026-09-02T20:00:00Z"),
  );
  const request = {
    ownerSub: "123456",
    universeId: "10009166512",
    section: "overview",
    range: "28D",
  };
  const first = await service.request(request);
  acquired = false;
  const duplicate = await service.request(request);
  assert.equal(first.status, "queued");
  assert.equal(duplicate.status, "already_queued");
  assert.equal(queued.length, 1);
  assert.doesNotMatch(JSON.stringify(queued[0]), /apiKey|secret/i);
});

test("analytics key provider fails closed on the deployment placeholder", async () => {
  await assert.rejects(
    () => new StaticAnalyticsApiKeyProvider("replace-after-creation").getApiKey(),
    (error) => error instanceof AnalyticsConfigurationError,
  );
  assert.equal(
    await new StaticAnalyticsApiKeyProvider("server-only-analytics-key").getApiKey(),
    "server-only-analytics-key",
  );
});

test("analytics sync projects official metric queries into a cached snapshot", async () => {
  const calls = [];
  const queryClient = {
    async queryMetric(apiKey, universeId, query) {
      calls.push({ apiKey, universeId, query });
      const current = Date.parse(query.startTime) >= Date.parse("2026-08-05T00:00:00Z");
      return {
        values: [{
          breakdowns: [],
          dataPoints: [
            { time: query.startTime, value: current ? 100 : 80 },
            { time: query.endTime, value: current ? 120 : 100 },
          ],
        }],
      };
    },
  };
  const store = new InMemoryAnalyticsSnapshotStore();
  const service = new AnalyticsSnapshotSyncService(queryClient, store, async () => undefined);
  const snapshot = await service.sync({
    apiKey: "server-only-analytics-key",
    ownerSub: "123456",
    universeId: "10009166512",
    section: "overview",
    range: "28D",
    now: new Date("2026-09-02T00:00:00Z"),
  });

  assert.equal(calls.length, 8);
  assert.equal(snapshot.metrics.length, 4);
  assert.equal(snapshot.metrics[0].displayValue, "120");
  assert.equal(snapshot.metrics[0].change, "↑ 20.0%");
  assert.equal(snapshot.charts[0].series.length, 2);
  assert.doesNotMatch(JSON.stringify(snapshot), /server-only-analytics-key/);
  const cached = await store.getSnapshot({
    ownerSub: "123456",
    universeId: "10009166512",
    section: "overview",
    range: "28D",
  });
  assert.deepEqual(cached, snapshot);
});

test("acquisition sync uses period-unique summaries instead of summing daily unique users", async () => {
  const calls = [];
  const queryClient = {
    async queryMetric(_apiKey, _universeId, query) {
      calls.push(query);
      const current = Date.parse(query.startTime) >= Date.parse("2026-08-05T00:00:00Z");
      return {
        values: [{
          breakdowns: [],
          dataPoints: query.granularity === "None"
            ? [{ value: current ? 66 : 50 }]
            : [
                { time: query.startTime, value: current ? 10 : 8 },
                { time: query.endTime, value: current ? 12 : 9 },
              ],
        }],
      };
    },
  };
  const store = new InMemoryAnalyticsSnapshotStore();
  const service = new AnalyticsSnapshotSyncService(queryClient, store, async () => undefined);
  const snapshot = await service.sync({
    apiKey: "server-only-analytics-key",
    ownerSub: "123456",
    universeId: "10009166512",
    section: "acquisition",
    range: "28D",
    now: new Date("2026-09-02T00:00:00Z"),
  });

  assert.equal(calls.length, 16);
  assert.equal(calls.filter((call) => call.granularity === "None").length, 8);
  assert.equal(snapshot.metrics[0].displayValue, "66");
  assert.equal(snapshot.metrics[0].change, "↑ 32.0%");
  assert.equal(snapshot.charts[0].series[0].points.length, 2);
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
