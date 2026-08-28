// Auth route tests — uses node:test + node:assert.
// Covers GET /auth/me and POST /auth/logout at the HTTP layer (the existing
// auth.test.js only tests the session-store/middleware layer directly).
// Proves the API-3 registry conversion: forced session-store failures return
// E-PERSIST-002, and the deliberately-untouched 401 {authenticated:false}
// shape on GET /auth/me is unchanged.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");

const auth = require("../middleware/auth");

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/auth");
  delete require.cache[routePath];

  app.use("/auth", require("../routes/auth"));
  return app;
}

function request(app, { method, path: reqPath, headers }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        { hostname: "127.0.0.1", port, path: reqPath, method, headers },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close(() => {
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
        server.close(() => reject(err));
      });
      req.end();
    });
  });
}

function authCookie() {
  return `sid=${encodeURIComponent(auth.createSession("test"))}`;
}

beforeEach(() => {
  auth.clearSessions();
});

describe("GET /auth/me", () => {
  test("returns 401 {authenticated:false} with no session — unchanged by this plan", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/auth/me",
    });

    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { authenticated: false });
  });

  test("returns 500 with E-PERSIST-002 on a forced session-store failure", async () => {
    const original = auth.getSession;
    auth.getSession = () => {
      throw new Error("forced failure for test");
    };
    try {
      const result = await request(createApp(), {
        method: "GET",
        path: "/auth/me",
        headers: { cookie: authCookie() },
      });

      assert.equal(result.status, 500);
      assert.equal(result.body.error.code, "E-PERSIST-002");
    } finally {
      auth.getSession = original;
    }
  });
});

describe("POST /auth/logout", () => {
  test("returns 500 with E-PERSIST-002 on a forced session-store failure", async () => {
    const original = auth.destroySession;
    auth.destroySession = () => {
      throw new Error("forced failure for test");
    };
    try {
      const result = await request(createApp(), {
        method: "POST",
        path: "/auth/logout",
        headers: { cookie: authCookie() },
      });

      assert.equal(result.status, 500);
      assert.equal(result.body.error.code, "E-PERSIST-002");
    } finally {
      auth.destroySession = original;
    }
  });
});
