#!/usr/bin/env bash
# deploy.sh — one-command VPS deploy / setup for thejesuswebsite API + MCP server.
# Idempotent: safe to run repeatedly. Exits on first error.
#
# Usage: ./deploy.sh
#
# Prerequisites on the VPS:
#   - Node.js >= 18
#   - npm
#   - sqlite3 CLI (for schema application)
#
# Review the paths and process manager (pm2 / systemd / supervisor) against
# the actual target server before first use.

set -euo pipefail

# ---- Configuration (adjust per VPS) -----------------------------------------
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
API_DIR="$PROJECT_DIR/api"
DB_DIR="$PROJECT_DIR/database"
DB_FILE="$DB_DIR/thejesuswebsite.db"
SCHEMA_FILE="$DB_DIR/schema.sql"
MIGRATIONS_DIR="$DB_DIR/migrations"

# Process manager: "pm2" | "systemd" | "none" (direct node)
PROCESS_MANAGER="${PROCESS_MANAGER:-pm2}"
APP_NAME="thejesuswebsite-api"
MCP_APP_NAME="thejesuswebsite-mcp"
MCP_DIR="$PROJECT_DIR/mcp-server"

# ---- Step cache ---------------------------------------------------------------
# The slow steps below (npm install, GeoIP import, Wikipedia scoring import)
# depend only on files in the repo. api/scripts/deploy-step-cache.js hashes
# those files, and a step runs only when the hash differs from the one recorded
# after its last success. A push that changes only code or content then skips
# them. FORCE_FULL_DEPLOY=1 runs every step; removing .deploy-state/ does the
# same for the next deploy.
STEP_CACHE="$API_DIR/scripts/deploy-step-cache.js"
inputs_unchanged() { node "$STEP_CACHE" check "$@"; }
record_step() { node "$STEP_CACHE" record "$@"; }

# $1 = step name, $2 = package directory. A missing node_modules/ always installs.
install_dependencies() {
  local step="$1" dir="$2"
  local inputs=("$dir/package.json" "$dir/package-lock.json")
  if [ -d "$dir/node_modules" ] && inputs_unchanged "$step" "${inputs[@]}"; then
    echo "[deploy] $step: package files unchanged — skipping npm install (FORCE_FULL_DEPLOY=1 to force)."
    return
  fi
  echo "[deploy] $step: installing dependencies..."
  (cd "$dir" && npm install --production)
  record_step "$step" "${inputs[@]}"
}

# ---- 1. Install dependencies ------------------------------------------------
install_dependencies api-npm "$API_DIR"
install_dependencies mcp-npm "$MCP_DIR"

# ---- 2. Apply database schema and migrations --------------------------------
echo "[deploy] Applying database schema..."
mkdir -p "$DB_DIR"

DB_IS_NEW=false
if [ ! -f "$DB_FILE" ]; then
  DB_IS_NEW=true
  echo "[deploy] Creating new database from schema."
  sqlite3 "$DB_FILE" < "$SCHEMA_FILE"
else
  echo "[deploy] Database exists."
fi

# The app now self-loads .env at boot (api/config/load-env.js), so no shell
# export is needed. Make sure .env has RP_ID, ORIGIN, NODE_ENV, and SETUP_TOKEN populated.
echo "[deploy] Reminder: ensure .env has RP_ID, ORIGIN, NODE_ENV, and SETUP_TOKEN populated."

# If this is a first-time setup, you may need to clear stale test credentials
# before enrolling the first real passkey:
#   node api/scripts/reset-credentials.js --confirm
# After that, visit /admin/ to enrol your passkey.

# Ensure the schema_migrations tracking table exists (defensive for databases
# that pre-date this system).
sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);"

# Apply migration files in sorted order, skipping 001_* (duplicate of schema.sql).
if [ -d "$MIGRATIONS_DIR" ]; then
  for migration in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    fname=$(basename "$migration")
    # Skip 001_ — it is a byte-identical copy of schema.sql, not a migration.
    # Skip 005_ — hero_image columns are already in the canonical schema.sql.
    [[ "$fname" == 001_* ]] && continue
    [[ "$fname" == 005_* ]] && continue

    # If this is a freshly created database (schema.sql just applied),
    # mark all migrations as already-applied — schema.sql already contains
    # their effects, and replaying them would cause duplicate-column errors.
    if [ "$DB_IS_NEW" = true ]; then
      echo "[deploy] Fresh DB: marking migration as already-applied: $fname"
      sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO schema_migrations(filename) VALUES ('$fname');"
      continue
    fi

    applied=$(sqlite3 "$DB_FILE" "SELECT 1 FROM schema_migrations WHERE filename = '$fname';" 2>/dev/null || true)
    if [ -n "$applied" ]; then
      echo "[deploy] Migration already applied: $fname"
      continue
    fi

    echo "[deploy] Applying migration: $fname"
    sqlite3 "$DB_FILE" < "$migration"
    sqlite3 "$DB_FILE" "INSERT INTO schema_migrations(filename) VALUES ('$fname');"
  done
else
  echo "[deploy] No migrations directory found — skipping."
fi

# ---- 3. Import GeoIP data (only when its inputs changed) ----------------------
# An empty geoip_blocks table always imports, so a lost or new table refills.
GEOIP_CSV="$API_DIR/data/geoip/GeoLite2-Country-Blocks-IPv4.csv"
GEOIP_INPUTS=("$GEOIP_CSV" "$API_DIR/data/geoip/GeoLite2-Country-Locations-en.csv" "$API_DIR/scripts/import-geoip.js")
if [ -f "$GEOIP_CSV" ]; then
  geoip_has_rows=$(sqlite3 "$DB_FILE" "SELECT 1 FROM geoip_blocks LIMIT 1;" 2>/dev/null || true)
  if [ "$DB_IS_NEW" = false ] && [ -n "$geoip_has_rows" ] && inputs_unchanged geoip "${GEOIP_INPUTS[@]}"; then
    echo "[deploy] GeoIP inputs unchanged — skipping import (FORCE_FULL_DEPLOY=1 to force)."
  else
    echo "[deploy] Importing GeoIP country data..."
    cd "$API_DIR"
    npm run import-geoip
    record_step geoip "${GEOIP_INPUTS[@]}"
  fi
else
  echo "[deploy] WARNING: GeoIP CSV not found at $GEOIP_CSV — country data will remain 'Unknown' until the CSV is placed and a deploy re-runs."
fi

# ---- 4. Import Wikipedia scoring data (only when its inputs changed) ----------
SCORING_EXPORT="$PROJECT_DIR/database/scoring-export.json"
SCORING_INPUTS=("$SCORING_EXPORT" "$API_DIR/scripts/import-wikipedia-scoring.js")
if [ -f "$SCORING_EXPORT" ]; then
  if [ "$DB_IS_NEW" = false ] && inputs_unchanged wikipedia-scoring "${SCORING_INPUTS[@]}"; then
    echo "[deploy] Wikipedia scoring inputs unchanged — skipping import (FORCE_FULL_DEPLOY=1 to force)."
  else
    echo "[deploy] Importing Wikipedia scoring data..."
    cd "$API_DIR"
    npm run import-wikipedia-scoring -- --publish --purge-missing
    record_step wikipedia-scoring "${SCORING_INPUTS[@]}"
  fi
else
  echo "[deploy] WARNING: Wikipedia scoring export not found at $SCORING_EXPORT — Wikipedia reliability data will remain stale until the file is placed and a deploy re-runs."
fi

# ---- 5. Generate sitemap and static pages ------------------------------------
# These run on every deploy, so they are not in the step cache. They read the
# production database, which the admin changes without a push. Their outputs
# are tracked files, so `git reset --hard` puts the committed copies back, and
# the asset and date stamps must be applied again after each reset.
echo "[deploy] Generating sitemap..."
cd "$API_DIR"
npm run sitemap

echo "[deploy] Generating static pages..."
npm run pages

echo "[deploy] Stamping about.html dates from git history..."
cd "$API_DIR" && npm run stamp-about-dates

echo "[deploy] Embedding initial data for list/visual pages..."
npm run embed-data

echo "[deploy] Stamping asset references with deploy version..."
npm run version-assets

# ---- 6. Start / restart the API and MCP servers -----------------------------
# SKIP_RESTART=1 skips this step entirely (used by routes/deploy-webhook.js:
# that endpoint runs on the very API process a pm2 restart would kill, which
# would sever the HTTP connection to the caller mid-response. The webhook
# runs deploy.sh with SKIP_RESTART=1 so this script can still report a real
# exit code for the build steps above, then runs scripts/pm2-apply.js itself
# as a separate detached step after the HTTP response has been sent.)

if [ "${SKIP_RESTART:-}" = "1" ]; then
  echo "[deploy] SKIP_RESTART=1 — leaving process restart to the caller."
else
  case "$PROCESS_MANAGER" in
    pm2)
      # All three processes come from ecosystem.config.js, so cwd, env and
      # crash limits are always the ones in the repo.
      # scripts/pm2-apply.js deletes and starts them, saves the list, and
      # exits non-zero if a health route does not answer within ~30s.
      echo "[deploy] Applying ecosystem.config.js (pm2) and checking health..."
      node "$PROJECT_DIR/scripts/pm2-apply.js"
      ;;
    systemd)
      echo "[deploy] Restarting systemd service..."
      sudo systemctl restart "$APP_NAME"
      ;;
    none)
      echo "[deploy] Starting API server directly (Ctrl+C to stop)..."
      cd "$API_DIR"
      node server.js
      ;;
    *)
      echo "[deploy] Unknown PROCESS_MANAGER: $PROCESS_MANAGER"
      exit 1
      ;;
  esac
fi

# ---- 7. Reload nginx so committed config changes take effect -----------------
# This reload only re-reads whatever file already sits at
# /etc/nginx/sites-available/thejesuswebsite on the VPS — it does NOT copy
# deploy/nginx.conf into place. That path must be a symlink to this repo's
# deploy/nginx.conf (see the one-time setup note at the top of that file) or
# committed nginx.conf changes reload "successfully" while staying completely
# inert. Use sudo -n
# (never prompt) and treat reload failure as a warning: a deploy must not die
# because the deploy user lacks the sudo grant. Grant it with:
#   echo "$USER ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload" | sudo tee /etc/sudoers.d/deploy-nginx-reload
if command -v nginx >/dev/null 2>&1; then
  echo "[deploy] Reloading nginx..."
  if sudo -n nginx -s reload 2>/dev/null; then
    echo "[deploy] nginx reloaded."
  else
    echo "[deploy] WARNING: nginx reload failed (no passwordless sudo?). Config changes in deploy/nginx.conf are NOT live until nginx is reloaded manually."
  fi
else
  echo "[deploy] nginx not found on PATH — skipping reload."
fi

echo "[deploy] Done."
