// Content model tests — uses node:test + node:assert with an in-memory SQLite
// database. Tests that getAllContent() returns both published and draft rows,
// that challenges rows are correctly tagged by academic_popular, and that
// wikipedia/news-articles are excluded.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const db = createTestDb();

// Mock the config module so content.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: db,
};

const contentModel = require("../models/content.model");

function clearAll() {
  db.exec("DELETE FROM evidence");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM responses");
  db.exec("DELETE FROM historiography");
  db.exec("DELETE FROM blog_posts");
  db.exec("DELETE FROM collections");
  db.exec("DELETE FROM resources");
  db.exec("DELETE FROM challenges");
  db.exec("DELETE FROM wikipedia_articles");
  db.exec("DELETE FROM news_articles");
}

// ── getAllContent returns both published and draft rows ─────────────────────

describe("getAllContent returns both states", () => {
  beforeEach(clearAll);

  test("returns published and draft evidence rows", () => {
    db.prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES ('Pub', 'pub', 1)",
    ).run();
    db.prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES ('Draft', 'draft', 0)",
    ).run();

    const results = contentModel.getAllContent();
    const types = results.map((r) => r.type);
    const titles = results.map((r) => r.title);
    assert.ok(titles.includes("Pub"));
    assert.ok(titles.includes("Draft"));
  });

  test("returns published and draft blog-post rows", () => {
    db.prepare(
      "INSERT INTO blog_posts (slug, blog_title, published_draft) VALUES ('pub-blog', 'Pub Blog', 1)",
    ).run();
    db.prepare(
      "INSERT INTO blog_posts (slug, blog_title, published_draft) VALUES ('draft-blog', 'Draft Blog', 0)",
    ).run();

    const results = contentModel.getAllContent();
    const blogRows = results.filter((r) => r.type === "blog-posts");
    assert.equal(blogRows.length, 2);
  });
});

// ── Challenges are tagged correctly ─────────────────────────────────────────

describe("challenges academic_popular tagging", () => {
  beforeEach(clearAll);

  test("popular row tagged as popular-challenges", () => {
    db.prepare(
      "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES ('pop', 'popular', 'Popular Challenge', 1)",
    ).run();
    db.prepare(
      "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES ('acad', 'academic', 'Academic Challenge', 0)",
    ).run();

    const results = contentModel.getAllContent();
    const popRows = results.filter((r) => r.type === "popular-challenges");
    const acadRows = results.filter((r) => r.type === "academic-challenges");

    assert.equal(popRows.length, 1);
    assert.equal(popRows[0].title, "Popular Challenge");
    assert.equal(acadRows.length, 1);
    assert.equal(acadRows[0].title, "Academic Challenge");
  });
});

// ── Wikipedia and news-articles are excluded ─────────────────────────────────

describe("wikipedia and news-articles excluded", () => {
  beforeEach(clearAll);

  test("no wikipedia rows appear even when seeded", () => {
    db.prepare(
      "INSERT INTO wikipedia_articles (slug, wikipedia_article_title, published_draft) VALUES ('wiki', 'Wiki Title', 1)",
    ).run();

    const results = contentModel.getAllContent();
    const wikiRows = results.filter((r) => r.type === "wikipedia");
    assert.equal(wikiRows.length, 0);
  });

  test("no news-articles rows appear even when seeded", () => {
    db.prepare(
      "INSERT INTO news_articles (slug, news_article_title, published_draft) VALUES ('news', 'News Title', 1)",
    ).run();

    const results = contentModel.getAllContent();
    const newsRows = results.filter((r) => r.type === "news-articles");
    assert.equal(newsRows.length, 0);
  });
});

// ── Resources have list_key populated ───────────────────────────────────────

describe("resources list_key field", () => {
  beforeEach(clearAll);

  test("resources rows carry list_key, non-resources have null list_key", () => {
    db.prepare(
      "INSERT INTO resources (list_key, resource_title, published_draft) VALUES ('people', 'A Person', 1)",
    ).run();
    db.prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES ('Ev', 'ev', 1)",
    ).run();

    const results = contentModel.getAllContent();

    const resRows = results.filter((r) => r.type === "resources");
    assert.equal(resRows.length, 1);
    assert.equal(resRows[0].list_key, "people");
    assert.equal(resRows[0].slug, null);

    const evRows = results.filter((r) => r.type === "evidence");
    assert.equal(evRows.length, 1);
    assert.equal(evRows[0].list_key, null);
  });
});

// ── Shape assertion ─────────────────────────────────────────────────────────

describe("normalised shape", () => {
  beforeEach(clearAll);

  test("each row has id, slug, title, type, published_draft, updated_at, list_key", () => {
    db.prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES ('Shape Test', 'shape', 1)",
    ).run();

    const results = contentModel.getAllContent();
    assert.ok(results.length > 0);

    const row = results[0];
    const keys = Object.keys(row).sort();
    assert.deepEqual(keys, [
      "id",
      "list_key",
      "published_draft",
      "slug",
      "title",
      "type",
      "updated_at",
    ]);
  });
});
