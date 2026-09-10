# Live connection repair — September 10, 2026

The development DynamoDB table `roblox-analytics-mobile-dev-app` had one
provisioned read and one write capacity unit. CloudWatch recorded 24 read
throttles in the 03:35 UTC bucket and 147 in the 03:40 UTC bucket while the
authenticated dashboard was loading. Analytics routes map unexpected storage
errors to HTTP 503.

Applied a targeted DynamoDB UpdateTable operation in account 896979073148,
us-east-2, using the existing development SSO role. The table is now ACTIVE
with PAY_PER_REQUEST billing, capped at 100 read and 25 write request units
per second. No records were modified. Backups and deletion protection remain.

The CDK source and table assertion reflect the same settings and the
infrastructure test passes. This was a direct operational update, not a full
CloudFormation deployment: the currently deployed stack template still has
the old capacity settings until the next reviewed deployment from this source.
Do not deploy an older checkout that would restore one-unit capacity.

App changes made during the simulator session also guard concurrent sign-in,
handle absent native splash views during Expo Go reloads, refresh stale
reports, and provide readable service errors. These fixes do not fabricate
metrics when Roblox reports zero or no data.
