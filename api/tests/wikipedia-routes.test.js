// Wikipedia route tests — uses node:test + node:assert/strict.
// Verifies that every route returns encoded E-* error shapes rather than
// legacy { error: string } bodies (closes Issues.md #137 and #148).
//
// Stubs model, auth, rate-limit, and vector-sidecar modules so the tests
// exercise the route-level error-path logic without a real database or
// passkey session.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// ── Module stubs ─────────────────────────────────────────────────────────────

/** Stub a module at `relativePath` so require() returns `exports`. */
function stubModule(relativePath, exports) {
  const p = require.resolve(path.resolve(__dirname, "..", relativePath));
  Module._cache[p] = { id: p, filename: p, loaded: true, exports };
}

// Pass-through auth middleware (no session check).
stubModule("middleware/auth", (req, res, next) => next());

// Pass-through rate limiter factory.
stubModule("middleware/rate-limit", () => (req, res, next) => next());

// Vector sidecar stub — just needs to exist so the route module loads.
stubModule("lib/vector-sidecar-client", {
  queryFamily: async () => ({ label: "mock" }),
  VectorSidecarError: class extends Error {
    constructor(msg, code) {
      super(msg);
      this.errorCode = code;
    }
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal Express app with the wikipedia router mounted.
 * @param {object} modelStub - Stub for wikipediaModel methods.
 */
function createApp(modelStub) {
  stubModule("models/wikipedia.model", modelStub);

  // Clear route cache so it re-evaluates with our stubs.
  const routePath = require.resolve("../routes/wikipedia");
  delete require.cache[routePath];

  const app = express();
  app.use(express.json());
  app.use("/wikipedia", require("../routes/wikipedia"));
  return app;
}

/**
 * Make an HTTP request and return { status, body }.
 */
async function request(app, { method, path: reqPath, body, headers }) {
  const { server, port } = await createTestServer(app);
  return new Promise((resolve, reject) => {
    const bodyStr =
      typeof body === "string" ? body : JSON.stringify(body || {});
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
          closeTestServer(server).then(() => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
      },
    );

    req.on("error", (err) => {
      closeTestServer(server).then(() => reject(err));
    });

    req.write(bodyStr);
    req.end();
  });
}

// ── Error shape assertion ───────────────────────────────────────────────────

/**
 * Assert that the response body has the canonical E-* encoded error shape.
 * @param {object} body - Parsed response body.
 * @param {string} expectedCode - e.g. "E-502-01" for OBJECT_MAPPING_FAILURE.
 * @param {number} expectedStatus - HTTP status code.
 */
function assertEncodedError(body, expectedCode, expectedStatus) {
  assert.ok(body && typeof body === "object", "body should be an object");
  assert.ok(body.error, "body should have an error property");
  assert.equal(body.error.code, expectedCode, "error code mismatch");
  assert.ok(typeof body.error.message === "string", "error should have a message");
  // Legacy shape must not be present.
  assert.equal(
    "error" in body && typeof body.error === "string",
    false,
    "must not use legacy { error: string } shape",
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Wikipedia routes — encoded error shapes", () => {
  test("GET /:slug — returns E-PERSIST-004 when article not found", async () => {
    const app = createApp({
      getBySlug: () => undefined, // not found
    });
    const res = await request(app, {
      method: "GET",
      path: "/wikipedia/nonexistent",
    });
    assert.equal(res.status, 404);
    assertEncodedError(res.body, "E-PERSIST-004", 404); // SQL_RECORD_NOT_FOUND
  });

  test("POST / — returns E-INPUT-001 when slug is missing", async () => {
    const app = createApp({
      create: () => ({}),
    });
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia",
      body: {}, // no slug
    });
    assert.equal(res.status, 400);
    assertEncodedError(res.body, "E-INPUT-001", 400); // MISSING_BODY_FIELD
    assert.equal(res.body.error.context?.field, "slug");
  });

  test("PUT /:id — returns E-PERSIST-004 when article not found", async () => {
    const app = createApp({
      update: () => undefined, // not found
    });
    const res = await request(app, {
      method: "PUT",
      path: "/wikipedia/9999",
      body: { slug: "test" },
    });
    assert.equal(res.status, 404);
    assertEncodedError(res.body, "E-PERSIST-004", 404); // SQL_RECORD_NOT_FOUND
  });

  test("DELETE /:id — returns E-PERSIST-004 when article not found", async () => {
    const app = createApp({
      remove: () => false, // not found / nothing deleted
    });
    const res = await request(app, {
      method: "DELETE",
      path: "/wikipedia/9999",
    });
    assert.equal(res.status, 404);
    assertEncodedError(res.body, "E-PERSIST-004", 404); // SQL_RECORD_NOT_FOUND
  });

  test("GET / — returns E-TRANSFORM-013 on model failure", async () => {
    const app = createApp({
      getAllPublished: () => {
        throw new Error("DB down");
      },
    });
    const res = await request(app, {
      method: "GET",
      path: "/wikipedia",
    });
    assert.equal(res.status, 500);
    assertEncodedError(res.body, "E-TRANSFORM-013", 500); // OBJECT_MAPPING_FAILURE
  });

  test("DELETE / — returns E-TRANSFORM-013 on model failure", async () => {
    const app = createApp({
      deleteAll: () => {
        throw new Error("DB down");
      },
    });
    const res = await request(app, {
      method: "DELETE",
      path: "/wikipedia",
    });
    assert.equal(res.status, 500);
    assertEncodedError(res.body, "E-TRANSFORM-013", 500); // OBJECT_MAPPING_FAILURE
  });
});
