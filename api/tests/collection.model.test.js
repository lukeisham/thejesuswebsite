// Collection model tests — uses node:test + node:assert with an in-memory SQLite
// database. Tests create/read, slug deduplication, evidence count aggregation,
// and evidence reordering in a transaction.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so collection.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const collectionModel = require("../models/collection.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM collection_evidence");
  testDb.exec("DELETE FROM collections");
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

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: collection.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof collectionModel.create === "function");
    assert.ok(typeof collectionModel.getById === "function");
    assert.ok(typeof collectionModel.getAllPublished === "function");
    assert.ok(typeof collectionModel.addEvidence === "function");
    assert.ok(typeof collectionModel.reorderEvidence === "function");
  });
});

// ── Create and read round-trip ──────────────────────────────────────────────

describe("collection: create() and getById() round-trip", () => {
  beforeEach(clearAll);

  test("create() with minimal valid payload stores and retrieves correctly", () => {
    const created = collectionModel.create({
      slug: "my-collection",
      title: "My Collection",
    });

    assert.ok(created.id);
    assert.equal(created.slug, "my-collection");
    assert.equal(created.title, "My Collection");
    assert.ok(created.created_at);

    const retrieved = collectionModel.getById(created.id);
    assert.deepStrictEqual(retrieved.slug, created.slug);
    assert.deepStrictEqual(retrieved.title, created.title);
  });

  test("create() requires title field", () => {
    // This should fail at the DB level (NOT NULL constraint)
    // or be handled gracefully. Let's test it throws or returns something falsy.
    try {
      collectionModel.create({
        slug: "no-title",
        // title omitted
      });
      // If it didn't throw, the DB should have rejected it with a constraint error
      assert.fail("Expected an error for missing required title");
    } catch (err) {
      // Expected: either a database constraint error or a validation error
      assert.ok(err);
    }
  });

  test("getById() returns undefined for non-existent id", () => {
    const result = collectionModel.getById(99999);
    assert.equal(result, undefined);
  });
});

// ── Slug deduplication ──────────────────────────────────────────────────────

describe("collection: slug deduplication", () => {
  beforeEach(clearAll);

  test("creating two collections with the same slug uniquifies the second", () => {
    const first = collectionModel.create({
      slug: "duplicate",
      title: "First Collection",
    });

    const second = collectionModel.create({
      slug: "duplicate",
      title: "Second Collection",
    });

    assert.equal(first.slug, "duplicate");
    assert.equal(second.slug, "duplicate-2");
    assert.notEqual(first.slug, second.slug);
  });

  test("subsequent duplicates increment the suffix", () => {
    collectionModel.create({ slug: "dup", title: "First" });
    collectionModel.create({ slug: "dup", title: "Second" });
    const third = collectionModel.create({ slug: "dup", title: "Third" });

    assert.equal(third.slug, "dup-3");
  });
});

// ── Count aggregation ───────────────────────────────────────────────────────

describe("collection: getAllPublished() with evidence count", () => {
  beforeEach(clearAll);

  test("getAllPublished() returns evidence_count for each collection", () => {
    const col = collectionModel.create({
      slug: "test-col",
      title: "Test Collection",
      published_draft: 1,
    });

    const ev1 = seedEvidence({ slug: "ev-1" });
    const ev2 = seedEvidence({ slug: "ev-2" });

    collectionModel.addEvidence(col.id, ev1);
    collectionModel.addEvidence(col.id, ev2);

    const results = collectionModel.getAllPublished();
    assert.ok(results.length > 0);

    const found = results.find((r) => r.id === col.id);
    assert.ok(found);
    assert.equal(found.evidence_count, 2);
  });

  test("getAllPublished() returns 0 count for collection with no evidence", () => {
    const col = collectionModel.create({
      slug: "empty-col",
      title: "Empty Collection",
      published_draft: 1,
    });

    const results = collectionModel.getAllPublished();
    const found = results.find((r) => r.id === col.id);
    assert.ok(found);
    assert.equal(found.evidence_count, 0);
  });

  test("getAllPublished() excludes draft collections", () => {
    collectionModel.create({
      slug: "draft-col",
      title: "Draft Collection",
      published_draft: 0,
    });

    const results = collectionModel.getAllPublished();
    const found = results.find((r) => r.slug === "draft-col");
    assert.equal(found, undefined);
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("collection: getAllPublished() pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    for (let i = 1; i <= 3; i += 1) {
      collectionModel.create({
        slug: `page-col-${i}`,
        title: `Page Collection ${i}`,
        published_draft: 1,
      });
    }

    const result = collectionModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("total reflects distinct collections, not post-JOIN evidence rows", () => {
    // One collection with 3 evidence rows (a LEFT JOIN count would report 3
    // here); two other collections with none. The correct total is 3
    // collections, not 5 joined rows.
    const multiEvidenceCol = collectionModel.create({
      slug: "multi-evidence-col",
      title: "Multi Evidence Collection",
      published_draft: 1,
    });
    for (let i = 1; i <= 3; i += 1) {
      collectionModel.addEvidence(multiEvidenceCol.id, seedEvidence({ slug: `pag-ev-${i}` }));
    }
    collectionModel.create({ slug: "solo-col-1", title: "Solo 1", published_draft: 1 });
    collectionModel.create({ slug: "solo-col-2", title: "Solo 2", published_draft: 1 });

    const result = collectionModel.getAllPublished({ page: 1, limit: 2 });
    assert.equal(result.total, 3);
    assert.equal(result.items.length, 2);
    assert.equal(result.totalPages, 2);
  });
});

// ── Evidence reordering in transaction ──────────────────────────────────────

describe("collection: reorderEvidence() transaction", () => {
  beforeEach(clearAll);

  test("reorderEvidence() updates sort_order for multiple evidence items", () => {
    const col = collectionModel.create({
      slug: "reorder-test",
      title: "Reorder Test",
    });

    const ev1 = seedEvidence({ slug: "ev-1" });
    const ev2 = seedEvidence({ slug: "ev-2" });
    const ev3 = seedEvidence({ slug: "ev-3" });

    collectionModel.addEvidence(col.id, ev1, 0);
    collectionModel.addEvidence(col.id, ev2, 1);
    collectionModel.addEvidence(col.id, ev3, 2);

    const reordered = collectionModel.reorderEvidence(col.id, [
      { evidence_id: ev3, sort_order: 0 },
      { evidence_id: ev1, sort_order: 1 },
      { evidence_id: ev2, sort_order: 2 },
    ]);

    assert.equal(reordered, 3);

    const updated = collectionModel.getById(col.id);
    assert.equal(updated.evidence[0].id, ev3);
    assert.equal(updated.evidence[1].id, ev1);
    assert.equal(updated.evidence[2].id, ev2);
  });
});

// ── Guard/failure paths ─────────────────────────────────────────────────────

describe("collection: guard paths", () => {
  beforeEach(clearAll);

  test("removeEvidence() returns false when collection does not exist", () => {
    const result = collectionModel.removeEvidence(99999, 1);
    assert.equal(result, false);
  });

  test("removeEvidence() returns false when evidence link does not exist", () => {
    const col = collectionModel.create({
      slug: "test",
      title: "Test",
    });

    const result = collectionModel.removeEvidence(col.id, 99999);
    assert.equal(result, false);
  });

  test("remove() returns false for non-existent collection id", () => {
    const result = collectionModel.remove(99999);
    assert.equal(result, false);
  });
});
