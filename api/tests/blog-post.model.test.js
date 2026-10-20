// Blog post model smoke tests (node:test) against an in-memory database built
// from schema.sql: the write/read round-trip including blog_thumbnail, the
// public-versus-admin read split, the paginated envelope, and the
// missing-id guards on update and remove.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

const testDb = createTestDb();

// blog-post.model.js requires ../config; hand it the in-memory database.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const model = require("../models/blog-post.model");

beforeEach(() => {
  testDb.exec("DELETE FROM blog_posts");
});

describe("blog-post model", () => {
  test("create persists blog_thumbnail and getDetailBySlug returns it with mla_sources", () => {
    const created = model.create({
      slug: "round-trip",
      blog_title: "Round trip",
      blog_thumbnail: "/assets/images/thumb.webp",
      published_draft: 1,
    });
    assert.equal(created.blog_thumbnail, "/assets/images/thumb.webp");

    const detail = model.getDetailBySlug("round-trip");
    assert.equal(detail.blog_thumbnail, "/assets/images/thumb.webp");
    assert.deepEqual(detail.mla_sources, []);
  });

  test("getAllPublished excludes drafts and getAllAdmin includes them", () => {
    model.create({ slug: "live", blog_title: "Live", published_draft: 1 });
    model.create({ slug: "hidden", blog_title: "Hidden", published_draft: 0 });

    const publicSlugs = model.getAllPublished().map((post) => post.slug);
    assert.deepEqual(publicSlugs, ["live"]);
    assert.equal(model.getBySlug("hidden"), undefined);

    const adminSlugs = model.getAllAdmin().map((post) => post.slug).sort();
    assert.deepEqual(adminSlugs, ["hidden", "live"]);
  });

  test("getAllPublished with page and limit returns the paginated envelope", () => {
    for (const n of [1, 2, 3]) {
      model.create({ slug: `page-${n}`, blog_title: `Page ${n}`, published_draft: 1 });
    }
    const result = model.getAllPublished({ page: 1, limit: 2 });
    assert.equal(result.items.length, 2);
    assert.equal(result.total, 3);
    assert.equal(result.totalPages, 2);
  });

  test("update changes only the given field and remove deletes the row", () => {
    const { id } = model.create({ slug: "edit-me", blog_title: "Before" });
    const updated = model.update(id, { blog_title: "After" });
    assert.equal(updated.blog_title, "After");
    assert.equal(updated.slug, "edit-me");

    assert.equal(model.remove(id), true);
    assert.equal(model.getById(id), undefined);
  });

  test("update and remove report a missing id instead of throwing", () => {
    assert.equal(model.update(99999, { blog_title: "x" }), undefined);
    assert.equal(model.remove(99999), false);
  });
});
