// Popular challenges model tests — uses node:test + node:assert with an
// in-memory SQLite database. Tests create/read filtered to
// academic_popular = "popular", and getAllPublished pagination (API-8).

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");
const { createTestDb } = require("./helpers/db");

// In-memory database with full schema + migrations applied.
const testDb = createTestDb();

// Mock the config module so popular-challenges.model requires our test DB.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

const popularChallengeModel = require("../models/popular-challenges.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearAll() {
  testDb.exec("DELETE FROM challenge_mla_sources");
  testDb.exec("DELETE FROM responses");
  testDb.exec("DELETE FROM challenges");
}

function seedPopular(overrides = {}) {
  return popularChallengeModel.create({
    slug: overrides.slug || "test-popular",
    challenge_title: overrides.challenge_title || "Test Popular Challenge",
    challenge_summary: overrides.challenge_summary || "Summary",
    challenge_rank_number:
      overrides.challenge_rank_number !== undefined ? overrides.challenge_rank_number : 1,
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    ...overrides,
  });
}

function seedAcademicDirect(overrides = {}) {
  // Insert an "academic" row directly (bypassing the academic-challenges
  // model) to prove getAllPublished() here stays scoped to
  // academic_popular = "popular".
  const row = testDb
    .prepare(
      `INSERT INTO challenges (slug, challenge_title, challenge_summary, challenge_rank_number, published_draft, academic_popular)
       VALUES (?, ?, ?, ?, ?, 'academic')`,
    )
    .run(
      overrides.slug || "test-academic",
      overrides.challenge_title || "Test Academic Challenge",
      overrides.challenge_summary || "Summary",
      overrides.challenge_rank_number !== undefined ? overrides.challenge_rank_number : 1,
      overrides.published_draft !== undefined ? overrides.published_draft : 1,
    );
  return { id: row.lastInsertRowid, ...overrides };
}

// ── Module loading ──────────────────────────────────────────────────────────

describe("model: popular-challenges.model", () => {
  test("module requires cleanly", () => {
    assert.ok(typeof popularChallengeModel.getAllPublished === "function");
    assert.ok(typeof popularChallengeModel.create === "function");
    assert.ok(typeof popularChallengeModel.getBySlug === "function");
  });
});

// ── getAllPublished filtering ────────────────────────────────────────────────

describe("popular-challenges: getAllPublished filtering", () => {
  beforeEach(clearAll);

  test("returns only academic_popular = 'popular' rows", () => {
    seedPopular({ slug: "pop-1" });
    seedAcademicDirect({ slug: "acad-1" });

    const results = popularChallengeModel.getAllPublished();
    const slugs = results.map((r) => r.slug);
    assert.ok(slugs.includes("pop-1"));
    assert.ok(!slugs.includes("acad-1"));
  });

  test("excludes draft popular challenges", () => {
    seedPopular({ slug: "draft-pop", published_draft: 0 });
    const results = popularChallengeModel.getAllPublished();
    assert.ok(!results.map((r) => r.slug).includes("draft-pop"));
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("popular-challenges: getAllPublished pagination", () => {
  beforeEach(clearAll);

  test("no page/limit returns a flat array (backward compatible)", () => {
    seedPopular({ slug: "p1", challenge_rank_number: 1 });
    seedPopular({ slug: "p2", challenge_rank_number: 2 });
    seedPopular({ slug: "p3", challenge_rank_number: 3 });

    const result = popularChallengeModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit given returns the paginated envelope, filtered to 'popular'", () => {
    seedPopular({ slug: "p1", challenge_rank_number: 1 });
    seedPopular({ slug: "p2", challenge_rank_number: 2 });
    seedPopular({ slug: "p3", challenge_rank_number: 3 });
    seedAcademicDirect({ slug: "acad-1" });

    const result = popularChallengeModel.getAllPublished({ page: 1, limit: 2 });
    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    // total counts only the 3 popular rows, not the academic one.
    assert.equal(result.total, 3);
  });
});
