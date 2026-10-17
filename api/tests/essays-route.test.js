// Essays route tests — uses node:test + node:assert.
// Minimum coverage proving the API-3 registry conversion: a 404 case and the
// create-validation 400 case both return { error: { code, message } }.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");
const { createTestServer, closeTestServer } = require("./helpers/test-server");
const { clearAuthSessions } = require("./helpers/test-setup");

const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const requireAuth = require("../middleware/auth");

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/essays");
  delete require.cache[routePath];

  app.use("/essays", require("../routes/essays"));
  return app;
}

function request(app, { method, path: reqPath, body, headers }) {
  return createTestServer(app).then(
    ({ server, port }) =>
      new Promise((resolve, reject) => {
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

        if (bodyStr) req.write(bodyStr);
        req.end();
      }),
  );
}

function authCookie() {
  return `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;
}

beforeEach(() => {
  clearAuthSessions();
});

describe("GET /essays/:slug", () => {
  test("returns 404 with E-PERSIST-004 for an unknown slug", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/essays/does-not-exist",
    });

    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "E-PERSIST-004");
  });
});

describe("POST /essays", () => {
  test("returns 400 with E-INPUT-001 when slug is missing", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/essays",
      body: {},
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-001");
  });
});

describe("/essays journal article fields validation", () => {
  test("POST with a too-long abstract returns 400 E-INPUT-022 naming abstract", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/essays",
      body: { slug: "essay-long", abstract: "a".repeat(2001) },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-022");
    assert.equal(result.body.error.context.field, "abstract");
  });

  test("PUT with a blank footnote returns 400 E-INPUT-038", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/essays/1",
      body: { footnotes: [{ content: "  " }] },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "footnotes[0].content");
  });

  test("PUT with a strength key returns 400 E-INPUT-038 (strength is for responses only)", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/essays/1",
      body: { strength: 3 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "strength");
  });

  test("POST with a valid abstract and footnotes returns 201 with both saved", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/essays",
      body: {
        slug: "essay-ok",
        abstract: "A fine abstract.",
        footnotes: [{ content: "Note one." }],
      },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.abstract, "A fine abstract.");
    assert.equal(result.body.footnotes[0].content, "Note one.");
  });

  test("POST with the same bad body and no session cookie returns 401", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/essays",
      body: { slug: "essay-anon", abstract: "a".repeat(2001) },
    });
    assert.equal(result.status, 401);
  });
});
