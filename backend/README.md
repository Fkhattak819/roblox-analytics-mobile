# roblox-analytics-mobile backend

This backend runs locally and through an AWS Lambda adapter. One Roblox OAuth consent provides identity and delegated read-only analytics access:

- `GET /v1/health` — service health
- `GET /v1/sample/home` — deterministic sample payload for the Expo app
- `GET /v2/auth/roblox/start?clientChallenge=...&clientState=...` — mobile-bound, one-time PKCE authorization start
- `GET /v1/auth/roblox/callback` — Roblox callback and one-time mobile redirect
- `POST /v2/auth/session/exchange` — one-time app-session exchange requiring `{ code, clientVerifier }`
- Legacy v1 start/exchange routes return 410 and cannot create a session
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

Local OAuth development requires `ROBLOX_OAUTH_CLIENT_ID` and `ROBLOX_OAUTH_CLIENT_SECRET` in an untracked environment file. AWS reads both fields from the `roblox-analytics-mobile/dev/roblox-oauth` Secrets Manager JSON object. The callback exchanges the Roblox code, reads the stable `sub` profile ID and concrete authorized universe resources, and stores access/refresh tokens only as KMS ciphertext. Mobile receives only an opaque app-session token and authorized universe IDs.

The legacy analytics API-key validation route remains disabled and is not used by the runtime. Never put a Roblox OAuth token, client secret, Roblox API key, `.ROBLOSECURITY` cookie, or AWS access key in this directory or the Expo bundle.
