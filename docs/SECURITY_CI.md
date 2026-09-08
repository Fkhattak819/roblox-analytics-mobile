# Security CI and scanning

The workflow `.github/workflows/security.yml` runs types, lint, app/backend tests, infrastructure synthesis, synthetic security probes, an iOS sample export, Gitleaks, and dependency advisories. It has read-only repository permissions, does not retain checkout credentials, and uses no cloud/account secrets. The `verify` check passed remotely for pushed commit `9945f43d5efe018e866a1c6e7aa4b1f259f68845`: [GitHub run](https://github.com/Fkhattak819/roblox-analytics-mobile/actions/runs/34152891788). Root and infrastructure advisory scans reported zero vulnerabilities at this checkpoint. Historical dependency entries below are not current findings.

## Repository protection candidate — September 7

Public GitHub API checks found `main` (default), `master` and `codex/security-audit` unprotected, and returned no repository rulesets. Git push access does not prove administration access. No authenticated GitHub admin connector or CLI is currently available; repository settings have not been changed.

`.github/release-ruleset.json` is a prepared configuration for both release branches. It requires pull requests, resolved review conversations and the up-to-date `verify` check from GitHub Actions (app ID 15368, verified from the current check run). It blocks force pushes and deletions, with no bypass actors. It allows zero independent approvals because no second maintainer is established; this is a CI/PR gate, not independent human review. Establish an additional reviewer before requiring an approval count of one.

An administrator can import the JSON from repository Settings > Rules > Rulesets or apply it through the [GitHub rules REST API](https://docs.github.com/en/rest/repos/rules). Inspect existing rules again first and update a matching rule rather than creating duplicates. After activation, re-read the rule and both branch states; confirm an intentionally failing test PR cannot merge without attempting a destructive branch operation.

Required CI should be present on the intended target branch before relying on PR events. The security branch still needs reconciliation with newer master frontend code before merge. Do not weaken the check to work around missing target workflow configuration.

Secret scanning/push protection and owner-account MFA/recovery are separate settings and remain unverified. A successful Gitleaks run is not server-side push protection. Use authenticated security settings to enable and verify those controls without exposing recovery codes or credentials.

Checkout/setup-node are pinned to verified commit IDs. Gitleaks 8.30.1 is pinned with a Linux archive SHA-256 check. Its official CLI documentation is at https://github.com/gitleaks/gitleaks. Update pins through a reviewed change.

`scripts/scan-secrets.mjs` scans all locally reachable Git history, the current tracked/nonignored source, and each supplied artifact directory. It captures scanner output, requests full redaction, and prints only finding locations/rule IDs. Ignored `.security-scan/` holds redacted reports; do not upload them automatically. `.security-tools/` holds local downloaded tooling. A scanner error or finding fails the command.

Run with a verified Gitleaks executable on PATH (or set `GITLEAKS_PATH`):

```sh
node scripts/scan-secrets.mjs dist-security-ios
```

The sole rule exception matches the exact known Figma document identifier. It does not exclude files, directories, or historical commits. September 6 scans returned no remaining findings in local history, current source, and the sample iOS export. This is pattern-based scanning, not proof that arbitrary or unknown credentials are absent. Remote-only refs, final signed binaries, owner account settings, repository rules, and push protection remain unverified.

## Dependency gate — September 6

URI decoder remediation now selects the unmodified upstream 0.5.0 package through the private `vendor/decode-uri-component-compat` adapter. The adapter supplies the callable CommonJS interface and legacy plus-to-space behavior expected by query-string 7; the actual patched upstream package remains visible in npm's advisory scan. The latest root lockfile audit reports **zero advisories**. Regression tests exercise query-string with Unicode, repeated keys, malformed bytes, and a long invalid percent run under a child-process timeout. Native validation remains a separate gate. Earlier dependency counts below are historical checkpoints.

Current result after coordinated Metro remediation: **8 moderate affected packages, zero high or critical**. All Metro family packages used by Expo are overridden together to 0.83.8. That release replaces image-size with patched internal parsers ([upstream release](https://github.com/react/metro/releases/tag/v0.83.8)). The override goes beyond Expo's exact default pins and therefore still needs Mac runtime validation. A clean-cache iOS export, TypeScript, lint, and 38 app tests pass. Tests exercise real project PNG parsing and bound the malformed ICNS regression in a child process. Redacted history/source/rebuilt-artifact scans remain clean. The sole remaining advisory root is decode-uri-component; its eight transitive affected packages still fail CI.

Latest remediation: scoped overrides now select PostCSS 8.5.28 for `@expo/metro-config` and UUID 11.1.1 for `xcode` and `@expo/ngrok`. Both UUID consumers use the compatible CommonJS `v4()` API. Consumer tests exercise Xcode identifier generation, UUID loading through ngrok without opening a tunnel, and PostCSS processing through Metro's dependency. All 37 app tests, TypeScript, lint, and the 1,553-module iOS export pass.

The refreshed root advisory count is **16 affected packages: 8 high and 8 moderate**, down from 27. Remaining roots are image-size and decode-uri-component. Metro 0.83.8 removes image-size, but Expo's installed Metro wrapper pins the complete Metro family to 0.83.3; a normal compatible update leaves it unchanged. Decode-uri-component 0.5.0 is ESM while the installed query-string consumer calls its CommonJS export directly. Neither is blindly overridden. Continue coordinated dependency compatibility work and native validation; the advisory gate remains failing.

Refreshed npm advisory metadata reports 27 affected root-tree packages: 9 high and 18 moderate. Infrastructure reports zero. Counts include transitive dependents, not 27 independent vulnerabilities. Current findings involve image-size/Metro, PostCSS, decode-uri-component/query-string/navigation, and uuid in build tooling. Earlier zero-advisory snapshots are superseded. CI intentionally fails until these are remediated and rechecked; no severity exception is configured.

Review compatible patched transitive versions and their APIs before changing overrides. npm's proposed force fix includes an Expo major upgrade and is not a verified compatible migration. Any SDK migration must update the coordinated native dependency set and repeat export and Mac simulator acceptance. Do not treat the currently clean secret scan or passing unit tests as resolving these advisories.
