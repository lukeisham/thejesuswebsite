#!/usr/bin/env bash
# sync-vector-sidecar.sh — push the vector sidecar's own code (vector-sidecar/
# at the repo root — an ordinary tracked directory, unlike setup/Wikipedia
# algorithm v2/) to the VPS, reinstall its Python dependencies, and restart it
# under pm2.
#
# Separate from sync-vector-stores.sh because the sidecar's Python code
# changes far less often than the stores/model data.
#
# FIRST-RUN (one-time) PROCEDURE — not part of every deploy, run manually:
#   1. SSH into the VPS.
#   2. mkdir -p /var/www/thejesuswebsite-vector-store/sidecar
#   3. cd /var/www/thejesuswebsite-vector-store/sidecar && python3 -m venv venv
#   4. Run ./scripts/sync-vector-sidecar.sh from your local machine (below) —
#      it will rsync the code and install dependencies into that venv.
#   5. On the VPS: pm2 start venv/bin/uvicorn --name thejesuswebsite-vector-sidecar \
#        --cwd /var/www/thejesuswebsite-vector-store/sidecar \
#        -- app:app --host 127.0.0.1 --port 8901
#     then: pm2 save
#   6. Run ./scripts/sync-vector-stores.sh (separate script) to push the
#      actual vector-stores data + model before the sidecar can serve
#      anything real.
#
# SUBSEQUENT RUNS just re-run this script — it detects the existing pm2
# process and restarts it instead of starting a new one.
#
# Env vars — same convention as sync-vector-stores.sh (read from shell env or
# a local .env; this script is run manually, not through GitHub Actions):
#   VPS_HOST, VPS_USER, VPS_SSH_KEY_PATH

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_SIDECAR_DIR="$PROJECT_DIR/vector-sidecar"
REMOTE_ROOT="/var/www/thejesuswebsite-vector-store"
REMOTE_SIDECAR_DIR="$REMOTE_ROOT/sidecar"
PM2_APP_NAME="thejesuswebsite-vector-sidecar"

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

echo "[sync-vector-sidecar] Syncing sidecar code ..."
rsync -avz --delete \
  --exclude '__pycache__' --exclude '*.pyc' --exclude '.venv' --exclude 'venv' \
  -e "${SSH_CMD[*]}" \
  "$LOCAL_SIDECAR_DIR/" \
  "$VPS_USER@$VPS_HOST:$REMOTE_SIDECAR_DIR/"

echo "[sync-vector-sidecar] Installing Python dependencies on the VPS ..."
"${SSH_CMD[@]}" "$VPS_USER@$VPS_HOST" bash -s <<REMOTE_SCRIPT
set -euo pipefail
cd "$REMOTE_SIDECAR_DIR"
if [ ! -d venv ]; then
  echo "[sync-vector-sidecar] No venv found — creating one (first run)."
  python3 -m venv venv
fi
./venv/bin/pip install -q -r requirements.txt

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  echo "[sync-vector-sidecar] Restarting existing pm2 process..."
  pm2 restart "$PM2_APP_NAME"
else
  echo "[sync-vector-sidecar] No existing pm2 process — starting it now (first run)."
  pm2 start venv/bin/uvicorn --name "$PM2_APP_NAME" --cwd "$REMOTE_SIDECAR_DIR" -- app:app --host 127.0.0.1 --port 8901
  pm2 save
fi
REMOTE_SCRIPT

echo "[sync-vector-sidecar] Done."
