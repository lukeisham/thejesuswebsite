// Publish route tests — verifies publish/unpublish, type validation (including
// Object.prototype key rejection), and id validation. Uses node:test + node:assert
// with an in-memory SQLite database.

const { test, describe, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");
const Module = require("module");
const express = require("express");

// ── In-memory database setup ──────────────────────────────────────────────────

const testDb = new Database(":memory:");
testDb.pragma("foreign_keys = ON");
testDb.exec(`
  CREATE TABLE evidence (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL DEFAULT '',
    slug            TEXT UNIQUE NOT NULL,
    published_draft INTEGER DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE evidence_pictures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order  INTEGER DEFAULT 0,
    image_path  TEXT,
    caption     TEXT
  );
  CREATE TABLE evidence_mla_sources (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id   INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    mla_source_id INTEGER NOT NULL,
    citation_order INTEGER DEFAULT 0
  );
  CREATE TABLE evidence_identifiers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id   INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    identifier_id INTEGER NOT NULL,
    citation_order INTEGER DEFAULT 0
  );
  CREATE TABLE evidence_links_evidence (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_evidence_id  INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_evidence_id  INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order          INTEGER DEFAULT 0
  );
  CREATE TABLE evidence_links_context (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id           INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    target_context_essay_id INTEGER NOT NULL,
    sort_order            INTEGER DEFAULT 0
  );
`);

// Replace the real database with our in-memory copy.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// Redirect the content-pages config to a temp directory so generated HTML
// files never land in the real frontend/ tree during tests.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-test-"));

const realEvidenceTemplate = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "evidence",
  "single",
  "[slug].html",
);
const tempEvidenceDir = path.join(tmpDir, "evidence", "single");
fs.mkdirSync(tempEvidenceDir, { recursive: true });
fs.copyFileSync(
  realEvidenceTemplate,
  path.join(tempEvidenceDir, "[slug].html"),
);

const contentPagesPath = require.resolve(
  path.resolve(__dirname, "..", "config", "content-pages"),
);
const realContentPages = require("../config/content-pages");
Module._cache[contentPagesPath] = {
  id: contentPagesPath,
  filename: contentPagesPath,
  loaded: true,
  exports: {
    CONTENT_PAGES: {
      evidence: {
        ...realContentPages.CONTENT_PAGES.evidence,
        templatePath: path.join(tempEvidenceDir, "[slug].html"),
        outputDir: tempEvidenceDir,
      },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

let server;
let baseUrl;
// Create a real session and capture its token for authenticating test requests.
let sessionToken;

function startServer() {
  return new Promise((resolve) => {
    // Clear cache so the publish router picks up fresh middleware state.
    delete require.cache[require.resolve("../routes/publish")];
    delete require.cache[require.resolve("../middleware/auth")];
    delete require.cache[require.resolve("../services/page-generator")];

    // Create a real session and capture the token before requiring the router
    // (so the in-memory session store has it ready).
    const auth = require("../middleware/auth");
    sessionToken = auth.createSession("admin");

    const publishRouter = require("../routes/publish");
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    app.use("/publish", publishRouter);

    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => server.close(resolve));
}

function doReq(method, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "content-type": "application/json",
        cookie: "sid=" + sessionToken,
        ...(opts.headers || {}),
      },
    };

    const r = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks).toString();
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf ? JSON.parse(buf) : null,
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: buf });
        }
      });
    });
    r.on("error", reject);
    if (opts.body) r.write(JSON.stringify(opts.body));
    r.end();
  });
}

function seedEvidence(opts = {}) {
  const row = testDb
    .prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES (?, ?, ?)",
    )
    .run(
      opts.title || "Test Item",
      opts.slug || "test-item-" + Math.random().toString(36).slice(2, 8),
      opts.published_draft ?? 0,
    );
  return row.lastInsertRowid;
}

function getPublishedDraft(id) {
  return testDb
    .prepare("SELECT published_draft FROM evidence WHERE id = ?")
    .get(id).published_draft;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /publish/:type/:id", () => {
  before(async () => {
    await startServer();
  });

  after(() => {
    stopServer();
    // Clean up the temp directory (rmSync is recursive, force ignores ENOENT).
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    testDb.exec("DELETE FROM evidence");
  });

  test("publishes a valid type (flips published_draft to 1)", async () => {
    const id = seedEvidence({
      title: "Publish Me",
      published_draft: 0,
    });
    assert.equal(getPublishedDraft(id), 0);

    const res = await doReq("POST", "/publish/evidence/" + id);
    assert.equal(res.status, 200);
    assert.equal(res.body.published_draft, 1);
    assert.equal(getPublishedDraft(id), 1);
  });

  test("unpublishes a valid type via DELETE (flips published_draft to 0)", async () => {
    const id = seedEvidence({
      title: "Unpublish Me",
      published_draft: 1,
    });
    assert.equal(getPublishedDraft(id), 1);

    const res = await doReq("DELETE", "/publish/evidence/" + id);
    assert.equal(res.status, 200);
    assert.equal(res.body.published_draft, 0);
    assert.equal(getPublishedDraft(id), 0);
  });

  test("returns 400 for an unknown type", async () => {
    const res = await doReq("POST", "/publish/not-a-real-type/1");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Unknown or non-publishable type.");
  });

  test("returns 400 for a constructor prototype key (not 500)", async () => {
    const res = await doReq("POST", "/publish/constructor/1");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Unknown or non-publishable type.");
  });

  test("returns 400 for a toString prototype key (not 500)", async () => {
    const res = await doReq("POST", "/publish/toString/1");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Unknown or non-publishable type.");
  });

  test("returns 400 for __proto__ prototype key (not 500)", async () => {
    const res = await doReq("POST", "/publish/__proto__/1");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Unknown or non-publishable type.");
  });

  test("returns 400 for a non-numeric id", async () => {
    const res = await doReq("POST", "/publish/evidence/abc");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "A positive numeric id is required.");
  });

  test("returns 400 for a negative id", async () => {
    const res = await doReq("POST", "/publish/evidence/-1");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "A positive numeric id is required.");
  });

  test("returns 400 for a zero id", async () => {
    const res = await doReq("POST", "/publish/evidence/0");
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "A positive numeric id is required.");
  });

  test("returns 404 for a non-existent id", async () => {
    const res = await doReq("POST", "/publish/evidence/99999");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Item not found.");
  });

  test("publishing evidence generates HTML in temp dir, not in real frontend", async () => {
    const realDir = path.resolve(
      __dirname,
      "..",
      "..",
      "frontend",
      "evidence",
      "single",
    );
    const beforeFiles = new Set(
      fs.readdirSync(realDir).filter((f) => !f.startsWith("[slug]")),
    );

    const id = seedEvidence({ title: "Page Gen Test", published_draft: 0 });
    const res = await doReq("POST", "/publish/evidence/" + id);
    assert.equal(res.status, 200);

    // The generated file must exist under the temp output dir.
    const slug = res.body.slug;
    assert.ok(slug, "Expected a slug in the response body");
    const generatedPath = path.join(tempEvidenceDir, slug + ".html");
    assert.ok(
      fs.existsSync(generatedPath),
      "Expected generated file at " + generatedPath,
    );

    // The real frontend/evidence/single/ directory must have gained no new files.
    const afterFiles = new Set(
      fs.readdirSync(realDir).filter((f) => !f.startsWith("[slug]")),
    );
    const newcomers = [...afterFiles].filter((f) => !beforeFiles.has(f));
    assert.equal(
      newcomers.length,
      0,
      "No new files should appear in real frontend/evidence/single/: " +
        newcomers.join(", "),
    );
  });
});
