// Site Settings route tests — uses node:test + node:assert.
// Tests GET /site-settings (public), PUT /site-settings (auth-guarded),
// and the 400/401 error paths.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory test database ─────────────────────────────────────────────────

const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const requireAuth = require("../middleware/auth");

// ── Helpers ─────────────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/site-settings");
  delete require.cache[routePath];

  app.use("/site-settings", require("../routes/site-settings"));
  return app;
}

function request(app, { method, path: reqPath, body, headers }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    const { port } = server.address();

    const bodyStr = body !== undefined ? JSON.stringify(body) : "";
    const reqHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      ...headers,
    };

    const req = http.request(
      { hostname: "127.0.0.1", port, path: reqPath, method, headers: reqHeaders },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      },
    );

    req.on("error", (err) => {
      server.close();
      reject(err);
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function authCookie() {
  return `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;
}

// ── GET /site-settings ────────────────────────────────────────────────────────

describe("GET /site-settings", () => {
  test("returns 200 with title, description, og_image keys (no auth required)", async () => {
    const app = createApp();
    const result = await request(app, { method: "GET", path: "/site-settings" });

    assert.equal(result.status, 200);
    assert.ok("title" in result.body);
    assert.ok("description" in result.body);
    assert.ok("og_image" in result.body);
  });
});

// ── PUT /site-settings ────────────────────────────────────────────────────────

describe("PUT /site-settings", () => {
  test("returns 401 without auth", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "PUT",
      path: "/site-settings",
      body: { title: "Should Not Apply" },
    });

    assert.equal(result.status, 401);
  });

  test("returns 400 with an empty body", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "PUT",
      path: "/site-settings",
      body: {},
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 400);
  });

  test("returns 200 and persists a valid payload", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "PUT",
      path: "/site-settings",
      body: {
        title: "Route Test Title",
        description: "Route test description.",
        og_image: "https://example.com/route-test.jpg",
      },
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.title, "Route Test Title");
    assert.equal(result.body.description, "Route test description.");
    assert.equal(result.body.og_image, "https://example.com/route-test.jpg");

    const follow = await request(app, { method: "GET", path: "/site-settings" });
    assert.equal(follow.body.title, "Route Test Title");

    // Restore defaults for any later test file relying on the seeded row.
    await request(app, {
      method: "PUT",
      path: "/site-settings",
      body: {
        title: "The Jesus Website",
        description:
          "A comprehensive survey of the historical evidence for Jesus the Messiah, presenting about 300 historical data points from the four gospels.",
        og_image:
          "https://thejesuswebsite.org/assets/images/jesus_walking_on_water.jpg",
      },
      headers: { cookie: authCookie() },
    });
  });
});
