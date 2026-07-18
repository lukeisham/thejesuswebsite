// Spellcheck dictionary model & route tests — uses node:test + node:assert.
// Tests add/list/remove operations, upsert-on-duplicate-normalized-word,
// input validation, and auth requirements.
//
// Run with: cd api && npm test

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("http");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory test database ─────────────────────────────────────────────────

const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function createApp() {
  const app = express();
  app.use(express.json());

  // Clear route and model caches so they re-evaluate with the test DB
  const modelPath = require.resolve(
    "../models/spellcheck-dictionary.model",
  );
  delete require.cache[modelPath];

  const routePath = require.resolve("../routes/spellcheck-dictionary");
  delete require.cache[routePath];

  	const router = require("../routes/spellcheck-dictionary");
  	app.use("/spellcheck-dictionary", router);

  return app;
}

function request(app, { method, path, body, headers }) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0);
    const { port } = server.address();

    const bodyStr =
      typeof body === "string" ? body : JSON.stringify(body || {});
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
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      },
    );

    req.on("error", (err) => {
      server.close();
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
}

// Create a fresh session cookie for authenticated requests.
function authCookie() {
  const requireAuth = require("../middleware/auth");
  return `sid=${encodeURIComponent(requireAuth.createSession("test"))}`;
}

// ── Model: direct tests ─────────────────────────────────────────────────────
//   Test the model directly (no HTTP) for fine-grained coverage.

describe("spellcheck-dictionary model", () => {
  let model;

  beforeEach(() => {
    // Clear the table before each test
    testDb.exec("DELETE FROM spellcheck_dictionary");

    // Force fresh require
    delete require.cache[
      require.resolve("../models/spellcheck-dictionary.model")
    ];
    model = require("../models/spellcheck-dictionary.model");
  });

  test("getAll() returns empty array when no words exist", () => {
    const words = model.getAll();
    assert.ok(Array.isArray(words));
    assert.equal(words.length, 0);
  });

  test("add() inserts a word and returns the row", () => {
    const row = model.add("Resurrection", "learned");
    assert.equal(row.word, "Resurrection");
    assert.equal(row.normalized, "resurrection");
    assert.equal(row.status, "learned");
  });

  test("add() upserts on duplicate normalized word", () => {
    model.add("Hello", "ignored");
    model.add("HELLO", "learned");

    const words = model.getAll();
    assert.equal(words.length, 1);
    assert.equal(words[0].normalized, "hello");
    // ON CONFLICT DO UPDATE only changes status, not the original word column
    assert.equal(words[0].status, "learned");
  });

  test("remove() deletes a word and returns true", () => {
    model.add("test", "learned");
    const result = model.remove("test");
    assert.equal(result, true);
    assert.equal(model.getAll().length, 0);
  });

  test("remove() returns false when word does not exist", () => {
    const result = model.remove("nonexistent");
    assert.equal(result, false);
  });

  test("remove() is case-insensitive", () => {
    model.add("MiXeDcAsE", "learned");
    const result = model.remove("mixedcase");
    assert.equal(result, true);
    assert.equal(model.getAll().length, 0);
  });

  test("getAll() returns words sorted alphabetically", () => {
    model.add("zebra", "learned");
    model.add("apple", "learned");
    model.add("mango", "learned");

    const words = model.getAll();
    assert.equal(words[0].word, "apple");
    assert.equal(words[1].word, "mango");
    assert.equal(words[2].word, "zebra");
  });
});

// ── Route: HTTP tests ───────────────────────────────────────────────────────
//   All paths omit the /api prefix — nginx strips it in production, and the
//   Express mount in server.js matches the bare path (consistent with every
//   other admin route). See Issues.md #54.

// Clear the spellcheck dictionary between HTTP tests so state from one test
// doesn't leak into another.
function clearDictionary() {
  testDb.exec("DELETE FROM spellcheck_dictionary");
}

describe("GET /spellcheck-dictionary", () => {
  beforeEach(clearDictionary);

  test("returns 401 without auth", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "GET",
      path: "/spellcheck-dictionary",
    });
    assert.equal(result.status, 401);
  });

  test("returns empty words array when dictionary is empty", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "GET",
      path: "/spellcheck-dictionary",
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 200);
    assert.ok(result.body.words);
    assert.equal(result.body.words.length, 0);
  });

  test("returns populated dictionary for an authenticated session", async () => {
    const app = createApp();
    // Seed the dictionary via POST
    await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "Nazareth", status: "learned" },
      headers: { cookie: authCookie() },
    });
    await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "synoptic", status: "ignored" },
      headers: { cookie: authCookie() },
    });

    const result = await request(app, {
      method: "GET",
      path: "/spellcheck-dictionary",
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 200);
    assert.ok(Array.isArray(result.body.words));
    assert.equal(result.body.words.length, 2);

    const words = result.body.words.map((w) => w.normalized).sort();
    assert.deepEqual(words, ["nazareth", "synoptic"]);
  });
});

describe("POST /spellcheck-dictionary", () => {
  beforeEach(clearDictionary);

  test("returns 401 without auth", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "test", status: "learned" },
    });
    assert.equal(result.status, 401);
  });

  test("adds a learned word and returns 201", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "Resurrection", status: "learned" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.word, "Resurrection");
    assert.equal(result.body.normalized, "resurrection");
    assert.equal(result.body.status, "learned");
  });

  test("adds an ignored word and returns 201", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "typo", status: "ignored" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.status, "ignored");
  });

  test("upserts on duplicate normalized word", async () => {
    const app = createApp();
    await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "Hello", status: "ignored" },
      headers: { cookie: authCookie() },
    });

    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "HELLO", status: "learned" },
      headers: { cookie: authCookie() },
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.normalized, "hello");
    assert.equal(result.body.status, "learned");

    // GET should confirm only one row
    const getResult = await request(app, {
      method: "GET",
      path: "/spellcheck-dictionary",
      headers: { cookie: authCookie() },
    });
    assert.equal(getResult.body.words.length, 1);
  });

  test("rejects empty word with 400", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "", status: "learned" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
  });

  test("rejects missing word with 400", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { status: "learned" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
  });

  test("rejects invalid status value with 400", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "test", status: "invalid" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
  });

  test("rejects missing status with 400", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "test" },
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 400);
  });
});

describe("DELETE /spellcheck-dictionary/:word", () => {
  beforeEach(clearDictionary);

  test("returns 401 without auth", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "DELETE",
      path: "/spellcheck-dictionary/test",
    });
    assert.equal(result.status, 401);
  });

  test("deletes a word and returns 204", async () => {
    const app = createApp();
    // Add a word first
    await request(app, {
      method: "POST",
      path: "/spellcheck-dictionary",
      body: { word: "remove-me", status: "learned" },
      headers: { cookie: authCookie() },
    });

    const result = await request(app, {
      method: "DELETE",
      path: "/spellcheck-dictionary/remove-me",
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 204);

    // Verify it's gone
    const getResult = await request(app, {
      method: "GET",
      path: "/spellcheck-dictionary",
      headers: { cookie: authCookie() },
    });
    assert.equal(getResult.body.words.length, 0);
  });

  test("returns 404 when word not found", async () => {
    const app = createApp();
    const result = await request(app, {
      method: "DELETE",
      path: "/spellcheck-dictionary/nonexistent",
      headers: { cookie: authCookie() },
    });
    assert.equal(result.status, 404);
  });
});
