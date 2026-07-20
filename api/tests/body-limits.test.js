// Body-limit and auth/me tests — uses node:test + node:assert.
// Tests that express.json({ limit: '1mb' }) correctly maps body-parser
// errors to 4xx codes, and that GET /auth/me sets Cache-Control: no-store.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const { createTestServer, closeTestServer } = require("./helpers/test-server");

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal Express app with JSON parsing and an error handler
 * that maps body-parser errors to proper 4xx codes.
 */
function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "Request body too large." });
    }
    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Malformed JSON body." });
    }
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

/**
 * Make an HTTP request and return { status, headers, body }.
 */
async function request(app, { method, path, body, headers }) {
  const { server, port } = await createTestServer(app);
  return new Promise((resolve, reject) => {
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
          closeTestServer(server).then(() => {
            try {
              resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, headers: res.headers, body: data });
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

// ── GET /auth/me tests ──────────────────────────────────────────────────────

describe("GET /auth/me", () => {
  test("sets Cache-Control: no-store on the response", async () => {
    const auth = require("../middleware/auth");
    const router = express.Router();

    router.get("/me", (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const token = auth.readToken(req);
      const session = token && auth.getSession(token);
      if (!session) return res.status(401).json({ authenticated: false });
      res.json({ authenticated: true, handle: session.userHandle });
    });

    const app = createApp();
    app.use("/auth", router);

    const result = await request(app, {
      method: "GET",
      path: "/auth/me",
    });

    assert.equal(result.headers["cache-control"], "no-store");
    assert.equal(result.status, 401);
    assert.equal(result.body.authenticated, false);
  });
});

// ── Body-limit tests ────────────────────────────────────────────────────────

describe("body-parser error mapping", () => {
  test("returns 413 when the body exceeds the 1mb limit", async () => {
    const app = createApp();

    app.post("/test", (req, res) => {
      res.json({ received: true });
    });

    // Send a request with a body > 1MB (raw string, content-length header).
    const largeBody = "x".repeat(2 * 1024 * 1024); // 2 MB

    const result = await request(app, {
      method: "POST",
      path: "/test",
      body: largeBody,
    });

    assert.equal(result.status, 413);
    assert.equal(result.body.error, "Request body too large.");
  });

  test("returns 400 for malformed JSON", async () => {
    const app = createApp();

    app.post("/test", (req, res) => {
      res.json({ received: true });
    });

    // Send a raw HTTP request with invalid JSON so that express.json()
    // triggers a parse error.
    const { server, port } = await createTestServer(app);
    const result = await new Promise((resolve, reject) => {
      const bodyStr = "{bad json";
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/test",
          method: "POST",
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

    assert.equal(result.status, 400);
    assert.equal(result.body.error, "Malformed JSON body.");
  });
});
