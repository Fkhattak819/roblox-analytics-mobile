import { createServer } from "node:http";
import { loadConfig } from "./config.js";
import { json, readJson } from "./http.js";
import { routeRequest } from "./router.js";

const config = loadConfig();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", config.appBaseUrl);
    const body = req.method === "POST" || req.method === "PUT" ? await readJson(req) : undefined;
    const result = await routeRequest(
      { method: req.method ?? "GET", path: url.pathname, body },
      config,
      "local",
    );
    return json(res, result.statusCode, result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(res, message === "Request body too large" ? 413 : 400, { error: message });
  }
});

server.listen(config.port, () => {
  console.log(`roblox-analytics-mobile backend listening on ${config.appBaseUrl}`);
});
