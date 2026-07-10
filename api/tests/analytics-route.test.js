// Analytics route tests — uses node:test + node:assert.
// Tests input validation on POST /analytics, device/geo enrichment,
// and aggregate endpoint response shapes.

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

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal Express app with JSON parsing and the analytics router mounted.
 */
function createApp() {
  const app = express();
  app.use(express.json());

  // Clear route cache so the module re-evaluates with the test DB
  const routePath = require.resolve("../routes/analytics");
  delete require.cache[routePath];

  const analyticsRouter = require("../routes/analytics");
  app.use("/analytics", analyticsRouter);

  return app;
}

/**
 * Make an HTTP request and return { status, body }.
 */
function request(app, { method, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    const { port } = server.address();

    const bodyStr =
      typeof body === "string" ? body : JSON.stringify(body || {});
    const reqHeaders = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
      ...headers,
    };

    const req = http.request(
      { hostname: "127.0.0.1", port, path, method, headers: reqHeaders },
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

    req.write(bodyStr);
    req.end();
  });
}

// ── POST /analytics input validation ─────────────────────────────────────────

describe("POST /analytics", () => {
  test("returns 400 when page is a number instead of a string", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: 12345 },
    });

    assert.equal(result.status, 400);
    assert.ok(result.body.error.includes("page"));
  });

  test("returns 400 when page is an object instead of a string", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: { path: "/foo" } },
    });

    assert.equal(result.status, 400);
    assert.ok(result.body.error.includes("page"));
  });

  test("returns 400 when page is an array instead of a string", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: ["/page1", "/page2"] },
    });

    assert.equal(result.status, 400);
    assert.ok(result.body.error.includes("page"));
  });

  test("returns 400 when page is null", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: null },
    });

    assert.equal(result.status, 400);
    assert.ok(result.body.error.includes("page"));
  });

  test("returns 400 when page is missing", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: {},
    });

    assert.equal(result.status, 400);
  });

  test("returns 204 when page is a valid string", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: "/evidence/single/test-slug" },
    });

    assert.equal(result.status, 204);
  });

  test("stores device_type, browser, and os from user-agent", async () => {
    const app = createApp();

    await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: "/device-test" },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });

    const row = testDb
      .prepare("SELECT device_type, browser, os FROM analytics WHERE page = ?")
      .get("/device-test");
    assert.ok(row);
    assert.equal(row.device_type, "desktop");
    assert.equal(row.browser, "Chrome");
    assert.equal(row.os, "macOS");
  });

  test("stores device info for iOS mobile Safari", async () => {
    const app = createApp();

    await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: "/ios-test" },
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
    });

    const row = testDb
      .prepare("SELECT device_type, browser, os FROM analytics WHERE page = ?")
      .get("/ios-test");
    assert.ok(row);
    assert.equal(row.device_type, "mobile");
    assert.equal(row.browser, "Safari");
    assert.equal(row.os, "iOS");
  });
});

// ── POST /analytics — geo enrichment ──────────────────────────────────────────

describe("POST /analytics — geo enrichment", () => {
  test("stores country as null when geoip_blocks table is empty", async () => {
    const app = createApp();

    await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: "/geo-empty-test" },
    });

    const row = testDb
      .prepare("SELECT country FROM analytics WHERE page = ?")
      .get("/geo-empty-test");
    assert.ok(row);
    assert.equal(row.country, null);
  });

  test("page view still records even when geo lookup fails", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "POST",
      path: "/analytics",
      body: { page: "/geo-graceful" },
    });

    // Should still be 204 even though geoip has no data
    assert.equal(result.status, 204);
  });
});

// ── GET /analytics/top-countries ──────────────────────────────────────────────

describe("GET /analytics/top-countries", () => {
  const requireAuth = require("../middleware/auth");

  test("returns correct shape when no country data exists", async () => {
    const app = createApp();
    const cookie = `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;

    const result = await request(app, {
      method: "GET",
      path: "/analytics/top-countries",
      headers: { cookie },
    });

    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.body));
  });

  test("returns 401 without auth", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "GET",
      path: "/analytics/top-countries",
    });

    assert.equal(result.status, 401);
  });
});

// ── GET /analytics/device-breakdown ───────────────────────────────────────────

describe("GET /analytics/device-breakdown", () => {
  const requireAuth = require("../middleware/auth");

  test("returns correct shape with device_types, browsers, and os arrays", async () => {
    const app = createApp();
    const cookie = `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;

    const result = await request(app, {
      method: "GET",
      path: "/analytics/device-breakdown",
      headers: { cookie },
    });

    assert.equal(result.status, 200);
    assert.ok(result.body.device_types);
    assert.ok(Array.isArray(result.body.device_types));
    assert.ok(result.body.browsers);
    assert.ok(Array.isArray(result.body.browsers));
    assert.ok(result.body.os);
    assert.ok(Array.isArray(result.body.os));
  });

  test("returns 401 without auth", async () => {
    const app = createApp();

    const result = await request(app, {
      method: "GET",
      path: "/analytics/device-breakdown",
    });

    assert.equal(result.status, 401);
  });
});
