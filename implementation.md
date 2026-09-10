# Roblox Analytics Studio — Implementation

Status: working pre-release iOS application. Evidence checkpoint: September 10, 2026.

This document explains the current code, how to run it, and what still needs verification. It is not a claim of public release or production readiness. For component relationships and security boundaries, see [architecture.md](architecture.md).

## What is implemented

The Expo React Native client has five primary destinations: Home, Experiences, Analytics, Sales, and More. It includes onboarding, Roblox sign-in, local sample data, report views, and account controls. A screen existing does not mean every displayed capability has a live data source.

The AWS backend implements the OAuth session flow, authorized analytics snapshot reads, connection metadata, and queued synchronization. Aggregate monetization is supported through analytics; exact purchase feeds and their sample product rankings are not established live features.

## Code map

| Location | Responsibility |
| --- | --- |
| `app/` | Expo Router entry points and navigation |
| `src/screens/` | Product screens and user interactions |
| `src/components/` | Shared UI and charts |
| `src/state/` | Session, workspace, and appearance state |
| `src/hooks/use-analytics-snapshot.ts` | Report loading and refresh coordination |
| `services/` | Network adapters, authentication, timeout handling, session controller |
| `contracts/src/` | Shared data types and runtime validation |
| `contracts/openapi.json` | Machine-readable API contract |
| `backend/src/router.ts` | API request routing |
| `backend/src/modules/auth/` | OAuth, sessions, credentials, and login protection |
| `backend/src/modules/analytics/` | Authorization, snapshots, upstream queries, and sync jobs |
| `backend/src/lambda/` | API and SQS worker entry points |
| `infrastructure/` | AWS CDK stack and infrastructure test |
| `tests/`, `backend/tests/` | Mobile-service and backend regression tests |

## Run the sample app

From this directory, with Node.js, Xcode, and an iOS simulator installed:

```sh
npm ci
npm run demo
```

The current lockfile targets Expo SDK 54 and React Native 0.81.5. Expo Go must match the project's runtime. To avoid relying on an Expo Go version, build the standalone simulator app:

```sh
npm run demo:build:ios
```

Choose a simulator destination. The Release build embeds its JavaScript and can subsequently launch without Metro. The first native build requires native dependencies and takes longer than starting a development server.

The demo wrapper in `scripts/reviewer.mjs` ignores local dotenv files, forces `EXPO_PUBLIC_DATA_MODE=sample`, and clears the API URL. Sample startup does not restore a saved live session. No Roblox account is needed for the sample walkthrough.

`npm run demo:export` produces an iOS JavaScript bundle, not an installable phone app.

## Live mode

Live builds use `EXPO_PUBLIC_DATA_MODE=aws_dev` and a configured `EXPO_PUBLIC_API_BASE_URL`. These are public configuration values—not places to store secrets. Use the normal Expo commands with the intended environment, not the sample-forcing demo wrapper.

The live flow requires a working backend, registered OAuth callback configuration, and the creator's authorized universe resources. A successful identity login alone is not proof that a report exists or that the creator has access to every universe.

Note: `services/backend-api.ts` also contains an AWS-transport loader for `/v1/sample/home`. That endpoint still returns sample data; an AWS transport label does not make those fixtures official analytics. Connected report reads use the analytics API path.

## Important implementation decisions

### Authentication belongs outside a screen's lifetime

`services/session-controller.ts` owns a shared pending sign-in promise. Screen remounts cannot release that lock and open a second native login browser. The controller also rejects stale async results and serializes secure-storage changes so a late login or token write cannot silently undo logout.

### Validate network data at the boundary

The client parses unknown responses before passing them to screens. Report identity must match the requested context. Source failures, missing snapshots, stale snapshots, and valid zero values are different states.

### Bound network work

`services/fetch-with-timeout.ts` uses an AbortController-based timeout compatible with the app runtime. The backend additionally budgets OAuth and analytics work so slow upstream operations do not consume an entire invocation without room for cleanup.

### Keep sample and live data separate

Sample data supports offline exploration. A connected request failure must not silently substitute fixture metrics. Some sample Sales/product labels still incorrectly imply official or recently updated data; fixing that copy is an open release task.

## Verification commands

```sh
npm run verify
npm --prefix infrastructure ci
npm --prefix infrastructure test
npm run demo:export
node scripts/scan-secrets.mjs
```

`verify` covers TypeScript, lint, mobile tests, and backend tests. Infrastructure is a separate check. Secret scanning requires `gitleaks` to be installed; a missing scanner is a failed check, not a clean result. Do not put secrets into commands or captured output.

## Recorded evidence, not newly rerun tests

- The isolated candidate passed 61 mobile tests, 59 backend tests, one infrastructure test, TypeScript, and lint.
- The root dependency audit reported zero known vulnerabilities at that checkpoint.
- A sample Release simulator build opened all five tabs without Metro.
- Live simulator testing verified login and Home/Sales recovery after a database-capacity repair; Analytics displayed a saved report where applicable.
- An unsigned arm64 physical-iPhone Release build compiled successfully. Signing, installation, and runtime testing on the phone remain incomplete.
- Secret scanning did not run successfully because its executable was unavailable.

These results do not prove accessibility, load capacity, physical-device correctness, or public distribution readiness.

## Next implementation and release work

1. Connect the physical iPhone, select the appropriate signing team, install, and test the complete account/report lifecycle.
2. Correct misleading sample labels after the required live-design inspection.
3. Run source/history/binary secret checks and confirm bundled font/artwork distribution rights.
4. Reconcile the deployed CloudFormation table configuration with the CDK capacity repair.
5. Test release behavior, document supported versus unavailable capabilities, and prepare distribution only after those gates pass.

See [API contract](docs/API_CONTRACT.md) and [live repair record](docs/LIVE_CONNECTION_FIX_2026-09-10.md) for technical details. Existing historical design plans are not an inventory of shipped features.
