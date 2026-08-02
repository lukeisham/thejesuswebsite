// Deploy webhook auth-gate tests — verifies POST /deploy-webhook rejects
// requests without a valid X-Deploy-Token before ever reaching the
// git-reset/deploy.sh spawn. The actual deploy spawn (success path) is not
// exercised here — it would really run git/deploy.sh — so only the auth gate
// is unit-tested; the execution path is covered by the one-time manual VPS
// deploy plus real CI runs.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const { closeTestServer } = require("./helpers/test-server");

function makeRequest(app, path, { token } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const headers = {};
      if (token !== undefined) headers["X-Deploy-Token"] = token;

      const req = http.request(
        { hostname: "localhost", port, path, method: "POST", headers },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            closeTestServer(server).then(() => {
              try {
                resolve({ status: res.statusCode, body: JSON.parse(data) });
              } catch (_e) {
                resolve({ status: res.statusCode, body: data });
              }
            });
          });
        },
      );
      req.on("error", (e) => {
        closeTestServer(server).then(() => reject(e));
      });
      req.end();
    });
  });
}

describe("POST /deploy-webhook", () => {
  let originalSecret;

  beforeEach(() => {
    originalSecret = process.env.DEPLOY_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.DEPLOY_WEBHOOK_SECRET;
    } else {
      process.env.DEPLOY_WEBHOOK_SECRET = originalSecret;
    }
  });

  function buildApp() {
    delete require.cache[require.resolve("../routes/deploy-webhook")];
    const app = express();
    app.use("/deploy-webhook", require("../routes/deploy-webhook"));
    return app;
  }

  test("503 when DEPLOY_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.DEPLOY_WEBHOOK_SECRET;
    const app = buildApp();
    const res = await makeRequest(app, "/deploy-webhook", { token: "anything" });
    assert.equal(res.status, 503);
  });

  test("401 when no token is provided", async () => {
    process.env.DEPLOY_WEBHOOK_SECRET = "correct-horse-battery-staple";
    const app = buildApp();
    const res = await makeRequest(app, "/deploy-webhook");
    assert.equal(res.status, 401);
  });

  test("401 when the token is wrong (same length)", async () => {
    process.env.DEPLOY_WEBHOOK_SECRET = "correct-horse-battery-staple";
    const app = buildApp();
    const res = await makeRequest(app, "/deploy-webhook", {
      token: "wrong-horse-battery-staplex",
    });
    assert.equal(res.status, 401);
  });

  test("401 when the token is wrong (different length)", async () => {
    process.env.DEPLOY_WEBHOOK_SECRET = "correct-horse-battery-staple";
    const app = buildApp();
    const res = await makeRequest(app, "/deploy-webhook", { token: "short" });
    assert.equal(res.status, 401);
  });
});
