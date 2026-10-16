// ecosystem.config.js — the one place that defines the pm2 processes on the VPS.
//
// Every start and restart path uses this file through scripts/pm2-apply.js:
// deploy.sh, api/routes/deploy-webhook.js and scripts/sync-vector-sidecar.sh.
// Do not start these processes by hand with other flags. Settings that live
// only on the server drift: after the sidecar code moved, its old pm2 process
// kept a stale cwd and pm2 restarted it about 3 times a second for 11 weeks
// (issue #249).
//
// The paths are absolute VPS paths, so this file is for the VPS only.
//
// Crash limits (all three processes):
//   min_uptime 10s   a process that exits sooner counts as an unstable restart
//   max_restarts 10  after 10 unstable restarts in a row, pm2 stops trying
//   exp_backoff_restart_delay 1000
//                    wait 1s, then longer, between restarts (up to 15s)
//
// The API and the MCP server load their settings from the project-root .env
// (api/config/load-env.js), so this file sets no env for the API. The MCP
// server gets an explicit PORT so a PORT from another environment cannot move
// it onto the API's port.

const fs = require("fs");

const PROJECT_DIR = "/var/www/thejesuswebsite";
const VECTOR_ROOT = "/var/www/thejesuswebsite-vector-store";
const SIDECAR_PYTHON = `${VECTOR_ROOT}/venv/bin/python`;

const CRASH_LIMITS = {
  min_uptime: "10s",
  max_restarts: 10,
  exp_backoff_restart_delay: 1000,
};

const apps = [
  {
    name: "thejesuswebsite-api",
    script: `${PROJECT_DIR}/api/server.js`,
    cwd: `${PROJECT_DIR}/api`,
    ...CRASH_LIMITS,
  },
  {
    name: "thejesuswebsite-mcp",
    script: `${PROJECT_DIR}/mcp-server/server.js`,
    cwd: `${PROJECT_DIR}/mcp-server`,
    env: { PORT: "3100" },
    ...CRASH_LIMITS,
  },
];

// The sidecar is optional. scripts/sync-vector-sidecar.sh creates its venv.
// Until the venv exists, leave the sidecar out instead of failing the deploy.
if (fs.existsSync(SIDECAR_PYTHON)) {
  apps.push({
    name: "thejesuswebsite-vector-sidecar",
    script: SIDECAR_PYTHON,
    interpreter: "none",
    args: "-m uvicorn app:app --host 127.0.0.1 --port 8901",
    cwd: `${PROJECT_DIR}/Wikipedia algorithm/vector-sidecar`,
    env: {
      VECTOR_STORE_DIR: `${VECTOR_ROOT}/vector-stores`,
      MODEL_DIR: `${VECTOR_ROOT}/model`,
    },
    ...CRASH_LIMITS,
  });
}

module.exports = { apps };
