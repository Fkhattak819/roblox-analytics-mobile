# roblox-analytics-mobile API contract

The canonical machine-readable contract is [`contracts/openapi.json`](../contracts/openapi.json). The Home DTO and runtime parser live in [`contracts/src/home.ts`](../contracts/src/home.ts) and are compiled into the backend while also being consumed by Expo.

## Route status

| Route | Status | Consumer |
| --- | --- | --- |
| `GET /v1/health` | Active | Deployment checks |
| `GET /v1/sample/home` | Active | Expo Sample/AWS development mode |
| `GET /v2/auth/roblox/start` | Implemented; AWS activation pending | Requires a mobile S256 challenge and state, persists the independent Roblox PKCE flow, and returns the authorization URL |
| `GET /v1/auth/roblox/callback` | Implemented; AWS activation pending | Consumes state, obtains Roblox identity, revokes Roblox tokens, and redirects to the app |
| `POST /v2/auth/session/exchange` | Implemented; AWS activation pending | Requires the initiating mobile verifier and atomically consumes the matching unexpired code |
| `GET /v1/auth/roblox/start`, `POST /v1/auth/session/exchange` | Retired; HTTP 410 | Requires an updated app; never falls back to code-only exchange |
| `GET /v1/auth/session` | Implemented; AWS activation pending | Reads the current authenticated Roblox identity |
| `POST /v1/auth/logout` | Implemented; AWS activation pending | Revokes the current app session |
| `POST /v1/auth/logout-all` | Implemented; AWS activation pending | Invalidates the account's current session generation |
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

### Mobile handoff protocol (v2)

The app uses `expo-crypto` asynchronous native random generation for two independent 32-byte values: a verifier and client state. It keeps both only in the pending call's memory. The verifier is encoded as 64 lowercase hex characters; `clientChallenge` is `BASE64URL(SHA256(ASCII(verifier)))` without padding.

`GET /v2/auth/roblox/start?clientChallenge=...&clientState=...` accepts the challenge and state, never the verifier. Server-side state stores them alongside the separate server-to-Roblox PKCE verifier. The existing registered `/v1/auth/roblox/callback` path remains in use; the app redirect now includes the stored mobile `state` with either `code` or `error`. The mobile parser rejects mismatched or duplicate state/code parameters and a changed callback destination before exchange.

`POST /v2/auth/session/exchange` accepts `{ code, clientVerifier }`. The backend derives the S256 challenge and checks it, expiry, and record type inside a conditional DynamoDB delete with returned old values. Wrong proof cannot consume the code. Legacy persisted states lacking proof fail closed. Authenticated session reads and logout retain their unchanged `/v1` paths and response shapes.

The v1 start/exchange endpoints return 410, including requests from older clients. Deploy backend support before shipping the updated client; do not reactivate the insecure v1 flow for compatibility. Authentication URLs require HTTPS; the native development wrapper explicitly permits loopback HTTP only. Production rejects HTTP, including loopback. API calls have 15-second client timeouts and disallow redirects. Verifiers, codes, tokens, request bodies, and authorization headers must not be logged.

The app restores tokens from SecureStore and verifies them before exposing identity. Sign-out clears local account state and secure storage, then attempts server revocation; failed remote revocation is reported as local-only. Account changes discard late requests and serialize keychain mutations. Sample selection remains offline. Native device testing remains required.

Account-wide logout replaces a persistent per-user generation marker. Sessions and pending exchanges from the previous generation cannot authenticate; the marker is read consistently and has no TTL. `SESSION_EPOCH` (CDK parameter `SessionEpoch`) additionally invalidates pre-recovery OAuth states, exchanges, and sessions. Recovery must use a new, never-reused epoch before serving traffic; this source mechanism does not establish that a restore has been tested.

### Snapshot data flow

OAuth upstream work shares a six-second monotonic deadline across token exchange and profile body consumption. Revocation receives a separate two-second budget. Lambda supplies its remaining invocation time; the work allowance shrinks to preserve cleanup plus one second for returning, or rejects before obtaining tokens when insufficient time remains. Redirects are rejected and cleanup failure prevents app exchange issuance. AWS credential/store latency and live runtime behavior still require verification; a timed-out token response can leave upstream tokens unknown to the service, so successful revocation is not guaranteed in that case.

1. Expo opens Roblox OAuth, receives a one-time callback code, and stores only the resulting app session token in the platform keychain. It never receives AWS credentials, the Roblox OAuth secret, or Roblox access/refresh tokens.
2. Screen requests read tenant-scoped snapshots from the API, not directly from Roblox.
3. A sync request creates a job and sends work to SQS.
4. A worker calls Roblox Open Cloud, polls asynchronous query jobs when required, normalizes results, and writes snapshots to DynamoDB.
5. Every response labels its source and freshness so sample, cached official, stale, and preliminary data cannot be confused.

## Security gates before real credentials

- Roblox OAuth identity is implemented with independent mobile-handoff S256 proof and server-to-Roblox PKCE, server-side state persistence, short expiries, atomic one-time exchanges, and replay protection. The development credential still needs to be created and loaded into AWS Secrets Manager before activation.
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
