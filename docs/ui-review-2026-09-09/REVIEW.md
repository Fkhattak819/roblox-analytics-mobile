# Creator Hub UI review — September 9, 2026

The design direction is refinement: retain the app's Builder Sans, blue accent, light/dark semantic palette, rounded cards, native navigation, and five destinations. Apply Creator Hub's readable metric hierarchy and clear control grouping to the existing mobile layout.

## Live reference

Inspected the signed-in Creator Hub with the in-app browser: BrainNourishmentGames (737917380), Most Words Win! (10009166512).

- [Experience overview](https://create.roblox.com/dashboard/creations/experiences/10009166512/overview): experience artwork and identity, Realtime, Insights, genre benchmarks, and a selectable metric snapshot.
- [Retention](https://create.roblox.com/dashboard/creations/experiences/10009166512/analytics/retention): date, filter, breakdown, and annotation controls; individually titled charts; period-average captions; legends; cohort table.
- The live UI uses neutral outlined panels, modest radii, sentence-case labels, strong numeric values, and blue series. Mobile should retain its own navigation and avoid reproducing desktop sidebars.

## Most Words Win examples and interpretation

Observed on September 9: the overview's seven-day moving-average snapshot showed 7 daily active users, 7.2 minutes average playtime, 5.89% Day 1 retention, and zero daily revenue for September 2–8. The benchmark card showed 8.8 minutes average playtime for a different window, with 9.1-minute median and 17.8-minute 90th percentile references. These values are observations, not new app fixtures or a live API feed.

The retention page displayed an analytics incident notice, sparse cohorts, and N/A cells. Some benchmark positions were internally surprising (7.14% D1 retention, a 6.05% median, and a displayed 0th percentile). Do not silently correct or treat those positions as reliable analytical conclusions. Periods, aggregation, missing data, and sources must remain visible; zero is different from unavailable. Realtime CCU must not be substituted for the app's cached DAU.

## Implemented refinement

- Home: more space between chart, value, and footer; sentence-case primary metric labels; separate freshness text; vertical value/sparkline composition to prevent small-card crowding; roomier quality, trend, monetization, and performance cards.
- Home controls: 44-point date options and notification button; clearer section titles; semantic accent colors in insight and focus icons so they adapt to appearance.
- Analytics: readable 12-point KPI labels, 26-point values, flexible card heights, 44-point filter controls, and larger multiline trend tabs.
- Comparison behavior: KPI deltas now honor the existing comparison setting.
- Shared analytics components carry the readable metrics and controls into their existing consumers without changing routing or data contracts.

## Figma relationship

Read live Home 59:7 and exact screenshot; Analytics 81:7 returned metadata, then full design context was read for KPI grid 91:13, scope controls 91:3, and trend switcher 117:5 (with returned screenshots). The user-requested Creator Hub refinement intentionally supersedes the tiny labels and fixed heights in these references. Existing bundled artwork, fonts, chart rendering, and icons are retained. No Figma mutation or parity claim.

## Validation

TypeScript and lint passed. All 55 existing tests passed. iOS export passed. Native visual results are recorded below after inspection. Existing unrelated changes in the worktree were preserved.

Native QA: Expo Go on iPhone 17 Pro / iOS 26, 402 × 874 points (1206 × 2622 pixels). Home and Analytics were inspected in light and dark appearance using offline sample data. KPI comparison-off behavior was exercised; the trend caption and summary were also corrected to honor that setting. The existing Engagement detail screen was spot-checked with the refined shared KPI/control components. Before/after Home captures and a 50% overlay are included at identical device geometry. The larger device differs from Figma's 393-point reference, and the increased card heights/type sizes are intentional; this is a Creator Hub-inspired refinement, not pixel parity approval. Connected data and all accessibility size settings were not exhaustively exercised.

Evidence: `home-comparison.png` (before left, after right), `home-overlay.png`, `home-light.png`, `home-dark.png`, `analytics-light.png`, `analytics-dark.png`, and `creator-hub-retention.png`.
