// Wikipedia model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests create/read round-trip, slug deduplication,
// signal attachment, and getAllPublished pagination (API-8).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so wikipedia.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const wikipediaModel = require("../models/wikipedia.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM wikipedia_article_signals");
  testDb.exec("DELETE FROM wikipedia_articles");
}

function seedArticle(overrides = {}) {
  return wikipediaModel.create({
    slug: overrides.slug || "test-article",
    wikipedia_article_title: overrides.wikipedia_article_title || "Test Article",
    wikipedia_article_url: overrides.wikipedia_article_url || "https://en.wikipedia.org/wiki/Test",
    wikipedia_article_rank_number:
      overrides.wikipedia_article_rank_number !== undefined
        ? overrides.wikipedia_article_rank_number
        : 1,
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    ...overrides,
  });
}

function addSignal(articleId, signalKey, contribution, cap) {
  testDb
    .prepare(
      "INSERT INTO wikipedia_article_signals (wikipedia_article_id, signal_key, contribution, cap) VALUES (?, ?, ?, ?)",
    )
    .run(articleId, signalKey, contribution, cap);
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: wikipedia.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof wikipediaModel.getAllPublished === "function");
    assert.ok(typeof wikipediaModel.create === "function");
    assert.ok(typeof wikipediaModel.getBySlug === "function");
    assert.ok(typeof wikipediaModel.getById === "function");
  });
});

// ── Create and read round-trip ──────────────────────────────────────────────

describe("wikipedia: create() and read round-trip", () => {
  beforeEach(clearAll);

  test("create() returns a valid row with generated id", () => {
    const row = seedArticle();
    assert.ok(row.id, "row should have an id");
    assert.equal(row.wikipedia_article_title, "Test Article");
    assert.equal(row.slug, "test-article");
  });

  test("getBySlug() returns the published article with a signals array", () => {
    const created = seedArticle({ published_draft: 1 });
    const found = wikipediaModel.getBySlug(created.slug);
    assert.ok(found);
    assert.ok(Array.isArray(found.signals));
  });

  test("getBySlug() returns undefined for a draft article", () => {
    const created = seedArticle({ published_draft: 0 });
    const found = wikipediaModel.getBySlug(created.slug);
    assert.equal(found, undefined);
  });
});

// ── getAllPublished ordering and signals ────────────────────────────────────

describe("wikipedia: getAllPublished ordering and signals", () => {
  beforeEach(clearAll);

  test("orders by wikipedia_article_rank_number ascending", () => {
    seedArticle({ slug: "third", wikipedia_article_rank_number: 3 });
    seedArticle({ slug: "first", wikipedia_article_rank_number: 1 });
    seedArticle({ slug: "second", wikipedia_article_rank_number: 2 });

    const results = wikipediaModel.getAllPublished();
    assert.deepStrictEqual(
      results.map((r) => r.slug),
      ["first", "second", "third"],
    );
  });

  test("each article carries a signals array", () => {
    const article = seedArticle();
    addSignal(article.id, "data-bucket", 5, 10);

    const results = wikipediaModel.getAllPublished();
    const found = results.find((r) => r.id === article.id);
    assert.ok(Array.isArray(found.signals));
    assert.equal(found.signals.length, 1);
    assert.equal(found.signals[0].signal_key, "data-bucket");
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("wikipedia: getAllPublished pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedArticle({ slug: "a1", wikipedia_article_rank_number: 1 });
    seedArticle({ slug: "a2", wikipedia_article_rank_number: 2 });
    seedArticle({ slug: "a3", wikipedia_article_rank_number: 3 });

    const result = wikipediaModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope", () => {
    seedArticle({ slug: "a1", wikipedia_article_rank_number: 1 });
    seedArticle({ slug: "a2", wikipedia_article_rank_number: 2 });
    seedArticle({ slug: "a3", wikipedia_article_rank_number: 3 });

    const result = wikipediaModel.getAllPublished({ page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    assert.equal(result.total, 3);
  });

  test("signals are attached correctly on a paginated (not full) result set", () => {
    const a1 = seedArticle({ slug: "a1", wikipedia_article_rank_number: 1 });
    const a2 = seedArticle({ slug: "a2", wikipedia_article_rank_number: 2 });
    seedArticle({ slug: "a3", wikipedia_article_rank_number: 3 });

    addSignal(a1.id, "data-bucket", 5, 10);
    addSignal(a2.id, "register", -2, -5);

    const result = wikipediaModel.getAllPublished({ page: 1, limit: 2 });
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].slug, "a1");
    assert.equal(result.items[0].signals.length, 1);
    assert.equal(result.items[0].signals[0].signal_key, "data-bucket");
    assert.equal(result.items[1].slug, "a2");
    assert.equal(result.items[1].signals[0].signal_key, "register");
  });
});
