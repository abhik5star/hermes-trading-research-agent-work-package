#!/usr/bin/env bash
# ===========================================================================
#  Hermes Neural — resume / health-check the dashboard preview (port 5173)
#
#  Why this exists: the dev sandbox can wipe webapp/node_modules between
#  turns, which kills the Vite server and the live preview with it. This
#  script is idempotent and rebuilds the whole preview in one command:
#
#    ./scripts/resume_preview.sh            # foreground dev server (Ctrl+C)
#    ./scripts/resume_preview.sh --detached # background, survives the shell
#    ./scripts/resume_preview.sh --check    # health check only, never starts
#
#  It never force-pushes, never touches git state, and never runs a live
#  brokerage integration — the app is a simulated research platform.
# ===========================================================================
set -uo pipefail

PORT="${PORT:-5173}"
HOST="${HOST:-0.0.0.0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBAPP_DIR="$ROOT_DIR/webapp"
LOG_FILE="$WEBAPP_DIR/.preview.log"
PID_FILE="$WEBAPP_DIR/.preview.pid"
MODE="foreground"

for arg in "$@"; do
  case "$arg" in
    -d|--detached) MODE="detached" ;;
    -c|--check)    MODE="check" ;;
    -h|--help)
      sed -n '2,14p' "${BASH_SOURCE[0]}"
      exit 0
      ;;
    *) echo "[WARN] Unknown option: $arg" ;;
  esac
done

green() { printf '\033[32m%s\033[0m\n' "$1"; }
amber() { printf '\033[33m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }

preview_url() {
  if [ -n "${E2B_SANDBOX_ID:-}" ]; then
    echo "https://${PORT}-${E2B_SANDBOX_ID}.e2b.app"
  else
    echo "http://localhost:${PORT}/"
  fi
}

port_open() {
  # Works without ss/netstat: bash /dev/tcp probe.
  (exec 3<>"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null && exec 3<&- && return 0
  return 1
}

http_code() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 6 "http://127.0.0.1:${PORT}/" 2>/dev/null || echo "000"
}

banner() {
  echo
  echo "============================================================"
  echo "  HERMES NEURAL — Dashboard Preview"
  echo "============================================================"
  echo "  Preview URL : $(preview_url)"
  echo "  Local URL   : http://localhost:${PORT}/"
  echo "  Mode        : simulated research platform (live trading OFF)"
  echo "============================================================"
  echo
}

# ── 1. Toolchain ───────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  red "[ERROR] Node.js not found on PATH. Install Node 18+ from https://nodejs.org"
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  red "[ERROR] Node $NODE_MAJOR is too old. Hermes needs Node 18+."
  exit 1
fi

# ── 2. Already serving? Reuse it instead of fighting for the port ─────────
if port_open; then
  CODE="$(http_code)"
  if [ "$CODE" = "200" ]; then
    green "[OK] Preview already live on port ${PORT} (HTTP ${CODE}) — reusing it."
    banner
    exit 0
  fi
  amber "[WARN] Port ${PORT} is open but returned HTTP ${CODE}. Restarting it."
  if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null)"
    [ -n "$OLD_PID" ] && kill "$OLD_PID" 2>/dev/null
    rm -f "$PID_FILE"
  fi
  pkill -f "vite --host ${HOST}" 2>/dev/null
  sleep 1
fi

if [ "$MODE" = "check" ]; then
  red "[FAIL] Nothing is serving on port ${PORT}."
  exit 1
fi

# ── 3. Dependencies (the sandbox wipes node_modules between turns) ─────────
cd "$WEBAPP_DIR" || { red "[ERROR] webapp/ not found at $WEBAPP_DIR"; exit 1; }

if [ ! -d node_modules ]; then
  amber "[1/3] node_modules missing (sandbox wipe) — running npm install..."
  if ! npm install --no-audit --no-fund; then
    red "[ERROR] npm install failed. Check network / npm registry access."
    exit 1
  fi
  green "      dependencies installed."
else
  echo "[1/3] Dependencies present — skipping install."
fi

# ── 4. Type-check so a broken tree fails loudly, not in the browser ───────
if [ "${SKIP_TYPECHECK:-0}" != "1" ]; then
  echo "[2/3] Type-checking (tsc --noEmit)..."
  if npx --no-install tsc --noEmit; then
    green "      type-check clean."
  else
    red "[ERROR] Type-check failed — see errors above."
    exit 1
  fi
else
  echo "[2/3] Type-check skipped (SKIP_TYPECHECK=1)."
fi

# ── 5. Start Vite ─────────────────────────────────────────────────────────
echo "[3/3] Starting Vite dev server on ${HOST}:${PORT} ..."
if [ "$MODE" = "detached" ]; then
  nohup npx --no-install vite --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  for _ in $(seq 1 40); do
    if port_open; then break; fi
    sleep 0.5
  done
  CODE="$(http_code)"
  if [ "$CODE" = "200" ]; then
    green "[OK] Preview running (PID $(cat "$PID_FILE"), HTTP ${CODE})."
    echo "     Log: $LOG_FILE"
    banner
    exit 0
  fi
  red "[ERROR] Server did not come up healthy (HTTP ${CODE}). Log tail:"
  tail -n 20 "$LOG_FILE" 2>/dev/null
  exit 1
fi

# Foreground mode: exec so Ctrl+C stops Vite cleanly.
exec npx --no-install vite --host "$HOST" --port "$PORT"
