# roblox-analytics-mobile infrastructure

This AWS CDK application defines the bounded development stack in `us-east-2`:

- API Gateway HTTP API, one API Lambda, and one concurrency-limited analytics worker Lambda
- one 1-RCU/1-WCU DynamoDB application table
- one active Secrets Manager secret for the Roblox OAuth client plus one retained, runtime-inaccessible legacy analytics secret
- one customer-managed KMS key for delegated Roblox access and refresh token encryption
- one encrypted SQS sync queue and dead-letter queue
- one private, S3-managed-encryption history bucket with 30-day object expiry
- seven-day Lambda log retention and a 5-request/second API throttle
- a free $10 monthly AWS budget and free daily cost-anomaly email alerts

The API Lambda exchanges Roblox OAuth grants and stores only KMS ciphertext. The worker can decrypt the signed-in creator's delegated tokens, rotate refresh tokens under a DynamoDB lease, and write tenant-scoped snapshots. OAuth state, one-time exchange codes, and app-session tokens are hashed before they are used as DynamoDB keys. Mobile never receives Roblox tokens. The stack deliberately avoids Cognito and a NAT gateway for this bounded development deployment.

Local verification:

```sh
npm install
npm test
npm run synth -- --profile roblox-analytics-mobile
```

Deployment requires a bootstrapped AWS account and a reviewed `cdk diff`. Supply the alert recipient at deployment time so no email address is stored in source control. The address receives budget and cost-anomaly alerts immediately; AWS also sends an SNS confirmation email that must be accepted before security and runtime alarm notifications can be delivered:

```sh
npm run deploy:dev -- --parameters roblox-analytics-mobile-dev:BudgetAlertEmail=you@example.com
```

The deployment uses the OAuth client secret and creates a paid customer-managed KMS key (about $1/month before request charges). The old analytics secret is retained for rollback but no runtime role can read it. Register `openid`, `profile`, and `universe.analytics:read` on the private Roblox OAuth app with this exact callback:

```text
https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback
```

Store the OAuth credentials using hidden prompts:

```sh
./scripts/configure-roblox-oauth.sh
```

No creator API key is collected. Each tester approves the configured universe during Roblox OAuth sign-in.
