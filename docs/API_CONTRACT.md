# roblox-analytics-mobile API contract

The canonical machine-readable contract is [`contracts/openapi.json`](../contracts/openapi.json). The Home DTO and runtime parser live in [`contracts/src/home.ts`](../contracts/src/home.ts) and are compiled into the backend while also being consumed by Expo.

## Route status

| Route | Status | Consumer |
| --- | --- | --- |
| `GET /v1/health` | Active | Deployment checks |
| `GET /v1/sample/home` | Active | Expo Sample/AWS development mode |
| `GET /v1/auth/roblox/start` | Implemented; AWS activation pending | Creates persisted one-time PKCE state and returns the authorization URL |
| `GET /v1/auth/roblox/callback` | Implemented; AWS activation pending | Consumes state, obtains Roblox identity, revokes Roblox tokens, and redirects to the app |
| `POST /v1/auth/session/exchange` | Implemented; AWS activation pending | Trades a one-time mobile code for an opaque app session |
| `GET /v1/auth/session` | Implemented; AWS activation pending | Reads the current authenticated Roblox identity |
| `POST /v1/auth/logout` | Implemented; AWS activation pending | Revokes the current app session |
| `POST /v1/connections/analytics/validate` | Scaffolded, disabled in AWS | Future Open Cloud analytics connection |

Scaffolded routes must fail closed. They cannot accept or persist a Roblox credential until their storage, redaction, authentication, and audit requirements are implemented and tested.

## Planned authenticated surface

These routes are an implementation inventory, not deployed API promises. Add each operation to OpenAPI only when its response schema and authorization behavior are implemented.

| Screen capability | Planned route | Data source |
| --- | --- | --- |
| Connected Home | `GET /v1/home` | Cached aggregate snapshot |
| Experience list | `GET /v1/experiences` | Cached Open Cloud inventory |
| Experience detail | `GET /v1/experiences/{experienceId}` | Cached aggregate snapshot |
| Analytics overview | `GET /v1/analytics/overview` | Cached Analytics Query results |
| Analytics section | `GET /v1/analytics/{section}` | Cached Analytics Query results |
| Sales overview | `GET /v1/sales/overview` | Cached official monetization aggregates |
| Product detail | `GET /v1/sales/products/{productId}` | Cached official aggregates |
| Preliminary live sale | `GET /v1/sales/events/{eventId}` | Optional signed game-server instrumentation |
| Connection status | `GET /v1/connections` | Backend metadata only; never secret material |
| Request synchronization | `POST /v1/sync-jobs` | Enqueues SQS work and returns a job identifier |

## Data flow

1. Expo opens Roblox OAuth, receives a one-time callback code, and stores only the resulting app session token in the platform keychain. It never receives AWS credentials, the Roblox OAuth secret, or Roblox access/refresh tokens.
2. Screen requests read tenant-scoped snapshots from the API, not directly from Roblox.
3. A sync request creates a job and sends work to SQS.
4. A worker calls Roblox Open Cloud, polls asynchronous query jobs when required, normalizes results, and writes snapshots to DynamoDB.
5. Every response labels its source and freshness so sample, cached official, stale, and preliminary data cannot be confused.

## Security gates before real credentials

- Roblox OAuth identity is implemented with PKCE, server-side state persistence, short expiries, atomic one-time exchanges, and replay protection. The development credential still needs to be created and loaded into AWS Secrets Manager before activation.
- Authenticate every non-sample route and derive tenant identity from the session, never from a client-provided tenant ID.
- Accept only a dedicated least-privilege Roblox Open Cloud key; never request `.ROBLOSECURITY`.
- Encrypt accepted keys with a customer-managed KMS key, redact request bodies and headers, and never return secret material.
- Establish a reviewed outbound-network strategy compatible with Roblox key restrictions before production.
- Add key rotation, revocation, deletion, failed-validation throttling, and security-event audit records.

## Contract rules

- OpenAPI describes only implemented behavior. Planned routes stay in this document until built.
- Breaking response changes require a new API version rather than silently changing `/v1`.
- Mobile parses unknown JSON at the network boundary before exposing it to screens.
- Sample Mode returns its local fixture before any network call is created.
- Official Roblox aggregates and optional preliminary live events remain separate types and UI states.
