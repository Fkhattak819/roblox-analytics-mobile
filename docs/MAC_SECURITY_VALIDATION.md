# Mac simulator security validation

Status: pending. The user has a Mac with an iPhone simulator; this Windows task has no access to it. Local Node tests and iOS exports do not prove native behavior.

Use the current working copy, including uncommitted changes. A fresh clone alone will omit these fixes. Transfer source through your own trusted local method, excluding environment files, credentials, node_modules, generated native folders, and build output. Install dependencies on the Mac from the lockfile.

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
