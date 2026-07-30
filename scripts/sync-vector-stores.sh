#!/usr/bin/env bash
# sync-vector-stores.sh — push locally-built FAISS vector stores + the vendored
# MiniLM ONNX model to the VPS for the vector sidecar to serve.
#
# IMPORTANT — path placement: the destination
# (/var/www/thejesuswebsite-vector-store/) is a SIBLING of the git working
# tree (/var/www/thejesuswebsite) that .github/workflows/deploy.yml resets
# with `git reset --hard origin/main`. It must stay a sibling, never a
# subdirectory of the git working tree — `git reset --hard` would otherwise
# wipe it (or its untracked contents) on every deploy. See
# setup/PLANS/.../wikipedia-v2-09-vps-vector-store-serving.md.
#
# This script is run MANUALLY by a developer after rebuilding the stores
# locally (Plan 4/5's build_stores.py / families export tooling) — it is not
# part of deploy.sh and does not run on every push to main.
#
# Update path (after rebuilding stores locally):
#   1. Rebuild the stores under
#      "Wikipedia algorithm/vector-stores/" (dev-machine only).
#   2. Run ./scripts/sync-vector-stores.sh
#   3. Run ./scripts/sync-vector-stores.sh --verify
#      to confirm the local and remote file counts match.
#
# Env vars (read from shell env or a local .env — this script is not run
# through GitHub Actions, so it does not have access to repo secrets):
#   VPS_HOST          e.g. example.com
#   VPS_USER          SSH user
#   VPS_SSH_KEY_PATH  path to the local private key file (NOT key contents —
#                     unlike the GitHub Actions VPS_SSH_KEY secret, this
#                     script shells out to the local `ssh`/`rsync` binaries,
#                     which need a file path via `-i`)
#
# Usage:
#   ./scripts/sync-vector-stores.sh              # sync stores + model
#   ./scripts/sync-vector-stores.sh --verify      # compare local/remote file counts

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_STORES_DIR="$PROJECT_DIR/Wikipedia algorithm/vector-stores"
LOCAL_MODEL_DIR="$PROJECT_DIR/Wikipedia algorithm/classifier/model"
REMOTE_ROOT="/var/www/thejesuswebsite-vector-store"

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

if [ ! -d "$LOCAL_STORES_DIR" ]; then
  echo "[sync-vector-stores] ERROR: local vector-stores directory not found: $LOCAL_STORES_DIR" >&2
  echo "[sync-vector-stores] Build at least one store (Plans 4/5's tooling) before syncing." >&2
  exit 1
fi

verify() {
  echo "[sync-vector-stores] Counting local files..."
  local_count=$(find "$LOCAL_STORES_DIR" -type f | wc -l | tr -d ' ')

  echo "[sync-vector-stores] Counting remote files..."
  remote_count=$(
    "${SSH_CMD[@]}" "$VPS_USER@$VPS_HOST" \
      "find '$REMOTE_ROOT/vector-stores' -type f 2>/dev/null | wc -l" | tr -d ' '
  )

  echo "[sync-vector-stores] local=$local_count remote=$remote_count"
  if [ "$local_count" != "$remote_count" ]; then
    echo "[sync-vector-stores] MISMATCH — re-run without --verify to sync." >&2
    exit 1
  fi
  echo "[sync-vector-stores] Counts match."
}

if [ "${1:-}" = "--verify" ]; then
  verify
  exit 0
fi

echo "[sync-vector-stores] Syncing vector-stores/ ..."
rsync -avz --delete -e "${SSH_CMD[*]}" \
  "$LOCAL_STORES_DIR/" \
  "$VPS_USER@$VPS_HOST:$REMOTE_ROOT/vector-stores/"

echo "[sync-vector-stores] Syncing embedding model (model.onnx + vocab.txt) ..."
rsync -avz --delete -e "${SSH_CMD[*]}" \
  "$LOCAL_MODEL_DIR/" \
  "$VPS_USER@$VPS_HOST:$REMOTE_ROOT/model/"

echo "[sync-vector-stores] Done. Run '$0 --verify' to confirm file counts match."
