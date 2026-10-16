#!/usr/bin/env node
// pm2-apply.js — (re)start the pm2 processes from ecosystem.config.js, then
// check that each one answers on its health route.
//
// Used by every start/restart path on the VPS: deploy.sh, the deploy webhook
// (api/routes/deploy-webhook.js) and scripts/sync-vector-sidecar.sh.
//
// Why delete and start, not restart: `pm2 restart` keeps the old cwd, script
// and flags. A stale cwd caused the 11-week sidecar crash loop (issue #249).
// In fork mode a restart also stops the process before it starts it again, so
// delete + start gives no extra downtime.
//
// Usage: node scripts/pm2-apply.js [--only <app-name>]
//
// Env:
//   DEPLOY_ID          optional id written to deploy-status.json, so the
//                      GitHub Actions job can find the result of its own deploy
//   HEALTH_TIMEOUT_MS  default 30000; how long to wait for each health route
//
// Writes <project>/deploy-status.json (gitignored) and exits 1 if pm2 fails
// or a health check does not pass in time.

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const PROJECT_DIR = path.resolve(__dirname, "..");
const ECOSYSTEM = path.join(PROJECT_DIR, "ecosystem.config.js");
const STATUS_FILE = path.join(PROJECT_DIR, "deploy-status.json");
const HEALTH_TIMEOUT_MS = parseInt(process.env.HEALTH_TIMEOUT_MS || "30000", 10);

const HEALTH_URLS = {
  "thejesuswebsite-api": "http://127.0.0.1:3000/health",
  "thejesuswebsite-mcp": "http://127.0.0.1:3100/health",
  "thejesuswebsite-vector-sidecar": "http://127.0.0.1:8901/health",
};

// pm2 copies the caller's env into the process with --update-env, and a new
// `pm2 start` also uses it. When this script runs from inside the API process,
// that env holds the loaded .env (PORT=3000) and pm2's own pm_* variables.
// Give pm2 only what it needs to find its daemon.
function pm2Env() {
  const env = {};
  for (const key of ["PATH", "HOME", "PM2_HOME", "USER", "LANG"]) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  return env;
}

function pm2(args) {
  console.log(`[pm2-apply] pm2 ${args.join(" ")}`);
  const result = spawnSync("pm2", args, {
    cwd: PROJECT_DIR,
    env: pm2Env(),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return result.status;
}

function gitCommit() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: PROJECT_DIR,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function writeStatus(status) {
  const record = {
    id: process.env.DEPLOY_ID || null,
    commit: gitCommit(),
    updatedAt: new Date().toISOString(),
    ...status,
  };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(record, null, 2) + "\n");
}

function getOnce(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200 ? null : `HTTP ${res.statusCode}`);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve(err.message));
  });
}

async function waitHealthy(name, url) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let lastError = "not checked";
  while (Date.now() < deadline) {
    lastError = await getOnce(url);
    if (lastError === null) return { name, url, ok: true };
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { name, url, ok: false, error: lastError };
}

async function main() {
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx === -1 ? null : process.argv[onlyIdx + 1];

  const { apps } = require(ECOSYSTEM);
  const names = apps.map((a) => a.name).filter((n) => !only || n === only);
  if (only && names.length === 0) {
    throw new Error(`${only} is not in ecosystem.config.js (sidecar venv missing?)`);
  }

  writeStatus({ state: "running", apps: names });

  for (const name of names) {
    // Fails when the process does not exist yet. That is fine.
    pm2(["delete", name]);
  }
  const startArgs = ["start", ECOSYSTEM];
  if (only) startArgs.push("--only", only);
  if (pm2(startArgs) !== 0) throw new Error("pm2 start failed");
  if (pm2(["save"]) !== 0) throw new Error("pm2 save failed");

  const checks = await Promise.all(names.map((n) => waitHealthy(n, HEALTH_URLS[n])));
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`[pm2-apply] health ${c.name}: ${c.ok ? "ok" : `FAILED (${c.error})`}`);
  }

  writeStatus({ state: failed.length ? "failed" : "ok", apps: names, checks });
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(`[pm2-apply] FAILED: ${err.message}`);
  try {
    writeStatus({ state: "failed", error: err.message });
  } catch (_e) {
    // Nothing more to do; the exit code still reports the failure.
  }
  process.exit(1);
});
