// Search model tests — uses node:test + node:assert with an in-memory SQLite
// database. Tests that searchOne returns the correct title field (not the
// full content body) and excludes unpublished rows.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const db = createTestDb();

// Mock the config module so search.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: db,
};

const searchModel = require("../models/search.model");

function seedEvidence(overrides = {}) {
  return db
    .prepare(
      `
    INSERT INTO evidence (title, slug, description, metadata_keywords, published_draft)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      overrides.title || "Test Evidence",
      overrides.slug || "test-evidence",
      overrides.description || "Test description.",
      overrides.metadata_keywords || "test",
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function seedEssay(overrides = {}) {
  return db
    .prepare(
      `
    INSERT INTO context_essays (slug, essay_title, essay_content, metadata_keywords, published_draft)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      overrides.slug || "test-essay",
      overrides.essay_title || "Test Essay Title",
      overrides.essay_content || "Full essay body content here.",
      overrides.metadata_keywords || "test",
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function seedResponse(overrides = {}) {
  const challengeId =
    overrides.challenge_id ||
    db
      .prepare(
        "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES ('ch', 'popular', 'Test Challenge', 1)",
      )
      .run().lastInsertRowid;

  return db
    .prepare(
      `
    INSERT INTO responses (slug, challenge_id, response_title, response_content, published_draft)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      overrides.slug || "test-response",
      challengeId,
      overrides.response_title || "Test Response Title",
      overrides.response_content || "Full response body content here.",
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function seedBlog(overrides = {}) {
  return db
    .prepare(
      `
    INSERT INTO blog_posts (slug, blog_title, blog_content, published_draft)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(
      overrides.slug || "test-blog",
      overrides.blog_title || "Test Blog Title",
      overrides.blog_content || "Full blog body content here.",
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function clearAll() {
  db.exec("DELETE FROM evidence");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM responses");
  db.exec("DELETE FROM blog_posts");
  db.exec("DELETE FROM challenges");
}

// ── searchOne() title field ───────────────────────────────────────────────────

describe("searchOne returns title, not body", () => {
  beforeEach(clearAll);

  test("evidence: has title, no content", () => {
    seedEvidence({
      title: "Resurrection Evidence",
      content: "LONG_BODY_TEXT_SHOULD_NOT_APPEAR",
    });
    const results = searchModel.searchOne("evidence", "Resurrection");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Resurrection Evidence");
    assert.equal(results[0].result_type, "evidence");
    assert.ok(!("content" in results[0]), "body content must not be present");
  });

  test("essays: has title, no essay_content", () => {
    seedEssay({
      essay_title: "Minimal Facts Argument",
      essay_content: "LONG_ESSAY_BODY",
    });
    const results = searchModel.searchOne("essays", "Minimal Facts");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Minimal Facts Argument");
    assert.ok(
      !("essay_content" in results[0]),
      "essay_content must not be present",
    );
  });

  test("responses: has title, no response_content", () => {
    seedResponse({
      response_title: "A Scholarly Reply",
      response_content: "LONG_RESPONSE_BODY",
    });
    const results = searchModel.searchOne("responses", "Scholarly");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "A Scholarly Reply");
    assert.ok(
      !("response_content" in results[0]),
      "response_content must not be present",
    );
  });

  test("blog: has title, no blog_content", () => {
    seedBlog({
      blog_title: "Blogging About History",
      blog_content: "LONG_BLOG_BODY",
    });
    const results = searchModel.searchOne("blog", "Blogging");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Blogging About History");
    assert.ok(
      !("blog_content" in results[0]),
      "blog_content must not be present",
    );
  });
});

// ── Excludes unpublished rows ─────────────────────────────────────────────────

describe("searchOne excludes unpublished rows", () => {
  beforeEach(clearAll);

  test("does not return draft evidence", () => {
    seedEvidence({ title: "Published Evidence", published_draft: 1 });
    seedEvidence({
      slug: "draft-ev",
      title: "Draft Evidence",
      published_draft: 0,
    });
    const results = searchModel.searchOne("evidence", "Evidence");
    const titles = results.map((r) => r.title);
    assert.ok(titles.includes("Published Evidence"));
    assert.ok(!titles.includes("Draft Evidence"));
  });

  test("does not return draft essays", () => {
    seedEssay({
      slug: "pub-essay",
      essay_title: "Published Essay",
      published_draft: 1,
    });
    seedEssay({
      slug: "draft-essay",
      essay_title: "Draft Essay",
      published_draft: 0,
    });
    const results = searchModel.searchOne("essays", "Essay");
    const titles = results.map((r) => r.title);
    assert.ok(titles.includes("Published Essay"));
    assert.ok(!titles.includes("Draft Essay"));
  });
});

// ── Prototype-key guard ───────────────────────────────────────────────────────

describe("searchOne rejects prototype-inherited keys", () => {
  test("returns [] for 'constructor' instead of crashing", () => {
    const results = searchModel.searchOne("constructor", "anything");
    assert.deepEqual(results, []);
  });

  test("returns [] for 'toString' instead of crashing", () => {
    const results = searchModel.searchOne("toString", "anything");
    assert.deepEqual(results, []);
  });

  test("search with constructor type returns [] instead of crashing", () => {
    const results = searchModel.search("anything", "constructor");
    assert.deepEqual(results, []);
  });
});
