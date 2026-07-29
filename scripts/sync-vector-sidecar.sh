#!/usr/bin/env bash
# sync-vector-sidecar.sh — (re)install the vector sidecar's Python venv on the
# VPS and (re)start it under pm2.
#
# The sidecar's CODE (top-level vector-sidecar/) is an ordinary tracked repo
# directory — it already reaches the VPS on every push via the normal
# .github/workflows/deploy.yml `git reset --hard origin/main` into
# /var/www/thejesuswebsite. This script does NOT rsync code; it only manages
# the Python venv + pm2 process, which `git reset --hard` never touches
# (untracked directories survive a reset — only tracked files are reverted).
#
# The vector-stores DATA + ONNX model are NOT in git (setup/ is gitignored)
# and are handled by the separate scripts/sync-vector-stores.sh, which rsyncs
# them to a sibling path (/var/www/thejesuswebsite-vector-store/) outside the
# git working tree, matching wikipedia-v2-09-vps-vector-store-serving.md's
# safety rationale (they must never live somewhere `git reset --hard` reaches).
#
# FIRST-RUN (one-time) PROCEDURE:
#   1. Make sure the sidecar code is already deployed: on the VPS,
#      /var/www/thejesuswebsite/vector-sidecar/ should exist (created by the
#      normal deploy once this repo's commit reached origin/main).
#   2. Run ./scripts/sync-vector-stores.sh from your local machine first —
#      the sidecar needs the vector-stores data + model to have anywhere to
#      load from before it can start successfully.
#   3. Run this script (./scripts/sync-vector-sidecar.sh) from your local
#      machine. It SSHs in, creates the venv if missing, installs
#      requirements.txt, and starts (or restarts) the pm2 process.
#
# SUBSEQUENT RUNS: just re-run this script after `requirements.txt` changes
# or after a fresh deploy updated vector-sidecar/'s code — it detects the
# existing pm2 process and restarts it instead of starting a new one.
#
# Env vars — same convention as sync-vector-stores.sh (read from shell env or
# a local .env; this script is run manually, not through GitHub Actions):
#   VPS_HOST, VPS_USER, VPS_SSH_KEY_PATH

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_SIDECAR_DIR="/var/www/thejesuswebsite/vector-sidecar"
REMOTE_DATA_ROOT="/var/www/thejesuswebsite-vector-store"
PM2_APP_NAME="thejesuswebsite-vector-sidecar"
SIDECAR_PORT="8901"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_DIR/.env"
  set +a
fi

: "${VPS_HOST:?VPS_HOST is not set (shell env or .env)}"
: "${VPS_USER:?VPS_USER is not set (shell env or .env)}"
: "${VPS_SSH_KEY_PATH:?VPS_SSH_KEY_PATH is not set (shell env or .env) — path to the local private key file}"

SSH_CMD=(ssh -i "$VPS_SSH_KEY_PATH")

echo "[sync-vector-sidecar] Setting up venv + pm2 process on the VPS ..."
"${SSH_CMD[@]}" "$VPS_USER@$VPS_HOST" bash -s <<REMOTE_SCRIPT
set -euo pipefail
cd "$REMOTE_SIDECAR_DIR"

if [ ! -d venv ]; then
  echo "[sync-vector-sidecar] No venv found — creating one (first run)."
  python3 -m venv venv
fi
./venv/bin/pip install -q -r requirements.txt

export VECTOR_STORE_DIR="$REMOTE_DATA_ROOT/vector-stores"
export MODEL_DIR="$REMOTE_DATA_ROOT/model"

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "[sync-vector-sidecar] Restarting existing pm2 process..."
  pm2 restart "$PM2_APP_NAME"
else
  echo "[sync-vector-sidecar] No existing pm2 process — starting it now (first run)."
  pm2 start venv/bin/uvicorn --name "$PM2_APP_NAME" --cwd "$REMOTE_SIDECAR_DIR" --interpreter none -- app:app --host 127.0.0.1 --port $SIDECAR_PORT
  pm2 save
fi
REMOTE_SCRIPT

echo "[sync-vector-sidecar] Done."
