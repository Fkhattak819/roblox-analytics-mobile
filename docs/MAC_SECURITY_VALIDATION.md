# Mac simulator security validation

Status: pending. The user has a Mac with an iPhone simulator; this Windows task has no access to it. Local Node tests and iOS exports do not prove native behavior.

The security implementation is pushed on `codex/security-audit`. In a clean Mac checkout, fetch origin and check out that branch; verify the revision with `git rev-parse HEAD` against the handoff message. Preserve any existing Mac work before changing branches. Do not copy environment files, credentials, node_modules or generated build output from Windows. Later frontend reconciliation may require repeating acceptance at a newer revision.

Run the checked-in preflight from the repository root. It refuses a dirty working tree, installs from both lockfiles, runs the app/backend/infrastructure checks and produces a sample iOS export without loading `.env` files:

```sh
bash scripts/mac-security-preflight.sh
```

## Offline UI check

From the transferred project folder in Terminal:

```sh
npm ci
EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_DATA_MODE=sample EXPO_PUBLIC_API_BASE_URL= npx expo start --ios
```

Use an Expo Go runtime compatible with the project's installed SDK 54. Verify onboarding and all five destinations with network disconnected after the bundle loads. Account screens must show sample or signed-out state without invented connected identities, stored analytics keys, or active security switches.

## Native login check

The custom callback `robloxanalyticsmobile://oauth/callback` needs a project-specific native app. Expo Go alone does not validate that callback. Use the Expo-managed local iOS build workflow (`npx expo run:ios`) on the Mac after configuring an approved app bundle identifier. Let Expo generate native files; do not hand-edit them. No paid EAS service or cloud deployment is required for the sample check above.

Real login additionally requires the reviewed v2 backend and approved OAuth configuration. Keep secret values out of the app and captured evidence. Backend activation remains a separate authorized deployment step.

The reviewed backend is now deployed at `https://bqrr070bkf.execute-api.us-east-2.amazonaws.com`. For the native login run, configure a local simulator bundle identifier when Expo prompts, then launch with public mode selection and the public API base URL only:

```sh
EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 \
EXPO_PUBLIC_DATA_MODE=aws_dev \
EXPO_PUBLIC_API_BASE_URL=https://bqrr070bkf.execute-api.us-east-2.amazonaws.com \
npx expo run:ios
```

These variables contain no credential. Do not add OAuth secrets, analytics keys or app session tokens to Expo configuration. The deployed backend requires v2 proof-bound login; the v1 start/exchange routes intentionally return 410.

Record pass/fail for:

1. Valid browser login returns to the app and shows the verified identity; relaunch restores it only after server verification.
2. Cancellation and unrelated or repeated callbacks do not authenticate.
3. Device logout clears identity and keychain state across relaunch. Network failure reports that remote revocation was not confirmed.
4. Account-wide logout invalidates a second signed-in client. Fresh sign-in works afterward.
5. Switching accounts clears prior selections and rejects late data from the previous account.
6. Expired/revoked tokens cannot restore identity; a temporary network outage permits retry without claiming authentication.
7. Background/foreground transitions and session expiry do not reopen a stale identity or interrupt the active browser login.

## Visual evidence

Compare screenshots at 393 x 852 points with the exact saved references in `assets/figma/security-2026-09-06/`: identity `210:471`, More `140:109`, profile `140:211`, analytics access `210:500`, ready `210:588`. Connections `140:313` is 393 x 1343 and needs scroll captures. Refresh live Figma context before further view edits.

Capture native screenshots with `xcrun simctl io booted screenshot <output.png>`. Record simulator model, iOS version, appearance, font size, and source revision. Compare overlays/image diffs and document intentional truthful-status text changes. Figma uses mixed Geist/Builder Sans; the existing font fallback remains a visual gap. Check VoiceOver, Dynamic Type, Reduce Motion, safe areas, and both appearances. Do not capture tokens, callback URLs, or private account details. No visual parity approval has been given.
