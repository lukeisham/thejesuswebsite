// News article model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests create/read, slug deduplication, landing page filtering,
// and date-based ordering.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so news-article.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const newsArticleModel = require("../models/news-article.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM news_articles");
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: news-article.model", () => {
  test("module requires cleanly and exports 6 functions", () => {
    const exports = [
      "getAllPublished",
      "getLandingPageArticles",
      "getBySlug",
      "getById",
      "create",
      "update",
      "remove",
    ];

    for (const fn of exports) {
      assert.ok(
        typeof newsArticleModel[fn] === "function",
        `${fn} should be a function`
      );
    }
  });
});

// ── Create and read round-trip ──────────────────────────────────────────────

describe("news-article: create() and getById() round-trip", () => {
  beforeEach(clearAll);

  test("create() with minimal valid payload stores and retrieves correctly", () => {
    const created = newsArticleModel.create({
      slug: "my-article",
      news_article_title: "My Article",
    });

    assert.ok(created.id);
    assert.equal(created.slug, "my-article");
    assert.equal(created.news_article_title, "My Article");

    const retrieved = newsArticleModel.getById(created.id);
    assert.deepStrictEqual(retrieved.slug, created.slug);
    assert.deepStrictEqual(retrieved.news_article_title, created.news_article_title);
  });

  test("getById() returns undefined for non-existent id", () => {
    const result = newsArticleModel.getById(99999);
    assert.equal(result, undefined);
  });
});

// ── Slug deduplication ──────────────────────────────────────────────────────

describe("news-article: slug deduplication", () => {
  beforeEach(clearAll);

  test("creating two articles with the same slug uniquifies the second", () => {
    const first = newsArticleModel.create({
      slug: "breaking-news",
      news_article_title: "Breaking News Part 1",
    });

    const second = newsArticleModel.create({
      slug: "breaking-news",
      news_article_title: "Breaking News Part 2",
    });

    assert.equal(first.slug, "breaking-news");
    assert.equal(second.slug, "breaking-news-2");
    assert.notEqual(first.slug, second.slug);
  });

  test("update() with slug change re-deduplicates", () => {
    const first = newsArticleModel.create({
      slug: "original",
      news_article_title: "First",
    });

    const second = newsArticleModel.create({
      slug: "other",
      news_article_title: "Second",
    });

    // Update second to use "original" slug — should become "original-2"
    const updated = newsArticleModel.update(second.id, {
      slug: "original",
    });

    assert.equal(updated.slug, "original-2");
    assert.equal(first.slug, "original");
  });
});

// ── Landing page filter and date ordering ──────────────────────────────────

describe("news-article: getLandingPageArticles() filter and order", () => {
  beforeEach(clearAll);

  test("getLandingPageArticles() returns only articles with landing_page_display=1", () => {
    newsArticleModel.create({
      slug: "featured-1",
      news_article_title: "Featured Article 1",
      landing_page_display: 1,
      published_draft: 1,
      news_article_date: "2024-01-01",
    });

    newsArticleModel.create({
      slug: "not-featured",
      news_article_title: "Not Featured",
      landing_page_display: 0,
      published_draft: 1,
      news_article_date: "2024-01-02",
    });

    newsArticleModel.create({
      slug: "featured-2",
      news_article_title: "Featured Article 2",
      landing_page_display: 1,
      published_draft: 1,
      news_article_date: "2024-01-03",
    });

    const results = newsArticleModel.getLandingPageArticles();
    assert.equal(results.length, 2);
    assert.ok(
      results.every((r) => r.landing_page_display === 1),
      "All results should have landing_page_display=1"
    );
  });

  test("getLandingPageArticles() orders by news_article_date DESC", () => {
    const older = newsArticleModel.create({
      slug: "older",
      news_article_title: "Older Article",
      landing_page_display: 1,
      published_draft: 1,
      news_article_date: "2024-01-01",
    });

    const newer = newsArticleModel.create({
      slug: "newer",
      news_article_title: "Newer Article",
      landing_page_display: 1,
      published_draft: 1,
      news_article_date: "2024-01-15",
    });

    const results = newsArticleModel.getLandingPageArticles();
    assert.ok(results.length >= 2);
    // Newer article should appear first (DESC order)
    const newerIndex = results.findIndex((r) => r.id === newer.id);
    const olderIndex = results.findIndex((r) => r.id === older.id);
    assert.ok(newerIndex < olderIndex, "Newer article should come before older");
  });

  test("getLandingPageArticles() excludes draft articles", () => {
    newsArticleModel.create({
      slug: "draft-featured",
      news_article_title: "Draft Featured",
      landing_page_display: 1,
      published_draft: 0,
      news_article_date: "2024-01-01",
    });

    const results = newsArticleModel.getLandingPageArticles();
    const found = results.find((r) => r.slug === "draft-featured");
    assert.equal(found, undefined);
  });
});

// ── getAllPublished ordering ────────────────────────────────────────────────

describe("news-article: getAllPublished() date ordering DESC", () => {
  beforeEach(clearAll);

  test("getAllPublished() orders by news_article_date DESC, then id DESC", () => {
    const article1 = newsArticleModel.create({
      slug: "article-1",
      news_article_title: "Article 1",
      published_draft: 1,
      news_article_date: "2024-01-01",
    });

    const article2 = newsArticleModel.create({
      slug: "article-2",
      news_article_title: "Article 2",
      published_draft: 1,
      news_article_date: "2024-01-10",
    });

    const article3 = newsArticleModel.create({
      slug: "article-3",
      news_article_title: "Article 3",
      published_draft: 1,
      news_article_date: "2024-01-10", // Same date as article2, should order by id DESC
    });

    const results = newsArticleModel.getAllPublished();
    assert.ok(results.length >= 3);

    const indices = {
      1: results.findIndex((r) => r.id === article1.id),
      2: results.findIndex((r) => r.id === article2.id),
      3: results.findIndex((r) => r.id === article3.id),
    };

    // article2 and article3 have later dates than article1
    assert.ok(indices[2] < indices[1]);
    assert.ok(indices[3] < indices[1]);

    // article3 should come before article2 (same date, higher id)
    assert.ok(indices[3] < indices[2]);
  });
});

// ── Public slug-based reads ─────────────────────────────────────────────────

describe("news-article: getBySlug() public filtering", () => {
  beforeEach(clearAll);

  test("getBySlug() returns undefined for draft articles", () => {
    const draft = newsArticleModel.create({
      slug: "draft-article",
      news_article_title: "Draft Article",
      published_draft: 0,
    });

    const result = newsArticleModel.getBySlug(draft.slug);
    assert.equal(result, undefined);
  });

  test("getBySlug() returns published articles", () => {
    const published = newsArticleModel.create({
      slug: "published-article",
      news_article_title: "Published Article",
      published_draft: 1,
    });

    const result = newsArticleModel.getBySlug(published.slug);
    assert.ok(result);
    assert.equal(result.id, published.id);
  });
});

// ── Guard/failure paths ─────────────────────────────────────────────────────

describe("news-article: guard paths", () => {
  beforeEach(clearAll);

  test("remove() returns false for non-existent article id", () => {
    const result = newsArticleModel.remove(99999);
    assert.equal(result, false);
  });

  test("update() returns undefined for non-existent article id", () => {
    const result = newsArticleModel.update(99999, {
      news_article_title: "New Title",
    });
    assert.equal(result, undefined);
  });

  test("getBySlug() returns undefined for non-existent slug", () => {
    const result = newsArticleModel.getBySlug("nonexistent-slug-xyz");
    assert.equal(result, undefined);
  });
});
