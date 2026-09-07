#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This preflight must run on macOS." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "The working tree must be clean before validation." >&2
  exit 1
fi

echo "Validating revision $(git rev-parse HEAD)"
export CI=1
export EXPO_NO_DOTENV=1
export EXPO_NO_TELEMETRY=1
export EXPO_PUBLIC_DATA_MODE=sample
export EXPO_PUBLIC_API_BASE_URL=

npm ci --ignore-scripts
npm ci --prefix infrastructure --ignore-scripts
npm run typecheck
npm run lint
npm test
npm --prefix backend test
npm --prefix infrastructure test
node scripts/security-audit.mjs
npx expo export --platform ios --output-dir dist-security-ios

echo "Preflight passed. Continue with the manual simulator checks in docs/MAC_SECURITY_VALIDATION.md."
