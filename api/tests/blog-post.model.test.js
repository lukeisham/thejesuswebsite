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

  test("getAllPublished rows carry list columns and a body prefix, getAllAdmin the full body", () => {
    const body = "x".repeat(3000);
    model.create({
      slug: "long-post",
      blog_title: "Long",
      blog_content: body,
      metadata_keywords: "a, b",
      published_draft: 1,
    });

    const [row] = model.getAllPublished();
    assert.deepEqual(Object.keys(row).sort(), [
      "blog_content",
      "blog_date",
      "blog_thumbnail",
      "blog_title",
      "created_at",
      "hero_image",
      "id",
      "slug",
      "updated_at",
    ]);
    assert.equal(row.blog_content.length, 1500);

    const [adminRow] = model.getAllAdmin();
    assert.equal(adminRow.blog_content.length, 3000);
  });

  test("update changes only the given field and remove deletes the row", () => {
    const { id } = model.create({ slug: "edit-me", blog_title: "Before" });
    const updated = model.update(id, { blog_title: "After" });
    assert.equal(updated.blog_title, "After");
    assert.equal(updated.slug, "edit-me");

    assert.equal(model.remove(id), true);
    assert.equal(model.getById(id), undefined);
  });

  test("updateComposite keeps breakouts and identifiers when their keys are absent, clears them on []", () => {
    const identifierId = testDb
      .prepare("INSERT INTO identifiers (isbn, published_draft) VALUES (?, 1)")
      .run("978-3-16-148410-0").lastInsertRowid;
    const created = model.createComposite({
      slug: "keep-relations",
      blog_title: "Before",
      breakouts: [{ title: "Section", content: "Body" }],
      identifier_ids: [identifierId],
    });

    const kept = model.updateComposite(created.id, { blog_title: "After" });
    assert.equal(kept.blog_title, "After");
    assert.equal(kept.breakouts.length, 1);
    assert.equal(kept.identifiers.length, 1);

    const cleared = model.updateComposite(created.id, {
      breakouts: [],
      identifier_ids: [],
    });
    assert.equal(cleared.breakouts.length, 0);
    assert.equal(cleared.identifiers.length, 0);
  });

  test("update and remove report a missing id instead of throwing", () => {
    assert.equal(model.update(99999, { blog_title: "x" }), undefined);
    assert.equal(model.remove(99999), false);
  });
});
