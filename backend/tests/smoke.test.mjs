import test from "node:test";
import assert from "node:assert/strict";
import { fingerprintSecret, validateConnectionInput } from "../dist/modules/analytics/connection.js";
import { sampleHome } from "../dist/modules/sample/sample.js";
import { loadConfig } from "../dist/config.js";
import { handler } from "../dist/lambda/api-handler.js";
import { routeRequest } from "../dist/router.js";

test("validates an analytics connection and supports safe fingerprinting", () => {
  const result = validateConnectionInput({ apiKey: "secret-key-value", universeIds: ["123"] });
  assert.equal(result.ok, true);
  assert.equal(fingerprintSecret("secret-key-value"), "...alue");
});

test("sample mode is deterministic and labeled", () => {
  const data = sampleHome();
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
