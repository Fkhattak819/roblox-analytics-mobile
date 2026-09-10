# Roblox Analytics Studio — reviewer guide

A mobile workspace for Roblox creators to inspect engagement, retention,
acquisition, and aggregate revenue across authorized experiences. Five tabs
organize the product: Home, Experiences, Analytics, Sales, and More.

## Try it

Clone this repository, install the locked dependencies with `npm ci`, then run
`npm run demo` on macOS with Xcode and an iPhone simulator. The tested local
runtime is Expo SDK 54. Use a matching Expo Go runtime, or build the app with
`npm run demo:build:ios` to avoid depending on Expo Go's runtime version.

The standalone build command prompts for a destination. Choose an iOS
simulator, not a physical phone. It compiles the native app and embeds the
sample bundle; subsequent launches do not need Metro. The first build needs
dependency downloads and may take several minutes. A physical-device release
requires a separate signing and distribution workflow.

`npm run demo:export` produces an iOS JavaScript bundle in
`artifacts/reviewer-ios`; that export is build evidence, not a simulator binary.
All three commands force sample mode and ignore local environment files.

For the local simulator ZIP candidate, unzip it, boot an iPhone simulator in
Xcode, and run from the extracted directory:

```sh
xcrun simctl install booted RobloxAnalyticsStudio.app
xcrun simctl launch booted com.anonymous.roblox-analytics-mobile
```

This is a simulator app, not an IPA for a physical phone. The current package
has not been cleared for public distribution. See the release checklist.

## Three-minute walkthrough

1. Open the app and choose **Explore sample data** if onboarding appears.
   The sample labels identify fixtures, not live Roblox results.
2. Open **Home**. Inspect the report sections, use a section shortcut, and
   toggle comparison to distinguish a value from its period-over-period change.
3. Open **Experiences**, choose an experience, and inspect its detail view.
4. Open **Analytics**, select a report, and inspect its chart and detail route.
5. Open **Sales**. Explain the distinction between aggregate monetization and
   individual purchase events. Sample previews do not establish live-sale support.
6. Open **More** to inspect settings and the Creator Hub tools directory.

For a recorded walkthrough, show sample mode first and keep account details,
authorization prompts, and credentials out of the recording. Demonstrate live
mode separately only with an authorized creator account. No recording or public
install link is claimed until the release checklist records one.

## Engineering worth inspecting

| Problem | Implementation and evidence |
| --- | --- |
| An OAuth callback must belong to the initiating app | `services/roblox-auth-core.ts` checks the mobile S256 proof, callback state, destination, and one-time exchange; `tests/roblox-auth.test.ts` exercises invalid callbacks and cancellation. |
| Account changes race with async requests and keychain writes | `services/session-controller.ts` orders storage writes and discards stale operations; its tests cover sign-out races and duplicate sign-in attempts. |
| A creator must not access another creator's experience | Backend analytics authorization derives the owner from the verified session and checks the concrete Roblox grant; `backend/tests/analytics-authorization.test.mjs` covers cross-account access. |
| Slow upstream queries should not block screen rendering | Screens read cached snapshots; SQS workers perform Roblox queries. Deadline and worker tests cover cancellation and revoked access. |
| Real data may be unavailable or outdated | Runtime parsing validates snapshots. Connected mode does not substitute sample metrics after failures; old reports are labeled and refreshed. |
| Local success can hide infrastructure limits | The live dashboard exposed DynamoDB read throttling. The operational record documents the metrics, bounded capacity change, and remaining stack reconciliation. |

The request path is Expo → API Gateway/Lambda → tenant-scoped DynamoDB
snapshots. Refresh requests enqueue SQS work; a worker queries Roblox using
delegated credentials encrypted with KMS. Only an opaque app-session token is
stored on the device. The app never requests a `.ROBLOSECURITY` cookie.

## What this demonstrates—and what it does not

The repository provides concrete evidence of a mobile product, asynchronous
backend design, authentication boundaries, and debugging a deployed failure.
It does not establish adoption, revenue, production scale, internship history,
or a graduation date. Those claims require separate personal evidence.

AI assisted implementation, debugging, test preparation, and documentation in
this project. The validation record should be used to explain which outputs
were checked rather than claiming AI-generated changes were automatically
correct. Before using this project in an interview, the owner should be able
to explain the authorization checks, race handling, stale-data policy, and
database-capacity tradeoff in their own words.

## Current limitations

- The current sample Sales and product-detail screens still contain misleading
  “official” and recent-update labels. These are fixtures, not live results.
  Experiences also describes fixture games as connected. These copy defects
  block the public reviewer release until corrected.
- Live reports depend on the creator's granted resources and Roblox's data
  availability; a zero or missing metric is not replaced with an estimate.
- Individual purchase alerts, product rankings, and some Creator Hub reports
  are not supported by the current aggregate analytics connection.
- Simulator testing is not physical-device, accessibility, App Store, or
  production-load certification.
- The direct DynamoDB repair is documented in
  [the incident record](LIVE_CONNECTION_FIX_2026-09-10.md). The deployed
  CloudFormation template still needs reconciliation with the CDK source.
