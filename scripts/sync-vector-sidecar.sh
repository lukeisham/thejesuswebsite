#!/usr/bin/env bash
# sync-vector-sidecar.sh — (re)install the vector sidecar's Python venv on the
# VPS and (re)start it under pm2.
#
# The sidecar's CODE (Wikipedia algorithm/vector-sidecar/) is an ordinary tracked repo
# directory — it already reaches the VPS on every push via the normal
# .github/workflows/deploy.yml `git reset --hard origin/main` into
# /var/www/thejesuswebsite. This script does NOT rsync code; it only manages
# the Python venv + pm2 process, which `git reset --hard` never touches
# (untracked directories survive a reset — only tracked files are reverted).
#
# The vector-stores DATA (.index/.jsonl) is tracked in git, but the ONNX model
# (Wikipedia algorithm/classifier/model/model.onnx) is gitignored. Both are
# handled by the separate scripts/sync-vector-stores.sh, which rsyncs
# them to a sibling path (/var/www/thejesuswebsite-vector-store/) outside the
# git working tree, matching wikipedia-v2-09-vps-vector-store-serving.md's
# safety rationale (they must never live somewhere `git reset --hard` reaches).
#
# FIRST-RUN (one-time) PROCEDURE:
#   1. Make sure the sidecar code is already deployed: on the VPS,
#      /var/www/thejesuswebsite/Wikipedia algorithm/vector-sidecar/ should exist (created by the
#      normal deploy once this repo's commit reached origin/main).
#   2. Run ./scripts/sync-vector-stores.sh from your local machine first —
#      the sidecar needs the vector-stores data + model to have anywhere to
#      load from before it can start successfully.
#   3. Run this script (./scripts/sync-vector-sidecar.sh) from your local
#      machine. It SSHs in, creates the venv if missing, installs
#      requirements.txt, and (re)creates the pm2 process from
#      ecosystem.config.js (via scripts/pm2-apply.js).
#
# SUBSEQUENT RUNS: re-run this script after `requirements.txt` changes or
# after the sidecar folder moves. It deletes the existing pm2 process and
# starts a new one, so the cwd, env and flags are always current. A normal
# deploy already restarts the sidecar (api/routes/deploy-webhook.js), so code
# changes alone do not need this script. The sidecar's start settings (port,
# cwd, env, crash limits) live in ecosystem.config.js, not here.
#
# Env vars — same convention as sync-vector-stores.sh (read from shell env or
# a local .env; this script is run manually, not through GitHub Actions):
#   VPS_HOST, VPS_USER, VPS_SSH_KEY_PATH

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_PROJECT_DIR="/var/www/thejesuswebsite"
REMOTE_SIDECAR_DIR="$REMOTE_PROJECT_DIR/Wikipedia algorithm/vector-sidecar"
REMOTE_DATA_ROOT="/var/www/thejesuswebsite-vector-store"
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

echo "[sync-vector-sidecar] Setting up venv + pm2 process on the VPS ..."
"${SSH_CMD[@]}" "$VPS_USER@$VPS_HOST" bash -s <<REMOTE_SCRIPT
set -euo pipefail
cd "$REMOTE_SIDECAR_DIR"

# The venv lives with the data, outside the git tree: no space in its path
# (which breaks script shebangs), and a folder move in git cannot strand it.
VENV="$REMOTE_DATA_ROOT/venv"
if [ ! -d "\$VENV" ]; then
  echo "[sync-vector-sidecar] No venv found — creating one (first run)."
  python3 -m venv "\$VENV"
fi
"\$VENV/bin/pip" install -q -r requirements.txt

# Start the sidecar from ecosystem.config.js, the one place that sets its
# cwd, env (VECTOR_STORE_DIR, MODEL_DIR) and crash limits. pm2-apply.js
# deletes and starts the process, never only restarts it: a restart keeps the
# old cwd, env and flags. After the code moved to "Wikipedia algorithm/", the
# old process kept its old cwd, could not import app.py, and pm2 restarted it
# about 3 times a second for 11 weeks (issue #249). It then waits for
# /health and fails if the sidecar does not answer.
cd "$REMOTE_PROJECT_DIR"
node scripts/pm2-apply.js --only "$PM2_APP_NAME"
REMOTE_SCRIPT

echo "[sync-vector-sidecar] Done."
