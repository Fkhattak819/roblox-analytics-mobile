# StudioPulse

StudioPulse is an iOS-first analytics companion for Roblox creators. The product is currently at the design and technical-planning stage; production implementation has not started.

Start here:

- [Mac and iOS development playbook](docs/MAC_IOS_DEVELOPMENT_PLAYBOOK.md)
- [AWS backend learning and scaling guide](docs/AWS_BACKEND_LEARNING_AND_SCALING_GUIDE.md)
- [Ready-to-paste overnight Codex goal](NIGHT_GOAL.md)
- [Figma implementation manifest](docs/FIGMA_IMPLEMENTATION_MANIFEST.md)
- [Local Figma node-map snapshot](design-system-state-studiopulse-onboarding.json)

The connected live Figma file is the visual source of truth. The local JSON is a node map and fallback record only; every Figma-derived SwiftUI screen must be read live and visually compared before it can be called a 1:1 recreation.

The existing `StudioPulse/` and `StudioPulse.xcodeproj/` directories are placeholders. The `.xcodeproj` does not currently contain a `project.pbxproj`, so the first Mac development session must treat this as a greenfield SwiftUI scaffold.

## Product contract

- Native iOS app, currently designed for a 393 x 852 point iPhone canvas.
- Persistent destinations: Home, Experiences, Analytics, Sales, More.
- Sample mode works before any account or credential is connected.
- The first real-data release is read-only toward Roblox experiences.
- Roblox OAuth identity and Roblox Open Cloud analytics access are separate connections.
- Roblox API keys never ship in the iOS app and `.ROBLOSECURITY` is never requested.
- Official aggregate analytics must remain visually distinct from optional live-sale instrumentation.
