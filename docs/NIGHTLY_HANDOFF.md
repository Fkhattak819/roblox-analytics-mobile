# roblox-analytics-mobile handoff

## Independent-creator private beta — September 8

- Prepared the app for five independent creators testing their own experiences. The AWS deployment now has an explicit `oauth_resources` admission policy: every concrete universe ID returned by Roblox token-resources can enter that user's session, while the default/rollback policy remains a static fail-closed allowlist.
- Tenant isolation remains enforced at every sensitive boundary. API reads and sync requests derive the Roblox subject from the app session; the worker checks the subject/universe pair before credential retrieval, after retrieval, after the Roblox query, and transactionally during snapshot publication. Tests cover creators attempting to swap universe IDs and independent authorized workers outside the old deployment list.
- Connected onboarding, Home, Analytics, analytics details, Experiences, Sales, Profile, Connections, Data Coverage, More, and the experience picker now use the current session's `authorizedUniverseIds`. The first authorized universe is selected automatically and testers can switch only among IDs present in their own session. Unknown experiences use a truthful `Universe <id>` label and neutral StudioPulse artwork until a reviewed metadata inventory route exists.
- Removed the connected Home benchmark fixture so an independent tester cannot see Most Words Win reference comparisons. Sample Mode keeps its local fixtures and remains offline.
- Local verification passes: TypeScript, Expo lint, 55 app tests, 59 backend tests, the CDK infrastructure test, `git diff --check`, and an AWS-connected iOS export (1,760 modules). The mobile auth test accepts five authorized universe IDs. Native simulator visual acceptance was not rerun because the simulator/processes were intentionally left stopped at the user's request.
- Read-only CDK diff against account 896979073148/us-east-2 changes only the two Lambda code bundles and adds `ANALYTICS_UNIVERSE_ACCESS_MODE=oauth_resources` to each. It shows no resource addition, removal, replacement, IAM change, or data-store mutation. Remote `main` still matches local base `88c5fd4`.
- Release gate: obtain explicit authorization for AWS deployment and remote push. After deployment, complete one OAuth login per tester, selecting only that tester's intended experience(s), and verify the first official snapshot. The private Roblox OAuth app remains limited to 10 unique users, so five testers fit; broader public use still requires Roblox app review/publishing.
- The SNS email subscription at `fkhattak819@gmail.com` still needs the recipient's confirmation link before application alarm email can be delivered.

## OAuth-only delegated analytics release — September 7–8

- Replaced operator-created `ACCESS#` grants and the runtime Open Cloud API key with Roblox OAuth delegation. The app requests `openid profile universe.analytics:read`, calls Roblox's token-resources endpoint, encrypts delegated tokens, and returns authorized universe IDs in the app session. This original release used the fixed development universe `10009166512`; the independent-creator beta above supersedes that deployment filter once deployed.
- Added KMS ciphertext storage for per-creator Roblox access/refresh tokens with subject-bound encryption context. Access tokens remain server-side; refresh tokens rotate under a conditional DynamoDB lease. Logout-all invalidates app sessions, deletes the encrypted authorization, and attempts upstream revocation. The old analytics secret is retained for rollback but both runtime roles lose read access.
- Removed the second analytics-key verification step from onboarding. Roblox sign-in now advances directly to choosing from authorized experiences. Updated current security/connection copy to describe the single-consent flow. Live Figma context for Connections `140:313` was re-read; the OAuth-only wording is an intentional product/security override while preserving the layout. The deleted live onboarding frames prevent a new parity claim.
- Official Roblox docs rechecked: OAuth access tokens are 15 minutes, refresh tokens are 90 days and single-use, token-resources supplies permitted resources, and `universe.analytics:read` covers Analytics Query endpoints. The implementation rejects wildcard-only/unknown resources and fails closed when no concrete admitted universe is present.
- Verification passed: 55 app tests, TypeScript, Expo lint, 57 backend tests, one infrastructure test, synthesis, `git diff --check`, and a live CDK diff. The diff adds one retained customer-managed KMS key/alias (owner approved the roughly $1/month key cost), restricts KMS use to Encrypt/Decrypt with project/purpose encryption-context conditions, removes worker access to the legacy analytics secret, and adds no replacement or deletion.
- `origin/master` was fetched and matches base commit `915ea42`. The Roblox private OAuth app was found under group `BrainNourishmentGames`; it remains unpublished and limited to 10 authorizing users. The scope selector is prepared for `universe.analytics:read`, but the permission has not been clicked/saved because browser permission changes require an immediate user confirmation.
- This section records the earlier release state. Follow the newer independent-creator release gate above for current actions.

## Live push, deployment, and access provisioning — September 7

- Integrated the newly advanced remote `master`, retained the tested security/Expo implementations during duplicate-history conflict resolution, accepted the remote OAuth-state TTL increase from 10 to 30 minutes, and reran TypeScript, lint, 55 app tests, 55 backend tests, and the infrastructure test. Pushed commit `9b882f9` to `origin/master`.
- Deployed that source to `roblox-analytics-mobile-dev` in account 896979073148/us-east-2. CloudFormation reports `UPDATE_COMPLETE`; both Node.js 22 ARM64 Lambdas are Active with Successful update status. Live probes return health 200, secure v2 OAuth start 200, anonymous session/analytics 401, and retired v1 OAuth start 410.
- Added one TLS-only SNS topic as the action for both application alarms. Both alarms report `OK` and each has one action. The approved email subscription is `PendingConfirmation`; the recipient must click the AWS confirmation email before alarm mail can be delivered. These are StudioPulse authentication/runtime alarms, not blanket monitoring for every AWS service or application in the account.
- Provisioned the operator-managed grant for Roblox user `2992201638` and universe `10009166512` with `type=analytics-access`, `enabled=true`, and verified group ownership metadata for group `737917380`. A consistent exact-key read confirmed the record. No other application records were read.
- Verified without printing values that both Roblox OAuth credential fields are configured in Secrets Manager. Creator Hub shows the matching private group-owned OAuth application and exact deployed callback. The private app remains limited to its approved test users; public publishing was not requested or performed.
- Installed CocoaPods and attempted an AWS-connected native iOS build. The app reached Xcode but ExpoModulesJSI cannot compile with this Mac's Xcode 26.0.1 / Swift 6.2. Expo requires Xcode 26.4+ / Swift 6.3 for this syntax, and Apple requires macOS Tahoe 26.2+ for that Xcode. The Mac is on Sequoia and the App Store offers only `Open`, not an Xcode update. A major macOS upgrade/restart was not performed. The tracked Expo prebuild edits were reverted; the ignored generated `ios/` directory remains available for the next build.

## Offline onboarding fallback fixed — September 7

- Fixed the no-backend onboarding path shown in the simulator: sample mode no longer presents a Roblox OAuth action that can fail with `The backend URL is not configured`.
- The primary welcome action is now `Explore sample data` in sample mode and transitions directly to the offline Analytics dashboard. The same fail-safe applies if an in-progress sample session is already on the identity or analytics-access step.
- Verified the exact no-backend configuration on iPhone 17 Pro / iOS 26.0. The CTA completed without an alert or network request. TypeScript, lint and all 55 app tests pass; the local AWS-dev `.env.local` was restored after validation.

## Main/security reconciliation completed — September 7

- Fetched `origin/main`, rebased the four local Expo/Figma commits, and merged `origin/codex/security-audit`. The merged app keeps the current SDK 57 UI while adding proof-bound OAuth, session lifecycle/account-state reset, tenant grant enforcement, bounded analytics work, recovery controls, CI and security operations documentation.
- Updated Expo to the SDK 57-recommended patch levels (`expo` 57.0.20 and `expo-router` 57.0.19). TypeScript, lint, 55 app tests, 55 backend tests, infrastructure synthesis, 18 synthetic security checks, dependency audits and an iOS export pass.
- Resolved the reported Expo Go connection failure: Metro had bound to IPv6 localhost while Expo Go requested `127.0.0.1`. `NODE_OPTIONS=--dns-result-order=ipv4first` makes Metro reachable. Offline simulator acceptance passed on iPhone 17 Pro / iOS 26.0 for Home, Analytics, More and Privacy with truthful sample/signed-out status.
- Hardened the Mac preflight to quarantine and restore local dotenv files so its sample export cannot silently inherit `aws_dev` from `.env.local`. Local QA artifacts are ignored and preserved.
- AWS read-only verification: account 896979073148/us-east-2, stack `roblox-analytics-mobile-dev` is `UPDATE_COMPLETE`; table is active with deletion protection and 35-day PITR, history bucket is private/versioned, queue/mapping are healthy, both Lambdas are active, and public health/auth boundary probes return the expected 200/401/410/400 responses. Both alarms are `OK` and have no notification actions. No secret value or session data was read.
- Remaining user-gated items: provide the Roblox OAuth subject/user ID and whether universe 10009166512 is individually or group owned so an `ACCESS#` grant can be verified/provisioned; choose an alarm email; explicitly authorize any paid isolated restore drill. GitHub ruleset activation and pushing the merged local commit also require the appropriate repository authority.

## Mac handoff package — September 7

- Added scripts/mac-security-preflight.sh: macOS-only, clean-tree preflight using locked installs, TypeScript/lint/app/backend/infrastructure tests, synthetic security probes and an iOS sample export with dotenv disabled.
- Updated native login instructions with the deployed public API URL and explicit nonsecret Expo variables. The app scheme is already robloxanalyticsmobile; the Mac local build may prompt for a simulator bundle identifier.
- No credentials or private account values are included. Manual login/logout/account-switching, Keychain, accessibility, screenshots and Figma comparisons still require the Mac simulator.

## AWS security deployment completed — September 7

- User explicitly requested deployment. Refreshed non-root assumed-role identity and reviewed the read-only diff, then deployed source 9945f43 to roblox-analytics-mobile-dev in account 896979073148/us-east-2. CDK succeeded; CloudFormation reports UPDATE_COMPLETE. Local uncommitted changes were documentation/ruleset only.
- Live verification: database PITR ENABLED/35 days, deletion protection true, table ACTIVE; history versioning Enabled; queue visibility 720 seconds. Both security alarms exist with no actions (auth alarm OK, runtime alarm INSUFFICIENT_DATA at first check).
- HTTP smoke checks: health 200; anonymous session 401; anonymous analytics 401; retired v1 login start 410. Full browser/native v2 login and authenticated tenant isolation remain unverified.
- Important product gap: current deployment requires server-managed ACCESS# grants. Automatic OAuth-based experience ownership/permission verification is still unimplemented. No real grant was provisioned. Older v1 clients must update. User was informed before deployment.
- Still open: automatic ownership flow, alarm email/delivery, isolated restore drill, effective IAM/live worker tests, newer master frontend reconciliation, Mac validation, GitHub protection activation and owner MFA/recovery. Do not mark the audit complete.

## Remote CI and repository controls — September 7

- Pushed security work as 9945f43; GitHub Actions `verify` succeeded for that exact SHA (run 34152891788, app ID 15368).
- Public API reports main/default, master and security branch unprotected; repository ruleset list empty. Prepared .github/release-ruleset.json for main/master with required PR/current verify check, no force pushes/deletions or bypass. This has not been applied; authenticated repository-admin access is unavailable.
- Updated Mac instructions to use the pushed security branch. Native testing remains pending, along with master frontend reconciliation, ownership verification, alarm destination/delivery, approved AWS deployment/restore, push protection and owner MFA/recovery.

## Security branch release checks — September 7

- TypeScript, lint (telemetry/dotenv disabled), 40 app tests, 48 backend tests, infrastructure synthesis, and all synthetic security probes pass. Root and infrastructure npm audit report zero vulnerabilities.
- Fresh iOS sample export completed (1,554 modules). Redacted scans of all local Git history, working source and that export report no findings. Native simulator testing remains unverified.
- Checkpoint includes tenant-grant API/worker enforcement, worker deadlines and proposed recovery/IAM changes. This is a review branch, not deployment approval; newer master frontend reconciliation and all live/native gates remain open.

## Worker invocation budget — September 7

- Worker uses one invocation-local budget capped at 110 seconds and Lambda remaining time minus two seconds. SDK sends are bounded including credential resolution, receive the cancellation signal, and use one attempt. Parallel upstream queries share that signal. Expired work cannot begin another SDK send; remaining queue records return partial failures.
- Shared SDK clients persist across warm invocations, while deadline facades and analytics credential providers are invocation-local. This removes the former cross-invocation analytics-key cache and may increase Secrets Manager reads; include this in cost validation.
- Backend compilation and 48 tests pass, covering stalled SDK resolution, blocked later writes, parallel-query cancellation and insufficient Lambda time. Cancellation does not roll back an already-submitted transaction; live timeout/duplicate-delivery tests remain required.
- Ownership details and alarm destination remain pending. No AWS deployment or push. Next: native/frontend reconciliation, final source/export scans and remote CI, verified grants and notification configuration, then approved deployment and recovery drill.

## Analytics transport deadline — September 7

- Added a shared 30-second deadline across query request headers, body parsing and polling delays; transport receives an abort signal. Deadline errors are nonretryable. Redirects are rejected to prevent forwarding the analytics key, operation identifiers are restricted, and upstream error text is excluded from thrown diagnostics.
- Backend compilation and all 45 tests pass, including stalled headers/body/poll tests, path rejection and fixed error messages. No live Roblox queries, cloud changes or push.
- This is a per-query deadline, not an invocation-wide worker budget. Remaining: AWS SDK/credential lookup bounds, coordinated multi-query cancellation, worker remaining-time propagation, ownership grant provisioning and pending user details, alarm delivery, frontend/native acceptance, deployment/recovery and release controls.

## Live diff verified — September 7

- Infrastructure test escalation succeeded: backend compilation, Lambda bundling and recovery/IAM assertions pass.
- Read-only `npm run diff:dev -- --no-change-set` completed against the intended non-root account/Ohio stack. No resources removed/replaced in template diff. Adds two alarms/one metric filter and SessionEpoch; changes recovery settings, queue timeout, two IAM policies and Lambda code. No cloud mutation.
- Table metadata: 73,843 bytes, 18 items, deletion protection false. Preliminary published-rate planning figures and remaining variable charges recorded in AWS_RECOVERY_PLAN.md; regional pricing still needs confirmation.
- Asked for creator user ID/ownership type and preferred alarm email. No grant or notification created. Next: verify ownership/provisioning path, complete worker deadlines and newer frontend reconciliation, then final checks/remote CI before deployment approval. Native, restore and owner-account gates remain open.

## Recovery controls candidate — September 7

- Follow-up: user refreshed SSO. Escalated read-only STS succeeded and verified the non-root assumed role; CloudFormation inventory returned 25 resources, including the existing worker/secret/mapping. Network escalation for these reads succeeded; the earlier test escalation rejection is separate. Fresh synthesis and full live property comparison remain pending.

- Prepared table deletion protection/35-day PITR, history versioning/30-day old-version retention, and 720-second queue visibility for the 120-second worker. Restored analytics secret output. No AWS mutation or push.
- Added infrastructure assertions for retention, recovery, public-access blocks and queue/worker timeout relationship. Backend compilation passed; test runner hit sandbox EPERM. Automatic approval review rejected test escalation due to account usage limits; synthesis remains unverified.
- Live identity check found expired SSO; asked for login refresh. Live resource comparison, pricing/deployment approval, grant provisioning, actual restore drill, frontend/native tests and release/owner controls remain open.
- Next: after SSO and execution access recover, run infrastructure tests and read-only live diff. Follow AWS_RECOVERY_PLAN.md before deployment or recovery testing.


## Worker and infrastructure reconciliation — September 7

- Restored worker, retained analytics secret, queue mapping and worker settings from master. API/worker IAM now explicitly deny ACCESS# grant mutation; grant reads and worker ConditionCheckItem are scoped separately. Worker snapshot/status writes use transactional membership checks.
- Worker checks access before credential retrieval, before sync, and before status publication. Restored /v1/connections with checks before/after metadata reads. Added cross-account and revocation worker/connection tests.
- Verified 41 backend tests, 40 app tests, TypeScript, and infrastructure synthesis (two functions/two secrets/mapping/grant-write denials). No deployment or push occurred.
- Next: verify synthesized resources against the live stack, reconcile newer master frontend under live Figma, establish operator grant provisioning and backup/recovery deployment plan. Live IAM inspection remains permission-limited; native/owner-account checks remain open.


## Analytics authorization integration — September 7

- Checkpointed limiter/logging work as d2faade on the review branch; not pushed. Imported new backend analytics modules/contracts from master and added a required operator-owned user/universe grant.
- Wired protected snapshot/sync routes into the AWS adapter. Reads validate grants, queueing rechecks after the gate, worker checks before credential retrieval, and snapshot publication transactionally checks grant validity.
- Backend 36 tests pass. Integration is local and partial: deployed worker/secret/IAM reconciliation, grant-write isolation, connection status, full worker revocation tests, newer UI/Figma reconciliation, and live validation remain pending. Do not deploy the current partial resource inventory.
- Details: ANALYTICS_AUTHORIZATION.md. No AWS mutations or new remote push occurred.


## Live AWS checkpoint — September 6

- SSO login completed; verified non-root assumed role. Read-only checks confirmed PITR/deletion protection disabled, private AES256 history bucket with TLS-only policy and no enabled versioning, ten-second API timeout, and no returned CloudWatch metric alarms. IAM policy inventory reads denied.
- Critical reconciliation finding: deployed stack contains analytics worker/secret resources absent from this branch. Remote master 32ef869 contains corresponding newer analytics/UI code. Do not deploy this branch's older resource inventory over the live stack.
- Master source checks universe globally before queueing/processing but lacks per-user universe authorization. Tenant-scoped storage alone does not close that gap. No live exploit or application-data read was attempted.
- See AWS_SECURITY_REVIEW_2026-09-06.md. Next: reconcile newer master functionality with audit fixes and implement server-owned membership checks in API and worker, then review the complete deployment diff. Nothing in AWS was changed.


## Login protection candidate — 2026-09-06

- Implemented atomic DynamoDB per-source/per-action minute buckets for AWS start/callback/exchange, trusted gateway address handling, bounded counter calls, 429 retry headers, and fail-closed limiter outages. UpdateItem grant is restricted to LIMIT# keys.
- Added fixed-schema auth result logs and proposed auth-failure/Lambda-error alarms. No token/request/error objects are logged. Alarms have no notification action; cost/deployment/delivery checks remain pending. See SECURITY_OPERATIONS.md.
- Verified backend 32 tests and infrastructure synthesis. Counter concurrency uses a synthetic atomic store, not live DynamoDB; live behavior and NAT/distributed abuse coverage remain open.
- GitHub Security and build CI succeeded for pushed commit 79a0879: https://github.com/Fkhattak819/roblox-analytics-mobile/actions/runs/34073043914. New limiter/logging changes remain local.
- AWS profile roblox-analytics-mobile exists but SSO is expired. Asked user to refresh it; identity must still be verified as non-root. Asked whether the audit branch is ready on Mac. Independent work remains: creator authorization, deployed recovery/access controls, notification delivery, native tests and owner-account controls.


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


Updated: 2026-09-05 (America/Chicago)

## Current security remediation checkpoint

- Implemented mobile-held S256 proof with Expo Crypto and callback state correlation; conditional DynamoDB consumption checks proof/expiry/type in the same operation. Wrong proof leaves the valid code usable.
- Mobile uses v2 OAuth start/session-exchange; legacy v1 start/exchange return 410. Existing registered v1 Roblox callback remains valid for the new server state. Mobile rejects unsafe HTTP configuration, ambiguous callbacks and expired responses.
- Redacted both HTTP adapters' outer errors; fixed the Windows backend build command; reconciled the API contract and playbook. All changes remain local and uncommitted.
- Current checks: `npm test` 22 passed; `npm --prefix backend test` 17 passed; `npm --prefix infrastructure test` 1 passed with Lambda bundling/template synthesis; `npm run typecheck` and `npm run lint` passed. `node scripts/security-audit.mjs` reports 18 protected local checks, zero failing checks in that scope. iOS export passed, 1,551 modules, synthetic sample configuration with dotenv and telemetry disabled. No native or live AWS verification.
- Exact next action: implement saved-session restoration/validation, mobile sign-out cleanup, account-wide revocation and account-change data clearing. Before changing settings/onboarding views, read exact live Figma context. Then continue report requirements 3–6: tenant-scoped analytics, recovery, abuse/deadlines/diagnostics, CI/scanning/account controls. The full goal remains open; see the requirement matrix at the top of `docs/SECURITY_REVIEW_2026-09-05.md`.
- Deployment/device gates: v2 backend must be deployed before shipping the updated mobile protocol, under explicit cloud authorization. A valid iPhone flow, live DynamoDB concurrency/revocation, and owner-account controls remain unverified. Do not restore code-only v1 exchange for compatibility.

## Security audit continuation — September 5

- Extended `docs/SECURITY_REVIEW_2026-09-05.md` and added the repeatable local probe runner `scripts/security-audit.mjs`. Application source remains at `d09980f`; findings are not fixed. No push, cloud mutation, Figma changes, or account-settings changes occurred.
- Installed both lockfile dependency trees with lifecycle scripts disabled; lockfiles unchanged.
- Verified: app tests 8/8, backend tests 8/8, TypeScript, lint, infrastructure test 1/1 with template synthesis, and iOS export (1,547 modules, synthetic sample configuration, no dotenv/telemetry). No iPhone or live AWS verification.
- Audit runner: 17 observations, 11 protected checks and 6 failing checks covering unbound mobile handoff, raw malformed-body reflection, accepted nonlocal HTTP configuration, and accepted expired mobile session responses. Backend expiry/revocation and in-memory one-time exchange checks hold.
- Windows workaround: compile with `node node_modules/typescript/bin/tsc -p backend/tsconfig.json`, then run `node --test backend/tests/*.test.mjs`. The package's relative POSIX-style compiler command fails under Windows npm. Run the probes with `node scripts/security-audit.mjs`; a nonzero exit indicates unresolved findings.
- Next action: fix mobile-generated proof and callback correlation before OAuth activation, enforce HTTPS, and add regression coverage. Then redact outer-handler errors and implement session restoration/logout. The older activation action below is superseded by this security checkpoint.
- Source conflict: the Expo playbook still mentions Cognito/JWT; current code and API contract implement opaque sessions. Do not infer Cognito protections.

## Prior implementation checkpoint — September 2

## Completed

- Pushed the shared API contract checkpoint (`ffcfae7`) to `origin/main`.
- Confirmed the Roblox OAuth registration and endpoint requirements against current Creator Hub documentation.
- Implemented Roblox authorization-code OAuth with PKCE and server-side state persistence.
- Added atomic, one-time callback and app-session exchanges with expiry and replay protection.
- Added opaque app sessions; only SHA-256 token hashes are stored in DynamoDB.
- Added Secrets Manager-backed OAuth client credentials with a five-minute Lambda cache.
- Roblox access and refresh tokens are never persisted; the refresh token is revoked after the profile lookup.
- Connected the Expo onboarding action to the backend and stored only the app session token in Expo Secure Store.
- Updated OpenAPI, tests, backend docs, and CDK infrastructure.
- Refreshed the `roblox-analytics-mobile` IAM Identity Center CLI session.
- Reviewed the deployed-stack diff. It adds one Secrets Manager secret, one least-privilege IAM policy, Lambda code/environment updates, and no resource replacement.

## Verification

- Backend tests: 8 passed.
- App tests: 8 passed.
- TypeScript: passed.
- Expo lint: passed.
- Infrastructure test: 1 passed.
- CDK synth: passed.
- iOS production export: passed (1,547 modules).
- `git diff --check`: passed.

## Pending gated actions

- Deploying creates one paid Secrets Manager secret (currently listed by AWS at $0.40 per secret-month, plus very small request charges).
- Creating the Roblox OAuth app creates persistent credentials and must be confirmed at action time.
- The prepared Roblox form currently targets owner `BrainNourishmentGames` and app name `roblox-analytics-mobile`.
- After creation, the user must personally copy the one-time client secret into AWS Secrets Manager; it must not be pasted into chat, source control, or command history.

## Prior activation action — after security remediation

After explicit approval, deploy the reviewed AWS change, create the prepared private Roblox OAuth app, configure only `openid profile`, add the exact callback below, and hand the secret-copy step to the user:

```text
https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback
```
