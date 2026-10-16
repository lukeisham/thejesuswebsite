// Shared X-Deploy-Token check for the deploy routes (routes/deploy-webhook.js
// and routes/deploy-status.js). Compares with crypto.timingSafeEqual, same
// pattern as routes/passkey.js. Always false when DEPLOY_WEBHOOK_SECRET is not
// set.

const crypto = require("crypto");

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

module.exports = { isAuthorized };
