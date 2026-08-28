// Academic challenges model tests — uses node:test + node:assert with an
// in-memory SQLite database. Tests create/read filtered to
// academic_popular = "academic", and getAllPublished pagination (API-8).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so academic-challenges.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const academicChallengeModel = require("../models/academic-challenges.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM challenge_mla_sources");
  testDb.exec("DELETE FROM responses");
  testDb.exec("DELETE FROM challenges");
}

function seedAcademic(overrides = {}) {
  return academicChallengeModel.create({
    slug: overrides.slug || "test-academic",
    challenge_title: overrides.challenge_title || "Test Academic Challenge",
    challenge_summary: overrides.challenge_summary || "Summary",
    challenge_rank_number:
      overrides.challenge_rank_number !== undefined ? overrides.challenge_rank_number : 1,
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    ...overrides,
  });
}

function seedPopularDirect(overrides = {}) {
  // Insert a "popular" row directly (bypassing the popular-challenges model)
  // to prove getAllPublished() here stays scoped to academic_popular = "academic".
  const row = testDb
    .prepare(
      `INSERT INTO challenges (slug, challenge_title, challenge_summary, challenge_rank_number, published_draft, academic_popular)
       VALUES (?, ?, ?, ?, ?, 'popular')`,
    )
    .run(
      overrides.slug || "test-popular",
      overrides.challenge_title || "Test Popular Challenge",
      overrides.challenge_summary || "Summary",
      overrides.challenge_rank_number !== undefined ? overrides.challenge_rank_number : 1,
      overrides.published_draft !== undefined ? overrides.published_draft : 1,
    );
  return { id: row.lastInsertRowid, ...overrides };
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: academic-challenges.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof academicChallengeModel.getAllPublished === "function");
    assert.ok(typeof academicChallengeModel.create === "function");
    assert.ok(typeof academicChallengeModel.getBySlug === "function");
  });
});

// ── getAllPublished filtering ────────────────────────────────────────────────

describe("academic-challenges: getAllPublished filtering", () => {
  beforeEach(clearAll);

  test("returns only academic_popular = 'academic' rows", () => {
    seedAcademic({ slug: "acad-1" });
    seedPopularDirect({ slug: "pop-1" });

    const results = academicChallengeModel.getAllPublished();
    const slugs = results.map((r) => r.slug);
    assert.ok(slugs.includes("acad-1"));
    assert.ok(!slugs.includes("pop-1"));
  });

  test("excludes draft academic challenges", () => {
    seedAcademic({ slug: "draft-acad", published_draft: 0 });
    const results = academicChallengeModel.getAllPublished();
    assert.ok(!results.map((r) => r.slug).includes("draft-acad"));
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("academic-challenges: getAllPublished pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedAcademic({ slug: "a1", challenge_rank_number: 1 });
    seedAcademic({ slug: "a2", challenge_rank_number: 2 });
    seedAcademic({ slug: "a3", challenge_rank_number: 3 });

    const result = academicChallengeModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope, filtered to 'academic'", () => {
    seedAcademic({ slug: "a1", challenge_rank_number: 1 });
    seedAcademic({ slug: "a2", challenge_rank_number: 2 });
    seedAcademic({ slug: "a3", challenge_rank_number: 3 });
    seedPopularDirect({ slug: "pop-1" });

    const result = academicChallengeModel.getAllPublished({ page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    // total counts only the 3 academic rows, not the popular one.
    assert.equal(result.total, 3);
  });
});
