# Security and readiness review — 2026-09-05

## URI decoder checkpoint — 2026-09-06

- Replaced the vulnerable decoder with unmodified upstream 0.5.0 via a private CommonJS compatibility adapter, preserving callable exports and plus-to-space behavior. The real upstream package remains in the lockfile/advisory scan. Corrected an initial npm relative-link artifact; npm ls now resolves query-string to the valid root adapter.
- Verified clean dependency installation, 40 app tests including bounded malformed-percent input, TypeScript, lint, clean-cache iOS export, and redacted history/source/export scans. Root lockfile audit now reports zero advisories; no severity suppressions were added.
- Native Node/Metro module compatibility is locally tested; iPhone runtime acceptance remains pending. No push or deployment occurred.
- Next: complete distributed abuse controls and safe diagnostics, then tenant-authorized real-data operations and recovery verification. Preserve all native/cloud/repository/owner-account gates in the original report; zero dependency advisories does not complete the audit.


## Metro security checkpoint — 2026-09-06

- Updated the coordinated Metro package family to 0.83.8 via overrides, removing vulnerable image-size. This changes Expo's exact default tooling pins; native Mac validation remains required.
- Verified 38 app tests, TypeScript, lint, and clean-cache iOS export. Added real PNG parsing and a child-process-bounded malformed ICNS regression. Redacted history/source/rebuilt-artifact scans report no findings.
- Dependency advisory count is now 8 moderate affected packages, zero high/critical. Remaining root: decode-uri-component and its navigation/query-string dependents. CI still fails this gate.
- Next: resolve CommonJS/ESM compatibility for the patched URI decoder without weakening malformed-input handling. Continue all original native, tenant, cloud/recovery, abuse and owner-account gates. No deployment or push.


## Dependency patch checkpoint — 2026-09-06

- Applied scoped PostCSS 8.5.28 and UUID 11.1.1 overrides after inspecting actual consumers. Added compatibility tests for Xcode ID generation, ngrok UUID import without network, and Metro's PostCSS processing.
- Verified 37 app tests, TypeScript, lint, and iOS export (1,553 modules). Root advisories fell from 27 to 16 affected packages: 8 high, 8 moderate. CI remains correctly failing its advisory gate.
- Remaining dependency work: Expo Metro wrapper pins every Metro package to 0.83.3; normal npm update does not take patched 0.83.8, which removes image-size. Patched decode-uri-component 0.5.0 changes to ESM while query-string uses CommonJS. Resolve these coherently and repeat native acceptance; do not use force updates merely to remove audit counts.
- All changes remain local and uncommitted. Native, cloud, tenant authorization, abuse, recovery, and owner-account gates remain open.


## CI and scanner checkpoint — 2026-09-06

- Added a local GitHub workflow for type/lint/tests/synthesis/probes/iOS export, checksum-pinned Gitleaks, and dependency advisories. Actions are commit-pinned, repository permission is read-only, and checkout credentials are not persisted. Workflow YAML parses; it has not been pushed or run remotely.
- Verified Gitleaks 8.30.1 locally: all reachable history, current source, and sample iOS artifact report zero findings after an exact public Figma identifier exception. A generated synthetic secret was detected and absent from redacted output. Reports/tool downloads are ignored; no real credential values were displayed.
- New release blocker: refreshed root npm audit reports 27 affected packages (9 high, 18 moderate; includes transitive propagation); infrastructure reports zero. This supersedes earlier zero-advisory checks. CI deliberately fails on these findings. See docs/SECURITY_CI.md.
- Exact next local action: investigate compatible patches for image-size/Metro, PostCSS, decode-uri-component/navigation, and uuid before choosing dependency overrides or a coordinated Expo SDK upgrade. Remaining original gates still include tenant ownership, distributed abuse controls, recovery/live access, native UI/login, repository protection and owner account controls.


## OAuth deadline checkpoint — 2026-09-06

- Token/profile requests now share a six-second monotonic work deadline, including JSON body consumption. Cleanup has a fresh two-second budget. Lambda remaining invocation time shrinks the work allowance while reserving one additional second; insufficient time fails before upstream token exchange. Upstream redirects are rejected.
- Cleanup failure or timeout prevents login completion. Regression tests cover slow token exchange, slow profile bodies, reserved cleanup, insufficient Lambda time, shared work budget, and successful cleanup before identity return.
- Verified: backend build and 27 tests pass; 18 synthetic audit observations still report zero findings in their scope. No cloud deployment or real Roblox request occurred.
- Remaining deadline limits: AWS credential/store operations need bounded end-to-end runtime verification. If token exchange times out before token material is received, the service cannot guarantee upstream revocation. Keep requirement 5 open alongside distributed limits, diagnostics, alarms, and incident response.


## Session security checkpoint — 2026-09-06

- Implemented SecureStore restoration and server verification, device/account-wide logout, expiry handling, offline sample selection, account-state reset, and rejection of stale login/data responses. Tokens stay outside React state. Remote revocation failures are reported separately from local cleanup.
- Added persistent account generation markers and a configurable recovery session epoch. Old generations/epochs fail closed. This has not been deployed or tested against live DynamoDB, and does not replace an isolated restore exercise.
- Replaced demonstration identity/security controls in reviewed account/onboarding views with session-derived status or disabled connection state. Native and visual acceptance remain pending.
- Verified: 34 app tests, 21 backend tests, TypeScript, lint, 18 protected synthetic audit checks with zero findings in that scope, iOS export (1,553 modules). Infrastructure synthesis passed earlier in this checkpoint. Node test runners needed child-process access after sandbox EPERM failures.
- Mac simulator is available to the user but inaccessible from this Windows task. Follow docs/MAC_SECURITY_VALIDATION.md using the current uncommitted working copy.
- Next: native login and visual validation; continue tenant authorization, distributed abuse limits, OAuth overall deadline/cleanup, recovery and live permission verification, CI/history/artifact scanning, and owner-account checks. No deployment, push, or release approval occurred.


## Current remediation checkpoint

Uncommitted local fixes now supersede the earlier audit-only status below:

- Mobile-generated S256 proof and independent client state are carried through server-side OAuth state to the final exchange. Wrong proof cannot consume a legitimate code; the DynamoDB check and delete are atomic.
- New `/v2/auth/roblox/start` and `/v2/auth/session/exchange` endpoints replace the insecure start/exchange protocol. The old v1 routes return 410. The registered Roblox callback, authenticated session reads, and logout keep their v1 paths.
- The mobile client rejects unrelated/ambiguous callbacks, nonlocal HTTP, embedded URL credentials, and expired session responses. Native development explicitly allows loopback HTTP only. Secure randomness uses Expo Crypto's asynchronous native API; pending proof stays in memory.
- Both HTTP adapters return stable error codes instead of exception text. Plain and base64 malformed-body regressions no longer echo submitted fragments.
- Updated API contract, backend guide, and Expo playbook to match the opaque-session implementation. Corrected the OpenAPI exchange-response schema so its session branch does not forbid the returned token. Fixed the backend build command's Windows portability issue.

Verified on this checkpoint: **22 app tests, 17 backend tests, 1 infrastructure synthesis test, TypeScript, lint, and iOS export (1,551 modules)**. The updated audit runner reports **18 protected checks, zero failing checks within its limited local scope**. It now includes a valid mobile-flow control so rejection at an unrelated earlier step cannot masquerade as an expiry fix. Tests cover absent/wrong proof, subsequent valid proof, replay, concurrent exchange, cancellation, legacy states/routes, callback ambiguity, native-entropy failure, expiry, and redaction. DynamoDB tests inspect the conditional request and failure handling; they do not substitute for live DynamoDB tests. The export used synthetic sample configuration, no dotenv loading, and no telemetry.

Crypto references: [Expo SDK 54 Crypto](https://docs.expo.dev/versions/v54.0.0/sdk/crypto/) and [RFC 7636 S256](https://www.rfc-editor.org/rfc/rfc7636.html). The two PKCE exchanges protect different handoffs; the app does not receive the backend's Roblox verifier or Roblox tokens.

### Full-goal completion audit

| Original requirement | Current evidence | Remaining work |
| --- | --- | --- |
| 1. Bind mobile login and verify on iPhone | Implemented locally; proof/callback/expiry/replay/concurrency tests pass | Native crypto/browser/SecureStore integration and valid iPhone flow; live database verification and authorized rollout. Not fully closed. |
| 2. Session lifecycle and truthful security state | Local session lifecycle, generation revocation and stale-response tests pass; reviewed views show truthful status | Native lifecycle/keychain and visual checks; live database validation. Open. |
| 3. Tenant ownership on real data | Planned endpoints remain absent and credential intake disabled | Implement authorized analytics slice, scoped workers/storage and two-user isolation tests before accepting analytics keys. Open. |
| 4. Recovery and deployed access controls | Existing CDK source inspected; no recovery settings changed | Recovery policy/cost review, approved backup configuration, isolated restore exercise, invalidation after recovery, live IAM/resource-policy verification. Open. |
| 5. Abuse controls, diagnostics, deadlines | Raw outer-handler errors fixed and tested | Distributed limits, redacted security events/alarms, incident response, overall OAuth deadline and delayed upstream/cleanup tests. Open. |
| 6. CI, scanning, owner accounts | Local build/test/export checks now reproducible | Security CI, redacted Git-history and release-artifact scan, repository protections, owner MFA/recovery and non-root AWS verification. Open. |

No push, deployment, account mutation, Figma mutation, or native-device test occurred. A green local probe runner is not a completed security audit or release approval. The September 6 checkpoint above supersedes session implementation status; preserve the remaining release gates until independently verified.

## Original audit and local verification history

Scope: current local source at `d09980f`, dependency lockfiles, existing tests and handoff, and a synthetic local login-flow check. This is an initial review, not a penetration test or a claim that production is secure. No application code, cloud resources, credentials, or account settings were changed.

The observations below are preserved as history. See **Current remediation checkpoint** above for the latest implementation and completion audit; the local verification follow-up below predates those fixes.

## Where the project stands

- Expo/TypeScript prototype with onboarding, Home, Experiences, Analytics, Sales, More, and deterministic sample data exists.
- Home can fetch the AWS sample endpoint. The authenticated analytics routes, workers, and tenant-scoped snapshots are still planned in `docs/API_CONTRACT.md`.
- Roblox OAuth and opaque app-session foundations exist in source. The September 2 handoff records successful build/test/export checks and pending OAuth activation; those results were not rerun today.
- The handoff describes an existing development AWS stack. Its current configuration and OAuth activation could not be independently verified today.
- Security/connection/session screens still contain hardcoded demonstration state. A green badge is not evidence of a working protection.
- Production readiness requires security fixes, real-data implementation, device testing, and comparison with live Figma frames.

## Existing protections confirmed in source

- Server-to-Roblox authorization-code flow uses PKCE, random state, expiry, and one-time state consumption.
- App-session bearer tokens are random; DynamoDB keys contain SHA-256 hashes rather than raw bearer tokens. Session reads check expiry independently of DynamoDB TTL cleanup.
- OAuth state and exchange consumption use DynamoDB atomic deletion with returned old values.
- Mobile stores its app-session token in Expo SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Roblox access/refresh tokens are not persisted by the implementation; refresh-token revocation is attempted after profile retrieval.
- AWS analytics-key submission is disabled. The mobile app does not currently collect or store an Open Cloud API key.
- CDK configures S3 Block Public Access, encryption and HTTPS enforcement; application-table access is limited to GetItem/PutItem/DeleteItem on that table, and OAuth-secret access is scoped to one secret.
- JSON body size limits and `cache-control: no-store` are implemented. API Gateway has a global 5 requests/second throttle with burst 10.
- Environment files and common signing-key files are ignored. The tracked-file inventory showed only `.env.example` templates, not tracked environment-value files. This does not establish that Git history or bundles are free of secrets.

## Prioritized findings and acceptance checks

### 1. High priority: bind the final mobile login exchange to its initiating app

Evidence: `services/roblox-auth-core.ts:45` starts a flow without a client-held proof; line 64 exchanges only `{ code }`. `backend/src/modules/auth/auth-service.ts:61` records the exchange without a client challenge, and line 82 accepts the code alone. The callback parser checks the destination but does not correlate the response to the initiating login attempt.

The backend-to-Roblox PKCE protection does not cover this separate backend-to-mobile handoff. If another app intercepts a valid custom-scheme callback code, it can attempt to redeem it first. This requires interception or delivery of a valid code; it is not evidence that arbitrary random codes work, nor proof of an exploit against the installed iOS app.

Local verification: invoked the actual `connectRobloxIdentity` function under Node with synthetic fetch/browser implementations. A callback with unrelated state was accepted, and the exchange request fields were only `["code"]`. No real identities, credentials, or network services were used.

Required fix: generate a cryptographically random verifier on the mobile client; bind its S256 challenge to server-side OAuth state and the eventual exchange; require the verifier during atomic exchange. Correlate callbacks to the initiating flow and require HTTPS for nonlocal API URLs. Consider verified HTTPS app links for production.

Acceptance: intercepted code without the verifier cannot create a session; wrong verifier and unrelated callback fail; expiry, cancellation, replay, and concurrent exchange are tested; the valid path still works on iPhone.

### 2. High priority before real users: finish session controls and remove misleading security state

Evidence: `services/roblox-auth.ts:25` and `:29` expose token read/delete functions with no application call sites found. Backend logout exists, but no mobile logout request was found. `src/screens/settings-screen.tsx:448` renders static session rows. Connected identity, encrypted-key storage, rotation dates, and event-security switches elsewhere in the same file are demonstration values. The default app-session lifetime is 30 days (`backend/src/config.ts:20`).

Required fix: load and validate the stored session, implement server revocation and local sign-out cleanup, clear account-specific data on logout/account change, handle expired/revoked sessions, and implement an account-wide session-revocation mechanism. Derive security status from backend facts or explicitly label it as sample content. Event-signature enforcement must be server-side and must not be bypassed by a client toggle.

Acceptance: a revoked token fails subsequent API requests; account switching leaves no previous creator's cached data; expired sessions cannot authenticate; sample mode remains usable offline.

### 3. Release gate: enforce creator/workspace ownership on every real-data operation

The planned authenticated analytics routes are not implemented yet. This is an upcoming requirement, not a demonstrated cross-tenant leak in an existing endpoint.

Derive identity from the verified session. Check workspace membership and authorization for every experience, snapshot, export, synchronization job, and object download. Do not treat a client-provided experience ID, claimed owner, or valid analytics key as proof that the signed-in user may access that resource. Scope background jobs and stored data to that authorized owner as well.

Acceptance: independent users A and B cannot read, update, export, or queue work for each other's resources by changing IDs. Anonymous requests fail. Revoked membership blocks further access. Tests must cover API and worker behavior.

### 4. Before storing valuable data: add recovery and verify deployed access controls

Evidence: `infrastructure/lib/roblox-analytics-mobile-stack.ts:106` retains the DynamoDB table but does not configure point-in-time recovery or table deletion protection. The history bucket explicitly has versioning disabled at line 162. Retention on stack removal is not a backup or a defense against item deletion by an authorized role.

Prepare a production recovery policy, enable appropriate backups/deletion protection with a reviewed cost, and perform a restore exercise. A restored auth database must not silently resurrect revoked sessions; recovery needs a session-invalidation procedure. Decide whether history is reproducible before choosing versioning/backup retention. Verify live S3/table resource policies and IAM grants, not just CDK intent.

Acceptance: recovery to an isolated target is demonstrated; access remains private after restore; sessions revoked before the incident cannot be revived by the recovery process.

### 5. Before public launch: abuse controls, safe diagnostics, and login deadlines

- The global API throttle is not a per-client or per-account login limit. Public OAuth start persists state; abusive callers could consume the shared allowance and table capacity. Add bounded, distributed limits and metrics without logging tokens, callback codes, request bodies, or authorization headers.
- The stack configures Lambda log retention but no application security-event audit pipeline or operational security alarms. Add redacted login/revocation/authorization-denial events, failure alarms, and a brief incident-response procedure.
- `backend/src/lambda/api-handler.ts` and `backend/src/server.ts` return raw exception messages from their outer handlers. Replace with stable public error messages and separately redacted diagnostics; malformed JSON errors can include request fragments.
- Lambda's 10-second timeout (`infrastructure/lib/roblox-analytics-mobile-stack.ts:191`) is shorter than the possible sequential token/profile/revocation requests, each with an 8-second timeout (`backend/src/modules/auth/roblox-oauth-api.ts`). A hard timeout can interrupt cleanup despite `finally`. Design an overall deadline with cleanup time reserved; test delayed upstream responses and revocation failures.

Acceptance: abuse is bounded without disabling legitimate users globally; synthetic secret markers are absent from responses/logs; delayed OAuth calls produce controlled failures and tested cleanup behavior.

### 6. Before release: automate security checks and verify owner accounts

No tracked `.github` security/test workflows were found. Add meaningful CI checks for types, lint, tests, iOS export, dependency advisories, and secret detection. Review Git history and release artifacts with a scanner that redacts values; a `.gitignore` does not remove previously committed material. Enable repository protection and secret push protection where supported.

Verify MFA/passkeys, recovery methods, and active sessions on the email account that controls recovery, GitHub, AWS, Roblox, Expo, and Apple. Use temporary non-root AWS access, remove any root access keys, and separate development from production privileges. These account settings were not inspected today. Budget alerts notify; they are not a hard spending cap.

## Checks performed and limits

- Initial worktree clean on `main`, commit `d09980f`; no remote refresh was performed today.
- `npm audit --package-lock-only --ignore-scripts --json` at the app root: zero reported vulnerabilities.
- Same audit in `infrastructure`: zero reported vulnerabilities. This covers known advisories in those lockfiles, not application logic or future disclosures.
- Local synthetic mobile callback test reproduced missing flow binding.
- Existing test inventory covers OAuth happy paths, replay, cancellation, and revocation. Full tests/builds were not rerun because dependencies are absent in this checkout.
- Documented AWS profile `roblox-analytics-mobile` was absent. Available `studiopulse-dev` profile could not authenticate and referenced an expired root login. No credentials were read or printed, no reauthentication was attempted, and no cloud mutation was made.
- Live cloud permissions, backups, logs, repository security settings, account MFA, device behavior, Git-history secret contents, and compiled release bundles remain unverified.

## Recommended sequence

1. Fix mobile login binding and add regression coverage before OAuth activation.
2. Complete session lifecycle and truthful connection/security status.
3. Implement a first real analytics slice with ownership checks and two-user isolation tests; finish encrypted analytics-key handling and revocation before accepting keys.
4. Audit live AWS through a non-root identity, establish recovery/alerts and repository protections, and verify owner-account MFA/recovery.
5. Run the complete checks and iPhone flow, then conduct a focused review of the built release before onboarding other creators.

## Local verification follow-up — 2026-09-05

Audited the same application source at `d09980f` on `main`. The existing untracked review was preserved and extended; no stashes were present. No application behavior, remote Git state, Figma file, AWS resource, or owner-account setting was changed.

### Reproducible probes

Added `scripts/security-audit.mjs`. It uses the actual compiled backend and the actual TypeScript mobile-auth core with synthetic browser, HTTP, identity, and store inputs. No real credentials are read or submitted. It disables global fetch and removes AWS auth-store configuration from its own process before importing the Lambda handler. Node 22.18.0 emits an experimental warning for its built-in TypeScript stripping API.

Run from the repository root after installing both root and infrastructure lockfiles:

```powershell
node node_modules/typescript/bin/tsc -p backend/tsconfig.json
node scripts/security-audit.mjs
```

The audit script reports individual observations and exits nonzero when findings remain. The observed six failing checks represent four underlying concerns, not six independent vulnerabilities. The 11 protected checks establish only the specific local behaviors exercised.

| Concern | Current reproduction | Priority and limits |
| --- | --- | --- |
| Mobile handoff binding (finding 1) | A code-only exchange creates a session. A callback with state different from the initiating authorization URL is accepted and its returned session is stored. | High before OAuth activation. Two failing checks. Still requires possession/delivery of a valid code; no arbitrary-code bypass or installed-iPhone interception was demonstrated. |
| Request-body reflection (finding 5) | Both plain and base64 Lambda events containing malformed JSON with a synthetic `AUDIT` marker return that marker inside HTTP 400 parser errors, before the disabled analytics route runs. | Medium. Two failing checks. This reflects caller-supplied content to the caller; it does not demonstrate another user's secret disclosure or server-side logging. Fix the Lambda and local server outer handlers with stable error envelopes. |
| HTTP backend URL accepted (finding 1) | `http://api.example.test` reaches both mocked transport calls and stores the returned session. | Configuration-dependent transport risk. One failing check. The real native transport may apply additional restrictions; no cleartext iPhone traffic was demonstrated. Enforce HTTPS at the client boundary, with an explicit development-only loopback exception if required. |
| Expired response accepted (finding 2) | The mobile parser stores a session whose `expiresAt` is in 2000. | Low/client correctness. One failing check. The backend still rejects expired sessions; this is not a backend authentication bypass. Reject expired responses and implement authoritative session restoration/401 handling. |

Confirmed local controls:

- Anonymous, expired, and revoked session reads return HTTP 401; logout returns 204.
- Twenty concurrent in-memory redemptions yield one session and 19 HTTP 401 responses.
- Expired exchanges return 401; expired and cancelled OAuth states cannot complete login.
- Valid JSON submitted to the AWS credential scaffold returns 503 without echoing the submitted marker; oversized input returns 413.
- Profile failure attempts refresh-token revocation; failed revocation rejects the login. These use the real OAuth API class with immediate synthetic responses. They do not verify cleanup after Lambda termination or delayed upstream calls.

DynamoDB source separately confirms `ConsistentRead: true` for session reads, `DeleteItem` with `ALL_OLD` for one-time consumption, and application-level expiry checks (`backend/src/modules/auth/dynamodb-auth-store.ts:73`, `:111`, `:124`). Live database races and revocation were not tested. AWS documents strongly consistent reads as reflecting prior successful writes; see [DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html).

### Verification status

- Installed the pinned root and infrastructure dependency trees with `npm ci --ignore-scripts`; neither lockfile changed. Initial sandbox/cache and process-spawn restrictions were resolved for the successful checks.
- `npm test`: **8 passed**. These existing tests permit the current code-only handoff, so green tests do not close finding 1.
- Backend TypeScript compilation with the direct Node command above: **passed**.
- `node --test backend/tests/*.test.mjs`: **8 passed**.
- `npm run typecheck`: **passed** after installing infrastructure dependencies.
- `npm run lint`: **passed**, with `EXPO_NO_TELEMETRY=1` and `EXPO_NO_DOTENV=1`.
- `node --import tsx --test infrastructure/test/*.test.ts`: **1 passed**, including local Lambda bundling and CloudFormation template synthesis; no AWS deployment.
- `node node_modules/expo/bin/cli export --platform ios`: **passed**, 1,547 modules. Dotenv loading and telemetry were disabled; sample mode and a synthetic public API URL were explicitly selected. This is a JavaScript/Hermes export, not a signed iOS build or device test.
- `node scripts/security-audit.mjs`: **17 observations, 11 protected checks, 6 failing checks**, as detailed above; deliberately nonzero.
- The backend package's `npm test` wrapper fails on Windows because its build command uses `../node_modules/.bin/tsc`. The direct Node compilation plus test invocation succeeds. This is a portability issue, not a security vulnerability.

The Expo playbook still describes Cognito/JWT authentication, whereas the current source and API contract use opaque backend app sessions. This documentation conflict is not evidence that Cognito protections exist; use the source and current API contract for this audit and reconcile the playbook before implementing authentication changes.

Live AWS configuration, MFA/recovery, Git-history secret scanning, native device behavior, complete tenant isolation, release-artifact secret scanning, and a restore exercise remain outside this local verification. Dependency advisory results earlier in this document are from the initial pass and were not refreshed here.

### Next remediation checkpoint

Fix finding 1 with mobile-generated cryptographic proof bound through backend state to the final exchange, callback correlation, and HTTPS validation. Add regression tests that require these attacks to fail, then verify the valid path on iPhone. In the same security remediation sequence, replace raw exception responses and finish the session lifecycle. OAuth activation remains gated by these fixes and the existing explicit authorization requirements for cloud changes.

## Primary guidance consulted

- [OAuth for Native Apps, RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html), especially callback interception and request-forgery protections.
- [OWASP API1: Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).
- [AWS DynamoDB backup and restore](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Backup-and-Restore.html).
- [AWS root-user best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html).
- [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/about-alerts).

Related project records: `docs/API_CONTRACT.md`, `docs/NIGHTLY_HANDOFF.md`, and Obsidian's `StudioPulse — Project Chronicle`.
