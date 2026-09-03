#!/usr/bin/env bash
set -euo pipefail

secret_name="roblox-analytics-mobile/dev/roblox-analytics-v1"
aws_profile="roblox-analytics-mobile"

command -v aws >/dev/null || { echo "AWS CLI is required." >&2; exit 1; }
command -v jq >/dev/null || { echo "jq is required." >&2; exit 1; }

printf "Roblox Open Cloud analytics API key (input hidden): "
IFS= read -r -s roblox_analytics_key
printf "\n"
if (( ${#roblox_analytics_key} < 10 )); then
  echo "The key looks too short; nothing was changed." >&2
  exit 1
fi

temporary_file="$(mktemp)"
trap 'unset roblox_analytics_key; rm -f "$temporary_file"' EXIT
chmod 600 "$temporary_file"
jq -n --arg apiKey "$roblox_analytics_key" '{apiKey: $apiKey}' > "$temporary_file"
unset roblox_analytics_key

aws --profile "$aws_profile" secretsmanager put-secret-value \
  --secret-id "$secret_name" \
  --secret-string "file://$temporary_file" \
  --query 'Name' \
  --output text >/dev/null

echo "Roblox analytics key stored in AWS Secrets Manager."
