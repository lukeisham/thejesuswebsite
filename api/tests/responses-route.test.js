// Responses route tests — uses node:test + node:assert.
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

  const routePath = require.resolve("../routes/responses");
  delete require.cache[routePath];

  app.use("/responses", require("../routes/responses"));
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

describe("GET /responses/:slug", () => {
  test("returns 404 with E-PERSIST-004 for an unknown slug", async () => {
    const result = await request(createApp(), {
      method: "GET",
      path: "/responses/does-not-exist",
    });

    assert.equal(result.status, 404);
    assert.equal(result.body.error.code, "E-PERSIST-004");
  });
});

describe("POST /responses", () => {
  test("returns 400 with E-INPUT-001 when slug is missing", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/responses",
      body: {},
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-001");
  });
});

describe("/responses journal article fields validation", () => {
  test("POST with a too-long abstract returns 400 E-INPUT-022 naming abstract", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/responses",
      body: { slug: "response-long", abstract: "a".repeat(2001) },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-022");
    assert.equal(result.body.error.context.field, "abstract");
  });

  test("PUT with a blank footnote returns 400 E-INPUT-038", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
      body: { footnotes: [{ content: "  " }] },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "footnotes[0].content");
  });

  test("PUT with strength 6 returns 400 E-INPUT-005 naming strength", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
      body: { strength: 6 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-005");
    assert.equal(result.body.error.context.field, "strength");
  });

  test("POST with a valid abstract and footnotes returns 201 with both saved", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/responses",
      body: {
        slug: "response-ok",
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
      path: "/responses",
      body: { slug: "response-null", doi: "10.1000/xyz" },
      headers: { cookie: authCookie() },
    });
    assert.equal(created.body.doi, "10.1000/xyz");

    const cleared = await request(createApp(), {
      method: "PUT",
      path: `/responses/${created.body.id}`,
      body: { doi: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.doi, null);
  });

  test("POST with the same bad body and no session cookie returns 401", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/responses",
      body: { slug: "response-anon", abstract: "a".repeat(2001) },
    });
    assert.equal(result.status, 401);
  });
});

describe("/responses typed column validation", () => {
  test("PUT with a numeric response_title returns 400 E-INPUT-038 naming the field", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
      body: { response_title: 42 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-038");
    assert.equal(result.body.error.context.field, "response_title");
  });

  test("PUT with published_draft 2 returns 400 naming the field", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
      body: { published_draft: 2 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.context.field, "published_draft");
  });

  test("PUT with a malformed slug returns 400 E-INPUT-006", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
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
      path: "/responses",
      body: { slug: "../x" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-006");
  });

  test("PUT with a non-integer challenge_id returns 400 E-INPUT-005", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/1",
      body: { challenge_id: "abc" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "E-INPUT-005");
    assert.equal(result.body.error.context.field, "challenge_id");
  });

  test("PUT with null optional text and a valid body passes validation (404 for a missing row)", async () => {
    const result = await request(createApp(), {
      method: "PUT",
      path: "/responses/99999",
      body: { response_title: null, doi: null, author_bio: null, two_column: 1, slug: "valid-slug" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 404);
  });
});

describe("/responses published needs a challenge", () => {
  function insertResponse(slug, published, challengeId) {
    return testDb
      .prepare(
        "INSERT INTO responses (slug, published_draft, challenge_id) VALUES (?, ?, ?)",
      )
      .run(slug, published, challengeId).lastInsertRowid;
  }

  function insertChallenge(slug) {
    return testDb
      .prepare(
        "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES (?, 'popular', 'T', 1)",
      )
      .run(slug).lastInsertRowid;
  }

  test("POST published with challenge_id null returns 400 naming challenge_id", async () => {
    const result = await request(createApp(), {
      method: "POST",
      path: "/responses",
      body: { slug: "pub-no-challenge", published_draft: 1, challenge_id: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.context.field, "challenge_id");
  });

  test("PUT publishing a stored row that has no challenge returns 400", async () => {
    const id = insertResponse("draft-no-challenge", 0, null);
    const result = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { published_draft: 1 },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.context.field, "challenge_id");
  });

  test("PUT clearing challenge_id on a published row returns 400", async () => {
    const challengeId = insertChallenge("c-clear");
    const id = insertResponse("pub-with-challenge", 1, challengeId);
    const result = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { challenge_id: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.context.field, "challenge_id");
  });

  test("PUT publishing with a challenge_id in the body returns 200", async () => {
    const challengeId = insertChallenge("c-ok");
    const id = insertResponse("draft-gets-challenge", 0, null);
    const result = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { published_draft: 1, challenge_id: challengeId },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.published_draft, 1);
  });

  test("PUT saving a draft with challenge_id null returns 200", async () => {
    const id = insertResponse("draft-stays-draft", 0, null);
    const result = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { published_draft: 0, challenge_id: null },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 200);
  });

  test("PUT keeps an unchanged legacy slug but rejects a changed bad slug", async () => {
    const id = insertResponse("Legacy_Slug", 0, null);
    const same = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { slug: "Legacy_Slug", response_title: "Kept" },
      headers: { cookie: authCookie() },
    });
    assert.equal(same.status, 200);

    const changed = await request(createApp(), {
      method: "PUT",
      path: `/responses/${id}`,
      body: { slug: "Another_Bad" },
      headers: { cookie: authCookie() },
    });
    assert.equal(changed.status, 400);
    assert.equal(changed.body.error.code, "E-INPUT-006");
  });
});
