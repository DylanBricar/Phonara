#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

log() {
  printf '[convex-preview] %s\n' "$*"
}

cleanup() {
  if [ -n "${export_dir:-}" ] && [ -d "$export_dir" ]; then
    if command -v trash >/dev/null 2>&1; then
      trash "$export_dir" >/dev/null 2>&1 || true
    else
      rm -r "$export_dir" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup EXIT

deploy_args=(
  deploy
  --cmd "pnpm build"
  --cmd-url-env-var-name VITE_CONVEX_URL
)

if [ -n "${CONVEX_PREVIEW_RUN_FUNCTION:-}" ]; then
  deploy_args+=(--preview-run "$CONVEX_PREVIEW_RUN_FUNCTION")
fi

log "deploying Convex functions and building the app"
pnpm exec convex "${deploy_args[@]}"

if [ "${VERCEL_ENV:-}" != "preview" ]; then
  log "VERCEL_ENV is not preview; skipping production data import"
  exit 0
fi

preview_name="${CONVEX_PREVIEW_NAME:-${VERCEL_GIT_COMMIT_REF:-}}"

if [ -z "$preview_name" ]; then
  echo "[convex-preview] ERROR: missing preview name. Set CONVEX_PREVIEW_NAME or run from a Vercel preview build with VERCEL_GIT_COMMIT_REF." >&2
  exit 1
fi

if [ -z "${CONVEX_PROD_DEPLOY_KEY:-}" ]; then
  echo "[convex-preview] ERROR: CONVEX_PROD_DEPLOY_KEY is required to export production data during preview builds." >&2
  echo "[convex-preview] Run pnpm vercel:setup-convex-env once, then redeploy. Keep CONVEX_DEPLOY_KEY as the Convex preview deploy key." >&2
  exit 1
fi

export_dir="$(mktemp -d "${TMPDIR:-/tmp}/nowstack-convex-preview.XXXXXX")"
snapshot_path="$export_dir/production-snapshot.zip"
export_args=(export --prod --path "$snapshot_path")

if [ "${CONVEX_PREVIEW_IMPORT_FILE_STORAGE:-1}" = "1" ]; then
  export_args+=(--include-file-storage)
fi

log "exporting production data snapshot"
CONVEX_DEPLOY_KEY="$CONVEX_PROD_DEPLOY_KEY" pnpm exec convex "${export_args[@]}"

log "importing production snapshot into preview deployment: $preview_name"
pnpm exec convex import "$snapshot_path" --preview-name "$preview_name" --replace-all -y

log "preview deployment data matches the production snapshot"
