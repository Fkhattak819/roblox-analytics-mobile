# roblox-analytics-mobile Figma implementation manifest

This is the audit trail between the live Figma file and the Expo / React Native app. Live Figma remains the visual source of truth; this file records the node IDs actually read before implementation.

## Source

- Figma file key: `WCcDt0bYdwuoypf03dYcCg`
- Figma file: [StudioPulse — Roblox Analytics Wireframes](https://www.figma.com/design/WCcDt0bYdwuoypf03dYcCg/StudioPulse-%E2%80%94-Roblox-Analytics-Wireframes)
- Current page: `0:1`, `01 — Mobile Overview`
- Target iPhone canvas: 393 x 852 points
- Target implementation: Expo 54, React Native, TypeScript
- App product name: `roblox-analytics-mobile` (the older name remains only in the Figma file title and historical notes)
- Figma access mode: read-only

## MCP preflight — 2026-09-02

| Check | Result |
| --- | --- |
| Premium connector authenticated | Passed — Pro plan, Full seat |
| File readable | Passed |
| Current page metadata | Passed — only page `0:1` exists |
| Live design context | Passed for every current production screen listed below |
| Exact-node screenshots | Passed |
| Motion check | No motion reported by the current changed screens |
| iOS build | Passed with `expo export --platform ios` |
| 393 x 852 simulator | Passed on iPhone 15 / iOS 26 |

The former onboarding page `201:104` and the vault's older `16:*`, `19:*`, `209:*`, and `210:*` nodes are no longer present in the live file. They must not be used for new parity claims.

## Current screen map

| Figma screen | Live node | Expo implementation | Result |
| --- | --- | --- | --- |
| Home / focused | `59:7` | `src/screens/home-screen.tsx` | Connected mode uses the Figma at-a-glance hierarchy with official Overview metrics, cached section summaries, the official experience icon, and the six Roblox benchmark cards captured from the owner's dashboard; DAU replaces the Figma near-live CCU hero because the current API exposes aggregated snapshots, not a live counter |
| Experiences | `72:7` | `src/screens/experiences-screen.tsx` | Existing implementation retained; the connected portfolio switcher and authorized-experience card use the official experience icon |
| Analytics / portfolio | `81:7`, content `91:2`, trigger `100:2` | `src/screens/analytics-screen.tsx` | Figma drill-down cards display official cached metrics, secondary signals, real mini-visualizations, the official experience icon, and a touch-scrollable mobile rendering of the six captured Roblox benchmark cards |
| Analytics / switcher | `102:7`, hub `102:519`, trigger `102:638`, scrim `102:643`, sheet `102:644` | `app/experience-picker.tsx` | Reimplemented from current Figma; exact wide artwork preserved locally |
| Analytics / Fling Squishies | `103:649` | `src/screens/analytics-screen.tsx` | Existing selected-experience state retained |
| Sales / overview | `132:7` | `src/screens/sales-screen.tsx` | Existing implementation retained; simulator comparison passed |
| Sales / live | `132:683` | `src/screens/sales-screen.tsx` | Reimplemented from current Figma |
| Sales / sale detail | `132:1359` | `src/screens/sale-detail-screen.tsx` | Reimplemented from current Figma; simulator comparison passed |
| Sales / product detail | `132:2035` | `src/screens/product-detail-screen.tsx` | Reimplemented from current Figma; simulator comparison passed |
| More / account | `140:109` | `src/screens/more-screen.tsx` | Existing implementation retained; live context and screenshot match |
| More / profile | `140:211` | `src/screens/settings-screen.tsx` | Reimplemented from current Figma; simulator comparison passed |
| More / connections | `140:313` | `src/screens/settings-screen.tsx` | Reimplemented from current Figma; simulator comparison passed |

## Preserved Figma asset

- `assets/experiences/most_words_win_wide.png`
- Source: raw image from node `102:644`
- Natural size: 1672 x 941 PNG
- Used by the selected-experience card in the Analytics switcher

## Official Roblox asset

- `assets/experiences/most_words_win_official.png`
- Source: Roblox's public game-thumbnail API for universe `10009166512`
- Natural size: 512 x 512 PNG
- Used consistently in connected Home, Experiences, Analytics, Sales, and experience-detail surfaces

Do not record login email addresses, authorization data, tokens, secret values, or expiring Figma asset URLs in this manifest.

## Intentional differences

- Native iOS status bars, safe areas, and the Expo tab navigator replace Figma's drawn device chrome.
- The visible product name is `roblox-analytics-mobile`, per the project owner's explicit naming decision, even where old Figma copy still says the historical name.
- Sample Mode remains explicitly labeled and offline; connected mode labels metrics official only when the authenticated backend returns a Roblox Open Cloud snapshot.
- Dashboard benchmark values are labeled `ROBLOX WEB` rather than `OFFICIAL` API data because the supported Open Cloud Analytics Query API does not expose genre benchmark comparisons.
- Onboarding remains implemented in Expo but cannot receive a current parity status because its previous Figma page was removed from the live file.

## Approval rule

“Visually approved” requires a live `get_design_context` read on the exact node, its exact-node screenshot, a successful Expo build, and a matching 393 x 852 simulator inspection. Metadata or a historical vault node ID alone is insufficient.
