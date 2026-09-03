# Roblox analytics audit — Most Words Win!

Audit date: 2026-09-02
Universe ID: `10009166512`

## Sources and scope

- Live, signed-in Roblox Creator Dashboard for **Most Words Win!**
- Figma file `WCcDt0bYdwuoypf03dYcCg`, analytics frame `81:7`, hub node `91:2`
- Existing Expo iOS app and Node/Express backend
- Official Roblox [Analytics Query guide](https://create.roblox.com/docs/cloud/guides/analytics), [API reference](https://create.roblox.com/docs/cloud/reference/domains/apis), and [scope reference](https://create.roblox.com/docs/cloud/reference/scopes)

The browser session exposed the live Creator Dashboard UI, but its browser automation surface did not expose a request log. Exact network calls below are therefore limited to Roblox's documented Open Cloud API; private Creator Dashboard calls are not inferred from bundle names or invented.

## Live Creator Dashboard surfaces audited

| Surface | Controls and data observed |
| --- | --- |
| Portfolio analytics | Experience table, date comparison, DAU, new users, average session, daily revenue |
| Overview | Realtime CCU, insight card, KPI tabs, acquisition-source chart legend, genre benchmark cards |
| Engagement | Date, filter, breakdown, interval, annotations; DAU, new/returning users, playtime, sessions, stickiness |
| Retention | D1/D7/D30, stickiness, benchmarks, UTC cohort table |
| Acquisition | Overall/Home Recommendations tabs, source breakdown, new/returning impressions and users with plays |
| Demographics | MAU plus country, gender, age, and language breakdowns |
| Economy | Instrumentation-required empty state for sources, sinks, and wallet balance |
| Funnels | User/session tabs, total users, total conversion, onboarding steps |
| Explore | Source, event, aggregation, interval, breakdown, filter, overlay, smoothing, annotations, chart-type controls |
| Monetization | Daily revenue, revenue sources, DevEx rates, payer CVR, paying users, ARPPU, ARPDAU |
| Performance | Client/server tabs, platform breakdown, half-hour interval, CCU/crash/memory/FPS/CPU charts and low-data states |

## Roblox vs Figma vs app

Roblox is the behavioral and visual reference. The Figma analytics hub already had the right mobile composition: paired selectors, a 2×2 KPI grid, freshness row, insight, trend explorer, and route cards. It used stale placeholder metrics and mixed Geist with Builder Sans; its route set and chart details were also narrower than the live product. The previous app drifted further by presenting invented, high-scale values as recently updated Roblox data and by giving detail pages one generic composition regardless of the Roblox surface.

The implementation keeps the existing Expo Router, React context, StyleSheet tokens, shared UI, and `react-native-svg` chart stack. It replaces only analytics presentation/configuration and adds reusable analytics primitives. Sample mode is now explicit and the values mirror the audit snapshot rather than implying a live connection.

## API coverage

### Official endpoints observed in Roblox documentation

| Purpose | Method and endpoint | Request/response notes | Auth classification |
| --- | --- | --- | --- |
| Query metric data | `POST https://apis.roblox.com/analytics-query-api/v1/universes/{universeId}/metrics` | Body: `metric`, `granularity`, inclusive `startTime`, exclusive `endTime`; optional `breakdown`, `filter`, `limit`. Returns metric values immediately or an operation. | Public Open Cloud API; API key or OAuth scope `universe.analytics:read`; no cookie or CSRF flow |
| Query dimension values | `POST https://apis.roblox.com/analytics-query-api/v1/universes/{universeId}/dimension-values` | Same universe/date framing, with the relevant metric/dimension request. Supports discovery for filters and breakdowns. | Public Open Cloud API; API key or OAuth scope `universe.analytics:read`; no cookie or CSRF flow |
| Poll metric operation | `GET https://apis.roblox.com/analytics-query-api/v1/universes/{universeId}/operations/metrics/{operationId}` | Used after `202 Accepted`; response exposes operation completion and metric result values. | Same Open Cloud authorization |
| Poll dimension operation | `GET https://apis.roblox.com/analytics-query-api/v1/universes/{universeId}/operations/dimension-values/{operationId}` | Used after an asynchronous dimension-values request. | Same Open Cloud authorization |

Supported documented granularities include `OneMinute`, `HalfHour`, `OneHour`, `OneDay`, `OneWeek`, `OneMonth`, and `None`. Metric responses group `dataPoints` under breakdown combinations. Dimension-value requests accept `dimensions` and optional `filter`, `granularity`, and `limit`. Analytics requests are universe-scoped; no place ID is required by these four documented paths. Pagination is not exposed as a page cursor on metric results; `limit` constrains returned groupings.

### Comparison

| Capability | Roblox uses | App before this pass | App after this pass / recommendation |
| --- | --- | --- | --- |
| Overview and section metrics | Creator Dashboard plus Analytics Query API | Static sample screens; no analytics backend route | Honest audit snapshot UI; server-only query client plus authenticated cached `/v1/analytics/{section}` boundary added |
| Date windows and granularity | Per-page date range and interval | UI-only range state | UI controls work; backend client accepts documented dates and granularity |
| Breakdowns and filters | Page-specific dimensions | UI-only generic filters | Sample mobile pattern retained; server client supports documented breakdowns and all filter operations, while connected controls stay hidden until section-specific dimensions are cached |
| Previous-period comparison | Dashboard chart overlays | Mostly decorative | Snapshot schema and worker projection carry current/previous series; charts share one honest vertical scale |
| Asynchronous jobs | Documented operation polling | Unsupported | Added bounded polling for both metric and dimension operations |
| Rate/transient errors | Open Cloud may return throttling/server failures | No analytics handling | Client classifies `429`, `500`, `503`, and `504` as retryable |
| Benchmarks | Visible in Creator Dashboard | Invented generic values | Audit snapshot shown; no private endpoint added because benchmark delivery is not documented in the public query API |
| Portfolio aggregation | Visible in Creator Dashboard | Sample home route | No private/cookie endpoint added; aggregate from authorized per-universe snapshots if product requirements justify it |

The backend exposes `/v1/health`, `/v1/sample/home`, OAuth/session routes, `/v1/connections`, the authenticated cached `/v1/analytics/{section}` read route, and the authenticated `/v1/analytics/{section}/sync` queueing route. Mobile connected mode reads validated snapshots with its opaque app-session token. Cached records are keyed by authenticated Roblox identity, universe, section, and date range. Connected mode never silently falls back to sample values after a backend error.

The Open Cloud query client remains worker-only. The universe-restricted key is encrypted in AWS Secrets Manager, sync work is cooldown-gated and queued through SQS, and the deployed analytics worker writes normalized snapshots to DynamoDB. The mobile client never receives the key, Roblox browser cookies, or raw query credentials.

The default acquisition projection uses `granularity: "None"` for period-unique KPI totals and a separate `OneDay` query for chart points. It does not add daily unique-user buckets, which would double-count returning users across the selected period. The Sessions mapping uses Roblox's documented `Visits` metric; `TotalSessionsEndedInBucket` is intentionally excluded because Roblox defines it as new-user first-session retention.

## Security and authentication

- Never ship a Roblox API key or dashboard cookie in the mobile client.
- Use an encrypted server-side secret store and least-privilege `universe.analytics:read` scope.
- The documented Open Cloud Analytics Query API uses API-key/OAuth authorization rather than browser-session CSRF.
- Creator Dashboard's private browser endpoints, benchmarks, and portfolio internals were intentionally not implemented because they would couple the app to undocumented cookie-authenticated behavior.
- The implemented backend persists normalized tenant-scoped snapshots and serves them only after app-session authorization. The remaining worker must poll long-running jobs off-request and write those snapshots after verifying universe authorization.

## Visual QA

Home, Experiences, experience detail, Analytics Overview, Engagement, Retention, Acquisition, Monetization, Audience, Performance, Economy, the analytics catalog, Sales Overview/Live/Products, profile, connections, data freshness, privacy, help, about, notifications, onboarding, and the hidden product/sale deep links were exercised in an iPhone 15 simulator. Date-range refresh, OAuth session restoration, connection status, loading, empty, unsupported, and navigation states were checked. Connected mode no longer displays portfolio fixtures, fake live purchases, fake product details, or unsupported demographic/funnel values. The updated layout preserves touch-sized controls and readable stacked cards at 393-point width. Type checking, linting, 18 app tests, 15 backend tests, the infrastructure test, `git diff --check`, and an iOS Expo export all passed after the implementation pass.
