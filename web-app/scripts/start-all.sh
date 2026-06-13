#!/usr/bin/env bash
# start-all.sh - boot Convex + TanStack Start dev servers in parallel,
# stream colored output to terminal AND write plain (ANSI-stripped) logs
# to .logs/{convex,web}.txt for AI agents (and humans) to tail.
set -uo pipefail

PORT=3000
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "Error: -p/--port requires a value" >&2
        exit 1
      fi
      PORT="$2"
      shift 2
      ;;
    --)
      shift
      ;;
    *)
      echo "Warning: ignoring unknown arg: $1" >&2
      shift
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.logs"
WEB_LOG="$LOG_DIR/web.txt"
CONVEX_LOG="$LOG_DIR/convex.txt"

mkdir -p "$LOG_DIR"
: > "$WEB_LOG"
: > "$CONVEX_LOG"

printf '[start-all] port=%s\n' "$PORT"
printf '[start-all] web log -> %s\n' "$WEB_LOG"
printf '[start-all] convex log -> %s\n' "$CONVEX_LOG"

printf '[start-all] setting Convex SITE_URL=http://localhost:%s\n' "$PORT"
if ! pnpm exec convex env set SITE_URL "http://localhost:$PORT"; then
  echo "[start-all] WARN: failed to set Convex SITE_URL (continuing)" >&2
fi

pids=()

cleanup() {
  trap '' INT TERM EXIT
  set +m 2>/dev/null || true
  echo
  echo "[start-all] stopping child processes..."
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 0.3
  for pid in "${pids[@]:-}"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done
  wait "${pids[@]:-}" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM EXIT

# Each child uses perl to read every line, write the ANSI-stripped + \r->\n
# version to the log file (with autoflush) AND print the original line with a
# colored [convex]/[web] prefix to the terminal. perl is used instead of awk
# because macOS's BSD awk corrupts -v values that start with "/" (treats them
# as regex literals), and instead of `tee >(...)` because tee block-buffers
# writes to a process substitution, which delays file updates.
set -m

(
  export LOG="$CONVEX_LOG"
  export PREFIX=$'\033[36m[convex]\033[0m'
  pnpm exec convex dev 2>&1 \
    | perl -ne '
        BEGIN {
          $| = 1;
          open(LOG, ">>", $ENV{LOG}) or die "open $ENV{LOG}: $!";
          select((select(LOG), $| = 1)[0]);
        }
        my $c = $_;
        $c =~ s/\033\[[0-9;?]*[a-zA-Z]//g;
        $c =~ s/\r/\n/g;
        print LOG $c;
        print "$ENV{PREFIX} $_";
      '
) &
pids+=("$!")

(
  for attempt in {1..30}; do
    if scripts/convex-sync-env.sh "$PORT" 2>/dev/null; then
      exit 0
    fi
    sleep 1
  done
  echo "[start-all] WARN: failed to sync Convex env after waiting for dev deployment" >&2
) &
pids+=("$!")

(
  PREFIX=$'\033[33m[stripe]\033[0m'
  for attempt in {1..60}; do
    if [ -f ".env.local" ] && grep -q '^VITE_CONVEX_SITE_URL=' ".env.local"; then
      node scripts/setup-stripe-webhook.mjs --quiet 2>&1 \
        | sed "s|^|$PREFIX |" \
        || echo "[start-all] WARN: stripe webhook setup failed (continuing)" >&2
      exit 0
    fi
    sleep 1
  done
  echo "[start-all] WARN: VITE_CONVEX_SITE_URL not found after 60s; skipping stripe webhook setup" >&2
) &
pids+=("$!")

(
  export LOG="$WEB_LOG"
  export PREFIX=$'\033[35m[web]\033[0m'
  export PORT="$PORT"
  export SITE_URL="http://localhost:$PORT"
  export VITE_SITE_URL="http://localhost:$PORT"
  pnpm dev 2>&1 \
    | perl -ne '
        BEGIN {
          $| = 1;
          open(LOG, ">>", $ENV{LOG}) or die "open $ENV{LOG}: $!";
          select((select(LOG), $| = 1)[0]);
        }
        my $c = $_;
        $c =~ s/\033\[[0-9;?]*[a-zA-Z]//g;
        $c =~ s/\r/\n/g;
        print LOG $c;
        print "$ENV{PREFIX} $_";
      '
) &
pids+=("$!")

wait
