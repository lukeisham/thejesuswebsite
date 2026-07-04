// Public rate-limit tests — uses node:test + node:assert.
// Tests that the public-read limiter and search-specific limiter return 429
// after their thresholds, and that /health is never limited.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const rateLimit = require("../middleware/rate-limit");
const http = require("http");

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a test app with a known set of rate-limited routes.
 * Uses small thresholds so tests run fast without firing hundreds of requests.
 */
function createApp({ readMax = 5, searchMax = 3 } = {}) {
  const app = express();

  const publicReadLimit = rateLimit({
    maxAttempts: readMax,
    windowMs: 60_000,
  });

  // A sample public content endpoint using the shared read limiter.
  app.get("/evidence", publicReadLimit, (req, res) => {
    res.json({ ok: true });
  });

  // Search with its own tighter limit (mounted after the shared one).
  const searchLimit = rateLimit({
    maxAttempts: searchMax,
    windowMs: 60_000,
  });
  app.get("/search", publicReadLimit, searchLimit, (req, res) => {
    res.json({ results: [] });
  });

  // Health — never limited (uptime monitor).
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

/**
 * Make an HTTP GET request and return { status, body }.
 */
function get(app, path) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    const { port } = server.address();

    const req = http.request(
      { hostname: "127.0.0.1", port, path, method: "GET" },
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

    req.end();
  });
}

/**
 * Fire `count` sequential GET requests and return the final { status, body }.
 */
async function burst(app, path, count) {
  let last;
  for (let i = 0; i < count; i++) {
    last = await get(app, path);
  }
  return last;
}

// ── Public read limiter ─────────────────────────────────────────────────────

describe("public read rate limiter", () => {
  test("returns 429 after exceeding the read budget", async () => {
    const app = createApp({ readMax: 5 });

    // First 5 requests should succeed (200).
    for (let i = 0; i < 5; i++) {
      const res = await get(app, "/evidence");
      assert.equal(res.status, 200, `request ${i + 1} should be 200`);
    }

    // Request 6 should be 429.
    const over = await get(app, "/evidence");
    assert.equal(over.status, 429);
    assert.ok(over.body.error);
  });
});

// ── Search limiter ──────────────────────────────────────────────────────────

describe("search rate limiter", () => {
  test("returns 429 from the tighter search limit before the shared budget is exhausted", async () => {
    const app = createApp({ readMax: 10, searchMax: 3 });

    // First 3 search requests should succeed (200).
    for (let i = 0; i < 3; i++) {
      const res = await get(app, "/search");
      assert.equal(res.status, 200, `request ${i + 1} should be 200`);
    }

    // Request 4 should hit the search-specific limit (429) even though
    // the shared read budget (10) is not yet exhausted.
    const over = await get(app, "/search");
    assert.equal(over.status, 429);
    assert.ok(over.body.error);
  });

  test("search limit is independent — evidence still works after search is exhausted", async () => {
    const app = createApp({ readMax: 10, searchMax: 2 });

    // Exhaust the search limit.
    await burst(app, "/search", 2);
    const search429 = await get(app, "/search");
    assert.equal(search429.status, 429);

    // Evidence (shared read budget, not search) should still work.
    const evidence = await get(app, "/evidence");
    assert.equal(evidence.status, 200);
  });
});

// ── Health endpoint is never limited ────────────────────────────────────────

describe("/health is never rate-limited", () => {
  test("returns 200 even after many requests", async () => {
    const app = createApp({ readMax: 2 });

    // Fire more than the read budget at /health — it has no limiter.
    for (let i = 0; i < 10; i++) {
      const res = await get(app, "/health");
      assert.equal(res.status, 200, `request ${i + 1} should be 200`);
    }
  });
});
