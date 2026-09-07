# Security CI and scanning

The local workflow `.github/workflows/security.yml` runs types, lint, app/backend tests, infrastructure synthesis, synthetic security probes, an iOS sample export, Gitleaks, and dependency advisories. It has read-only repository permissions, does not retain checkout credentials, and uses no cloud/account secrets. It is not active remotely until a separately authorized push. No remote CI run has been verified.

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
