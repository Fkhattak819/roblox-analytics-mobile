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

# Expo SDK 57's virtual environment module can discover standard dotenv files
# even when EXPO_NO_DOTENV is set. Quarantine local configuration for the
# sample export and restore it on every exit path without printing its contents.
preflight_env_dir="$(mktemp -d "${TMPDIR:-/tmp}/roblox-analytics-preflight.XXXXXX")"
preflight_env_files=(.env .env.local .env.production .env.production.local)
restore_local_env() {
  for env_file in "${preflight_env_files[@]}"; do
    if [[ -e "$preflight_env_dir/$env_file" ]]; then
      mv "$preflight_env_dir/$env_file" "$env_file"
    fi
  done
  rmdir "$preflight_env_dir" 2>/dev/null || true
}
trap restore_local_env EXIT
for env_file in "${preflight_env_files[@]}"; do
  if [[ -e "$env_file" ]]; then
    mv "$env_file" "$preflight_env_dir/$env_file"
  fi
done

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
