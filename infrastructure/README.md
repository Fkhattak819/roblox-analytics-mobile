# roblox-analytics-mobile infrastructure

This AWS CDK application defines the bounded development stack in `us-east-2`:

- API Gateway HTTP API and one bounded Lambda function
- one 1-RCU/1-WCU DynamoDB application table
- one Secrets Manager secret for the Roblox OAuth client ID and client secret
- one encrypted SQS sync queue and dead-letter queue
- one private, S3-managed-encryption history bucket with 30-day object expiry
- seven-day Lambda log retention and a 5-request/second API throttle
- a free $10 monthly AWS budget and free daily cost-anomaly email alerts

The Lambda receives least-privilege access to the application table and the one OAuth secret. OAuth state, one-time exchange codes, and app-session tokens are hashed before they are used as DynamoDB keys. Roblox access and refresh tokens are never persisted. It deliberately does not create Cognito, a customer-managed KMS key, a NAT gateway, or fixed egress; analytics API-key submission remains disabled.

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

The deployment creates a paid Secrets Manager secret. After registering the private Roblox OAuth app, update that secret manually with a JSON object containing `clientId` and `clientSecret`; do not pass the secret on a command line or commit it. Register this exact development callback with Roblox:

```text
https://bqrr070bkf.execute-api.us-east-2.amazonaws.com/v1/auth/roblox/callback
```
