// Security headers tests — uses node:test + node:assert.
// Tests that public GET responses are cacheable, and that error responses
// (status 400 and up, except 404) carry no-store so a shared cache never keeps them.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const securityHeaders = require("../middleware/security-headers");
const rateLimit = require("../middleware/rate-limit");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// ── Helpers ─────────────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(securityHeaders);

  app.get("/ok", (req, res) => res.json({ ok: true }));
  app.get("/missing", (req, res) => res.status(404).json({ error: "missing" }));
  app.get("/bad-input", (req, res) => res.status(400).json({ error: "bad" }));
  app.get("/boom", (req, res) => res.status(500).json({ error: "boom" }));
  app.get("/limited", rateLimit({ maxAttempts: 1, windowMs: 60_000 }), (req, res) =>
    res.json({ ok: true }),
  );
  app.get("/coded-error", (req, res) => sendError(res, ERRORS.RATE_LIMITED));
  app.post("/write", (req, res) => res.json({ ok: true }));

  return app;
}

/** Make a request and return { status, cacheControl }. */
async function request(method, urlPath) {
  const { server, port } = await createTestServer(createApp());
  try {
    return await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, path: urlPath, method },
        (res) => {
          res.resume();
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              cacheControl: res.headers["cache-control"],
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    });
  } finally {
    await closeTestServer(server);
  }
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("securityHeaders Cache-Control", () => {
  test("200 GET is cacheable for 60 seconds", async () => {
    const res = await request("GET", "/ok");
    assert.equal(res.status, 200);
    assert.equal(res.cacheControl, "public, max-age=60");
  });

  test("404 GET stays cacheable", async () => {
    const res = await request("GET", "/missing");
    assert.equal(res.status, 404);
    assert.equal(res.cacheControl, "public, max-age=60");
  });

  test("400 GET is no-store", async () => {
    const res = await request("GET", "/bad-input");
    assert.equal(res.status, 400);
    assert.equal(res.cacheControl, "no-store");
  });

  test("500 GET is no-store", async () => {
    const res = await request("GET", "/boom");
    assert.equal(res.status, 500);
    assert.equal(res.cacheControl, "no-store");
  });

  test("429 from sendError is no-store", async () => {
    const res = await request("GET", "/coded-error");
    assert.equal(res.status, 429);
    assert.equal(res.cacheControl, "no-store");
  });

  test("429 from the real rate limiter is no-store", async () => {
    // One app, two requests: the first passes, the second is limited.
    const { server, port } = await createTestServer(createApp());
    try {
      const get = () =>
        new Promise((resolve, reject) => {
          http
            .get({ hostname: "127.0.0.1", port, path: "/limited" }, (res) => {
              res.resume();
              res.on("end", () =>
                resolve({
                  status: res.statusCode,
                  cacheControl: res.headers["cache-control"],
                }),
              );
            })
            .on("error", reject);
        });
      const first = await get();
      const second = await get();
      assert.equal(first.status, 200);
      assert.equal(first.cacheControl, "public, max-age=60");
      assert.equal(second.status, 429);
      assert.equal(second.cacheControl, "no-store");
    } finally {
      await closeTestServer(server);
    }
  });

  test("POST is no-store", async () => {
    const res = await request("POST", "/write");
    assert.equal(res.cacheControl, "no-store");
  });
});
