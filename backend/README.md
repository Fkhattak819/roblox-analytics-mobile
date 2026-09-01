# roblox-analytics-mobile backend

This is the first backend scaffold for `roblox-analytics-mobile`. It runs locally and through an AWS Lambda adapter, and it is intentionally credential-free:

- `GET /v1/health` — service health
- `GET /v1/sample/home` — deterministic sample payload for the Expo app
- `GET /v1/auth/roblox/start` — PKCE URL generation when OAuth configuration exists
- `POST /v1/connections/analytics/validate` — request-shape validation only in local mode

Run it with:

```sh
cp .env.example .env
npm run build
npm test
npm start
```

The first AWS development stack exposes the health and sample endpoints through API Gateway while provisioning the storage and queue foundations. Cognito, KMS-backed credentials, and real Roblox calls stay disabled until their separate security and cost gates. Do not put a Roblox API key or AWS access key in this directory or the Expo bundle.
