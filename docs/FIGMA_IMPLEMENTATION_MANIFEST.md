# StudioPulse Figma implementation manifest

This file is the audit trail between live Figma frames and React Native/Expo screens. It does not replace a live Figma read. Update an entry immediately before implementing or visually approving that screen.

## Source

- Figma file key: `WCcDt0bYdwuoypf03dYcCg`
- Figma file: [StudioPulse — Roblox Analytics Wireframes](https://www.figma.com/design/WCcDt0bYdwuoypf03dYcCg/StudioPulse-%E2%80%94-Roblox-Analytics-Wireframes)
- Onboarding page: `201:104`, `03 — Onboarding / Light + Dark`
- Target mobile reference canvas: 393 x 852 points
- Figma access mode: read-only

## Connector preflight

| Check | Current result | Mac overnight requirement |
| --- | --- | --- |
| Connector authenticated | Passed on 2026-08-22 | Re-run on the Mac before UI work |
| File readable | Passed on 2026-08-22 | Re-run against the file key |
| Page metadata `201:104` | Passed on 2026-08-22 | Refresh before locating frames |
| Design context `209:108` | Passed on 2026-08-22 | Re-read with TypeScript/React Native context |
| Exact screenshot `209:108` | Passed at 393 x 852 on 2026-08-22 | Re-run the read and save its short-lived PNG on the Mac |
| Recursive motion context `209:108` | Passed on 2026-08-22 | Re-read if the live frame still reports motion |

Do not record Figma login emails, authorization data, tokens, or expiring asset URLs here.

## Screen status

| Screen | Light node | Dark node | Live context | Expo/React Native | Visual diff | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Welcome / Sample | `209:108` | `210:454` | light preflight only | pending | pending | Re-read both appearances on Mac |
| Roblox identity | `209:249` | `210:471` | pending | pending | pending | Connected-mode concept only for first night |
| Analytics access | `210:145` | `210:500` | pending | pending | pending | Read-only analytics concept |
| Choose experiences | `210:294` | `210:533` | pending | pending | pending | Required connected-mode step |
| Sales setup | `210:346` | `210:558` | pending | deferred/optional | pending | Must not block activation |
| Ready | `210:398` | `210:588` | pending | pending | pending | Onboarding completion |
| Home | discover through live metadata | discover through live metadata | pending | pending | pending | Never implement from screenshot alone |

## Verified Welcome observations

These observations came from a successful live read on 2026-08-22 and must be refreshed on the Mac before implementation:

- frame `209:108` returned structured design context and a visual preview
- an exact-node screenshot read returned the frame's natural 393 x 852 PNG geometry
- the live frame reported Geist typography at that time; legal app font files were not found or approved by this check
- Figma returned source Roblox-mark SVG assets; they have not yet been preserved in the Expo asset structure
- recursive motion context reported a 2,000 ms looping chart animation under cohort root `209:104`
- chart path `I209:124;208:116` (fallback `208:116`) used an ease-out path-trim reveal
- endpoint `I209:124;208:117` (fallback `208:117`) used opacity and spring-like scale keyframes

## Entry template

Copy this block for each implemented frame:

```text
Screen:
Appearance:
Figma node:
Live-read date/time and timezone:
Design-context result:
Frame dimensions:
Font families/weights:
Semantic tokens/components:
Downloaded assets and checksums:
Motion-context result and node mapping:
React Native/Expo view/component mapping:
Simulator device and OS:
Content-size category:
Source image:
Simulator image:
Overlay/diff image:
Intentional mask:
Remaining deviations:
Parity status: pending | blocked | visually approved
```

“Visually approved” requires a successful live design-context read plus a matching-geometry source/simulator comparison. A screenshot, page metadata, or the local JSON alone is insufficient.
