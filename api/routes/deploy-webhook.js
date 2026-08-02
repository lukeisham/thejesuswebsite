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
// crypto.timingSafeEqual (same pattern as routes/passkey.js).

const express = require("express");
const crypto = require("crypto");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const PROJECT_DIR = path.resolve(__dirname, "..", "..");
const LOG_FILE = path.join(PROJECT_DIR, "deploy-webhook.log");

function isAuthorized(req) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) return false;

  const provided = req.get("X-Deploy-Token") || "";
  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(secret);

  return (
    providedBuf.length === secretBuf.length &&
    crypto.timingSafeEqual(providedBuf, secretBuf)
  );
}

function logToFile(message) {
  fs.appendFileSync(LOG_FILE, message);
}

// Restarts pm2 as a detached, unref'd process so it outlives this one (it is
// about to be killed by the very restart it issues). Only called after the
// HTTP response has finished sending — see the 'finish' handler below.
function restartServers() {
  const restart = spawn(
    "bash",
    ["-c", "pm2 restart thejesuswebsite-api && pm2 restart thejesuswebsite-mcp && pm2 save"],
    { cwd: PROJECT_DIR, detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let restartOutput = "";
  restart.stdout.on("data", (chunk) => {
    restartOutput += chunk;
  });
  restart.stderr.on("data", (chunk) => {
    restartOutput += chunk;
  });
  restart.on("close", (code) => {
    logToFile(
      `--- restart ${new Date().toISOString()} exit=${code} ---\n${restartOutput}\n`,
    );
  });
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
    if (res.headersSent) return;

    if (code !== 0) {
      res.status(500).json({ status: "failed", exitCode: code, output });
      return;
    }

    // Restart only after the response has actually finished sending — this
    // process is about to be killed by that restart.
    res.once("finish", () => {
      setTimeout(restartServers, 250);
    });
    res.status(200).json({ status: "ok", output });
  });
});

module.exports = router;
