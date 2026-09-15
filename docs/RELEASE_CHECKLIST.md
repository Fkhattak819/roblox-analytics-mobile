# Reviewer release checklist

This checklist distinguishes observed results from work still required.
Do not submit a release as complete while its distribution gates are open.

## Verified locally, September 15, 2026

- TypeScript and lint pass; 61 mobile tests and 59 backend tests pass.
- The infrastructure stack test and `npm run demo:export` pass.
- Both dependency audits at the low advisory threshold report zero vulnerabilities.
- Gitleaks 8.30.1, verified against its published SHA-256 manifest, reports zero
  findings in reachable Git history, working source, and the final sample iOS export.
- An isolated copy of the current tracked and untracked working-source
  inventory at `/private/tmp/roblox-reviewer-current.UUD0ED` passed fresh
  locked root and infrastructure installations, `npm run verify`, the CDK
  stack test, and `npm run demo:export`. It excludes ignored local settings,
  artifacts, and held font files. This is not a clean published checkout.
- A separate clean `git archive` of the local release commit, with no ignored
  files or working-copy changes, passed locked root and infrastructure installs,
  TypeScript, lint, 61 mobile and 59 backend tests, the CDK stack test, sample
  iOS export, both low-threshold dependency audits, and Gitleaks on its sample
  export. The 18-observation security audit also passed under the pinned CI
  Node.js runtime. The candidate was subsequently published and its exact-SHA
  Security and build CI completed successfully.
- The Release simulator build used for the five tracked screenshots succeeded
  with zero errors and native warnings. All five tabs opened without Metro.
- A scoped-clean Release rebuild on September 15 succeeded with zero errors
  and three warnings, opens in offline Sample Mode without Metro, and contains
  no Builder Sans or other `.otf` files. The `.app` code signature verifies.
- The final simulator ZIP validates, extracts to the documented app bundle ID,
  and its `ditto -x -k`-extracted code signature verifies. Plain `unzip`
  extraction failed strict code-signature verification in a fresh-directory
  rehearsal, so the reviewer guide specifies `ditto`. Its extracted contents
  and the embedded JavaScript bundle report zero Gitleaks findings. A
  printable-string check of the native executable needed the narrow exception
  recorded below.
- The `ditto`-extracted ZIP app installed onto the booted iPhone 17 Pro
  simulator and launched by its documented bundle ID. A temporary screenshot
  showed the labeled offline Sample Mode Home, and no process was listening on
  Metro port 8081. This verifies the local simulator package, not a physical
  device or a public download.
- The September 10 live session verified sign-in, Home and Sales recovery after
  database throttling; Analytics displayed a labeled saved report.
- Sample commands force fixture mode and ignore `.env.local`.
- The SDK 54 candidate was published at `da2b23a`; its remote security CI
  failed in the audit script. The isolated font-remediation commit `a39b216`
  is now public; its
  [CI run](https://github.com/Fkhattak819/roblox-analytics-mobile/actions/runs/35019344123)
  also fails in the preexisting audit loader after source tests and CDK bundling,
  with `ERR_UNSUPPORTED_RESOLVE_REQUEST` for a relative import from a data URL.
  The isolated two-file loader fix was then published as `844b44b` and uses
  `node --import tsx`; its
  [public CI run](https://github.com/Fkhattak819/roblox-analytics-mobile/actions/runs/35020182712)
  completed successfully. The 18-observation audit also passes
  locally under the workflow's exact Node.js 22.18.0 runtime, verified against
  Node's published SHA-256 list. The screenshot/reviewer commit was published
  as `41e3a45`; its
  [Security and build run](https://github.com/Fkhattak819/roblox-analytics-mobile/actions/runs/35022165417)
  completed successfully for that exact SHA.

## Release gates

- [x] Install dependencies and verify the complete candidate in a fresh directory.
- [x] Build and launch the standalone sample-mode iOS simulator app.
- [x] Save tracked screenshots of all five tabs in `docs/screenshots/`.
- [x] Use the five screenshots as visual evidence; a recording was waived by
  the owner and is not part of the release.
- [x] Repackage the final simulator app with updated checksum and installation instructions.
- [x] Correct misleading fixture labels after inspecting the live Figma nodes.
  Exact light-mode Sales and Experiences frames were overlaid with the release
  screenshots for a structural review. Device geometry, native chrome, system
  fonts, and truthful sample copy intentionally differ; formal pixel parity is
  not claimed.
- [x] Confirm redistribution permission for the experience artwork and logo
  shown in the five sample screenshots. The owner confirmed permission and
  approved the screenshots on September 15. This is an owner attestation, not
  an independent audit of artist or group agreements. The README and reviewer
  guide identify the project as unofficial; Roblox's
  [name and logo guidelines](https://en.help.roblox.com/hc/en-us/articles/115001708126-Roblox-Name-and-Logo-Community-Usage-Guidelines)
  still require avoiding implied endorsement before any public app-store claim.
- [ ] Resolve Builder Sans files in older public Git history. Builder Sans was
  removed from the current public `main` tree in `a39b216`, and the app now
  uses native system typography. Older reachable commits still contain four
  OTF files introduced in `c024f66`. Roblox's
  [Builder font license](https://en.help.roblox.com/hc/en-us/articles/24608223674388-Builder-Font-License)
  restricts use or distribution for other purposes without written permission;
  a normal push does not erase historical copies. The owner declined a history
  rewrite on September 15; no written font grant or repository-access change
  has been supplied. A history rewrite would replace 34 commit IDs and still
  could not recall existing clones. The current app and simulator ZIP contain
  no OTF files, but the historical public exposure remains an open gate.
- [x] Reconcile the deployed CloudFormation **template** with CDK. With the
  owner's September 15 approval, the fresh diff showed only the SNS display
  name and table metadata moving from provisioned 1/1 to the already-live
  `PAY_PER_REQUEST` mode with 100 read / 25 write request-unit caps. The CDK
  deployment completed; CloudFormation is `UPDATE_COMPLETE` with a September
  15 update, the public health route returned 200, and a post-deployment CDK
  diff reported zero differences. The live table remained `ACTIVE`,
  `PAY_PER_REQUEST`, capped at 100 read / 25 write units, with deletion
  protection enabled. CDK published a synthesized template during diff; this
  was not a separate stack update.
- [x] Verify current dependency advisories and scan history, working source,
  the final sample-mode iOS export, extracted app package, embedded JavaScript,
  and native executable strings. Record the narrow binary exception below.
- [x] Verify the published reviewer commit's CI. `41e3a45` is on public
  `main`; its Security and build run `35022165417` completed successfully for
  the exact published SHA.
- [x] Publish the five screenshots and README to a reviewer-accessible remote.
  They are in public `main` at `41e3a45`; the
  [repository](https://github.com/Fkhattak819/roblox-analytics-mobile)
  provides source and build instructions.
- [ ] Provide a public install/download link for an appropriate distributable
  app. The signed simulator ZIP is still local, sample-mode-only, and not a
  physical-device IPA or App Store release. Historical font exposure and
  native/device/distribution gates remain disclosed; no public binary was
  uploaded under the repository-push authorization.

The owner's graduation date and individual contribution statement still need
personal confirmation before any application or interview claim.
Remote push and screenshot redistribution were explicitly authorized. The
owner declined a font-history rewrite and approved the scoped AWS template
reconciliation. These decisions do not certify physical-device behavior,
public app distribution, or historical font licensing.

## Local package evidence

`artifacts/reviewer/RobloxAnalyticsStudio-simulator.zip` is a local review
candidate, not a public release or a physical-device IPA. Installation is
documented in the reviewer guide. SHA-256:

```text
c876f7c31dd9fb1f9065faf27f790f866f89baf89281894b04b3e6117ca56a11
```

The superseded September 10 ZIP remains local as
`artifacts/reviewer/RobloxAnalyticsStudio-simulator-2026-09-10.zip` and must
not be presented as the new candidate.

Binary-string scan exception: scanning `strings` output as if each C-string
were a line in one text file yielded two `generic-api-key` matches, one per
simulator architecture. Both span the compiled SDWebImage
`deviceInfoForKey:` selector and the next independent C-string. The selector
is present in `ios/Pods/SDWebImage/SDWebImage/Core/SDImageCoderHelper.m`.
Preserving explicit boundaries between C-strings yields zero findings, as do
the extracted-app and JavaScript-bundle scans. This is a scanner framing
exception, not evidence that any source or binary contains a credential; no
candidate value was printed or allowlisted.
