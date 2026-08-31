import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { json, readJson } from "./http.js";
import { createOAuthStart } from "./modules/auth/roblox-oauth.js";
import {
  ANALYTICS_SCOPE,
  fingerprintSecret,
  validateConnectionInput,
} from "./modules/analytics/connection.js";
import { sampleHome } from "./modules/sample/sample.js";

const config = loadConfig();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", config.appBaseUrl);

    if (req.method === "GET" && url.pathname === "/v1/health") {
      return json(res, 200, { ok: true, service: "studiopulse-backend", mode: "local" });
    }
    if (req.method === "GET" && url.pathname === "/v1/sample/home") {
      return json(res, 200, sampleHome());
    }
    if (req.method === "GET" && url.pathname === "/v1/auth/roblox/start") {
      const result = createOAuthStart(config);
      return result.error ? json(res, 503, result) : json(res, 200, result);
    }
    if (req.method === "POST" && url.pathname === "/v1/connections/analytics/validate") {
      const result = validateConnectionInput(await readJson(req));
      if (!result.ok) return json(res, 400, { error: result.error });

      // Local mode intentionally does not call Roblox or persist credentials.
      return json(res, 501, {
        status: "not_configured",
        scope: ANALYTICS_SCOPE,
        universeIds: result.value.universeIds,
        fingerprint: fingerprintSecret(result.value.apiKey),
        message: "Cloud credential validation is not enabled in the local scaffold.",
      });
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(res, message === "Request body too large" ? 413 : 400, { error: message });
  }
});

server.listen(config.port, () => {
  console.log(`StudioPulse backend listening on ${config.appBaseUrl}`);
});
