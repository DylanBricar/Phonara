#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/worktree-context.sh"

worktree_path="$(resolve_worktree_path "$script_dir")"
cd "$worktree_path"

source_tree="$(resolve_source_tree)"
ensure_source_tree_exists "$source_tree" "worktree-setup"
ensure_not_source_tree "$source_tree" "ALLOW_SOURCE_TREE_SETUP" "worktree-setup" "set up"

workspace_slug="$(slugify "$(resolve_workspace_name)")"
auth_cookie_prefix="$(resolve_worktree_auth_cookie_prefix "$workspace_slug")"
convex_deployment_mode="$(resolve_convex_deployment_mode)"
convex_target_deployment=""
convex_created_deployment=0

echo "[worktree-setup] setting up NowStack worktree: $workspace_slug"

copy_local_env() {
  local env_path="$1"
  local source_path="$source_tree/$env_path"
  local target_path="$PWD/$env_path"

  if [ -f "$source_path" ]; then
    if [ "$source_path" = "$target_path" ]; then
      return 0
    fi
    cp "$source_path" "$env_path"
    echo "[worktree-setup] copied $env_path"
  fi
}

copy_local_env ".env"
copy_local_env ".env.development.local"

set_local_env_value() {
  local env_path="$1"
  local key="$2"
  local value="$3"

  touch "$env_path"

  if grep -Eq "^${key}=" "$env_path"; then
    ENV_KEY="$key" ENV_VALUE="$value" perl -0pi -e 'my $key = $ENV{ENV_KEY}; my $value = $ENV{ENV_VALUE}; s/^\Q$key\E=.*/$key . "=" . $value/me' "$env_path"
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_path"
  fi
}

set_local_env_value ".env" "BETTER_AUTH_COOKIE_PREFIX" "$auth_cookie_prefix"
echo "[worktree-setup] using Better Auth cookie prefix: $auth_cookie_prefix"

echo "[worktree-setup] installing dependencies"
CONVEX_CODEGEN_SKIP=1 pnpm install

configure_convex_local() {
  if [ -f ".env.local" ] && grep -q "^CONVEX_DEPLOYMENT=local" ".env.local"; then
    echo "[worktree-setup] local Convex deployment already selected"
    return 0
  fi

  rm -f ".env.local"
  trash_path ".convex"

  echo "[worktree-setup] creating isolated local Convex deployment"
  if pnpm exec convex deployment create local --select; then
    echo "[worktree-setup] local Convex deployment selected"
    return 0
  fi

  echo "[worktree-setup] local deployment create failed; trying convex dev --local --once"
  pnpm exec convex dev --local --once
}

configure_convex_cloud() {
  local ref
  ref="$(resolve_convex_deployment_ref "$workspace_slug")"
  convex_target_deployment="$ref"

  if [ -f "$source_tree/.env.local" ]; then
    cp "$source_tree/.env.local" ".env.local"
  fi

  echo "[worktree-setup] creating/selecting Convex dev deployment: $ref"
  if pnpm exec convex deployment create "$ref" --type dev --select; then
    convex_created_deployment=1
  else
    pnpm exec convex deployment select "$ref"
  fi
}

import_convex_dev_data() {
  local source_deployment
  local target_deployment="$1"
  source_deployment="$(resolve_convex_import_source)"

  if [ -z "$target_deployment" ]; then
    return 0
  fi

  if [ "$source_deployment" = "$target_deployment" ]; then
    echo "[worktree-setup] import source and target are both $target_deployment; skipping import"
    return 0
  fi

  if [ "$convex_created_deployment" != "1" ] && [ "${CONVEX_WORKTREE_RESET_DATA:-0}" != "1" ]; then
    echo "[worktree-setup] Convex deployment already existed; skipping data import"
    return 0
  fi

  local export_dir
  local export_path
  export_dir="$(mktemp -d -t nowstack-convex-export)"
  export_path="$export_dir/snapshot.zip"

  echo "[worktree-setup] exporting Convex data from $source_deployment"
  if [ "${CONVEX_WORKTREE_IMPORT_FILE_STORAGE:-1}" = "1" ]; then
    pnpm exec convex export --deployment "$source_deployment" --include-file-storage --path "$export_path"
  else
    pnpm exec convex export --deployment "$source_deployment" --path "$export_path"
  fi

  echo "[worktree-setup] importing Convex data into $target_deployment"
  pnpm exec convex import "$export_path" --deployment "$target_deployment" --replace-all -y
  trash_path "$export_dir"
}

clone_convex_dev_env() {
  local source_deployment
  local target_deployment="$1"
  source_deployment="$(resolve_convex_env_source)"

  if [ -z "$target_deployment" ]; then
    return 0
  fi

  if [ "$source_deployment" = "$target_deployment" ]; then
    echo "[worktree-setup] env source and target are both $target_deployment; skipping env clone"
    return 0
  fi

  local env_file
  env_file=".env-convex"

  (
    trap 'rm -f "$env_file"' EXIT
    rm -f "$env_file"

    echo "[worktree-setup] cloning Convex env vars from $source_deployment to $target_deployment"
    pnpm exec convex env list --deployment "$source_deployment" > "$env_file"

    if [ ! -s "$env_file" ]; then
      echo "[worktree-setup] source Convex deployment has no env vars"
      return 0
    fi

    pnpm exec convex env set --deployment "$target_deployment" --from-file "$env_file" --force >/dev/null
  )
}

set_convex_auth_cookie_prefix() {
  local target_deployment="$1"

  if [ -n "$target_deployment" ]; then
    pnpm exec convex env set --deployment "$target_deployment" BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
  else
    pnpm exec convex env set BETTER_AUTH_COOKIE_PREFIX "$auth_cookie_prefix" >/dev/null
  fi

  echo "[worktree-setup] set Convex BETTER_AUTH_COOKIE_PREFIX=$auth_cookie_prefix"
}

case "$convex_deployment_mode" in
  local)
    configure_convex_local
    ;;
  cloud)
    configure_convex_cloud
    ;;
  existing)
    copy_local_env ".env.local"
    echo "[worktree-setup] copied existing Convex .env.local"
    ;;
  *)
    echo "[worktree-setup] invalid CONVEX_WORKTREE_DEPLOYMENT_MODE; use local, cloud, or existing" >&2
    exit 1
    ;;
esac

if [ "$convex_deployment_mode" = "cloud" ]; then
  clone_convex_dev_env "$convex_target_deployment"
  set_convex_auth_cookie_prefix "$convex_target_deployment"
  scripts/convex-sync-env.sh
  echo "[worktree-setup] pushing Convex schema and functions"
  pnpm exec convex dev --once
  import_convex_dev_data "$convex_target_deployment"
else
  set_convex_auth_cookie_prefix "$convex_target_deployment"
fi

echo "[worktree-setup] generating Convex client"
pnpm exec convex codegen

echo "[worktree-setup] setup complete"
