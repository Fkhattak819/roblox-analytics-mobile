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
  Node.js runtime. Remote CI still requires the authorized public push.
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
  Node's published SHA-256 list. A new CI run on the eventual published
  screenshot/reviewer commit is still required.

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
- [ ] Confirm redistribution rights for artwork and resolve historical font
  distribution. Builder Sans was removed from the current public `main` tree
  in `a39b216`, and the app now uses a native system-font hierarchy. Older
  reachable Git commits still contain the OTF files. Roblox's
  [Builder font license](https://en.help.roblox.com/hc/en-us/articles/24608223674388-Builder-Font-License)
  restricts use or distribution for other purposes without written permission;
  a normal push does not erase historical copies. A history rewrite, repository
  access change, or written license grant requires a separate owner decision.
  Read-only ref inventory found one advertised public branch (`main`), no
  advertised tags, and four font blobs introduced in `c024f66`. Removing
  those paths from reachable history would rewrite 34 commits from that
  introduction through current public `main`, invalidate those commit IDs and
  their CI links, and still could not recall existing clones or downloads.
  Roblox's
  [thumbnail API](https://create.roblox.com/docs/cloud/reference/features/thumbnails)
  permits public fetching, but its
  [Creator Terms](https://en.help.roblox.com/hc/article_attachments/47741686745236)
  say creators retain copyrights in their UGC and API access does not grant
  ownership of returned content. Public availability alone therefore does not
  establish permission to publish the experience icon, wide image, and logo in
  this repository's new screenshots or a public simulator package; the owner
  must confirm the relevant group/artist rights. The README and reviewer guide
  identify the project as unofficial; Roblox's
  [name and logo guidelines](https://en.help.roblox.com/hc/en-us/articles/115001708126-Roblox-Name-and-Logo-Community-Usage-Guidelines)
  also require avoiding implied endorsement, so the project name and branding
  should be reviewed before a public app distribution claim.
- [ ] Reconcile the deployed CloudFormation **template** with CDK. A fresh
  September 15 check found the stack `UPDATE_COMPLETE` with its last update on
  September 8. The live table is `ACTIVE`, `PAY_PER_REQUEST`, capped at 100
  read / 25 write request units, with deletion protection enabled. Its stack
  template still records provisioned 1/1 throughput. The proposed deployment
  aligns that metadata and renames an SNS display name; explicit deployment
  approval remains separate. CDK diff staged a synthesized template in its
  bootstrap area but did not update the stack.
- [x] Verify current dependency advisories and scan history, working source,
  the final sample-mode iOS export, extracted app package, embedded JavaScript,
  and native executable strings. Record the narrow binary exception below.
- [ ] Publish the committed reviewer candidate, then verify that exact
  published commit's CI. The local reviewer commit is rebased one commit ahead
  of public `main` after the isolated CI fix; it has not been pushed.
- [ ] Publish the five screenshots and README to a reviewer-accessible remote.
  Provide an install/download link only after distribution rights clear.

The owner's graduation date and individual contribution statement still need
personal confirmation before any application or interview claim.
Remote push was explicitly authorized. The font-remediation and CI-fix subsets
were pushed;
artwork-redistribution confirmation was requested separately and is not
inferred from either the push authorization or the AWS SSO refresh.

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
