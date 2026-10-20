// Historiography route tests — uses node:test + node:assert.
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

  const routePath = require.resolve("../routes/historiography");
  delete require.cache[routePath];

  app.use("/historiography", require("../routes/historiography"));
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

describe("GET /historiography/:slug", () => {
  test("returns 404 with E-PERSIST-004 for an unknown slug", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/historiography/does-not-exist",
    });

    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "E-PERSIST-004");
  });
});

describe("POST /historiography", () => {
  test("returns 400 with E-INPUT-001 when slug is missing", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/historiography",
      body: {},
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-001");
  });
});

describe("/historiography journal article fields validation", () => {
  test("POST with a too-long abstract returns 400 E-INPUT-022 naming abstract", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/historiography",
      body: { slug: "hist-long", abstract: "a".repeat(2001) },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-022");
    assert.equal(result.body.error.context.field, "abstract");
  });

  test("PUT with a blank footnote returns 400 E-INPUT-038", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
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
      path: "/historiography/1",
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
      path: "/historiography",
      body: {
        slug: "hist-ok",
        abstract: "A fine abstract.",
        footnotes: [{ content: "Note one." }],
      },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.abstract, "A fine abstract.");
    assert.equal(result.body.footnotes[0].content, "Note one.");
  });

  test("PUT with doi null clears the stored doi", async () => {
    const created = await request(createApp(), {
      method: "POST",
      path: "/historiography",
      body: { slug: "hist-null", doi: "10.1000/xyz" },
      headers: { cookie: authCookie() },
    });
    assert.equal(created.body.doi, "10.1000/xyz");

    const cleared = await request(createApp(), {
      method: "PUT",
      path: `/historiography/${created.body.id}`,
      body: { doi: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.doi, null);
  });

  test("POST with the same bad body and no session cookie returns 401", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/historiography",
      body: { slug: "hist-anon", abstract: "a".repeat(2001) },
    });
    assert.equal(result.status, 401);
  });
});

describe("/historiography typed column validation", () => {
  test("PUT with a numeric essay_title returns 400 E-INPUT-038 naming the field", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
      body: { essay_title: 42 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "essay_title");
  });

  test("PUT with published_draft 2 returns 400 naming the field", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
      body: { published_draft: 2 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.context.field, "published_draft");
  });

  test("PUT with a malformed slug returns 400 E-INPUT-006", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
      body: { slug: "Bad Slug" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-006");
    assert.equal(result.body.error.context.field, "slug");
  });

  test("POST with a malformed slug returns 400 E-INPUT-006", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/historiography",
      body: { slug: "../x" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-006");
  });

  test("PUT with an unknown historiography_period returns 400 naming the field", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
      body: { historiography_period: "not-a-period" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "historiography_period");
  });

  test("PUT with a non-integer period_sort_order returns 400 E-INPUT-005", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/1",
      body: { period_sort_order: "3" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-005");
    assert.equal(result.body.error.context.field, "period_sort_order");
  });

  test("PUT with null optional text and a valid body passes validation (404 for a missing row)", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/historiography/99999",
      body: { essay_title: null, doi: null, author_bio: null, two_column: 1, slug: "valid-slug" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 404);
  });
});
