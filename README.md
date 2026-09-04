# roblox-analytics-mobile

StudioPulse (`roblox-analytics-mobile`) is an Expo-managed React Native analytics companion for Roblox creators with a TypeScript serverless backend on AWS.

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

`EXPO_PUBLIC_DATA_MODE=sample` performs no network requests. Set it to `aws_dev` to load the same safe sample snapshot through the deployed AWS API. No Roblox credential belongs in Expo environment files.

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
- Roblox OAuth identity and Roblox Open Cloud analytics access are separate connections.
- Roblox API keys never ship in the mobile app and `.ROBLOSECURITY` is never requested.
- Official aggregate analytics must remain visually distinct from optional live-sale instrumentation.
