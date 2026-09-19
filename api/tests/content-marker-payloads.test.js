// Content marker payload tests — verifies that every public by-slug detail
// endpoint returns resolved mla_sources and identifiers arrays where each item
// has its own id field (for client-side marker resolution).
// Uses node:test + node:assert with an in-memory SQLite DB for isolation.

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "schema.sql",
);

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const evidenceModel = require("../models/evidence.model");
const essayModel = require("../models/essay.model");
const responseModel = require("../models/response.model");
const historiographyModel = require("../models/historiography.model");
const blogPostModel = require("../models/blog-post.model");

// ---- seed helpers ----

function seedMlaSource(overrides = {}) {
  return db
    .prepare(
      "INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date, published_draft) VALUES (?, ?, ?, 1)",
    )
    .run(
      overrides.mla_book_title || "Test Book",
      overrides.mla_book_author || "Author Name",
      overrides.mla_book_date || "2024",
    ).lastInsertRowid;
}

function seedIdentifier(overrides = {}) {
  return db
    .prepare(
      "INSERT INTO identifiers (isbn, isbn_book_title, isbn_book_author, published_draft) VALUES (?, ?, ?, 1)",
    )
    .run(
      overrides.isbn || "978-3-16-148410-0",
      overrides.isbn_book_title || "Test ISBN Book",
      overrides.isbn_book_author || "Identifier Author",
    ).lastInsertRowid;
}

function seedChallenge() {
  return db
    .prepare(
      "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES ('test-challenge', 'popular', 'Test', 1)",
    )
    .run().lastInsertRowid;
}

// ---- helpers to assert resolved arrays ----

/**
 * Assert that every item in an array has a numeric id field.
 */
function assertAllHaveId(arr, label) {
  assert.ok(Array.isArray(arr), `${label} should be an array`);
  for (let i = 0; i < arr.length; i++) {
    assert.ok(
      typeof arr[i].id === "number" && arr[i].id > 0,
      `${label}[${i}] should have a numeric id, got ${JSON.stringify(arr[i])}`,
    );
  }
}

// ---- evidence ----

describe("evidence detail: resolved mla_sources and identifiers", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getDetailBySlug returns resolved mla_sources with id", () => {
    const mlaId = seedMlaSource({ mla_book_title: "Evidence Source" });
    evidenceModel.createComposite({
      title: "Evidence With Source",
      slug: "evidence-with-source",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = evidenceModel.getDetailBySlug("evidence-with-source");
    assert.ok(detail, "detail should exist");
    assert.equal(detail.mla_sources.length, 1);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Evidence Source");
  });

  test("getDetailBySlug returns resolved identifiers with id", () => {
    const identifierId = seedIdentifier({ isbn: "111-1-11-111111-1" });
    evidenceModel.createComposite({
      title: "Evidence With Identifier",
      slug: "evidence-with-id",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = evidenceModel.getDetailBySlug("evidence-with-id");
    assert.ok(detail);
    assert.equal(detail.identifiers.length, 1);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "111-1-11-111111-1");
  });

  test("getDetailBySlug returns empty arrays when no links exist", () => {
    evidenceModel.createComposite({
      title: "Evidence No Links",
      slug: "evidence-no-links",
      published_draft: 1,
    });

    const detail = evidenceModel.getDetailBySlug("evidence-no-links");
    assert.ok(detail);
    assert.deepEqual(detail.mla_sources, []);
    assert.deepEqual(detail.identifiers, []);
  });
});

// ---- essays ----

describe("essay detail: resolved mla_sources and identifiers", () => {
  beforeEach(() => {
    db.exec("DELETE FROM context_essays");
    db.exec("DELETE FROM context_essay_mla_sources");
    db.exec("DELETE FROM context_essay_identifiers");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getDetailBySlug returns resolved mla_sources with id (plus bibliography)", () => {
    const mlaId = seedMlaSource({ mla_book_title: "Essay Source" });
    essayModel.createComposite({
      slug: "essay-with-source",
      essay_title: "Essay Title",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = essayModel.getDetailBySlug("essay-with-source");
    assert.ok(detail);
    assert.equal(detail.mla_sources.length, 1);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Essay Source");

    // bibliography is also present for frontend rendering
    assert.ok(Array.isArray(detail.bibliography));
    assert.equal(detail.bibliography.length, 1);
  });

  test("getDetailBySlug returns resolved identifiers with id", () => {
    const identifierId = seedIdentifier({ isbn: "222-2-22-222222-2" });
    essayModel.createComposite({
      slug: "essay-with-id",
      essay_title: "Essay With ID",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = essayModel.getDetailBySlug("essay-with-id");
    assert.ok(detail);
    assert.equal(detail.identifiers.length, 1);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "222-2-22-222222-2");
  });
});

// ---- responses ----

describe("response detail: resolved mla_sources and identifiers", () => {
  beforeEach(() => {
    db.exec("DELETE FROM responses");
    db.exec("DELETE FROM response_mla_sources");
    db.exec("DELETE FROM response_identifiers");
    db.exec("DELETE FROM challenges");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getDetailBySlug returns resolved mla_sources with id", () => {
    const challengeId = seedChallenge();
    const mlaId = seedMlaSource({ mla_book_title: "Response Source" });
    responseModel.createComposite({
      slug: "response-with-source",
      challenge_id: challengeId,
      response_title: "Response Title",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = responseModel.getDetailBySlug("response-with-source");
    assert.ok(detail);
    assert.equal(detail.mla_sources.length, 1);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Response Source");
  });

  test("getDetailBySlug returns resolved identifiers with id", () => {
    const challengeId = seedChallenge();
    const identifierId = seedIdentifier({ isbn: "333-3-33-333333-3" });
    responseModel.createComposite({
      slug: "response-with-id",
      challenge_id: challengeId,
      response_title: "Response With ID",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = responseModel.getDetailBySlug("response-with-id");
    assert.ok(detail);
    assert.equal(detail.identifiers.length, 1);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "333-3-33-333333-3");
  });
});

// ---- historiography ----

describe("historiography detail: resolved mla_sources and identifiers", () => {
  beforeEach(() => {
    db.exec("DELETE FROM historiography");
    db.exec("DELETE FROM historiography_mla_sources");
    db.exec("DELETE FROM historiography_identifiers");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getDetailBySlug returns resolved mla_sources with id (plus bibliography)", () => {
    const mlaId = seedMlaSource({ mla_book_title: "Historiography Source" });
    historiographyModel.createComposite({
      slug: "hist-with-source",
      essay_title: "Hist Title",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = historiographyModel.getDetailBySlug("hist-with-source");
    assert.ok(detail);
    assert.equal(detail.mla_sources.length, 1);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Historiography Source");

    // bibliography is also present for frontend rendering
    assert.ok(Array.isArray(detail.bibliography));
    assert.equal(detail.bibliography.length, 1);
  });

  test("getDetailBySlug returns resolved identifiers with id", () => {
    const identifierId = seedIdentifier({ isbn: "444-4-44-444444-4" });
    historiographyModel.createComposite({
      slug: "hist-with-id",
      essay_title: "Hist With ID",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = historiographyModel.getDetailBySlug("hist-with-id");
    assert.ok(detail);
    assert.equal(detail.identifiers.length, 1);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "444-4-44-444444-4");
  });
});

// ---- blog posts ----

describe("blog post detail: resolved mla_sources and identifiers", () => {
  beforeEach(() => {
    db.exec("DELETE FROM blog_posts");
    db.exec("DELETE FROM blog_post_mla_sources");
    db.exec("DELETE FROM blog_post_identifiers");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getDetailBySlug returns resolved mla_sources with id", () => {
    const mlaId = seedMlaSource({ mla_book_title: "Blog Source" });
    blogPostModel.createComposite({
      slug: "blog-with-source",
      blog_title: "Blog Title",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = blogPostModel.getDetailBySlug("blog-with-source");
    assert.ok(detail);
    assert.equal(detail.mla_sources.length, 1);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Blog Source");
  });

  test("getDetailBySlug returns resolved identifiers with id", () => {
    const identifierId = seedIdentifier({ isbn: "555-5-55-555555-5" });
    blogPostModel.createComposite({
      slug: "blog-with-id",
      blog_title: "Blog With ID",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = blogPostModel.getDetailBySlug("blog-with-id");
    assert.ok(detail);
    assert.equal(detail.identifiers.length, 1);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "555-5-55-555555-5");
  });
});

// ---- multiple links and ordering ----

describe("resolved arrays: multiple items and ordering", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("multiple mla_sources are returned in citation_order", () => {
    const mla1 = seedMlaSource({ mla_book_title: "First Source" });
    const mla2 = seedMlaSource({ mla_book_title: "Second Source" });
    const mla3 = seedMlaSource({ mla_book_title: "Third Source" });

    // Insert via createComposite — order is the array order.
    evidenceModel.createComposite({
      title: "Multi Source",
      slug: "multi-source",
      published_draft: 1,
      mla_source_ids: [mla2, mla1, mla3], // deliberate non-sequence
    });

    const detail = evidenceModel.getDetailBySlug("multi-source");
    assert.equal(detail.mla_sources.length, 3);
    assertAllHaveId(detail.mla_sources, "mla_sources");
    assert.equal(detail.mla_sources[0].mla_book_title, "Second Source");
    assert.equal(detail.mla_sources[1].mla_book_title, "First Source");
    assert.equal(detail.mla_sources[2].mla_book_title, "Third Source");
  });

  test("multiple identifiers are returned in citation_order", () => {
    const id1 = seedIdentifier({ isbn: "aaa-1" });
    const id2 = seedIdentifier({ isbn: "bbb-2" });
    const id3 = seedIdentifier({ isbn: "ccc-3" });

    evidenceModel.createComposite({
      title: "Multi Identifier",
      slug: "multi-identifier",
      published_draft: 1,
      identifier_ids: [id3, id2, id1],
    });

    const detail = evidenceModel.getDetailBySlug("multi-identifier");
    assert.equal(detail.identifiers.length, 3);
    assertAllHaveId(detail.identifiers, "identifiers");
    assert.equal(detail.identifiers[0].isbn, "ccc-3");
    assert.equal(detail.identifiers[1].isbn, "bbb-2");
    assert.equal(detail.identifiers[2].isbn, "aaa-1");
  });

  test("resolved rows contain all mla_sources columns", () => {
    const mlaId = seedMlaSource({
      mla_book_title: "Full Book",
      mla_book_author: "Full Author",
      mla_book_date: "2023",
    });

    evidenceModel.createComposite({
      title: "Full Source",
      slug: "full-source",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = evidenceModel.getDetailBySlug("full-source");
    const source = detail.mla_sources[0];
    assert.equal(source.id, mlaId);
    assert.equal(source.mla_book_title, "Full Book");
    assert.equal(source.mla_book_author, "Full Author");
    assert.equal(source.mla_book_date, "2023");
    assert.equal(source.published_draft, 1);
  });

  test("resolved rows contain all identifiers columns", () => {
    const identifierId = seedIdentifier({
      isbn: "978-0-00-000000-0",
      isbn_book_title: "Full ISBN Book",
      isbn_book_author: "Full ISBN Author",
    });

    evidenceModel.createComposite({
      title: "Full Identifier",
      slug: "full-identifier",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    const detail = evidenceModel.getDetailBySlug("full-identifier");
    const ident = detail.identifiers[0];
    assert.equal(ident.id, identifierId);
    assert.equal(ident.isbn, "978-0-00-000000-0");
    assert.equal(ident.isbn_book_title, "Full ISBN Book");
    assert.equal(ident.isbn_book_author, "Full ISBN Author");
    assert.equal(ident.published_draft, 1);
  });
});
