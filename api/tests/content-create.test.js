// Content-create regression tests — uses node:test + node:assert.
//
// Regression net for the live "Failed to save evidence: Failed to create
// evidence." bug: creates one valid record through every content-type model
// (evidence, blog post, news article, essay, historiography, response),
// asserting the insert succeeds, and confirms a CHECK-violating value is
// rejected cleanly rather than silently accepted. Uses an in-memory SQLite DB
// built from schema.sql for isolation (JS-2: no shared state).

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.resolve(__dirname, "..", "..", "database", "schema.sql");

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const evidenceModel = require("../models/evidence.model");
const blogPostModel = require("../models/blog-post.model");
const newsArticleModel = require("../models/news-article.model");
const essayModel = require("../models/essay.model");
const historiographyModel = require("../models/historiography.model");
const responseModel = require("../models/response.model");

beforeEach(() => {
  db.exec("DELETE FROM evidence");
  db.exec("DELETE FROM blog_posts");
  db.exec("DELETE FROM news_articles");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM historiography");
  db.exec("DELETE FROM responses");
});

describe("create: every content type accepts a valid new record", () => {
  test("evidence", () => {
    const created = evidenceModel.create({
      title: "Test Evidence",
      slug: "test-evidence-create",
      timeline_era: "beginning",
      timeline_period: "PreIncarnation",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-evidence-create");
  });

  test("blog post", () => {
    const created = blogPostModel.create({
      slug: "test-blog-create",
      blog_title: "Test Blog Post",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-blog-create");
  });

  test("news article", () => {
    const created = newsArticleModel.create({
      slug: "test-news-create",
      news_article_title: "Test News Article",
      news_article_url: "https://example.com/article",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-news-create");
  });

  test("contextual essay", () => {
    const created = essayModel.create({
      slug: "test-essay-create",
      essay_title: "Test Essay",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-essay-create");
  });

  test("historiography", () => {
    const created = historiographyModel.create({
      slug: "test-historiography-create",
      essay_title: "Test Historiography",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-historiography-create");
  });

  test("response", () => {
    const created = responseModel.create({
      slug: "test-response-create",
      response_title: "Test Response",
    });
    assert.ok(created.id);
    assert.equal(created.slug, "test-response-create");
  });
});

describe("create: evidence accepts every valid timeline_era and a sample of timeline_period", () => {
  for (const era of ["beginning", "middle", "end"]) {
    test(`timeline_era '${era}'`, () => {
      const created = evidenceModel.create({
        title: `Era ${era}`,
        slug: `era-${era}`,
        timeline_era: era,
      });
      assert.equal(created.timeline_era, era);
    });
  }

  for (const period of [
    "PreIncarnation",
    "LifeBaptism",
    "GalileeSermonMount",
    "PassionFridayDeath",
    "PassionSundayResurrection",
    "ReturnOfJesus",
  ]) {
    test(`timeline_period '${period}'`, () => {
      const created = evidenceModel.create({
        title: `Period ${period}`,
        slug: `period-${period.toLowerCase()}`,
        timeline_period: period,
      });
      assert.equal(created.timeline_period, period);
    });
  }
});

describe("create: CHECK-violating values are rejected cleanly", () => {
  test("evidence rejects an invalid timeline_era", () => {
    assert.throws(
      () =>
        evidenceModel.create({
          title: "Bad Era",
          slug: "bad-era",
          timeline_era: "ministry-Galilee",
        }),
      /CHECK constraint failed/,
    );
  });

  test("evidence rejects an invalid timeline_period", () => {
    assert.throws(
      () =>
        evidenceModel.create({
          title: "Bad Period",
          slug: "bad-period",
          timeline_period: "NotARealPeriod",
        }),
      /CHECK constraint failed/,
    );
  });

  test("evidence rejects an invalid gospel_category", () => {
    assert.throws(
      () =>
        evidenceModel.create({
          title: "Bad Category",
          slug: "bad-category",
          gospel_category: "not-a-real-category",
        }),
      /CHECK constraint failed/,
    );
  });
});
