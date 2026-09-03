#!/usr/bin/env bash
set -euo pipefail

secret_name="roblox-analytics-mobile/dev/roblox-oauth"
aws_profile="roblox-analytics-mobile"

command -v aws >/dev/null || { echo "AWS CLI is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }

printf "Roblox OAuth client ID (input hidden): "
IFS= read -r -s roblox_oauth_client_id
printf "\nRoblox OAuth client secret (input hidden): "
IFS= read -r -s roblox_oauth_client_secret
printf "\n"
if (( ${#roblox_oauth_client_id} < 3 || ${#roblox_oauth_client_secret} < 10 )); then
  echo "The OAuth credentials look incomplete; nothing was changed." >&2
  exit 1
fi

temporary_file="$(mktemp)"
trap 'unset roblox_oauth_client_id roblox_oauth_client_secret; rm -f "$temporary_file"' EXIT
chmod 600 "$temporary_file"
jq -n \
  --arg clientId "$roblox_oauth_client_id" \
  --arg clientSecret "$roblox_oauth_client_secret" \
  '{clientId: $clientId, clientSecret: $clientSecret}' > "$temporary_file"
unset roblox_oauth_client_id roblox_oauth_client_secret

aws --profile "$aws_profile" secretsmanager put-secret-value \
  --secret-id "$secret_name" \
  --secret-string "file://$temporary_file" \
  --query 'Name' \
  --output text >/dev/null

echo "Roblox OAuth credentials stored in AWS Secrets Manager."
