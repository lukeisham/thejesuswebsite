// Deploy status + ecosystem tests — GET /deploy-status must refuse callers
// without a valid X-Deploy-Token, and ecosystem.config.js must keep the crash
// limits on every pm2 process (issue #249).

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");

const { closeTestServer } = require("./helpers/test-server");

function makeRequest(app, urlPath, { token } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const headers = {};
      if (token !== undefined) headers["X-Deploy-Token"] = token;

      const req = http.request(
        { hostname: "localhost", port, path: urlPath, method: "GET", headers },
        (res) => {
          res.resume();
          res.on("end", () => {
            closeTestServer(server).then(() =>
              resolve({ status: res.statusCode, cache: res.headers["cache-control"] }),
            );
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

describe("GET /deploy-status", () => {
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
    delete require.cache[require.resolve("../routes/deploy-status")];
    const app = express();
    app.use("/deploy-status", require("../routes/deploy-status"));
    return app;
  }

  test("503 when DEPLOY_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.DEPLOY_WEBHOOK_SECRET;
    const res = await makeRequest(buildApp(), "/deploy-status", { token: "x" });
    assert.equal(res.status, 503);
  });

  test("401 when no token is provided, and never cached", async () => {
    process.env.DEPLOY_WEBHOOK_SECRET = "correct-horse-battery-staple";
    const res = await makeRequest(buildApp(), "/deploy-status");
    assert.equal(res.status, 401);
    assert.equal(res.cache, "no-store");
  });

  test("401 when the token is wrong", async () => {
    process.env.DEPLOY_WEBHOOK_SECRET = "correct-horse-battery-staple";
    const res = await makeRequest(buildApp(), "/deploy-status", {
      token: "wrong-horse-battery-staplex",
    });
    assert.equal(res.status, 401);
  });
});

describe("ecosystem.config.js", () => {
  const { apps } = require(path.join(__dirname, "..", "..", "ecosystem.config.js"));

  test("defines the API and MCP processes with absolute VPS paths", () => {
    const names = apps.map((a) => a.name);
    assert.ok(names.includes("thejesuswebsite-api"));
    assert.ok(names.includes("thejesuswebsite-mcp"));
    for (const app of apps) {
      assert.ok(app.cwd.startsWith("/var/www/thejesuswebsite"), app.name);
      assert.ok(app.script.startsWith("/var/www/thejesuswebsite"), app.name);
    }
  });

  test("every process has the crash limits", () => {
    for (const app of apps) {
      assert.equal(app.min_uptime, "10s", app.name);
      assert.equal(app.max_restarts, 10, app.name);
      assert.equal(app.exp_backoff_restart_delay, 1000, app.name);
    }
  });
});
