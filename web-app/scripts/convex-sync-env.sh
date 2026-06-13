#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

convex_env_list="$(pnpm exec convex env list)"

convex_has_env_key() {
  local key="$1"

  printf '%s\n' "$convex_env_list" | grep -Eq "^${key}="
}

read_env_value() {
  local key="$1"
  local file
  local line
  local value

  for file in .env.local .env; do
    if [ ! -f "$file" ]; then
      continue
    fi

    line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
    if [ -z "$line" ]; then
      continue
    fi

    value="${line#*=}"
    value="${value%$'\r'}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf '%s\n' "$value"
    return 0
  done

  return 1
}

sync_missing_env_value() {
  local key="$1"
  local value

  if value="$(read_env_value "$key")" && [ -n "$value" ]; then
    if convex_has_env_key "$key"; then
      return 0
    fi

    pnpm exec convex env set "$key" "$value" >/dev/null
    echo "[convex-env] set missing $key"
  fi
}

sync_missing_env_value BETTER_AUTH_SECRET
sync_missing_env_value BETTER_AUTH_COOKIE_PREFIX
sync_missing_env_value GITHUB_CLIENT_ID
sync_missing_env_value GITHUB_CLIENT_SECRET
sync_missing_env_value GOOGLE_CLIENT_ID
sync_missing_env_value GOOGLE_CLIENT_SECRET
sync_missing_env_value R2_S3_URL
sync_missing_env_value R2_S3_ACCESS_KEY_ID
sync_missing_env_value R2_S3_SECRET_ACCESS_KEY
sync_missing_env_value R2_S3_BUCKET_NAME
sync_missing_env_value R2_URL
