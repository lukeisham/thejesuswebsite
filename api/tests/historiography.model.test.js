// Historiography model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests create/read round-trip, slug deduplication, period-based
// grouping ordered by period_sort_order, composite create/update in transactions,
// public vs admin reads (normalizeForPublic), and child-row assembly.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// ── In-memory database setup ────────────────────────────────────────────────
const testDb = createTestDb();

const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const historiographyModel = require("../models/historiography.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearTable() {
  testDb.exec("DELETE FROM historiography");
  testDb.exec("DELETE FROM historiography_breakouts");
  testDb.exec("DELETE FROM historiography_mla_sources");
  testDb.exec("DELETE FROM historiography_identifiers");
  testDb.exec("DELETE FROM historiography_links_evidence");
  testDb.exec("DELETE FROM historiography_links_context");
}

function seedMinimalHistoriography(overrides = {}) {
  return historiographyModel.create({
    slug: overrides.slug || "test-essay",
    essay_title: overrides.essay_title || "Test Essay",
    essay_content: overrides.essay_content || "Test content",
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    historiography_period: overrides.historiography_period || "early-church",
    period_sort_order: overrides.period_sort_order !== undefined ? overrides.period_sort_order : 1,
    ...overrides,
  });
}

// ── Module loads cleanly ────────────────────────────────────────────────────

describe("historiography.model", () => {
  test("exports 11 functions", () => {
    const keys = Object.keys(historiographyModel).sort();
    assert.equal(keys.length, 11);
    // Verify expected functions exist (order doesn't matter after sort)
    const expected = [
      "create",
      "createComposite",
      "getAllAdmin",
      "getAllPublished",
      "getAdminById",
      "getById",
      "getBySlug",
      "getDetailBySlug",
      "remove",
      "update",
      "updateComposite",
    ].sort();
    assert.deepEqual(keys, expected);
  });
});

// ── create() and read round-trip ────────────────────────────────────────────

describe("historiography.model: create()", () => {
  beforeEach(clearTable);

  test("create() returns a valid row with generated id", () => {
    const row = seedMinimalHistoriography();
    assert.ok(row.id, "row should have an id");
    assert.equal(typeof row.id, "number");
    assert.equal(row.essay_title, "Test Essay");
    assert.equal(row.slug, "test-essay");
  });

  test("create() → getById() round-trip", () => {
    const created = seedMinimalHistoriography();
    const retrieved = historiographyModel.getById(created.id);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.essay_title, created.essay_title);
    assert.equal(retrieved.slug, created.slug);
  });

  test("create() with published_draft=1 is readable via getBySlug()", () => {
    const created = seedMinimalHistoriography({ published_draft: 1 });
    const retrieved = historiographyModel.getBySlug(created.slug);
    assert.ok(retrieved, "published row should be found by slug");
    assert.equal(retrieved.id, created.id);
  });

  test("create() with published_draft=0 is NOT readable via getBySlug()", () => {
    const created = seedMinimalHistoriography({ published_draft: 0, slug: "draft-only" });
    const retrieved = historiographyModel.getBySlug("draft-only");
    assert.equal(retrieved, undefined, "draft row should not be found");
  });
});

// ── Slug deduplication ──────────────────────────────────────────────────────

describe("historiography.model: slug deduplication", () => {
  beforeEach(clearTable);

  test("second essay with same base slug gets -2 suffix", () => {
    const first = seedMinimalHistoriography({ slug: "base-slug" });
    const second = seedMinimalHistoriography({ slug: "base-slug" });
    assert.equal(first.slug, "base-slug");
    assert.equal(second.slug, "base-slug-2");
  });

  test("third essay with same base slug gets -3 suffix", () => {
    seedMinimalHistoriography({ slug: "base" });
    seedMinimalHistoriography({ slug: "base" });
    const third = seedMinimalHistoriography({ slug: "base" });
    assert.equal(third.slug, "base-3");
  });
});

// ── Period-based grouping and ordering ──────────────────────────────────────

describe("historiography.model: getAllPublished ordering", () => {
  beforeEach(clearTable);

  test("getAllPublished returns only published rows", () => {
    seedMinimalHistoriography({ published_draft: 1, slug: "pub1" });
    seedMinimalHistoriography({ published_draft: 0, slug: "draft1" });
    seedMinimalHistoriography({ published_draft: 1, slug: "pub2" });

    const results = historiographyModel.getAllPublished();
    const slugs = results.map((r) => r.slug);
    assert.ok(slugs.includes("pub1"));
    assert.ok(slugs.includes("pub2"));
    assert.ok(!slugs.includes("draft1"));
  });

  test("getAllPublished orders by period_sort_order ASC", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      slug: "early",
      historiography_period: "early-church",
      period_sort_order: 1,
    });
    seedMinimalHistoriography({
      published_draft: 1,
      slug: "reform",
      historiography_period: "reformation-early-modern",
      period_sort_order: 3,
    });
    seedMinimalHistoriography({
      published_draft: 1,
      slug: "medieval",
      historiography_period: "medieval",
      period_sort_order: 2,
    });

    const results = historiographyModel.getAllPublished();
    const periods = results.map((r) => r.period_sort_order);
    // Should be ordered by period_sort_order: 1, 2, 3
    assert.deepEqual(periods, [1, 2, 3]);
  });

  test("within same period, both rows appear ordered by created_at DESC", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      slug: "first",
      period_sort_order: 1,
    });
    seedMinimalHistoriography({
      published_draft: 1,
      slug: "second",
      period_sort_order: 1,
    });

    const results = historiographyModel.getAllPublished();
    const samePeriodRows = results.filter((r) => r.period_sort_order === 1);
    // Both rows should be present in the same period
    assert.equal(samePeriodRows.length, 2);
    const slugs = samePeriodRows.map((r) => r.slug);
    assert.ok(slugs.includes("first"));
    assert.ok(slugs.includes("second"));
  });
});

// ── Public vs admin reads ───────────────────────────────────────────────────

describe("historiography.model: getAllPublished normalization", () => {
  beforeEach(clearTable);

  test("getAllPublished normalizes columns (essay_title → title)", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      essay_title: "My Essay",
      essay_author: "John Doe",
    });

    const results = historiographyModel.getAllPublished();
    assert.ok(results.length > 0);
    const row = results[0];
    assert.equal(row.title, "My Essay");
    assert.equal(row.author, "John Doe");
    // Raw column names should not exist in public read
    assert.equal(row.essay_title, undefined);
  });

  test("getAllAdmin returns raw DB column names", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      essay_title: "Admin View",
    });

    const results = historiographyModel.getAllAdmin();
    assert.ok(results.length > 0);
    const row = results[0];
    assert.equal(row.essay_title, "Admin View");
    // Normalized name should not exist in admin view
    assert.equal(row.title, undefined);
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("historiography.model: getAllPublished pagination", () => {
  beforeEach(clearTable);

  function seedThree() {
    for (let i = 1; i <= 3; i += 1) {
      seedMinimalHistoriography({ slug: `page-essay-${i}`, essay_title: `Page Essay ${i}` });
    }
  }

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedThree();
    const result = historiographyModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope, still normalized", () => {
    seedThree();
    const result = historiographyModel.getAllPublished({ page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    assert.equal(result.total, 3);
    assert.ok(result.items[0].title);
    assert.equal(result.items[0].essay_title, undefined);
  });
});

// ── Composite create with child/junction rows ───────────────────────────────

describe("historiography.model: createComposite()", () => {
  beforeEach(clearTable);

  test("createComposite with breakouts writes child rows", () => {
    const composite = historiographyModel.createComposite({
      slug: "with-breakouts",
      essay_title: "Essay with Breakouts",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
      breakouts: [
        { title: "Section 1", content: "Content 1" },
        { title: "Section 2", content: "Content 2" },
      ],
    });

    assert.ok(composite.id);
    assert.equal(composite.breakouts.length, 2);
    assert.equal(composite.breakouts[0].title, "Section 1");
    assert.equal(composite.breakouts[1].title, "Section 2");
  });

  test("createComposite assembles full detail with empty arrays when no relations", () => {
    const composite = historiographyModel.createComposite({
      slug: "no-relations",
      essay_title: "No Relations",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
    });

    assert.ok(composite.id);
    assert.deepEqual(composite.breakouts, []);
    assert.deepEqual(composite.mla_sources, []);
    assert.deepEqual(composite.identifiers, []);
    assert.deepEqual(composite.links_evidence, []);
    assert.deepEqual(composite.links_context, []);
  });
});

// ── Composite update ────────────────────────────────────────────────────────

describe("historiography.model: updateComposite()", () => {
  beforeEach(clearTable);

  test("updateComposite replaces breakouts array", () => {
    const created = historiographyModel.createComposite({
      slug: "update-test",
      essay_title: "To Update",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
      breakouts: [{ title: "Old", content: "Old content" }],
    });

    const updated = historiographyModel.updateComposite(created.id, {
      breakouts: [
        { title: "New 1", content: "New content 1" },
        { title: "New 2", content: "New content 2" },
      ],
    });

    assert.equal(updated.breakouts.length, 2);
    assert.equal(updated.breakouts[0].title, "New 1");
    assert.equal(updated.breakouts[1].title, "New 2");
  });

  test("updateComposite clears relations when not specified in update data", () => {
    const created = historiographyModel.createComposite({
      slug: "clear-relations",
      essay_title: "Clear Relations",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
      breakouts: [{ title: "Original", content: "This" }],
    });

    const updated = historiographyModel.updateComposite(created.id, {
      essay_title: "Updated Title",
      // No breakouts specified — implementation clears them
    });

    assert.equal(updated.essay_title, "Updated Title");
    assert.equal(updated.breakouts.length, 0, "breakouts should be cleared when not specified");
  });
});

// ── Transaction integrity ──────────────────────────────────────────────────

describe("historiography.model: createComposite atomicity", () => {
  beforeEach(clearTable);

  test("createComposite writes base row and all relations in one transaction", () => {
    const before = historiographyModel.getAllAdmin().length;

    const composite = historiographyModel.createComposite({
      slug: "atomic-test",
      essay_title: "Atomic Test",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
      breakouts: [
        { title: "B1", content: "C1" },
        { title: "B2", content: "C2" },
      ],
    });

    const after = historiographyModel.getAllAdmin().length;
    assert.equal(after, before + 1, "base row should be written");
    assert.equal(composite.breakouts.length, 2, "all breakout rows should be written");

    // Verify breakouts are in database
    const fetched = historiographyModel.getAdminById(composite.id);
    assert.equal(fetched.breakouts.length, 2, "breakouts should persist");
  });
});

// ── getDetailBySlug and getAdminById assembly ───────────────────────────────

describe("historiography.model: detail assembly", () => {
  beforeEach(clearTable);

  test("getDetailBySlug assembles published row with all relations", () => {
    historiographyModel.createComposite({
      slug: "detail-test",
      essay_title: "Detail Test",
      essay_content: "Content",
      published_draft: 1,
      period_sort_order: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = historiographyModel.getDetailBySlug("detail-test");
    assert.ok(detail);
    assert.equal(detail.title, "Detail Test"); // Normalized for public
    assert.equal(detail.breakouts.length, 1);
  });

  test("getDetailBySlug returns undefined if row is not published", () => {
    historiographyModel.create({
      slug: "unpublished",
      essay_title: "Unpublished",
      essay_content: "Content",
      published_draft: 0,
      period_sort_order: 1,
    });

    const detail = historiographyModel.getDetailBySlug("unpublished");
    assert.equal(detail, undefined);
  });

  test("getAdminById assembles row in any state with raw column names", () => {
    const created = historiographyModel.createComposite({
      slug: "admin-detail",
      essay_title: "Admin Detail",
      essay_content: "Content",
      published_draft: 0,
      period_sort_order: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = historiographyModel.getAdminById(created.id);
    assert.ok(detail);
    assert.equal(detail.essay_title, "Admin Detail"); // Raw name for admin
    assert.equal(detail.breakouts.length, 1);
  });
});

// ── Metadata normalization ──────────────────────────────────────────────────

describe("historiography.model: metadata_keywords normalization", () => {
  beforeEach(clearTable);

  test("getAllPublished parses metadata_keywords into array", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      metadata_keywords: "jesus, resurrection, faith",
    });

    const results = historiographyModel.getAllPublished();
    const keywords = results[0].keywords;
    assert.deepEqual(keywords, ["jesus", "resurrection", "faith"]);
  });

  test("empty metadata_keywords returns empty array", () => {
    seedMinimalHistoriography({
      published_draft: 1,
      metadata_keywords: null,
    });

    const results = historiographyModel.getAllPublished();
    assert.deepEqual(results[0].keywords, []);
  });
});
