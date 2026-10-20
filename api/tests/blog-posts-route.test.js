// Blog Posts route tests — uses node:test + node:assert.
// Pins the error-registry shape (API-3) for the 404 and 400 paths, the
// 401/pass-through gate on every admin route (TEST-7), the published-only
// gate on the public routes, and body and id validation (API-4).

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

  const routePath = require.resolve("../routes/blog-posts");
  delete require.cache[routePath];

  app.use("/blog-posts", require("../routes/blog-posts"));
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

describe("GET /blog-posts/:slug", () => {
  test("returns 404 with E-PERSIST-004 for an unknown slug", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/blog-posts/does-not-exist",
    });

    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "E-PERSIST-004");
  });
});

describe("POST /blog-posts", () => {
  test("returns 400 with E-INPUT-001 when slug is missing", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/blog-posts",
      body: {},
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-001");
  });
});

describe("POST and PUT validation", () => {
  const badBodies = [
    { label: "a non-string blog_title", body: { slug: "v-title", blog_title: 5 }, field: "blog_title" },
    { label: "a published_draft outside 0 and 1", body: { slug: "v-draft", published_draft: 2 }, field: "published_draft" },
    { label: "a non-string slug", body: { slug: 7 }, field: "slug" },
  ];

  for (const { label, body, field } of badBodies) {
    test(`POST with ${label} returns 400 E-INPUT-038 naming ${field}`, async () => {
      const result = await request(createApp(), {
        method: "POST",
        path: "/blog-posts",
        body,
        headers: { cookie: authCookie() },
      });
      assert.equal(result.status, 400);
      assert.equal(result.body.error.code, "E-INPUT-038");
      assert.equal(result.body.error.context.field, field);
    });
  }

  test("PUT with a published_draft outside 0 and 1 returns 400 E-INPUT-038", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/blog-posts/1",
      body: { published_draft: "yes" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "published_draft");
  });

  for (const { method, path: reqPath, body } of [
    { method: "PUT", path: "/blog-posts/abc", body: { blog_title: "x" } },
    { method: "DELETE", path: "/blog-posts/abc" },
    { method: "GET", path: "/blog-posts/admin/abc" },
  ]) {
    test(`${method} ${reqPath} returns 400 E-INPUT-005 naming id`, async () => {
      const result = await request(createApp(), {
        method,
        path: reqPath,
        body,
        headers: { cookie: authCookie() },
      });
      assert.equal(result.status, 400);
      assert.equal(result.body.error.code, "E-INPUT-005");
      assert.equal(result.body.error.context.field, "id");
    });
  }
});

describe("/blog-posts admin gates", () => {
  const gated = [
    { method: "POST", path: "/blog-posts", body: { slug: "gate-post" }, passStatus: 201 },
    { method: "PUT", path: "/blog-posts/99999", body: { blog_title: "x" }, passStatus: 404 },
    { method: "DELETE", path: "/blog-posts/99999", passStatus: 404 },
    { method: "GET", path: "/blog-posts/admin", passStatus: 200 },
    { method: "GET", path: "/blog-posts/admin/99999", passStatus: 404 },
  ];

  for (const { method, path: reqPath, body, passStatus } of gated) {
    test(`${method} ${reqPath} returns 401 without a session cookie`, async () => {
      const result = await request(createApp(), { method, path: reqPath, body });
      assert.equal(result.status, 401);
    });

    test(`${method} ${reqPath} passes the gate with a valid session`, async () => {
      const result = await request(createApp(), {
        method,
        path: reqPath,
        body,
        headers: { cookie: authCookie() },
      });
      assert.equal(result.status, passStatus);
    });
  }
});

describe("public routes return published posts only", () => {
  test("a draft slug returns 404 and the list omits it", async () => {
    testDb
      .prepare("INSERT INTO blog_posts (slug, blog_title, published_draft) VALUES (?, ?, ?)")
      .run("secret-draft", "Secret", 0);
    testDb
      .prepare("INSERT INTO blog_posts (slug, blog_title, published_draft) VALUES (?, ?, ?)")
      .run("open-post", "Open", 1);

    const detail = await request(createApp(), { method: "GET", path: "/blog-posts/secret-draft" });
    assert.equal(detail.status, 404);

    const list = await request(createApp(), { method: "GET", path: "/blog-posts" });
    assert.equal(list.status, 200);
    const slugs = list.body.map((post) => post.slug);
    assert.ok(slugs.includes("open-post"));
    assert.ok(!slugs.includes("secret-draft"));
  });
});
