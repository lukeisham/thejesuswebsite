// Drafts route tests — uses node:test + node:assert.
// Minimum coverage proving the API-3 registry conversion: GET /drafts and
// GET /drafts/counts both return E-PERSIST-002 on a forced model failure.

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
const draftsModel = require("../models/drafts.model");

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/drafts");
  delete require.cache[routePath];

  app.use("/drafts", require("../routes/drafts"));
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

function authCookie() {
  return `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;
}

beforeEach(() => {
  clearAuthSessions();
});

describe("GET /drafts", () => {
  test("returns 500 with E-PERSIST-002 on a forced model failure", async () => {
    const original = draftsModel.getAllDrafts;
    draftsModel.getAllDrafts = () => {
      throw new Error("forced failure for test");
    };
    try {
      const result = await request(createApp(), {
        method: "GET",
        path: "/drafts",
        headers: { cookie: authCookie() },
      });

      assert.equal(result.status, 500);
      assert.equal(result.body.error.code, "E-PERSIST-002");
    } finally {
      draftsModel.getAllDrafts = original;
    }
  });
});

describe("GET /drafts/counts", () => {
  test("returns 500 with E-PERSIST-002 on a forced model failure", async () => {
    const original = draftsModel.getDraftCounts;
    draftsModel.getDraftCounts = () => {
      throw new Error("forced failure for test");
    };
    try {
      const result = await request(createApp(), {
        method: "GET",
        path: "/drafts/counts",
        headers: { cookie: authCookie() },
      });

      assert.equal(result.status, 500);
      assert.equal(result.body.error.code, "E-PERSIST-002");
    } finally {
      draftsModel.getDraftCounts = original;
    }
  });
});
