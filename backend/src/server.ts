import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { readJson } from "./http.js";
import { createLocalAuthService } from "./modules/auth/auth-runtime.js";
import { routeRequest } from "./router.js";

const config = loadConfig();
const authService = createLocalAuthService(config);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", config.appBaseUrl);
    const body = req.method === "POST" || req.method === "PUT" ? await readJson(req) : undefined;
    const result = await routeRequest(
      {
        method: req.method ?? "GET",
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : value,
          ]),
        ),
        body,
      },
      config,
      "local",
      { authService },
    );
    const payload = result.statusCode === 204 ? "" : JSON.stringify(result.body);
    res.writeHead(result.statusCode, {
      ...result.headers,
      "content-length": Buffer.byteLength(payload),
    });
    res.end(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const payload = JSON.stringify({ error: message });
    res.writeHead(message === "Request body too large" ? 413 : 400, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(payload),
      "cache-control": "no-store",
    });
    res.end(payload);
  }
});

server.listen(config.port, () => {
  console.log(`roblox-analytics-mobile backend listening on ${config.appBaseUrl}`);
});
