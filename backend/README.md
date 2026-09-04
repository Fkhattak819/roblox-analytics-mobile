# roblox-analytics-mobile backend

This backend runs locally and through an AWS Lambda adapter. Its Roblox identity flow is implemented, while the separate Open Cloud analytics-key flow remains disabled:

- `GET /v1/health` — service health
- `GET /v1/sample/home` — deterministic sample payload for the Expo app
- `GET /v1/auth/roblox/start` — persisted, one-time PKCE authorization start
- `GET /v1/auth/roblox/callback` — Roblox callback and one-time mobile redirect
- `POST /v1/auth/session/exchange` — one-time app-session exchange
- `GET /v1/auth/session` — current Roblox identity for a bearer app session
- `POST /v1/auth/logout` — app-session revocation
- `POST /v1/connections/analytics/validate` — request-shape validation only in local mode

Run it with:

```sh
cp .env.example .env
npm run build
npm test
npm start
```

Local OAuth development requires `ROBLOX_OAUTH_CLIENT_ID` and `ROBLOX_OAUTH_CLIENT_SECRET` in an untracked environment file. AWS reads both fields from the `roblox-analytics-mobile/dev/roblox-oauth` Secrets Manager JSON object. The callback exchanges the Roblox code, reads the stable `sub` profile ID, then revokes the returned Roblox refresh token; Roblox access and refresh tokens are not stored.

The analytics API-key route remains disabled until KMS encryption, outbound-network restrictions, and its remaining security gates are complete. Never put a Roblox secret, Roblox API key, `.ROBLOSECURITY` cookie, or AWS access key in this directory or the Expo bundle.
