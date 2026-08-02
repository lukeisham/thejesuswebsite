// POST /deploy-webhook — triggers a VPS deploy over HTTPS.
//
// Exists because inbound SSH (port 22) from GitHub-hosted Actions runners is
// unreliable on this host (see setup/Issues.md) while HTTPS (443) is not.
// The GitHub Actions workflow calls this route instead of SSHing in; the
// route runs the same git-reset + deploy.sh sequence the SSH step used to run,
// synchronously, so the workflow step still fails when the deploy fails.
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
      "set -euo pipefail; git fetch origin main && git reset --hard origin/main && PROCESS_MANAGER=pm2 ./deploy.sh",
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
    fs.appendFileSync(
      LOG_FILE,
      `\n--- deploy ${new Date().toISOString()} spawn error ---\n${err.stack}\n`,
    );
    if (!res.headersSent) {
      res.status(500).json({ status: "failed", error: err.message, output });
    }
  });

  child.on("close", (code) => {
    fs.appendFileSync(
      LOG_FILE,
      `\n--- deploy ${new Date().toISOString()} exit=${code} ---\n${output}\n`,
    );
    if (res.headersSent) return;
    if (code === 0) {
      res.status(200).json({ status: "ok", output });
    } else {
      res.status(500).json({ status: "failed", exitCode: code, output });
    }
  });
});

module.exports = router;
