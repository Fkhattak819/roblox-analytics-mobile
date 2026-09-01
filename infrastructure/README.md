# roblox-analytics-mobile infrastructure

This AWS CDK application defines the first credential-free development stack in `us-east-2`:

- API Gateway HTTP API and one bounded Lambda function
- one 1-RCU/1-WCU DynamoDB application table
- one encrypted SQS sync queue and dead-letter queue
- one private, S3-managed-encryption history bucket with 30-day object expiry
- seven-day Lambda log retention and a 5-request/second API throttle
- a free $10 monthly AWS budget and free daily cost-anomaly email alerts

It deliberately does not create Cognito, a customer-managed KMS key, a NAT gateway, fixed egress, or any real Roblox credential integration.

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
