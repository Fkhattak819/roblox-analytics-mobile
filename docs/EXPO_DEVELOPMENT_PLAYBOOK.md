# StudioPulse Expo Development Playbook

**Status:** current implementation source of truth

**Last updated:** 2026-08-26

**Client:** Expo-managed React Native with TypeScript

**Development entry point:** Expo Go for fast iteration

**Production path:** Expo development builds and EAS Build

## 1. The stack decision

StudioPulse uses Expo-managed React Native, not native SwiftUI. The repository should contain a JavaScript/TypeScript application and Expo configuration. The empty `StudioPulse.xcodeproj/` directory came from an earlier native-iOS plan and is not the application source.

Use this progression:

```text
Expo Go
  -> development build with expo-dev-client
      -> EAS preview build
          -> EAS production build
```

Expo Go provides fast feedback while you learn and build the sample-data UI. Expo Go includes a fixed set of native libraries, so it cannot support every native dependency or custom app configuration. When the app needs custom native code, app icons, universal links, remote push notifications, or store-ready behavior, build a development client with `expo-dev-client` and EAS Build.

The client stack is:

| Concern | Decision |
| --- | --- |
| UI | React Native and Expo components |
| Language | TypeScript with strict checking |
| Routing | Expo Router when the project is initialized with it |
| Networking | `fetch` behind typed repository/client modules |
| Authentication | Cognito sessions and Roblox OAuth Authorization Code + PKCE later |
| Secure storage | `expo-secure-store` for StudioPulse tokens |
| Local sample data | Deterministic fixtures with no network requirement |
| Build and distribution | Expo CLI, EAS CLI, preview builds, production builds |
| Backend | API Gateway HTTP API, Lambda, DynamoDB, SQS, EventBridge, and related AWS services |
| API contract | OpenAPI 3.1 with generated or mechanically checked TypeScript models |

## 2. Expo Go, development builds, and EAS

### Expo Go

Use Expo Go for:

- React Native layout work.
- Sample Mode.
- API client development against fixtures or a local server.
- Expo SDK libraries already included in Expo Go.
- Fast sharing through a QR code during local development.

Do not use Expo Go as proof that a production build works. Expo Go cannot change its native runtime after installation. It cannot load arbitrary native modules that are absent from the installed Expo Go version.

### Development builds

Use a development build when you need:

- A native library that Expo Go does not include.
- `expo-dev-client` and a project-specific developer menu.
- Custom app name, icon, splash screen, URL scheme, or native configuration.
- Remote push-notification testing.
- A runtime that matches the project's future production binary.

Create one with the Expo workflow after the project has a valid `package.json` and app configuration:

```powershell
npx expo install expo-dev-client
eas build:configure
eas build --profile development --platform android
eas build --profile development --platform ios
```

Use the platform that matches the current project scope. Do not create an iOS build simply because the old repository name contains `ios`.

### EAS Build

Use EAS Build for preview and production binaries. Keep `eas.json` in Git. Keep EAS tokens and signing credentials out of the repository.

An initial profile can look like this:

```json
{
  "cli": {
    "version": ">= 16.18.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

Treat the exact CLI version and SDK version as project decisions. Pin them in the lockfile and record the versions used for a successful build.

## 3. Recommended project structure

When the Expo application is initialized, use a feature-first layout:

```text
roblox-analytics-mobile/
  src/
    app/
      _layout.tsx
      index.tsx
      (tabs)/
        _layout.tsx
        index.tsx
        experiences.tsx
        analytics.tsx
        sales.tsx
        more.tsx
      onboarding/
        welcome.tsx
        roblox-identity.tsx
        analytics-access.tsx
        choose-experiences.tsx
        ready.tsx
    components/
    design-system/
    features/
      onboarding/
      home/
      experiences/
      analytics/
      sales/
      more/
    domain/
    repositories/
    services/
    fixtures/
    hooks/
    constants/
  assets/
  backend/
  infra/
  app.json or app.config.ts
  eas.json
  package.json
  tsconfig.json
```

If the project uses Expo Router, route files belong under `src/app`. Keep components, hooks, repositories, fixtures, and utilities outside that directory so Expo Router does not treat them as routes.

## 4. Stable product contract

The app keeps five destinations:

1. Home
2. Experiences
3. Analytics
4. Sales
5. More

The first onboarding story remains:

1. Welcome and Sample Mode.
2. Roblox identity concept.
3. Read-only analytics access concept.
4. Choose authorized experiences.
5. Ready and enter Home.

Sales setup stays optional after activation. It should not block a creator who only wants official analytics.

The selected workspace and experience live in shared app state. Each feature reads that state through typed hooks. Route parameters should identify a destination, while the backend still performs authorization for every workspace and universe request.

## 5. React Native architecture

Use four layers:

```text
Routes
  -> feature screens and feature state
      -> domain models and repositories
          -> API client, secure storage, fixtures, and platform services
```

Views should not call AWS or Roblox directly. They should call a feature repository or use a feature model that owns loading, loaded, empty, stale, and error states.

Keep these interfaces replaceable:

```text
ExperienceRepository
SnapshotRepository
AuthRepository
SyncStatusRepository
SecureSessionStore
Clock
```

Sample repositories and live repositories should satisfy the same interfaces. Sample Mode must work when Wi-Fi is disabled and when AWS credentials do not exist.

## 6. Networking and authentication

Create one typed API client around `fetch`. It should own:

- Base URL selection by environment.
- Request timeout or cancellation.
- JSON decoding and schema validation.
- Correlation/request IDs.
- Standard error envelopes.
- 401 handling and sign-out behavior.
- Retry rules for safe idempotent requests.

The mobile client calls StudioPulse endpoints such as:

```text
GET /v1/me
GET /v1/experiences
GET /v1/experiences/{universeId}/home
GET /v1/experiences/{universeId}/sync-status
```

The mobile client does not call Roblox Open Cloud directly. AWS workers call Roblox asynchronously, and the app reads cached StudioPulse snapshots.

Store StudioPulse access and refresh tokens with `expo-secure-store`. Do not store a Roblox Open Cloud API key, OAuth client secret, or `.ROBLOSECURITY` value in the app.

Use Cognito for the first product-authentication path. Add Roblox as an external OIDC provider only after testing Authorization Code + PKCE, redirect handling, token refresh, logout, and account-linking behavior. Roblox identity and Open Cloud analytics authorization remain separate connections.

Use public Expo configuration only for values such as:

- API environment name.
- Public API base URL.
- Expo project ID.
- URL scheme.

Do not place secrets in `app.json`, `app.config.ts`, `EXPO_PUBLIC_*` variables, fixtures, or the JavaScript bundle. Expo public environment variables are visible to the app user.

## 7. Expo environment configuration

Use separate development, preview, and production values. A simple pattern is:

```text
.env.example
.env.development
.env.preview
.env.production
```

Commit only `.env.example`. Ignore the other files. Put secrets in EAS environment variables or the backend secret store, not in the Expo bundle.

Validate configuration at startup and fail with a useful development error when a required public value is missing. Do not silently fall back to a production API from a development build.

## 8. Figma to Expo workflow

The live Figma file remains the visual source of truth. The local JSON is a node map, not a substitute for a live frame read.

For every Figma-derived screen:

1. Read the exact live frame through the Figma connector.
2. Retrieve an exact-node screenshot for the same appearance and reference geometry.
3. Use TypeScript and React Native/Expo as the implementation context.
4. Preserve the returned assets in the Expo asset structure before temporary URLs expire.
5. Retrieve recursive motion context when the live frame reports motion.
6. Implement with reusable React Native components and semantic tokens.
7. Test light and dark appearance, Dynamic Type equivalents, screen readers, reduced motion, and safe areas.
8. Capture the Expo Go or development-build result at matching geometry.
9. Compare source and implementation with an overlay or image diff.
10. Record the node, asset names, motion mapping, test device, and remaining deviations in `docs/FIGMA_IMPLEMENTATION_MANIFEST.md`.

Use `Animated` or the project's approved Expo-compatible motion library for chart reveals and endpoint pulses. Reduce or remove motion when the platform accessibility setting requests reduced motion.

## 9. Local development loop

From the Expo project root:

```powershell
npm ci
npx expo start
```

Open the project in Expo Go while the development server runs. Use a development build when the project requires native functionality outside Expo Go.

Useful checks:

```powershell
npx tsc --noEmit
npx expo export
npx expo start --no-dev
```

Run the exact test command defined in `package.json`. The repository should add tests for route state, onboarding transitions, formatting, API decoding, fixture rendering, and error states.

For a local native build when the required toolchain exists:

```powershell
npx expo run:android
npx expo run:ios
```

These commands generate native directories when needed. Treat generated `android/` and `ios/` output as build artifacts from the Expo configuration unless the project explicitly adopts a native edit or config plugin.

## 10. Backend boundary

The Expo app is the client. The AWS backend owns:

- Cognito JWT validation.
- Workspace and universe authorization.
- Roblox Open Cloud credentials.
- Analytics Query API requests and `202` polling.
- Rate limits, retries, and sync scheduling.
- DynamoDB snapshots and freshness state.
- SQS jobs and dead-letter handling.
- S3 historical exports when the product needs them.

The intended path is:

```text
Expo app
  -> API Gateway HTTP API
      -> Lambda BFF
          -> DynamoDB snapshot
          -> SQS refresh job
              -> Lambda Roblox worker
                  -> Roblox Open Cloud
```

Do not make a screen render wait for a Roblox API query. Show the last known snapshot and its freshness state while the worker updates data in the background.

## 11. Accessibility and platform behavior

React Native implementation must account for:

- VoiceOver and TalkBack labels.
- Dynamic text sizes and layout overflow.
- Reduced motion.
- Light and dark color schemes.
- Safe-area insets.
- Keyboard and focus behavior.
- Touch target sizing.
- Loading, empty, sparse, stale, and error states.
- Offline behavior.

Use platform-aware behavior only where the user experience requires it. Keep domain state and API contracts platform-independent.

## 12. Verification gates

Before calling a screen complete:

- The exact Figma frame was read live.
- The screen works in Sample Mode without AWS or Roblox credentials.
- The screen works in Expo Go when it uses only supported Expo modules, or in a development build when it needs custom native behavior.
- TypeScript checks pass.
- The relevant tests pass.
- Light and dark states were inspected.
- Accessibility labels and reduced motion behavior were checked.
- The source and implementation were compared at matching geometry.
- The manifest records the evidence and any intentional platform differences.

Before calling a backend slice complete:

- CDK synthesis succeeds.
- The API contract is versioned.
- Tenant authorization is tested.
- Secrets stay outside the app bundle and logs.
- Workers handle duplicate SQS messages.
- Roblox 202, 429, and transient failures have fixtures.
- CloudWatch logs and alarms are bounded.
- The AWS budget and Free Tier dashboard have been checked.

## Official Expo references

- [Expo app development overview](https://docs.expo.dev/workflow/overview/)
- [Expo Go and development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Configure a development build with EAS](https://docs.expo.dev/tutorial/eas/configure-development-build/)
- [Expo Router introduction](https://docs.expo.dev/router/introduction/)
- [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## Current repository note

The repository was initially created with placeholder native-iOS paths and planning documents. The current client decision is Expo-managed React Native. Before implementation begins, initialize or import the actual Expo project, verify `package.json`, `app.json` or `app.config.ts`, `src/app`, and `eas.json`, then update the README and handoff with the exact SDK and Node versions used.
