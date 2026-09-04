# roblox-analytics-mobile handoff

Updated: 2026-09-04 (America/Chicago)

## Completed

- Audited the existing Expo Router app, shared UI/theme, `react-native-svg` chart stack, state, backend, OpenAPI contract, auth boundary, loading/error handling, and mobile layout before editing.
- Audited the signed-in Creator Dashboard for **Most Words Win!** (`universeId=10009166512`): portfolio, Overview, Engagement, Retention, Acquisition, Demographics, Economy, Funnels, Explore, Monetization, and Performance.
- Compared the live product with Figma file `WCcDt0bYdwuoypf03dYcCg` nodes `81:7` and `91:2`, then adapted the existing analytics screens instead of rebuilding the app.
- Added reusable analytics primitives for filter rows, KPI cards, chart cards/legends, data provenance, loading, error, and empty states.
- Reworked the analytics overview and detail pages around the observed Roblox hierarchy, values, date windows, comparison treatment, route catalog, and explicit sample/official provenance.
- Preserved Expo Router, React context, StyleSheet tokens, shared cards/text, the five-tab navigation, and the existing SVG chart implementation.
- Confirmed Builder Sans Regular/Medium/Semibold/Bold assets are locally present, loaded through `expo-font`, and applied through `StudioText` and the theme token map.
- Added a strict shared `AnalyticsSnapshot` contract and the authenticated mobile read route `GET /v1/analytics/{section}?universeId=...&range=...`.
- Added tenant-isolated in-memory and DynamoDB snapshot stores keyed by app-session owner, universe, section, and date range.
- Added a worker-facing Analytics Query client/sync service for Roblox's documented metric, dimension-value, and long-running-operation endpoints. It includes bounded retry classification and previous-period projection.
- Added default sync plans for overview, engagement, retention, monetization, acquisition, performance, economy, thumbnails, advertising, matchmaking, data stores, memory stores, speech-to-text, text-to-speech, and safety.
- Kept the mobile client credential-free. It reads only normalized cached snapshots with its opaque app session and never calls Roblox directly or falls back to sample data after a connected-mode failure.
- Updated OpenAPI and the detailed audit at `docs/ROBLOX_ANALYTICS_AUDIT.md`.
- Deployed the on-demand live analytics path to the existing AWS development stack: authenticated `POST /v1/sync-jobs`, a 60-second tenant/universe/section/range cooldown, SQS worker delivery, Secrets Manager key loading, official Analytics Query calls, and DynamoDB snapshot/status writes.
- Added `GET /v1/connections` and replaced fixed identity, fingerprint, universe-count, and live-event claims on the Connections screen with authenticated backend status. Unconfigured live events now say so explicitly.
- Added safe hidden-input scripts for Roblox OAuth and Open Cloud analytics credentials. No credential was read, printed, stored in the client, or committed.
- The worker is active at 256 MB/120 seconds, processes one record per batch, and is capped at two concurrent SQS invocations. It has only DynamoDB `PutItem` plus access to its one analytics secret and queue.
- Re-read live Figma nodes `91:2` (Analytics hub) and `59:7` (Home full scroll), then replaced connected-mode route placeholders with a reusable six-card quick-look grid.
- Home and Analytics now combine official Overview metrics with the latest cached Engagement, Retention, Acquisition, Monetization, and Performance snapshots. Audience is explicitly labeled Roblox-web-only instead of showing a fabricated demographic value.
- Quick-look cache reads are sequential, tolerate a transient backend 5xx once, try the reviewed section date ranges, and never enqueue a burst of Roblox synchronization jobs. Tapping an unsynced card opens the existing section, whose normal sync flow owns loading and retry behavior.
- Verified live simulator values and drill-down navigation for Most Words Win!, including Acquisition `151.7K` impressions, `3.2K` users with plays, and `1.6K` qualified users.
- Replaced the placeholder notebook tile with the official 512 px Most Words Win! Roblox icon across connected Home, Experiences, Analytics, Sales, and detail surfaces.
- Added a reusable, horizontally snapping mobile benchmark carousel to connected Home and Analytics. It reproduces all six values from the owner's Creator Dashboard capture: average playtime, D1 retention, D7 retention, payer conversion, ARPPU, and play-through rate, including percentiles and 50th/90th callouts.
- Kept dashboard benchmarks separate from API-backed metrics and labeled their provenance `ROBLOX WEB`; no undocumented cookie-authenticated endpoint was introduced.
- Re-ran the 393 x 852 simulator loop after correcting a clipped benchmark callout and the `3th` ordinal. Verified Home, Analytics, horizontal benchmark navigation, loading skeleton transition, and the connected Experiences artwork.
- Extended connected Home beyond the Figma full-scroll frame. The page now includes a DAU hero, fast revenue/playtime cards, recent peak, game-quality carousel, strongest-change insight, six-section quick look, two deep trend cards, benchmarks, retention snapshot, monetization, acquisition funnel, performance health, three prioritized `Focus next` prompts, and per-section data coverage.
- Home insight copy is derived only from returned metric values and comparisons. Missing snapshots remain `Not synced`, `Awaiting signal`, or `WAITING`; the UI does not infer health or fabricate live CCU, server counts, product rankings, or Roblox metrics.
- Upgraded the mobile project and simulator workflow to Expo SDK 57 so it opens in the current Expo Go client.
- Added a persisted Light / Dark / System appearance preference and wired the root navigation, status bar, tabs, modals, analytics surfaces, skeletons, onboarding, Sales, More, and settings screens to shared appearance-aware tokens.
- Read all exact production frames on Figma's `02 — Mobile Light Mode` page (`187:104`) and matched its white canvas, pale gray surfaces, thin borders, neutral typography, and light-mode data accents without replacing the existing dark theme.
- Fixed an SDK 57 runtime incompatibility where `react-native-svg` received opaque `DynamicColorIOS` objects. Charts now resolve appearance-aware values to SVG-safe colors while retaining native dynamic colors everywhere else.
- Added a functional sign-out flow that clears local Roblox/app-session state and returns to onboarding without embedding or exposing Roblox credentials.
- Added the supplied Roblox Analytics logo to app icon, splash, favicon, and About surfaces.
- Added the owner-supplied transparent logo variant to onboarding and replaced the onboarding experience placeholder with the official Most Words Win! thumbnail.
- Added touch scrubbing to analytics line charts. Dragging across a chart now selects the nearest real point and displays its exact timestamp, formatted current value, and previous-period value when comparison is enabled.
- Replaced tap-to-cycle analytics controls with anchored dropdown menus for date range, comparison, and the available filter/breakdown options.
- Moved the connected per-section Data coverage panel from the Home feed into More → Data coverage, preserving cached readiness timestamps, pull-to-refresh, official provenance, waiting states, and the explicit Roblox-web-only Audience limitation.

## Verification

- Root app tests: 18 passed.
- Backend tests: 15 passed.
- Infrastructure test: 1 passed.
- TypeScript: passed.
- Expo lint: passed.
- Backend TypeScript build: passed.
- CDK synth and reviewed AWS diff: passed.
- AWS deployment: passed; `/v1/health` returns `200`, and analytics, sync, and connection routes return `401` without an app session.
- iOS production export: passed (1,558 modules; Builder Sans and official experience artwork included).
- `git diff --check`: passed.
- iPhone Simulator QA: populated sample Home/analytics overview/detail layouts were inspected; connected-mode error state was inspected with no sample metrics leaking underneath.
- Expo SDK 57 iPhone Simulator QA: light Home, Analytics, Sales, and More render correctly on iPhone 17 Pro / iOS 26; the light SVG charts, active tab treatment, card borders, metric trend colors, and persistent bottom navigation were inspected directly.

## Remaining gated work and limitations

- OAuth and the least-privilege Analytics Query credential are configured in the development stack; official snapshots are populated for Most Words Win!. Production rotation and operational hardening remain.
- OAuth remains identity-only (`openid profile`). The analytics worker separately uses a least-privilege server-held Open Cloud key with `universe.analytics:read` for universe `10009166512`.
- The low-cost development stack has dynamic Lambda egress rather than a NAT gateway/static outbound IP. The Roblox key must therefore be universe/scope restricted, but cannot be reliably source-IP restricted in this configuration.
- Audience/demographics, funnels, custom events, and arbitrary Explore queries need section-specific dimension discovery and saved filter configuration. They are represented honestly in sample mode but are not included in the default worker plan.
- Creator Dashboard benchmark comparisons are implemented as a clearly labeled snapshot of the owner's supplied values, not as live API data, because no stable public Analytics Query endpoint was observed. Do not substitute undocumented cookie-authenticated dashboard calls.
- Figma remained read-only. Its stale placeholders and mixed typography were interpreted in code against the live Roblox reference rather than mutated.
- Roblox Analytics Query provides aggregated snapshots, not the Figma's truly near-live CCU/server counter. Connected Home therefore uses official DAU and cached peak CCU rather than implying a live feed.

## Next safe implementation step

Open any card still marked “Not synced” to queue its section-specific official snapshot. Production rollout still needs credential rotation policy, reviewed network egress, and App Store signing/distribution.
