# Creator Hub mobile overview overhaul

Inspected the signed-in Roblox Creator Hub for **Most Words Win!**, universe `10009166512`, in **BrainNourishmentGames**, on September 9, 2026 (local time). Navigation source: https://create.roblox.com/dashboard/creations/experiences/10009166512/overview.

## Comparison and resulting changes

| Creator Hub pattern | Mobile implementation |
| --- | --- |
| Long experience overview with deep reports | Home now has Engagement, six genre benchmarks, Retention, Acquisition, Monetization, Demographics, Economy, Funnels, Monitoring, and Creator tools in one vertical page. |
| Charts with metric tabs and comparisons | Full-width native charts, metric selectors, comparison toggle, and links into native reports. |
| Dense desktop sidebar | Searchable directory with all 61 observed sidebar entries, organized into eight groups. Accessible from Home and More. |
| Persistent experience context | Experience picker on Home and directory; links resolve against the selected universe. |
| Breakdown tables | Mobile bars and readable label/value rows for acquisition sources, revenue sources, demographics, and sample onboarding. |
| Data eligibility and onboarding states | Economy setup state; connected reports show loading, errors, empty states, or a clear Creator Hub handoff. No sample fallback in connected mode. |
| Management and monetization controls | Explicit browser links for configuration, products, passes, rewards, audience settings, promotion, moderation, and service management. |

The previous Home preview mixed portfolio-scale synthetic values with Most Words Win reference analytics. Home now shares the existing section fixtures with the native detail screens. Sample periods are fixed and labeled; the connected date controls request the selected reporting window, while Monitoring explicitly uses 24 hours. Benchmarks are a separately dated September 2 reference, shown only in the Most Words Win sample context. Current private browser values were not copied into live API responses. Sample funnel figures are illustrative existing fixtures; the current live Funnels and Economy pages showed setup states.

## Inspection coverage

Visited the sidebar destinations below. Also inspected the Performance Client/Server, Acquisition Overall/Home recommendations, and Developer products Creations/Analytics tabs. Other pages were compared through their visible headings, tab structures, charts, and tables. Explore and Badges did not yield substantive report content during inspection. Secrets and Webhooks were limited to page structure; credential content and player data-store keys were not inspected. No settings, products, events, or permissions were changed.

| Group | Inspected destinations |
| --- | --- |
| Overview | Overview |
| Configure | Settings, Places, Custom matchmaking, Server management, Permissions, Configs, Experiments, Alerts, Secrets, Webhooks, Data Stores manager, Leaderboard, Extended services, Questionnaire |
| Analytics | Retention, Engagement, Acquisition, Demographics, Economy, Funnels, Explore, Manage all |
| Monetization | Overview, Shop, Managed pricing, Developer products, Passes, Third-party avatar item commissions, Commerce, Ads, Subscriptions, Roblox Plus, Creator Rewards, Avatar Creation Tokens |
| Monitoring | Performance, Error report, Crashes, Memory Stores, Speech-to-Text, Text-to-Speech, Data Stores, Http Service, Messaging Service, Video Service, Generation Service, Activity History |
| Audience | Reach, Feedback, Access settings, Communication settings, Localization |
| Promotion | Events & updates, Social links, Notifications, Badges, Referral rewards, Recommendation service |
| Safety | Overview, Moderation, Collaborators |

## Scope and limitations

This is a mobile Creator Hub overview and navigation overhaul, not complete native editing parity. Native analytics use the app’s existing cached API contract. Unsupported management operations deliberately open the selected experience’s official Creator Hub page. Browser pages may require Roblox sign-in. Sample experiences without a real universe cannot open an unrelated Roblox experience.

The user explicitly requested a longer Creator Hub layout. This intentionally diverges from the compact live Figma Home frame `59:7`; Builder Sans, semantic light/dark colors, rounded cards, and the five app tabs are retained. The live More frame `140:109` was read before adding its directory entry. No Figma writes were made.

## Verification

- TypeScript and Expo lint pass.
- 57 tests pass, including selected-universe URL validation and native route identity.
- Production iOS export succeeds.
- Expo Go on iPhone 17 Pro / iOS 26, 402 × 874 points: checked Home, retention jump, back-to-top, chart switching to Stickiness, tools category filtering, search for Retention, native detail navigation, and directory Overview navigation.
- Inspected Home and tools in light and dark appearance. Larger accessibility text sizes and connected production data were not exhaustively tested.
- Evidence: `hub-home-light.png`, `hub-home-dark.png`, `hub-retention-dark.png`, `hub-tools-dark.png`. The sample preview is isolated under `/tmp/studiopulse-ui-preview` on port 8084; project connection configuration was not changed.

Figma comparison: `figma-home-reference.png` is the exact live Home frame. `hub-figma-overlay.png` compares the first 852 points against the final dark native capture, normalized to 393 points wide. The overlay confirms intentional structural divergence: experience selector and report controls replace the portfolio hero; report cards are taller and chart sections stack vertically. This is a new Creator Hub layout, not a pixel-match claim. `hub-overhaul-preview.png` collects four verified screens for review.

## Analytics tab follow-up

Inspected the old Analytics tab on-device after the user flagged its appearance. Replaced its mixed header and miniature report previews with the same header/experience card hierarchy as Home and a readable six-report list. Moved the primary chart directly after the overview, made metric tabs scroll horizontally, added a working report jump, and linked chart exploration to the appropriate native report. Removed the noninteractive insight CTA. Sample overview now states its fixed Aug 26–Sep 1 period instead of offering a date control that did not change its fixtures; report previews carry their separate period. Historical Most Words Win benchmarks are restricted to its sample context instead of appearing for arbitrary connected universes.

Verified the report jump, comparison-off deltas/caption, light and dark layouts, TypeScript, lint, 57 regression tests, and final iOS export `/tmp/studiopulse-analytics-revised-final`. Screenshots: `analytics-revised-dark.png`, `analytics-revised-light.png`, and `analytics-reports-revised-light.png`. Live Figma KPI node `91:13` was read and captured; the larger cards/type and new screen structure intentionally follow the user's Creator Hub direction. The normalized KPI overlay is a structural comparison, not a pixel-parity approval. Connected production data and large accessibility text settings were not exhaustively exercised.
