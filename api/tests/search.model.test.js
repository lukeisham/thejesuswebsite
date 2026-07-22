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
    INSERT INTO blog_posts (slug, blog_title, blog_content, blog_thumbnail, published_draft)
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(
      overrides.slug || "test-blog",
      overrides.blog_title || "Test Blog Title",
      overrides.blog_content || "Full blog body content here.",
      overrides.blog_thumbnail ?? null,
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function seedNews(overrides = {}) {
  return db
    .prepare(
      `
    INSERT INTO news_articles (slug, news_article_title, news_article_thumbnail, published_draft)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(
      overrides.slug || "test-news",
      overrides.news_article_title || "Test News Title",
      overrides.news_article_thumbnail ?? null,
      overrides.published_draft ?? 1,
    ).lastInsertRowid;
}

function clearAll() {
  db.exec("DELETE FROM evidence");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM responses");
  db.exec("DELETE FROM blog_posts");
  db.exec("DELETE FROM challenges");
  db.exec("DELETE FROM news_articles");
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

// ── thumbnail column ──────────────────────────────────────────────────────────

describe("searchOne includes a thumbnail column", () => {
  beforeEach(clearAll);

  test("evidence: thumbnail comes from thumbnail_path", () => {
    seedEvidence({ title: "Thumbnail Evidence" });
    db.prepare("UPDATE evidence SET thumbnail_path = ? WHERE slug = ?").run(
      "/uploads/2026/07/abc_thumb.jpg",
      "test-evidence",
    );
    const results = searchModel.searchOne("evidence", "Thumbnail");
    assert.equal(results[0].thumbnail, "/uploads/2026/07/abc_thumb.jpg");
  });

  test("blog: thumbnail comes from blog_thumbnail", () => {
    seedBlog({
      blog_title: "Thumbnail Blog",
      blog_thumbnail: "/uploads/2026/07/blog_thumb.jpg",
    });
    const results = searchModel.searchOne("blog", "Thumbnail");
    assert.equal(results[0].thumbnail, "/uploads/2026/07/blog_thumb.jpg");
  });

  test("news: thumbnail comes from news_article_thumbnail", () => {
    seedNews({
      news_article_title: "Thumbnail News",
      news_article_thumbnail: "/uploads/2026/07/news_thumb.jpg",
    });
    const results = searchModel.searchOne("news", "Thumbnail");
    assert.equal(results[0].thumbnail, "/uploads/2026/07/news_thumb.jpg");
  });

  test("essays: no thumbnail column configured, always null", () => {
    seedEssay({ essay_title: "Thumbnail Essay" });
    const results = searchModel.searchOne("essays", "Thumbnail");
    assert.equal(results[0].thumbnail, null);
  });

  test("evidence: null thumbnail_path surfaces as null, not a missing key", () => {
    seedEvidence({ title: "No Thumb Evidence" });
    const results = searchModel.searchOne("evidence", "No Thumb");
    assert.ok("thumbnail" in results[0]);
    assert.equal(results[0].thumbnail, null);
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

// ── Quoted phrase vs unquoted matching ────────────────────────────────────────

describe("quoted phrases match adjacency and order", () => {
  beforeEach(clearAll);

  test("quoted phrase matches only rows with words adjacent and in order", () => {
    seedEvidence({
      slug: "pilate-ev",
      title: "Pontius Pilate",
      description: "Pontius Pilate was the governor.",
    });
    seedEvidence({
      slug: "other-ev",
      title: "Pilate and Pontius",
      description: "Pontius appears later after Pilate in this text.",
    });

    const phraseResults = searchModel.searchOne("evidence", '"Pontius Pilate"');
    // Only the first row has the words adjacent and in order.
    assert.equal(phraseResults.length, 1);
    assert.equal(phraseResults[0].title, "Pontius Pilate");
  });

  test("unquoted words match rows with the words anywhere", () => {
    seedEvidence({
      slug: "pilate-ev",
      title: "Pontius Pilate",
      description: "Pontius Pilate was the governor.",
    });
    seedEvidence({
      slug: "other-ev",
      title: "Pilate and Pontius",
      description: "Pontius appears later after Pilate in this text.",
    });

    const unquotedResults = searchModel.searchOne("evidence", "Pontius Pilate");
    // Both rows contain both words (unquoted = AND of prefix tokens).
    assert.equal(unquotedResults.length, 2);
  });
});

// ── Prefix matching ───────────────────────────────────────────────────────────

describe("bare partial word prefix-matches", () => {
  beforeEach(clearAll);

  test("resur prefix-matches Resurrection", () => {
    seedEvidence({
      slug: "resurrection-ev",
      title: "Resurrection Evidence",
      description: "Evidence for the Resurrection of Jesus.",
    });

    const results = searchModel.searchOne("evidence", "resur");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Resurrection Evidence");
  });

  test("partial word matches across essays", () => {
    seedEssay({
      slug: "minimal-facts",
      essay_title: "Minimal Facts Argument",
      essay_content: "The minimal facts approach to the resurrection.",
    });

    const results = searchModel.searchOne("essays", "mini");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Minimal Facts Argument");
  });
});

// ── OR fallback for near-miss queries ─────────────────────────────────────────

describe("OR fallback returns partial matches", () => {
  beforeEach(clearAll);

  test("multi-word query where one word matches nothing still returns hits for the other", () => {
    seedEvidence({
      slug: "resurrection-ev",
      title: "Resurrection Evidence",
      description: "Historical evidence for the resurrection.",
    });

    // "Resurrection" matches; "xyzzy" matches nothing.
    // The strict AND pass returns 0, then OR fallback finds the resurrection row.
    const results = searchModel.searchOne("evidence", "Resurrection xyzzy");
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Resurrection Evidence");
  });

  test("OR fallback preserves exact phrase tokens", () => {
    seedEvidence({
      slug: "pilate-ev",
      title: "Pontius Pilate",
      description: "Pontius Pilate was the governor.",
    });
    seedEvidence({
      slug: "other-ev",
      title: "Some Other Evidence",
      description: "This has neither Pontius nor Pilate.",
    });

    // The phrase '"Pontius Pilate"' + nonsense word triggers OR fallback.
    const results = searchModel.searchOne("evidence", '"Pontius Pilate" xyzzy');
    assert.ok(results.length > 0);
    assert.equal(results[0].title, "Pontius Pilate");
  });
});

// ── Hostile input safety ──────────────────────────────────────────────────────

describe("hostile input returns [] or results without throwing", () => {
  test('" OR injection returns []', () => {
    const results = searchModel.searchOne("evidence", '" OR ');
    assert.deepEqual(results, []);
  });

  test("* wildcard returns []", () => {
    const results = searchModel.searchOne("evidence", "*");
    assert.deepEqual(results, []);
  });

  test("NOT ( parentheses returns []", () => {
    const results = searchModel.searchOne("evidence", "NOT (");
    assert.deepEqual(results, []);
  });

  test("unbalanced quotes returns []", () => {
    const results = searchModel.searchOne("evidence", '"unbalanced');
    assert.deepEqual(results, []);
  });

  test("empty string returns []", () => {
    const results = searchModel.searchOne("evidence", "");
    assert.deepEqual(results, []);
  });

  test("whitespace-only returns []", () => {
    const results = searchModel.searchOne("evidence", "   ");
    assert.deepEqual(results, []);
  });

  test("double-quote only returns []", () => {
    const results = searchModel.searchOne("evidence", '"');
    assert.deepEqual(results, []);
  });
});
