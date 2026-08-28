// Identifiers model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests create/read round-trip, publish filtering, ordering,
// and getAllPublished pagination (API-8).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so identifiers.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const identifiersModel = require("../models/identifiers.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM identifiers");
}

function seedIdentifier(overrides = {}) {
  return identifiersModel.create({
    isbn: overrides.isbn || "978-0-00-000000-0",
    isbn_book_title: overrides.isbn_book_title || "Test Book",
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    ...overrides,
  });
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: identifiers.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof identifiersModel.getAllPublished === "function");
    assert.ok(typeof identifiersModel.getAllAdmin === "function");
    assert.ok(typeof identifiersModel.create === "function");
  });
});

// ── getAllPublished filtering and ordering ──────────────────────────────────

describe("identifiers: getAllPublished filtering and ordering", () => {
  beforeEach(clearAll);

  test("excludes draft identifiers", () => {
    seedIdentifier({ isbn_book_title: "Draft Book", published_draft: 0 });
    seedIdentifier({ isbn_book_title: "Published Book", published_draft: 1 });

    const results = identifiersModel.getAllPublished();
    const titles = results.map((r) => r.isbn_book_title);
    assert.ok(titles.includes("Published Book"));
    assert.ok(!titles.includes("Draft Book"));
  });

  test("orders by id DESC", () => {
    const first = seedIdentifier({ isbn_book_title: "First" });
    const second = seedIdentifier({ isbn_book_title: "Second" });

    const results = identifiersModel.getAllPublished();
    assert.equal(results[0].id, second.id);
    assert.equal(results[1].id, first.id);
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("identifiers: getAllPublished pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedIdentifier({ isbn_book_title: "Book 1" });
    seedIdentifier({ isbn_book_title: "Book 2" });
    seedIdentifier({ isbn_book_title: "Book 3" });

    const result = identifiersModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope", () => {
    seedIdentifier({ isbn_book_title: "Book 1" });
    seedIdentifier({ isbn_book_title: "Book 2" });
    seedIdentifier({ isbn_book_title: "Book 3" });

    const result = identifiersModel.getAllPublished({ page: 1, limit: 2 });
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
});
