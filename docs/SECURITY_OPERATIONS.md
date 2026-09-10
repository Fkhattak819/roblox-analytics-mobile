# Security operations

## Login protection

AWS login start allows 10 requests per trusted gateway source IP per minute. Callback and exchange each allow 30. The existing gateway-wide throttle remains. Buckets use a SHA-256 digest of the canonical IP, action, and minute; raw IPs are not persisted. A hash is pseudonymous, not proof of anonymity. A conditional DynamoDB increment prevents concurrent requests exceeding the bucket. TTL is cleanup only: a new minute uses a new key regardless of delayed deletion. A fixed-window boundary can allow two windows' allowances in quick succession.

The gateway HTTP source address is authoritative; forwarded headers are ignored. Missing addresses, counter failures, and one-second counter timeouts fail closed with 503. Exhausted buckets return 429 and Retry-After. UpdateItem permission is restricted to LIMIT# keys in the app table. These controls are deployed in the development stack.

Limits reduce single-source abuse but do not eliminate attacks from many IPs. Shared NATs share allowance; monitor legitimate failures before adjusting limits. Source-IP controls do not replace future authenticated per-account limits and worker budgets. Local sample operation is unaffected.

## Diagnostics and alarms

Auth routes emit only a fixed event label, enumerated action, numeric status, and enumerated outcome. No request or error object is serialized; bodies, query strings, IPs, identity names, codes, tokens, and authorization headers are excluded. Public errors retain stable messages.

CDK alarms detect five auth 5xx results in five minutes or three Lambda errors in five minutes. Lambda errors include hard timeouts that bypass application logging. Missing data is treated as nonbreaching. Both development alarms currently report `OK` and route to a TLS-only SNS topic. The email subscription is still `PendingConfirmation`; delivery is not active until the recipient clicks the AWS confirmation email. These alarms cover this Roblox Analytics Studio deployment, not every AWS service or application in the account. Existing log retention is one week.

## Incident response

Worker budget follow-up: invocation work now shares a deadline capped at 110 seconds or remaining Lambda time minus two seconds. AWS sends receive the same abort signal and are bounded even during SDK credential resolution. Deadline-bound client facades are never cached across invocations. Parallel queries inherit the cancellation signal; expired work cannot start another SDK request. Tests cover these boundaries with synthetic stalled services. Aborting an already-submitted transaction is not proof of rollback; atomic authorization and idempotent snapshot writes remain required. Live timeout and redelivery behavior are still unverified.

Analytics transport candidate (September 7): query creation, response body and polling share a 30-second deadline. Fetch receives an abort signal and rejects redirects. Deadline failures are nonretryable, operation paths require the expected universe and a simple operation identifier, and upstream operation error text is not propagated. Synthetic stalled-transport tests pass. This does not yet bound the entire worker invocation: credential retrieval, DynamoDB calls and multiple query phases still need a shared remaining-time budget and coordinated cancellation. No live request/deployment verification occurred.

1. Determine whether failure is application 5xx, Lambda timeout, throttling, upstream failure, or expired deployment configuration. Inspect aggregate metrics first. Do not enable request-body or authorization-header logging.
2. If login is being abused, retain proof verification and fail-closed behavior. Review source limits and global capacity; do not reactivate retired v1 login endpoints.
3. For suspected account compromise, revoke all sessions from a verified session and verify old sessions fail. For a global recovery or widespread compromise, deploy a never-used SessionEpoch before reopening traffic.
4. For a leaked credential, revoke/rotate through its owner service. Do not paste values into issues or logs. A Git history rewrite is not a substitute for rotation.
5. After recovery, verify valid login, cleanup failures, revoked sessions, account isolation, and alarm behavior in the isolated validation environment. Record timestamps, revisions, outcome counts, and unresolved limits, not secrets.

Live verification on September 7 used the non-root SSO deployment role in the intended account and region. CloudFormation is `UPDATE_COMPLETE`, both Lambdas are healthy, both alarms are `OK` with SNS actions, the secure OAuth-start route returns 200, anonymous session and analytics routes return 401, and the retired v1 start route returns 410. Email delivery remains pending subscription confirmation. A controlled alarm transition, authenticated native login, live worker timeout/redelivery exercise, and paid isolated recovery drill remain separate validation work.
