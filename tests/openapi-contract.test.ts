import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const openApiPath = resolve(dirname(fileURLToPath(import.meta.url)), '../contracts/openapi.json');
const openApi = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
  openapi?: string;
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

test('publishes an OpenAPI 3.1 contract for every implemented route', () => {
  assert.equal(openApi.openapi, '3.1.0');
  assert.deepEqual(Object.keys(openApi.paths ?? {}).sort(), [
    '/v1/auth/roblox/start',
    '/v1/connections/analytics/validate',
    '/v1/health',
    '/v1/sample/home',
  ]);
});

test('defines the shared Home response and credential-safe connection request', () => {
  const schemas = openApi.components?.schemas ?? {};
  assert.ok(schemas.HomeSnapshot);
  assert.ok(schemas.HomePortfolio);

  const connection = schemas.AnalyticsConnectionRequest as {
    properties?: { apiKey?: { writeOnly?: boolean } };
  };
  assert.equal(connection.properties?.apiKey?.writeOnly, true);
});
