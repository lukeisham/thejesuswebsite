// Essay model tests — uses node:test + node:assert with an in-memory SQLite
// database. Tests create/read, slug deduplication, CSV keyword normalization,
// composite create/update with transactions, and public vs admin read filtering.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so essay.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const essayModel = require("../models/essay.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM context_essay_links_context");
  testDb.exec("DELETE FROM context_essay_links_evidence");
  testDb.exec("DELETE FROM context_essay_identifiers");
  testDb.exec("DELETE FROM context_essay_mla_sources");
  testDb.exec("DELETE FROM essay_breakouts");
  testDb.exec("DELETE FROM context_essays");
  testDb.exec("DELETE FROM evidence");
}

function seedEvidence(overrides = {}) {
  const result = testDb
    .prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES (?, ?, ?)"
    )
    .run(
      overrides.title || "Test Evidence",
      overrides.slug || `test-slug-${Date.now()}`,
      overrides.published_draft !== undefined ? overrides.published_draft : 1
    );
  return result.lastInsertRowid;
}

function seedMlaSource() {
  const result = testDb
    .prepare("INSERT INTO mla_sources (mla_book_title) VALUES (?)")
    .run("Test Source");
  return result.lastInsertRowid;
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: essay.model", () => {
  test("module requires cleanly and exports 11 functions", () => {
    const exports = [
      "getAllPublished",
      "getAllAdmin",
      "getBySlug",
      "getById",
      "getDetailBySlug",
      "getAdminById",
      "create",
      "createComposite",
      "update",
      "updateComposite",
      "remove",
    ];

    for (const fn of exports) {
      assert.ok(
        typeof essayModel[fn] === "function",
        `${fn} should be a function`
      );
    }
  });
});

// ── Create and read round-trip ──────────────────────────────────────────────

describe("essay: create() and getById() round-trip", () => {
  beforeEach(clearAll);

  test("create() with minimal valid payload stores and retrieves correctly", () => {
    const created = essayModel.create({
      slug: "my-essay",
      essay_title: "My Essay",
    });

    assert.ok(created.id);
    assert.equal(created.slug, "my-essay");
    assert.equal(created.essay_title, "My Essay");
    assert.ok(created.created_at);

    const retrieved = essayModel.getById(created.id);
    assert.deepStrictEqual(retrieved.slug, created.slug);
    assert.deepStrictEqual(retrieved.essay_title, created.essay_title);
  });

  test("getById() returns undefined for non-existent id", () => {
    const result = essayModel.getById(99999);
    assert.equal(result, undefined);
  });
});

// ── Slug deduplication ──────────────────────────────────────────────────────

describe("essay: slug deduplication", () => {
  beforeEach(clearAll);

  test("creating two essays with the same slug uniquifies the second", () => {
    const first = essayModel.create({
      slug: "duplicate",
      essay_title: "First Essay",
    });

    const second = essayModel.create({
      slug: "duplicate",
      essay_title: "Second Essay",
    });

    assert.equal(first.slug, "duplicate");
    assert.equal(second.slug, "duplicate-2");
    assert.notEqual(first.slug, second.slug);
  });
});

// ── CSV keyword normalization ───────────────────────────────────────────────

describe("essay: CSV keyword normalization on normalizeForPublic()", () => {
  beforeEach(clearAll);

  test("normalizeForPublic() converts metadata_keywords CSV to keywords array", () => {
    const created = essayModel.create({
      slug: "keywords-test",
      essay_title: "Keywords Test",
      metadata_keywords: "faith, jesus, history",
      published_draft: 1,
    });

    // Simulate retrieving published version with normalization
    const published = essayModel.getAllPublished();
    const found = published.find((e) => e.id === created.id);

    assert.ok(found);
    assert.ok(Array.isArray(found.keywords));
    assert.deepStrictEqual(found.keywords, ["faith", "jesus", "history"]);
  });

  test("normalizeForPublic() trims whitespace and filters empty keywords", () => {
    const created = essayModel.create({
      slug: "trim-test",
      essay_title: "Trim Test",
      metadata_keywords: "  hello  ,  , world  ",
      published_draft: 1,
    });

    const published = essayModel.getAllPublished();
    const found = published.find((e) => e.id === created.id);

    assert.ok(found);
    assert.deepStrictEqual(found.keywords, ["hello", "world"]);
  });

  test("normalizeForPublic() handles null/empty metadata_keywords", () => {
    const created = essayModel.create({
      slug: "empty-keywords",
      essay_title: "Empty Keywords",
      metadata_keywords: null,
      published_draft: 1,
    });

    const published = essayModel.getAllPublished();
    const found = published.find((e) => e.id === created.id);

    assert.ok(found);
    assert.deepStrictEqual(found.keywords, []);
  });
});

// ── Composite create with child rows ────────────────────────────────────────

describe("essay: createComposite() writes child/junction rows", () => {
  beforeEach(clearAll);

  test("createComposite() creates essay and associated breakouts in a transaction", () => {
    const sourceId = seedMlaSource();
    const created = essayModel.createComposite({
      slug: "composite-test",
      essay_title: "Composite Test",
      breakouts: [
        { title: "Section 1", content: "Content 1" },
        { title: "Section 2", content: "Content 2" },
      ],
      mla_source_ids: [sourceId],
    });

    assert.ok(created.id);
    assert.equal(created.breakouts.length, 2);
    assert.equal(created.breakouts[0].title, "Section 1");
    assert.equal(created.breakouts[1].title, "Section 2");
    assert.ok(created.mla_sources.length > 0);
  });

  test("createComposite() rolls back the essay row when a child insert fails", () => {
    const before = testDb
      .prepare("SELECT COUNT(*) as count FROM context_essays")
      .get().count;

    // mla_source_ids references a non-existent mla_sources row, which should
    // fail on the FK-constrained junction insert and roll back the whole
    // transaction, including the already-inserted essay row.
    assert.throws(() => {
      essayModel.createComposite({
        slug: "rollback-test",
        essay_title: "Rollback Test",
        breakouts: [{ title: "Valid", content: "Content" }],
        mla_source_ids: [999999],
      });
    });

    const after = testDb
      .prepare("SELECT COUNT(*) as count FROM context_essays")
      .get().count;
    assert.equal(after, before, "essay row must be rolled back on child insert failure");

    const found = essayModel.getBySlug("rollback-test");
    assert.equal(found, undefined);
  });
});

// ── Public vs admin read filtering ──────────────────────────────────────────

describe("essay: public vs admin read filtering", () => {
  beforeEach(clearAll);

  test("getBySlug() returns undefined for draft essays (public filter)", () => {
    const draft = essayModel.create({
      slug: "draft-essay",
      essay_title: "Draft Essay",
      published_draft: 0,
    });

    const result = essayModel.getBySlug(draft.slug);
    assert.equal(result, undefined);
  });

  test("getById() returns draft essays (admin read)", () => {
    const draft = essayModel.create({
      slug: "admin-draft",
      essay_title: "Admin Draft",
      published_draft: 0,
    });

    const result = essayModel.getById(draft.id);
    assert.ok(result);
    assert.equal(result.published_draft, 0);
  });

  test("getDetailBySlug() normalizeForPublic() only on published reads", () => {
    const published = essayModel.create({
      slug: "detail-public",
      essay_title: "Detail Public",
      metadata_keywords: "test, keywords",
      published_draft: 1,
    });

    const detail = essayModel.getDetailBySlug(published.slug);
    assert.ok(detail);
    // Public detail should have normalized keywords array
    assert.ok(Array.isArray(detail.keywords));
    assert.deepStrictEqual(detail.keywords, ["test", "keywords"]);

    // Admin detail should have raw metadata_keywords string
    const adminDetail = essayModel.getAdminById(published.id);
    assert.ok(adminDetail);
    assert.equal(adminDetail.metadata_keywords, "test, keywords");
    // Admin detail should NOT have keywords array (it's not normalized)
    assert.equal(adminDetail.keywords, undefined);
  });
});

// ── Named-column reads (SQL-9: no SELECT * drift) ──────────────────────────

describe("essay: named-column reads return exactly the expected keys", () => {
  beforeEach(clearAll);

  const RAW_COLUMNS = [
    "id",
    "slug",
    "essay_title",
    "essay_content",
    "essay_author",
    "essay_date",
    "essay_publisher",
    "essay_headings",
    "published_draft",
    "metadata_keywords",
    "two_column",
    "doi",
    "author_bio",
    "created_at",
    "updated_at",
  ].sort();

  const NORMALIZED_COLUMNS = [
    "id",
    "slug",
    "essay_date",
    "essay_publisher",
    "essay_headings",
    "published_draft",
    "two_column",
    "doi",
    "author_bio",
    "created_at",
    "updated_at",
    "title",
    "author",
    "body",
    "keywords",
    "mla_sources",
  ].sort();

  test("getAllAdmin() rows have exactly the raw column keys", () => {
    essayModel.create({ slug: "admin-cols", essay_title: "Admin Cols" });

    const rows = essayModel.getAllAdmin();
    assert.ok(rows.length > 0);
    assert.deepStrictEqual(Object.keys(rows[0]).sort(), RAW_COLUMNS);
  });

  test("getById() row has exactly the raw column keys", () => {
    const created = essayModel.create({
      slug: "byid-cols",
      essay_title: "By Id Cols",
    });

    const row = essayModel.getById(created.id);
    assert.deepStrictEqual(Object.keys(row).sort(), RAW_COLUMNS);
  });

  test("getAllPublished() rows have exactly the normalized public keys", () => {
    essayModel.create({
      slug: "published-cols",
      essay_title: "Published Cols",
      published_draft: 1,
    });

    const rows = essayModel.getAllPublished();
    assert.ok(rows.length > 0);
    assert.deepStrictEqual(Object.keys(rows[0]).sort(), NORMALIZED_COLUMNS);
  });
});

// ── Guard/failure paths ─────────────────────────────────────────────────────

describe("essay: guard paths", () => {
  beforeEach(clearAll);

  test("remove() returns false for non-existent essay id", () => {
    const result = essayModel.remove(99999);
    assert.equal(result, false);
  });

  test("update() returns undefined for non-existent essay id", () => {
    const result = essayModel.update(99999, { essay_title: "New Title" });
    assert.equal(result, undefined);
  });

  test("getDetailBySlug() returns undefined for non-existent slug", () => {
    const result = essayModel.getDetailBySlug("nonexistent-essay-slug");
    assert.equal(result, undefined);
  });
});
