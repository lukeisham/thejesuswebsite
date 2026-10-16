// GET /deploy-status — the result of the last pm2 restart + health check.
//
// The deploy webhook (routes/deploy-webhook.js) sends its HTTP response before
// it restarts pm2, so that response cannot say whether the new processes came
// up. scripts/pm2-apply.js writes the result to deploy-status.json. The GitHub
// Actions job polls this route for its own deployId and turns red when the
// state is "failed" or never reaches "ok".
//
// Auth: the same X-Deploy-Token as the webhook (lib/deploy-token.js).

const express = require("express");
const path = require("path");
const fs = require("fs");
const { isAuthorized } = require("../lib/deploy-token");

const router = express.Router();

const STATUS_FILE = path.resolve(__dirname, "..", "..", "deploy-status.json");

router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");

  if (!process.env.DEPLOY_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Deploy webhook not configured." });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  let status;
  try {
    status = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: "No deploy status yet." });
    }
    return res.status(500).json({ error: `Cannot read deploy status: ${err.message}` });
  }
  res.json(status);
});

module.exports = router;
