// Identifiers route tests — uses node:test + node:assert.
// Minimum coverage proving the API-3 registry conversion: the 404 registry
// shape (E-PERSIST-004). No create-validation case exists to test — the
// route has no required-field check on POST /identifiers (pre-existing gap,
// out of scope for the API-3 sweep).

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

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/identifiers");
  delete require.cache[routePath];

  app.use("/identifiers", require("../routes/identifiers"));
  return app;
}

function request(app, { method, path: reqPath, headers }) {
  return createTestServer(app).then(
    ({ server, port }) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          { hostname: "127.0.0.1", port, path: reqPath, method, headers },
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

        req.end();
      }),
  );
}

beforeEach(() => {
  clearAuthSessions();
});

describe("GET /identifiers/:id", () => {
  test("returns 404 with E-PERSIST-004 for an unknown id", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/identifiers/999999",
    });

    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "E-PERSIST-004");
  });
});
