// Timeline route tests — uses node:test + node:assert.
// Covers the public GET /timeline draft boundary (API-5: the model decides
// published-only, never the query string) and the auth guard on GET
// /timeline/admin. Model-level draft filtering is covered by timeline.test.js.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");
const { createTestServer, closeTestServer } = require("./helpers/test-server");
const { clearAuthSessions } = require("./helpers/test-setup");

// ── In-memory test database ─────────────────────────────────────────────────

const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const requireAuth = require("../middleware/auth");

// ── Helpers ─────────────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());

  const routePath = require.resolve("../routes/timeline");
  delete require.cache[routePath];

  app.use("/timeline", require("../routes/timeline"));
  return app;
}

async function request(app, { method, path: reqPath, headers }) {
  const { server, port } = await createTestServer(app);
  return new Promise((resolve, reject) => {
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
  });
}

function authCookie() {
  return `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;
}

/** Insert one evidence row placed on the timeline. */
function insertPlaced({ title, slug, published_draft }) {
  testDb
    .prepare(
      `INSERT INTO evidence (title, slug, published_draft, timeline_era, timeline_period)
       VALUES (?, ?, ?, 'PassionWeek', 'PassionPalmSunday')`,
    )
    .run(title, slug, published_draft);
}

/** Flatten the route's era-grouped payload into a single array of rows. */
function allRows(body) {
  if (Array.isArray(body)) return body;
  return Object.values(body).flatMap((value) =>
    Array.isArray(value) ? value : [],
  );
}

beforeEach(() => {
  clearAuthSessions();
  testDb.exec("DELETE FROM evidence");
  insertPlaced({ title: "Published Row", slug: "published-row", published_draft: 1 });
  insertPlaced({ title: "Draft Row", slug: "draft-row", published_draft: 0 });
});

// ── GET /timeline (public) ──────────────────────────────────────────────────

describe("GET /timeline", () => {
  test("returns published rows and omits drafts", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/timeline",
    });

    assert.equal(result.status, 200);
    const titles = allRows(result.body).map((row) => row.title);
    assert.ok(titles.includes("Published Row"));
    assert.ok(!titles.includes("Draft Row"));
  });

  test("ignores an includeDrafts query param — drafts stay hidden", async () => {
    // Regression: the handler used to forward req.query straight into the
    // model, whose draft guard keys off a truthy `includeDrafts`. Query values
    // are always strings, so "1" — and even "0" — unpublished the guard and
    // exposed every draft row to anonymous callers.
    for (const value of ["1", "0", "true"]) {
      const result = await request(createApp(), {
        method: "GET",
        path: `/timeline?includeDrafts=${value}`,
      });

      assert.equal(result.status, 200);
      const titles = allRows(result.body).map((row) => row.title);
      assert.ok(
        !titles.includes("Draft Row"),
        `includeDrafts=${value} leaked a draft row`,
      );
    }
  });
});

// ── GET /timeline/:era ──────────────────────────────────────────────────────

describe("GET /timeline/:era", () => {
  test("returns 400 with E-INPUT-007 for an unknown era", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/timeline/not-a-real-era",
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-007");
  });
});

// ── GET /timeline/admin (auth-guarded) ─────────────────────────────────────

describe("GET /timeline/admin", () => {
  test("returns 401 without a session cookie", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/timeline/admin",
    });

    assert.equal(result.status, 401);
  });

  test("includes drafts with a valid session cookie", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/timeline/admin",
      headers: { Cookie: authCookie() },
    });

    assert.equal(result.status, 200);
    const titles = allRows(result.body).map((row) => row.title);
    assert.ok(titles.includes("Draft Row"));
  });
});
