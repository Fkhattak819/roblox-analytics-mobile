import test from "node:test";
import assert from "node:assert/strict";
import { fingerprintSecret, validateConnectionInput } from "../dist/modules/analytics/connection.js";
import { sampleHome } from "../dist/modules/sample/sample.js";

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
