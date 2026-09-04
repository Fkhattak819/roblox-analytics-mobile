# roblox-analytics-mobile handoff

Updated: 2026-09-02 (America/Chicago)

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

## Exact next action

After explicit approval, deploy the reviewed AWS change, create the prepared private Roblox OAuth app, configure only `openid profile`, add the exact callback below, and hand the secret-copy step to the user:

```text
https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback
```

