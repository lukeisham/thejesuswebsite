// POST /deploy-webhook — triggers a VPS deploy over HTTPS.
//
// Exists because inbound SSH (port 22) from GitHub-hosted Actions runners is
// unreliable on this host (see setup/Issues.md) while HTTPS (443) is not.
// The GitHub Actions workflow calls this route instead of SSHing in.
//
// deploy.sh's own pm2-restart step would kill this very Express process
// mid-response (it's the process serving this request), so the git-reset +
// deploy.sh sequence below runs with SKIP_RESTART=1 — its exit code still
// reflects the real build/migration/import steps, which is what actually
// tends to fail. The restart is issued separately, only after the HTTP
// response has finished sending, as a detached process that survives this
// one dying.
//
// Auth: a shared secret sent as X-Deploy-Token, compared with
// crypto.timingSafeEqual (lib/deploy-token.js, same pattern as
// routes/passkey.js).
//
// One deploy at a time (issue #244): while a deploy runs, a second POST gets
// 409. Two deploy.sh runs at the same time would both hold the CPU and the
// SQLite write lock. After a good deploy the lock stays set until the restart
// kills this process. RESTART_LOCK_MS clears it if the restart does not
// happen, so a failed restart cannot block all later deploys.

const express = require("express");
const crypto = require("crypto");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { isAuthorized } = require("../lib/deploy-token");

const router = express.Router();

const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const LOG_FILE = path.join(PROJECT_DIR, "deploy-webhook.log");
const RESTART_LOCK_MS = 3 * 60 * 1000;

let deployInProgress = false;

function logToFile(message) {
  fs.appendFileSync(LOG_FILE, message);
}

// Restarts pm2 from ecosystem.config.js and runs the health checks
// (scripts/pm2-apply.js). Only called after the HTTP response has finished
// sending — see the 'finish' handler below.
//
// The outer bash puts the node script in the background and exits at once, so
// the script is no longer a child of this API process. pm2 kills the whole
// process tree of the API when it stops it, and it would otherwise kill the
// script half-way. The script writes straight to the log file, not to a pipe
// into this process, because this process is about to die.
function restartServers(deployId) {
  const logFd = fs.openSync(LOG_FILE, "a");
  fs.writeSync(logFd, `\n--- restart ${new Date().toISOString()} id=${deployId} ---\n`);
  const restart = spawn(
    "bash",
    ["-c", "node scripts/pm2-apply.js || echo \"[pm2-apply] exit=$?\" &"],
    {
      cwd: PROJECT_DIR,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, DEPLOY_ID: deployId },
    },
  );
  fs.closeSync(logFd);
  restart.unref();
}

router.post("/", (req, res) => {
  if (!process.env.DEPLOY_WEBHOOK_SECRET) {
    console.error(
      "POST /deploy-webhook: DEPLOY_WEBHOOK_SECRET is not set — refusing all requests.",
    );
    return res.status(503).json({ error: "Deploy webhook not configured." });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (deployInProgress) {
    return res.status(409).json({ error: "A deploy is already in progress." });
  }
  deployInProgress = true;

  const child = spawn(
    "bash",
    [
      "-c",
      "set -euo pipefail; git fetch origin main && git reset --hard origin/main && SKIP_RESTART=1 PROCESS_MANAGER=pm2 ./deploy.sh",
    ],
    { cwd: PROJECT_DIR },
  );

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });

  child.on("error", (err) => {
    deployInProgress = false;
    logToFile(
      `\n--- deploy ${new Date().toISOString()} spawn error ---\n${err.stack}\n`,
    );
    if (!res.headersSent) {
      res.status(500).json({ status: "failed", error: err.message, output });
    }
  });

  child.on("close", (code) => {
    logToFile(
      `\n--- deploy ${new Date().toISOString()} exit=${code} ---\n${output}\n`,
    );
    if (code !== 0) {
      deployInProgress = false;
    } else {
      setTimeout(() => {
        deployInProgress = false;
      }, RESTART_LOCK_MS).unref();
    }
    if (res.headersSent) return;

    if (code !== 0) {
      res.status(500).json({ status: "failed", exitCode: code, output });
      return;
    }

    // Restart only after the response has actually finished sending — this
    // process is about to be killed by that restart. The caller polls
    // GET /deploy-status for this deployId to learn the restart and health
    // check result (routes/deploy-status.js).
    const deployId = crypto.randomUUID();
    res.once("finish", () => {
      setTimeout(() => restartServers(deployId), 250);
    });
    res.status(200).json({ status: "ok", deployId, output });
  });
});

module.exports = router;
