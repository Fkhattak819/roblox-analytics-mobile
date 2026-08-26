# StudioPulse first Expo goal

Run the preparation checklist in `docs/EXPO_DEVELOPMENT_PLAYBOOK.md` first. Install the required Node.js and Expo tooling, authenticate the Figma connector to an account that can read the StudioPulse file, keep the Figma file available, and open this repository in Codex before pasting the goal below.

```text
/goal Build and verify StudioPulse's first local Expo vertical slice from the live Figma source without stopping until the project runs in Expo Go or an Expo development build, tests successfully, and has frame-matched visual evidence plus a complete handoff.

Read AGENTS.md, docs/EXPO_DEVELOPMENT_PLAYBOOK.md, docs/FIGMA_IMPLEMENTATION_MANIFEST.md, NIGHT_GOAL.md, and design-system-state-studiopulse-onboarding.json before changing files. Treat the repository as a planning scaffold and inspect the worktree first. The legacy StudioPulse/ and StudioPulse.xcodeproj/ paths are not the current application source.

The live Figma file is the visual source of truth:

- URL: https://www.figma.com/design/WCcDt0bYdwuoypf03dYcCg/StudioPulse-%E2%80%94-Roblox-Analytics-Wireframes
- file key: WCcDt0bYdwuoypf03dYcCg
- onboarding page: 201:104, named 03 — Onboarding / Light + Dark
- light frames: Welcome 209:108, Roblox OAuth 209:249, Analytics Access 210:145, Choose Experiences 210:294, Sales Setup 210:346, Ready 210:398
- dark frames: Welcome 210:454, Roblox OAuth 210:471, Analytics Access 210:500, Choose Experiences 210:533, Sales Setup 210:558, Ready 210:588

Load and follow the figma-design-to-code workflow. Use TypeScript and React Native/Expo as the implementation context. Use page metadata only to orient yourself and locate additional frames such as Home. Before implementing each screen, call live design context on that exact renderable frame, then retrieve an exact-node Figma screenshot for the same variant. A page/canvas is not a substitute for a frame read. If design context identifies animation, retrieve recursive motion context for the frame before coding. The Welcome chart currently contains a 2-second looping line reveal and endpoint pulse; implement the returned live motion rather than guessing it.

Implement only the local/sample-data foundation:

1. Preflight the live Figma connection. Run the connector identity check, confirm that its authenticated account can read the file, retrieve metadata for page 201:104, and successfully retrieve both design context and an exact-node 393 x 852 screenshot for frame 209:108 before implementing UI. Record only the account/access status in the handoff, not unnecessary personal account details.
2. Update `docs/FIGMA_IMPLEMENTATION_MANIFEST.md` without discarding its verified preflight history. For every screen implemented, record its node ID, live-read timestamp, exact dimensions, component/tokens used, font family and weights, asset filenames, motion status, and any unresolved mismatch. Do not copy expiring asset URLs into the manifest.
3. Create or import a reproducible Expo project with TypeScript. Pin the Node.js and Expo SDK versions that are actually used. Keep Expo Go as the first development target.
4. Add a CLI-first Expo workflow using `npx expo start`, TypeScript checks, the configured test runner, and `npx expo export`.
5. Establish a React Native design system from the live Figma contexts for color, typography, spacing, radius, cards, buttons, chart styling, skeleton loading, and light/dark appearance. Use the font actually assigned in each live frame. Respect Reduce Motion and accessibility.
6. Download every required Figma image/icon asset immediately and preserve its exact bytes and sensible filename in the asset catalog before temporary URLs expire. Do not redraw an available source asset or substitute an emoji/SF Symbol unless the Figma frame itself specifies that symbol.
7. Implement the revised onboarding story with deterministic local state: Welcome and Sample Mode, Roblox identity concept, Read-only Analytics connection concept, Choose Experiences, and Ready. Inspect both light and dark frame contexts. Sales Setup may be inspected for reusable components but must not block activation; expose it later as an optional destination or callout. Do not implement real OAuth, accept a real API key, or contact Roblox.
8. Implement the stable five-tab shell: Home, Experiences, Analytics, Sales, More. Locate the exact live Home frame through metadata, then read its design context before implementing it. Build a polished sample Home vertical slice using local fixtures for portfolio revenue, DAU, D1 retention, average playtime, freshness/source labels, one chart, and one useful empty/sparse state. Sales must be labeled aggregate/sample rather than a live receipt feed.
9. Translate Figma into idiomatic React Native. Use Expo Router when the project includes it, safe-area behavior, accessible text sizing, reusable components, and Expo-compatible chart/motion primitives. Generated web markup is structural reference only. Do not flatten the screen into a bitmap.
10. Add deterministic unit tests for navigation/onboarding state and formatting, plus at least one UI smoke test that reaches Home in Sample Mode. Add previews for reusable components where practical.
11. Run the project in Expo Go or an Expo development build on the available device or simulator. Capture source-frame references and matching light/dark screenshots for every implemented screen. Produce overlay or pixel-diff artifacts under `artifacts/visual-qa/`, iterate on visible geometry/color/type/asset differences, and record platform-rendering differences. Never describe a screen as 1:1 without a successful live frame read and this comparison.
12. Maintain docs/NIGHTLY_HANDOFF.md throughout the run. Record the final file structure, architecture choices, exact commands and results, Figma node manifest, scheme, simulator, screenshots/diffs, remaining visual differences, blockers, and the next recommended milestone.

Constraints:

- Keep all implementation work local. Read Figma through the authenticated connector, but do not edit or mutate the Figma file. Do not deploy or create AWS resources, call Roblox APIs, register OAuth clients, use real secrets, enroll in Apple programs, publish, send notifications, spend money, or push to a remote.
- Do not add Aurora, Kinesis, Fargate, AppSync, a NAT gateway, or other production infrastructure.
- Do not request .ROBLOSECURITY and do not place a Roblox API key in the app, fixtures, tests, logs, or repository.
- Do not invent benchmark data as real Roblox data. Label all fixtures Sample Data.
- Avoid unrelated refactors and unnecessary third-party packages. Prefer Expo and React Native APIs.
- Never delete or overwrite an existing non-empty user file merely to simplify the scaffold.
- If a command needs account login, payment, external authorization, native build tooling, or a missing proprietary asset, do not wait indefinitely. Record the blocker, continue every safe checkpoint that does not require it, and leave exact instructions in docs/NIGHTLY_HANDOFF.md.
- If the Figma connector is missing, unauthenticated, rate-limited, denied access, or unable to return design context, record the exact error. Continue project generation, tests, data models, and other nonvisual work, but stop Figma-derived visual implementation and do not claim visual parity from screenshots or the local JSON alone.
- Do not push. Local checkpoint commits are allowed only if Git identity is already configured, a secret scan is clean, and existing uncommitted files are preserved; otherwise leave a clearly documented working tree.

Done means all of the following are true:

- Project generation is reproducible from committed manifests.
- The app builds with zero compiler errors from the CLI.
- Unit tests and the UI smoke test pass, or an environment-only blocker is documented with the exact failing command and all independent work is complete.
- The app launches in the intended Expo environment on an available device or simulator.
- Onboarding and Home work in Sample Mode with no network or credentials.
- Every implemented Figma-derived screen has a manifest entry proving a successful live frame read.
- Exact Figma assets are preserved locally and every live motion instruction used by an implemented screen is translated or explicitly documented as blocked.
- Light and dark source/simulator screenshots and overlay or image-diff evidence exist, with remaining differences documented honestly.
- docs/NIGHTLY_HANDOFF.md is complete and tells me exactly what changed, what was verified, what remains, and what I should do next in the morning.
```

This goal deliberately stops before real authentication, Roblox Open Cloud, AWS deployment, push notifications, and live-sale instrumentation. Those are separate milestones with credentials, cost, and security decisions that should not be made unattended.
