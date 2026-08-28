// Resource model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests getByListKey filtering/ordering, getByListKey
// pagination (API-8), and confirms getAllPublishedByListKey (untouched by
// API-8 — see the plan's note on grouped-summary rows) still returns its
// grouped-summary shape.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so resource.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const resourceModel = require("../models/resource.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM resources");
}

function seedResource(overrides = {}) {
  return resourceModel.create({
    list_key: overrides.list_key || "parables",
    resource_title: overrides.resource_title || "Test Resource",
    resource_url: overrides.resource_url || "https://example.com",
    sort_order: overrides.sort_order !== undefined ? overrides.sort_order : 0,
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    in_holding_pen: overrides.in_holding_pen !== undefined ? overrides.in_holding_pen : 0,
    ...overrides,
  });
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: resource.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof resourceModel.getByListKey === "function");
    assert.ok(typeof resourceModel.getAllPublishedByListKey === "function");
  });
});

// ── getByListKey filtering and ordering ─────────────────────────────────────

describe("resource: getByListKey filtering and ordering", () => {
  beforeEach(clearAll);

  test("returns only the requested list_key, published, not parked", () => {
    seedResource({ list_key: "parables", resource_title: "Parable 1" });
    seedResource({ list_key: "people", resource_title: "Person 1" });
    seedResource({ list_key: "parables", resource_title: "Draft Parable", published_draft: 0 });
    seedResource({ list_key: "parables", resource_title: "Parked Parable", in_holding_pen: 1 });

    const results = resourceModel.getByListKey("parables");
    const titles = results.map((r) => r.resource_title);
    assert.ok(titles.includes("Parable 1"));
    assert.ok(!titles.includes("Person 1"));
    assert.ok(!titles.includes("Draft Parable"));
    assert.ok(!titles.includes("Parked Parable"));
  });

  test("orders by sort_order, id", () => {
    seedResource({ list_key: "parables", resource_title: "Second", sort_order: 2 });
    seedResource({ list_key: "parables", resource_title: "First", sort_order: 1 });

    const results = resourceModel.getByListKey("parables");
    assert.deepStrictEqual(
      results.map((r) => r.resource_title),
      ["First", "Second"],
    );
  });

  test("returns an empty array for an unrecognized list_key", () => {
    assert.deepStrictEqual(resourceModel.getByListKey("not-a-real-list"), []);
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("resource: getByListKey pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedResource({ list_key: "parables", resource_title: "R1", sort_order: 1 });
    seedResource({ list_key: "parables", resource_title: "R2", sort_order: 2 });
    seedResource({ list_key: "parables", resource_title: "R3", sort_order: 3 });

    const result = resourceModel.getByListKey("parables");
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope, scoped to list_key", () => {
    seedResource({ list_key: "parables", resource_title: "R1", sort_order: 1 });
    seedResource({ list_key: "parables", resource_title: "R2", sort_order: 2 });
    seedResource({ list_key: "parables", resource_title: "R3", sort_order: 3 });
    seedResource({ list_key: "people", resource_title: "Person 1" });

    const result = resourceModel.getByListKey("parables", { page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    // total counts only the 3 "parables" rows, not the "people" row.
    assert.equal(result.total, 3);
  });

  test("an unrecognized list_key returns [] regardless of page/limit", () => {
    assert.deepStrictEqual(resourceModel.getByListKey("not-a-real-list", { page: 1, limit: 2 }), []);
  });
});

// ── getAllPublishedByListKey (untouched by API-8) ───────────────────────────

describe("resource: getAllPublishedByListKey grouped-summary shape", () => {
  beforeEach(clearAll);

  test("returns grouped summary rows, not per-resource items", () => {
    seedResource({ list_key: "parables", resource_title: "R1" });
    seedResource({ list_key: "parables", resource_title: "R2" });
    seedResource({ list_key: "people", resource_title: "Person 1" });

    const results = resourceModel.getAllPublishedByListKey();
    assert.ok(Array.isArray(results));

    const parablesGroup = results.find((r) => r.list_key === "parables");
    assert.ok(parablesGroup);
    assert.equal(parablesGroup.count, 2);
    assert.ok(Object.hasOwn(parablesGroup, "resource_ids"));

    const peopleGroup = results.find((r) => r.list_key === "people");
    assert.ok(peopleGroup);
    assert.equal(peopleGroup.count, 1);
  });
});
