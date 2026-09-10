# Reviewer release checklist

This checklist distinguishes observed results from work still required.
Do not submit a release as complete while its distribution gates are open.

## Verified in the local candidate, September 10, 2026

- TypeScript and lint pass.
- 61 mobile tests and 59 backend tests pass after reviewer packaging changes.
- The isolated working-tree candidate at `/tmp/roblox-reviewer-KC4MgO`
  passed locked installation, `npm run verify`, and `npm run demo:export`.
  This is a copy of the uncommitted candidate, not a clean published checkout.
- The root dependency audit reports zero vulnerabilities after targeted overrides.
- The isolated infrastructure installation and its one stack test pass.
- The Release simulator build succeeds with zero errors and three native
  dependency/linker warnings. All five tabs opened without Metro listening on 8081.
- The September 10 live session verified sign-in, Home and Sales recovery after
  database throttling; Analytics displayed a labeled saved report.
- Sample commands force fixture mode and ignore `.env.local`.
- The candidate includes an SDK 54 lockfile and compatibility edits that were
  not included in the previous live-fix commit. Publish them as a coherent set.

## Release gates

- [x] Install dependencies and verify the complete candidate in a fresh directory.
- [x] Build and launch the standalone sample-mode iOS simulator app.
- [x] Save screenshots of all five tabs in `artifacts/reviewer/` (local, ignored).
- [ ] Capture a walkthrough of all five tabs from that build.
- [x] Package the tested simulator app with installation instructions and checksum.
- [ ] Correct misleading fixture labels: Sales says “Official revenue · updated
  2 min ago” and “Signed events”; product detail also claims official revenue;
  Experiences calls fixture games “connected”. Inspect the live Figma nodes
  before editing the screens, as required by AGENTS.md. No visual parity approval
  has been performed for this candidate.
- [ ] Confirm redistribution rights for bundled fonts and artwork.
- [ ] Reconcile the deployed CloudFormation table configuration with CDK.
- [ ] Verify current dependency advisories and secret scans; record exceptions explicitly.
- [ ] Commit and publish the candidate, then verify the published commit's CI.
- [ ] Provide a reviewer-accessible install/download link or recording.

The full supplied Cursor posting has been read. Graduation date and the owner's
individual contribution statement still need personal confirmation.

## Local package evidence

`artifacts/reviewer/RobloxAnalyticsStudio-simulator.zip` is a local review
candidate, not a public release or a physical-device IPA. Installation is
documented in the reviewer guide. SHA-256:

```text
184d5868a1ef269235b516d08aa518f8be52058b60683542d76b3f6d081255bd
```

Secret scanning was attempted with `node scripts/scan-secrets.mjs` but failed
because `gitleaks` is not installed. Neither history nor working-source scanning
is claimed as passed. Scan the final binary as well before distribution.
