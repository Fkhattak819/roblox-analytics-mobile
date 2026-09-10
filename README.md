# Roblox Analytics Studio

Roblox Analytics Studio is an Expo-managed React Native analytics companion for Roblox creators with a TypeScript serverless backend on AWS. The repository and compatibility-sensitive service identifiers retain the original `roblox-analytics-mobile` name.

## Review the project

Start with the [reviewer guide and three-minute walkthrough](docs/REVIEWER_GUIDE.md).
It explains the product, the engineering decisions, and the limits of the current release.

On a Mac with Xcode and an iOS simulator, use Node 22.18 or newer:

```sh
npm ci
npm run demo
```

The demo uses labeled fixtures and ignores `.env.local`. It needs no Roblox
account or AWS credentials. For a standalone simulator build with embedded
sample data, run `npm run demo:build:ios` and select an iPhone simulator.
This is a development portfolio project; no App Store or TestFlight release
is claimed. A JavaScript export is not an installable iPhone app.

Run `npm run verify` for TypeScript, lint, mobile tests, and backend tests.
The current local release candidate uses Expo SDK 54; include its lockfile and
compatibility changes together when publishing it. See the
[release checklist](docs/RELEASE_CHECKLIST.md) for verification status.

Current implementation:

- Expo onboarding, five-tab app shell, analytics screens, and detail routes restored from the repository safety backup
- Home dashboard with offline Sample Mode and an explicit AWS development mode
- typed, runtime-validated API client
- API Gateway HTTP API + Lambda backend
- DynamoDB, SQS/DLQ, and private S3 foundations
- AWS budget and cost-anomaly safeguards

Run the app:

```sh
cp .env.example .env.local
npm install
npm run typecheck
npm start
```

`EXPO_PUBLIC_DATA_MODE=sample` uses local fixtures. Set it to `aws_dev` to enable Roblox OAuth and authenticated cached analytics through the deployed AWS API. No Roblox credential belongs in Expo environment files.

Start here:

- [Expo development playbook](docs/EXPO_DEVELOPMENT_PLAYBOOK.md)
- [API contract and backend route plan](docs/API_CONTRACT.md)
- [AWS backend learning and scaling guide](docs/AWS_BACKEND_LEARNING_AND_SCALING_GUIDE.md)
- [Mac and iOS development playbook](docs/MAC_IOS_DEVELOPMENT_PLAYBOOK.md)
- [Ready-to-paste overnight Codex goal](NIGHT_GOAL.md)
- [Figma implementation manifest](docs/FIGMA_IMPLEMENTATION_MANIFEST.md)
- [Local Figma node-map snapshot](design-system-state-studiopulse-onboarding.json)

The connected live Figma file remains the visual source of truth for future production screens. The current screens are a functional prototype and integration surface, not a claim of final Figma parity.

Historical SwiftUI planning files remain in the repository for reference; Expo is the active mobile implementation in this workspace.

## Product contract

- Expo-managed React Native mobile app, with the current Figma reference designed on a 393 x 852 point mobile canvas.
- Persistent destinations: Home, Experiences, Analytics, Sales, More.
- Sample mode works before any account or credential is connected.
- The first real-data release is read-only toward Roblox experiences.
- Roblox OAuth requests identity and read-only analytics access for the experiences the creator authorizes.
- Roblox API keys never ship in the mobile app and `.ROBLOSECURITY` is never requested.
- Official aggregate analytics must remain visually distinct from optional live-sale instrumentation.
