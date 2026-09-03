# roblox-analytics-mobile infrastructure

This AWS CDK application defines the bounded development stack in `us-east-2`:

- API Gateway HTTP API, one API Lambda, and one concurrency-limited analytics worker Lambda
- one 1-RCU/1-WCU DynamoDB application table
- one Secrets Manager secret for Roblox OAuth and one for the least-privilege analytics key
- one encrypted SQS sync queue and dead-letter queue
- one private, S3-managed-encryption history bucket with 30-day object expiry
- seven-day Lambda log retention and a 5-request/second API throttle
- a free $10 monthly AWS budget and free daily cost-anomaly email alerts

The API Lambda can enqueue sync work but cannot read the analytics key. The worker can read that one secret and write tenant-scoped snapshots. OAuth state, one-time exchange codes, and app-session tokens are hashed before they are used as DynamoDB keys. Roblox access and refresh tokens are never persisted. The stack deliberately avoids Cognito, a customer-managed KMS key, and a NAT gateway for this bounded development deployment.

Local verification:

```sh
npm install
npm test
npm run synth -- --profile roblox-analytics-mobile
```

Deployment requires a bootstrapped AWS account and a reviewed `cdk diff`. Supply the alert recipient at deployment time so no email address is stored in source control:

```sh
npm run deploy:dev -- --parameters roblox-analytics-mobile-dev:BudgetAlertEmail=you@example.com
```

The deployment creates two paid Secrets Manager secrets. After registering the private Roblox OAuth app, update its secret manually with a JSON object containing `clientId` and `clientSecret`; do not pass the secret on a command line or commit it. Register this exact development callback with Roblox:

```text
https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback
```

Store the OAuth credentials using hidden prompts:

```sh
./scripts/configure-roblox-oauth.sh
```

Create a dedicated Roblox Open Cloud key restricted to universe `10009166512` and Analytics read access. Store it without placing it in shell history:

```sh
./scripts/configure-roblox-analytics-key.sh
```
