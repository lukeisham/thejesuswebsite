// Evidence route tests (node:test + node:assert). Asserts that a PUT carrying
// null for an optional column clears it, so the evidence editor can empty a field.

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

  const routePath = require.resolve("../routes/evidence");
  delete require.cache[routePath];

  app.use("/evidence", require("../routes/evidence"));
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

describe("PUT /evidence/:id clears a field sent as null", () => {
  test("PUT with primary_verse null clears the stored primary_verse", async () => {
    const created = await request(createApp(), {
      method: "POST",
      path: "/evidence",
      body: { title: "Null clear", slug: "null-clear", primary_verse: "John 3:16", map_x: 12.5 },
      headers: { cookie: authCookie() },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.primary_verse, "John 3:16");

    const cleared = await request(createApp(), {
      method: "PUT",
      path: `/evidence/${created.body.id}`,
      body: { primary_verse: null, map_x: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.primary_verse, null);
    assert.equal(cleared.body.map_x, null);
  });
});
