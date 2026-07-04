// Analytics route tests — uses node:test + node:assert.
// Tests input validation on POST /analytics, specifically that a non-string
// `page` field returns 400 instead of 500.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal Express app with JSON parsing and the analytics router mounted.
 */
function createApp() {
  const app = express();
  app.use(express.json());

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

    const bodyStr = typeof body === "string" ? body : JSON.stringify(body || {});
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
});
