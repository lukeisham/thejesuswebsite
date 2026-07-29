// POST /wikipedia/signal-check route tests — uses node:test + node:assert.
// Mocks api/lib/vector-sidecar-client.js so no real sidecar process or
// network call is needed. Asserts: 200 with the sidecar's payload on success,
// 400 on missing/unwhitelisted family or missing text, correct E-PERSIST-026/
// 027 codes + HTTP status when the sidecar client throws, and 429 after
// exceeding the route's rate limit.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// ── Stub out the DB-backed model (signal-check doesn't touch it, but the
// route file requires wikipedia.model.js, which requires ../config at load
// time) ─────────────────────────────────────────────────────────────────────

const testDb = createTestDb();
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// ── Stub out the sidecar client so tests never touch the network ──────────

const clientPath = require.resolve("../lib/vector-sidecar-client");

class FakeVectorSidecarError extends Error {
  constructor(errorCode, message) {
    super(message);
    this.name = "VectorSidecarError";
    this.errorCode = errorCode;
  }
}

/** Installs a fake sidecar client implementation for one test. */
function stubSidecarClient(queryFamilyImpl) {
  delete Module._cache[clientPath];
  Module._cache[clientPath] = {
    id: clientPath,
    filename: clientPath,
    loaded: true,
    exports: {
      queryFamily: queryFamilyImpl,
      VectorSidecarError: FakeVectorSidecarError,
    },
  };
}

function freshRouter() {
  const routePath = require.resolve("../routes/wikipedia");
  delete Module._cache[routePath];
  return require("../routes/wikipedia");
}

function createApp(queryFamilyImpl) {
  stubSidecarClient(queryFamilyImpl);
  const app = express();
  app.use(express.json());
  app.use("/wikipedia", freshRouter());
  return app;
}

function request(app, { method, path: reqPath, body }) {
  return createTestServer(app).then(
    ({ server, port }) =>
      new Promise((resolve, reject) => {
        const bodyStr = body !== undefined ? JSON.stringify(body) : "";
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: reqPath,
            method,
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(bodyStr),
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              closeTestServer(server).then(() => {
                try {
                  resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (err) {
                  resolve({ status: res.statusCode, body: data });
                }
              });
            });
          },
        );
        req.on("error", (err) => closeTestServer(server).then(() => reject(err)));
        req.end(bodyStr);
      }),
  );
}

const SAMPLE_SIDECAR_RESPONSE = {
  family: "anti-supernatural",
  store: "anti-supernatural",
  k: 5,
  results: [{ id: "anti-sup-pos-001", type: "positive", similarity: 0.81 }],
  verdict: { label: "strong_fire", nearest_neighbour_type: "positive", similarity: 0.81 },
};

describe("POST /wikipedia/signal-check", () => {
  test("200 with the sidecar's payload on success", async () => {
    const app = createApp(async () => SAMPLE_SIDECAR_RESPONSE);
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia/signal-check",
      body: { family: "anti-supernatural", text: "Some paragraph text." },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, SAMPLE_SIDECAR_RESPONSE);
  });

  test("400 on an unwhitelisted family value", async () => {
    const app = createApp(async () => {
      throw new Error("should not be called");
    });
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia/signal-check",
      body: { family: "not-a-real-family", text: "Some paragraph text." },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "E-INPUT-001");
  });

  test("400 on missing text", async () => {
    const app = createApp(async () => {
      throw new Error("should not be called");
    });
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia/signal-check",
      body: { family: "anti-supernatural" },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "E-INPUT-001");
  });

  test("502 with E-PERSIST-026 when the sidecar is unreachable", async () => {
    const app = createApp(async () => {
      throw new FakeVectorSidecarError(
        "VECTOR_SIDECAR_UNREACHABLE",
        "connection refused",
      );
    });
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia/signal-check",
      body: { family: "register", text: "Some paragraph text." },
    });
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, "E-PERSIST-026");
  });

  test("504 with E-PERSIST-027 when the sidecar times out", async () => {
    const app = createApp(async () => {
      throw new FakeVectorSidecarError("VECTOR_SIDECAR_TIMEOUT", "timed out");
    });
    const res = await request(app, {
      method: "POST",
      path: "/wikipedia/signal-check",
      body: { family: "register", text: "Some paragraph text." },
    });
    assert.equal(res.status, 504);
    assert.equal(res.body.error.code, "E-PERSIST-027");
  });

  test("429 after exceeding the rate limit", async () => {
    const app = createApp(async () => SAMPLE_SIDECAR_RESPONSE);
    let lastStatus;
    // The route's limiter allows 20/min; fire past that against one app instance.
    for (let i = 0; i < 21; i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app, {
        method: "POST",
        path: "/wikipedia/signal-check",
        body: { family: "register", text: "Some paragraph text." },
      });
      lastStatus = res.status;
    }
    assert.equal(lastStatus, 429);
  });
});
