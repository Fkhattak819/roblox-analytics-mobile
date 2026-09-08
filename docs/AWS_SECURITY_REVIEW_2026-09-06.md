# Live AWS review — September 6

Read-only inspection used the `roblox-analytics-mobile` profile in us-east-2 after successful SSO login. STS identified an assumed AWSReservedSSO role, not root. No credentials, secret values, application records, or log bodies were read. No cloud resources were changed.

## Verified live

- Development stack `roblox-analytics-mobile-dev`: UPDATE_COMPLETE.
- Application table: ACTIVE; deletion protection false; point-in-time recovery DISABLED. ContinuousBackupsStatus ENABLED does not mean PITR is enabled. Missing SSEDescription in the response does not establish lack of DynamoDB encryption.
- History bucket: all four public-access blocks true; policy status IsPublic false; default AES256 encryption; bucket policy denies non-TLS access. Versioning response has no enabled status.
- API Lambda: Node.js 22, ten-second timeout, Active; last modified September 3.
- CloudWatch describe-alarms returned no metric alarms in this account/region through this profile.
- IAM ListRolePolicies and ListAttachedRolePolicies were denied. Effective API-role permissions remain unverified; denied inspection is not evidence that policies are absent.

## Deployment reconciliation required

The live stack includes an analytics worker, its role/log group/SQS mapping, and an analytics secret resource absent from the audit branch's CDK source. Remote `master` at 32ef869 contains corresponding analytics implementation and substantial newer UI work. This is a strong source-reconciliation lead, not proof of the precise deployed commit. Do not deploy the older audit template over the live stack: it could remove existing functionality/resources.

Review and integrate the newer work while retaining the audit branch's v2 login proof, session lifecycle, revocation, dependency patches, CI, and new limiter/logging changes. Preserve newer screens using their live Figma references before resolving visual conflicts.

## New source authorization finding

On remote master, router requestAnalyticsSync authenticates the session and checks a deployment-wide universe allowlist, then queues work under the requesting user's ID. The worker repeats the global universe check and uses the configured analytics credential without checking that this user is authorized for the universe. Tenant-prefixed storage does not prevent unauthorized data from being copied into the requesting tenant by that job.

This is a source-level authorization gap, not a demonstrated live exploit. Fix by enforcing a server-owned user/workspace-to-universe authorization relation both before enqueue and again before worker processing/publishing, including membership revocation tests. Do not test against real creators' data or read the analytics secret to investigate.

## Remaining gates

Reconcile deployed functionality first. Then review a concrete deployment diff and backup/alarm cost, add recovery protection, perform an isolated restore with a fresh SessionEpoch, and verify private access and revocation afterward. Obtain read-only IAM visibility to finish policy review. Native simulator validation, notification delivery, repository protections, and owner-account recovery/MFA remain open.
