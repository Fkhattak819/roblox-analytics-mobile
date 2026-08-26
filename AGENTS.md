# StudioPulse project instructions

Read `docs/EXPO_DEVELOPMENT_PLAYBOOK.md`, `docs/FIGMA_IMPLEMENTATION_MANIFEST.md`, and `design-system-state-studiopulse-onboarding.json` before making product or architecture changes. `docs/MAC_IOS_DEVELOPMENT_PLAYBOOK.md` is a legacy SwiftUI/Tuist plan and is not the current implementation source of truth. Before implementing or visually approving a screen, also read its current live Figma node through the connected Figma tools.

## Product boundaries

- Build an Expo-managed React Native app with TypeScript. Use Expo Go for fast local iteration, then use an Expo development build or EAS Build when the app needs native modules, custom app configuration, remote push notifications, or production packaging. Keep the current mobile platform scope configured for the project; do not add web unless the user explicitly requests it.
- Preserve the five destinations: Home, Experiences, Analytics, Sales, More.
- Keep onboarding short: sample/welcome, Roblox identity, read-only analytics connection, experience selection, ready. Live Sales setup is optional after activation.
- Treat the live Figma file as the visual source of truth and the playbook as the implementation source of truth. The local JSON is a useful node map and historical snapshot, not a substitute for reading the live frame. If the sources conflict, report the conflict instead of silently inventing a third design.
- Match the font actually assigned in the live Figma frame. Bundle a custom font only when its redistributable file is present and its shipping rights are confirmed. If that is not possible, use an explicitly documented fallback; never label a fallback as Builder Sans or Geist.

## Engineering boundaries

- Keep the Expo build loop CLI-first with `npm`, `npx expo`, and EAS CLI. Do not hand-edit generated native `ios/` or `android/` directories when app config or a config plugin can express the change.
- Prefer React Native and Expo APIs: React, React Native, Expo Router, Expo SecureStore, Expo AuthSession, Expo Linking, `fetch`, TypeScript, and the project's chosen test runner.
- Follow the installed `figma-design-to-code` workflow for every Figma-derived screen. Call live design context on the exact frame before writing its view, using TypeScript and React Native/Expo as the client language/framework, then retrieve an exact-node Figma screenshot for that variant. Page metadata may locate frames, but metadata, screenshots, and the local JSON must never replace design context.
- When live design context reports motion, retrieve the recursive motion context before implementing it. Translate the returned timing, easing, transforms, and animated node IDs into React Native motion while honoring Reduce Motion.
- Download and preserve the exact assets returned by Figma before their temporary URLs expire. Reuse Figma components and semantic tokens where possible; treat generated web markup only as structural reference and write idiomatic React Native.
- Figma desktop being open is not sufficient. The Codex Figma connector must pass its identity check and the authenticated account must be able to read file `WCcDt0bYdwuoypf03dYcCg`. If live design context is unavailable, continue only nonvisual scaffolding and record the blocker; do not claim a 1:1 recreation.
- Keep feature state behind protocols so mock and live repositories can be exchanged without changing views.
- Sample mode and deterministic fixtures must remain usable without network access, AWS, Roblox credentials, or paid Expo/EAS services.
- The Expo app may store StudioPulse session tokens in `expo-secure-store` or the platform secure storage it uses. It must never store a Roblox Open Cloud API key.
- Backend code may use TypeScript, AWS CDK, API Gateway HTTP APIs, Lambda, DynamoDB, SQS, EventBridge, S3, and KMS. Do not introduce Aurora, Kinesis, EKS, OpenSearch, AppSync, Fargate, or a NAT gateway without measured need and explicit approval.
- Do not call Roblox directly from a screen render. Mobile reads cached StudioPulse API snapshots; workers call Roblox asynchronously.
- Do not present aggregate monetization as an exact purchase receipt feed. Exact live sales require separate signed, opt-in game-server instrumentation.

## Safety and validation

- Never read, print, commit, or log credentials, tokens, authorization headers, `.ROBLOSECURITY`, signing keys, or decrypted tenant secrets.
- Do not create AWS resources, enable paid services, publish to App Store Connect, send notifications, mutate Figma, push Git, or spend money without explicit user authorization. Live Figma inspection for this project is read-only.
- Preserve user files and unrelated changes. The current repository has no initial commit, so inspect before moving or replacing placeholder paths.
- After each implementation checkpoint, run the smallest relevant Expo test or bundle check. Before claiming a UI slice complete, launch it in Expo Go or an Expo development build on an available device/simulator, capture visual evidence at matching geometry, and compare it with the exact live Figma frame using an overlay or image diff. Record any intentional platform-rendering tolerance.
- Respect Reduce Motion, Dynamic Type, VoiceOver labels, contrast, safe areas, and light/dark appearance from the first reusable component.
- Keep a concise `docs/NIGHTLY_HANDOFF.md` during unattended work with completed checkpoints, commands and results, screenshots, blockers, assumptions, and the exact next action.
