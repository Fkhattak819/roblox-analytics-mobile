# Security operations

## Login protection candidate

AWS login start allows 10 requests per trusted gateway source IP per minute. Callback and exchange each allow 30. The existing gateway-wide throttle remains. Buckets use a SHA-256 digest of the canonical IP, action, and minute; raw IPs are not persisted. A hash is pseudonymous, not proof of anonymity. A conditional DynamoDB increment prevents concurrent requests exceeding the bucket. TTL is cleanup only: a new minute uses a new key regardless of delayed deletion. A fixed-window boundary can allow two windows' allowances in quick succession.

The gateway HTTP source address is authoritative; forwarded headers are ignored. Missing addresses, counter failures, and one-second counter timeouts fail closed with 503. Exhausted buckets return 429 and Retry-After. UpdateItem permission is restricted to LIMIT# keys in the app table. These changes remain local pending deployment review.

Limits reduce single-source abuse but do not eliminate attacks from many IPs. Shared NATs share allowance; monitor legitimate failures before adjusting limits. Source-IP controls do not replace future authenticated per-account limits and worker budgets. Local sample operation is unaffected.

## Diagnostics and alarms

Auth routes emit only a fixed event label, enumerated action, numeric status, and enumerated outcome. No request or error object is serialized; bodies, query strings, IPs, identity names, codes, tokens, and authorization headers are excluded. Public errors retain stable messages.

Proposed CDK alarms detect five auth 5xx results in five minutes or three Lambda errors in five minutes. Lambda errors include hard timeouts that bypass application logging. Missing data is treated as nonbreaching. These alarms have no notification actions yet; neither delivery nor live alarm state has been verified. Review custom metric/alarm costs and choose a notification destination before deployment. Existing log retention is one week.

## Incident response

1. Determine whether failure is application 5xx, Lambda timeout, throttling, upstream failure, or expired deployment configuration. Inspect aggregate metrics first. Do not enable request-body or authorization-header logging.
2. If login is being abused, retain proof verification and fail-closed behavior. Review source limits and global capacity; do not reactivate retired v1 login endpoints.
3. For suspected account compromise, revoke all sessions from a verified session and verify old sessions fail. For a global recovery or widespread compromise, deploy a never-used SessionEpoch before reopening traffic.
4. For a leaked credential, revoke/rotate through its owner service. Do not paste values into issues or logs. A Git history rewrite is not a substitute for rotation.
5. After recovery, verify valid login, cleanup failures, revoked sessions, account isolation, and alarm behavior in the isolated validation environment. Record timestamps, revisions, outcome counts, and unresolved limits, not secrets.

Live verification is pending. GitHub CI passed for commit 79a0879 before this limiter/logging candidate. The AWS profile exists but its SSO session was expired when checked; no identity or deployed control was verified by that failed call.
