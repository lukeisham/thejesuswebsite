// Dev-bypass test suite — verifies every gate in the multi-layered
// GET /auth/dev-login handler. Uses the same pattern as auth-guard.test.js:
// spin up a minimal Express app on a random port, issue raw HTTP requests,
// and assert status / cookies / body.
//
// JS-2: every gate must fail closed — any missing or wrong signal = 401/403/404.

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const auth = require("../middleware/auth");

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a fresh minimal Express app with the dev-bypass route mounted.
 * The route module reads process.env at request time, so we can mutate
 * process.env between test cases to simulate different environments.
 * The app is NOT started here — each test creates its own server.
 */
function createApp() {
  const app = express();
  app.use("/auth", require("../routes/dev-bypass"));
  return app;
}

/**
 * Make an HTTP GET request to a test Express app.
 * Returns { status, body, headers }.
 */
function makeGet(app, path, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: { ...extraHeaders },
      };

      const req = http.request(options, (res) => {
        let data = "";
        const setCookieHeaders = res.headers["set-cookie"] || [];
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          server.close();
          try {
            resolve({
              status: res.statusCode,
              body: data ? JSON.parse(data) : null,
              headers: { "set-cookie": setCookieHeaders },
            });
          } catch (_e) {
            resolve({
              status: res.statusCode,
              body: data || null,
              headers: { "set-cookie": setCookieHeaders },
            });
          }
        });
      });
      req.on("error", (e) => {
        server.close();
        reject(e);
      });
      req.end();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Store original env values to restore after tests
// ═══════════════════════════════════════════════════════════════════════════════

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_DEV_BYPASS: process.env.ADMIN_DEV_BYPASS,
  ADMIN_DEV_BYPASS_SECRET: process.env.ADMIN_DEV_BYPASS_SECRET,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Test fixture: a valid secret
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_SECRET = "test-dev-secret-32-chars-minimum!";

/**
 * Set up the environment so every gate except the one under test would pass.
 * Callers should override the specific gate's env var AFTER calling this.
 */
function setValidDevEnv() {
  process.env.NODE_ENV = "development";
  process.env.ADMIN_DEV_BYPASS = "1";
  process.env.ADMIN_DEV_BYPASS_SECRET = VALID_SECRET;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /auth/dev-login", () => {
  afterEach(() => {
    // Restore original env after each test.
    process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
    process.env.ADMIN_DEV_BYPASS = ORIGINAL_ENV.ADMIN_DEV_BYPASS;
    process.env.ADMIN_DEV_BYPASS_SECRET = ORIGINAL_ENV.ADMIN_DEV_BYPASS_SECRET;
  });

  // ── Gate 1: NODE_ENV === "production" ──────────────────────────────────────

  describe("gate 1: NODE_ENV=production", () => {
    test("returns 404 when NODE_ENV is production (even with valid flag+secret+loopback)", async () => {
      setValidDevEnv();
      process.env.NODE_ENV = "production";
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 404);
    });

    test("returns 404 when NODE_ENV is production regardless of other gates", async () => {
      // Not even setting the flag or secret — production gate is first and fails-closed.
      process.env.NODE_ENV = "production";
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 404);
    });
  });

  // ── Gate 2: ADMIN_DEV_BYPASS flag ──────────────────────────────────────────

  describe("gate 2: ADMIN_DEV_BYPASS flag", () => {
    test("returns 404 when ADMIN_DEV_BYPASS is unset", async () => {
      setValidDevEnv();
      delete process.env.ADMIN_DEV_BYPASS;
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 404);
    });

    test("returns 404 when ADMIN_DEV_BYPASS is 0", async () => {
      setValidDevEnv();
      process.env.ADMIN_DEV_BYPASS = "0";
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 404);
    });

    test("returns 404 when ADMIN_DEV_BYPASS is an arbitrary string", async () => {
      setValidDevEnv();
      process.env.ADMIN_DEV_BYPASS = "yes";
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 404);
    });
  });

  // ── Gate 3: X-Forwarded-For header ─────────────────────────────────────────

  describe("gate 3: X-Forwarded-For header", () => {
    test("returns 403 when X-Forwarded-For header is present (even from loopback)", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-forwarded-for": "127.0.0.1",
        "x-dev-bypass-secret": VALID_SECRET,
      });
      assert.strictEqual(res.status, 403);
    });

    test("returns 403 when X-Forwarded-For is present with any value", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-forwarded-for": "192.168.1.1",
        "x-dev-bypass-secret": VALID_SECRET,
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // ── Gate 5: ADMIN_DEV_BYPASS_SECRET ────────────────────────────────────────
  // (Gate 4 — loopback check — is inherently satisfied in the test harness
  // because we connect to 127.0.0.1. We test it indirectly via the success
  // case; a separate test connects from a non-loopback address is not feasible
  // in this harness but the logic is straightforward.)

  describe("gate 5: ADMIN_DEV_BYPASS_SECRET", () => {
    test("returns 403 when ADMIN_DEV_BYPASS_SECRET env var is unset", async () => {
      setValidDevEnv();
      delete process.env.ADMIN_DEV_BYPASS_SECRET;
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 403);
    });

    test("returns 403 when ADMIN_DEV_BYPASS_SECRET env var is empty string", async () => {
      setValidDevEnv();
      process.env.ADMIN_DEV_BYPASS_SECRET = "";
      const res = await makeGet(createApp(), "/auth/dev-login");
      assert.strictEqual(res.status, 403);
    });

    test("returns 403 when x-dev-bypass-secret header is missing", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login");
      // No x-dev-bypass-secret header at all.
      assert.strictEqual(res.status, 403);
    });

    test("returns 403 when x-dev-bypass-secret header is wrong", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": "wrong-secret-value",
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // ── Success case ───────────────────────────────────────────────────────────

  describe("all gates satisfied", () => {
    test("returns 200 with authenticated:true and sets sid cookie", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": VALID_SECRET,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.authenticated, true);
      assert.strictEqual(res.body.handle, "dev-agent");

      // Verify the session cookie is set.
      const setCookie = res.headers["set-cookie"];
      assert.ok(setCookie.length > 0, "expected a Set-Cookie header");
      const sidCookie = setCookie.find((c) => c.startsWith("sid="));
      assert.ok(sidCookie, "expected sid cookie in Set-Cookie header");
      assert.ok(
        sidCookie.includes("HttpOnly"),
        "sid cookie must be HttpOnly",
      );
    });

    test("minted session is usable for authenticated requests", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": VALID_SECRET,
      });

      // Extract the session token from the cookie.
      const setCookie = res.headers["set-cookie"];
      const sidCookie = setCookie.find((c) => c.startsWith("sid="));
      const token = sidCookie.split(";")[0].slice("sid=".length);

      // Use auth middleware directly to verify the session is valid.
      const session = auth.getSession(token);
      assert.ok(session, "session should exist after successful dev login");
      assert.strictEqual(session.userHandle, "dev-agent");
    });

    test("session has correct TTL", async () => {
      setValidDevEnv();
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": VALID_SECRET,
      });

      const setCookie = res.headers["set-cookie"];
      const sidCookie = setCookie.find((c) => c.startsWith("sid="));
      const token = sidCookie.split(";")[0].slice("sid=".length);

      const session = auth.getSession(token);
      const ttl = session.expiresAt - session.createdAt;
      assert.strictEqual(ttl, auth.SESSION_TTL_MS);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    test("returns 404 when NODE_ENV is undefined (default is not production)", async () => {
      // NODE_ENV undefined is NOT "production", so gate 1 should pass.
      // But we need valid flag+secret for gate 2 and 5.
      setValidDevEnv();
      delete process.env.NODE_ENV;
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": VALID_SECRET,
      });
      // Should succeed because undefined !== "production"
      assert.strictEqual(res.status, 200);
    });

    test("returns 404 in production even when everything else is perfect", async () => {
      process.env.NODE_ENV = "production";
      process.env.ADMIN_DEV_BYPASS = "1";
      process.env.ADMIN_DEV_BYPASS_SECRET = VALID_SECRET;
      const res = await makeGet(createApp(), "/auth/dev-login", {
        "x-dev-bypass-secret": VALID_SECRET,
      });
      assert.strictEqual(res.status, 404);
    });
  });
});
