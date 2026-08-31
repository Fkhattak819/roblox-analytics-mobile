# StudioPulse backend

This is the first local backend scaffold for StudioPulse. It is intentionally credential-free:

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

The next cloud milestone adds Cognito/API Gateway JWT validation, KMS-backed credential storage, DynamoDB repositories, SQS refresh jobs, and the Roblox Analytics Query API adapter. Do not put a Roblox API key or AWS access key in this directory or the Expo bundle.
