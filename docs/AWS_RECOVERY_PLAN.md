# AWS recovery deployment candidate — September 7, 2026

Status: local candidate only. After the user refreshed SSO, a read-only STS check verified the non-root AWSReservedSSO assumed role in account 896979073148. CloudFormation returned 25 deployed resources, including both functions, both secrets and the existing worker queue mapping. Full comparison against freshly synthesized output is pending. No cloud resources were changed and no restore has been tested.

## Proposed controls

- Application table: deletion protection and 35-day point-in-time recovery (PITR). Retain policies remain in place for deletion and replacement.
- History bucket: versioning with 30-day noncurrent-version expiry, alongside existing 30-day current-object expiry, public access blocks and TLS enforcement. Older versions eventually expire; this is bounded recovery, not indefinite archival.
- Sync queue: 720-second visibility timeout for the 120-second worker. Existing partial batch responses remain enabled. At-least-once delivery still requires idempotency.
- Existing analytics secret output restored. Worker, secrets and resource logical IDs must still be compared against the live CloudFormation template before deployment.

AWS recommends a visibility timeout of at least six times the Lambda timeout: [SQS configuration](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-lambda-function-trigger.html). PITR supports up to 35 days; shortening the recovery period does not reduce its table-size-based charge: [DynamoDB PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html).

## Deployment gate

1. Refresh SSO and verify an assumed non-root identity for the intended account and region.
2. Complete synthesis tests, then compare live and proposed logical IDs, IAM, resource replacement/deletion and changed properties using a read-only diff. Never print secret values or full runtime environment maps.
3. Estimate incremental PITR, retained S3 versions, metrics and alarm charges from current regional pricing and measured metadata. The existing budget is an alert, not a spending cap. Restore drills also incur temporary table/storage/request costs.
4. Resolve analytics grant provisioning and remaining worker/session integration concerns. Confirm updated mobile login compatibility before retiring live v1 exchanges.
5. Present the concrete diff and cost estimate for deployment approval. Notification delivery needs an approved destination and separate verification.

## Recovery drill acceptance

Use an isolated, explicitly approved target and synthetic records. Do not restore production data into a public or casually accessible test environment.

1. Verify PITR is ENABLED and record its earliest/latest restorable timestamps after deployment. Recovery begins at enablement; it cannot recover earlier incidents.
2. Restore to a separately named table at an eligible timestamp. Keep restored data disconnected from serving traffic and workers. Record duration as measured recovery time; no recovery objective is proven until this succeeds.
3. Verify restored table encryption, TTL, PITR, deletion protection, IAM and retention independently; do not assume every setting carries over. Validate synthetic snapshot and access-grant behavior without printing private contents.
4. Before any restored auth data serves requests, configure a never-used SessionEpoch and verify pre-restore sessions, OAuth states and exchanges fail. Review restored grants against current ownership records so revoked access is not resurrected.
5. In an isolated versioned bucket, write and overwrite a synthetic object; recover its earlier version and verify the expected hash. Test deleted-object recovery and continued public-access denial. Never weaken the real bucket policy for this drill.
6. Record target identifiers, timestamps, hashes/outcome counts and costs, then obtain approval for any destructive cleanup. A successful isolated drill does not authorize a production cutover.

## Current validation

The earlier execution restriction cleared. `npm --prefix infrastructure test` passed, including backend compilation, both Lambda bundles and synthesized recovery/IAM/retention assertions.

`npm run diff:dev -- --no-change-set` succeeded against account 896979073148, us-east-2, on September 7. It created no change set and deployed nothing. The template diff reports:

- No resource deletions or replacements. Existing worker, two secrets and queue mapping are preserved.
- Three added resources: auth metric filter and two alarms. One added parameter: SessionEpoch.
- Updated table recovery/protection, bucket versioning/lifecycle, queue visibility, two runtime IAM policies and both Lambda code packages. API environment gains SessionEpoch.
- IAM narrows existing application-table grants and adds explicit ACCESS# write denials, grant reads, worker condition checks and LIMIT# counter updates.

This is a template diff, not a CloudFormation change-set guarantee or proof of live effective IAM. Existing IAM inventory permission denials remain unresolved. Deployment still requires application compatibility, operator grant provisioning and final approval.

### Preliminary cost inputs

Live `DescribeTable` metadata reports 73,843 bytes and 18 items, with deletion protection still false. AWS table-size metadata is approximate and periodically refreshed. No records were read.

AWS's published pricing examples use $0.20/GB-month for PITR, $0.30/month per custom metric and $0.10/month per standard alarm. At those example rates, one metric plus two alarms is approximately $0.50/month before free-tier effects; the current tiny table contributes much less than one cent/month for PITR. These are preliminary planning figures, not an Ohio-specific quote or a total bill forecast. Verify regional rates and account discounts before approval. Sources: [DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/), [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/).

Additional S3 old-version storage, auth-result log ingestion, application load and an isolated restore drill are variable and not included. Current bucket size/version turnover has not been measured. Existing provisioned capacity may throttle the additional conditional/transactional work; validate capacity under expected traffic before deployment rather than silently increasing paid capacity.
