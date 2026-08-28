// Response model tests — uses node:test + node:assert with an in-memory
// SQLite database. Tests create/read round-trip, slug deduplication,
// challenge_id filtering, composite create/update in transactions,
// and the CHECK constraint (published_draft=1 requires challenge_id IS NOT NULL).

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

const responseModel = require("../models/response.model");

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearTables() {
  testDb.exec("DELETE FROM response_breakouts");
  testDb.exec("DELETE FROM response_mla_sources");
  testDb.exec("DELETE FROM response_identifiers");
  testDb.exec("DELETE FROM response_links_evidence");
  testDb.exec("DELETE FROM response_links_context");
  testDb.exec("DELETE FROM responses");
  testDb.exec("DELETE FROM challenges");
}

function seedChallenge(overrides = {}) {
  const row = testDb
    .prepare(
      `INSERT INTO challenges (slug, challenge_title, published_draft)
       VALUES (?, ?, ?)`,
    )
    .run(
      overrides.slug || "challenge-1",
      overrides.challenge_title || "Test Challenge",
      overrides.published_draft !== undefined ? overrides.published_draft : 1,
    );
  return { id: row.lastInsertRowid, ...overrides };
}

function seedMinimalResponse(overrides = {}) {
  const challenge = seedChallenge();
  return responseModel.create({
    slug: overrides.slug || "test-response",
    response_title: overrides.response_title || "Test Response",
    response_content: overrides.response_content || "Test content",
    challenge_id: overrides.challenge_id !== undefined ? overrides.challenge_id : challenge.id,
    published_draft: overrides.published_draft !== undefined ? overrides.published_draft : 1,
    ...overrides,
  });
}

// ── Module loads cleanly ────────────────────────────────────────────────────

describe("response.model", () => {
  test("exports 11 functions", () => {
    const keys = Object.keys(responseModel).sort();
    assert.equal(keys.length, 11);
    // Verify expected functions exist (order doesn't matter after sort)
    const expected = [
      "create",
      "createComposite",
      "getAdminById",
      "getByChallenge",
      "getById",
      "getBySlug",
      "getDetailBySlug",
      "getAllPublished",
      "remove",
      "update",
      "updateComposite",
    ].sort();
    assert.deepEqual(keys, expected);
  });
});

// ── create() and read round-trip ────────────────────────────────────────────

describe("response.model: create()", () => {
  beforeEach(clearTables);

  test("create() returns a valid row with generated id", () => {
    const challenge = seedChallenge();
    const row = responseModel.create({
      slug: "response-1",
      response_title: "Test Response",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    assert.ok(row.id, "row should have an id");
    assert.equal(typeof row.id, "number");
    assert.equal(row.response_title, "Test Response");
    assert.equal(row.slug, "response-1");
  });

  test("create() → getById() round-trip", () => {
    const challenge = seedChallenge();
    const created = responseModel.create({
      slug: "rt-test",
      response_title: "RT Test",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    const retrieved = responseModel.getById(created.id);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.response_title, "RT Test");
    assert.equal(retrieved.challenge_id, challenge.id);
  });

  test("create() with published_draft=1 is readable via getBySlug()", () => {
    const created = seedMinimalResponse({ published_draft: 1 });
    const retrieved = responseModel.getBySlug(created.slug);
    assert.ok(retrieved);
    assert.equal(retrieved.id, created.id);
  });

  test("create() with published_draft=0 is NOT readable via getBySlug()", () => {
    const challenge = seedChallenge();
    const created = responseModel.create({
      slug: "draft-only",
      response_title: "Draft",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 0,
    });

    const retrieved = responseModel.getBySlug("draft-only");
    assert.equal(retrieved, undefined);
  });
});

// ── Slug deduplication ──────────────────────────────────────────────────────

describe("response.model: slug deduplication", () => {
  beforeEach(clearTables);

  test("second response with same base slug gets -2 suffix", () => {
    const challenge = seedChallenge();
    const first = responseModel.create({
      slug: "base-slug",
      response_title: "First",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
    });
    const second = responseModel.create({
      slug: "base-slug",
      response_title: "Second",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    assert.equal(first.slug, "base-slug");
    assert.equal(second.slug, "base-slug-2");
  });

  test("third response with same base slug gets -3 suffix", () => {
    const challenge = seedChallenge();
    responseModel.create({
      slug: "base",
      response_title: "1",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 1,
    });
    responseModel.create({
      slug: "base",
      response_title: "2",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 1,
    });
    const third = responseModel.create({
      slug: "base",
      response_title: "3",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    assert.equal(third.slug, "base-3");
  });
});

// ── getAllPublished with challenge_id filter ────────────────────────────────

describe("response.model: getAllPublished filtering", () => {
  beforeEach(clearTables);

  test("getAllPublished returns only published responses", () => {
    const challenge = seedChallenge();
    responseModel.create({
      slug: "pub1",
      response_title: "Pub 1",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 1,
    });
    responseModel.create({
      slug: "draft1",
      response_title: "Draft 1",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 0,
    });
    responseModel.create({
      slug: "pub2",
      response_title: "Pub 2",
      response_content: "C",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    const results = responseModel.getAllPublished();
    const slugs = results.map((r) => r.slug);
    assert.ok(slugs.includes("pub1"));
    assert.ok(slugs.includes("pub2"));
    assert.ok(!slugs.includes("draft1"));
  });

  test("getAllPublished with challenge_id filter returns only matching responses", () => {
    const c1 = seedChallenge({ slug: "challenge-1" });
    const c2 = seedChallenge({ slug: "challenge-2" });

    responseModel.create({
      slug: "resp-c1-1",
      response_title: "C1 Resp 1",
      response_content: "C",
      challenge_id: c1.id,
      published_draft: 1,
    });
    responseModel.create({
      slug: "resp-c1-2",
      response_title: "C1 Resp 2",
      response_content: "C",
      challenge_id: c1.id,
      published_draft: 1,
    });
    responseModel.create({
      slug: "resp-c2-1",
      response_title: "C2 Resp 1",
      response_content: "C",
      challenge_id: c2.id,
      published_draft: 1,
    });

    const c1Results = responseModel.getAllPublished({ challenge_id: c1.id });
    const c1Slugs = c1Results.map((r) => r.slug);
    assert.equal(c1Results.length, 2);
    assert.ok(c1Slugs.includes("resp-c1-1"));
    assert.ok(c1Slugs.includes("resp-c1-2"));
    assert.ok(!c1Slugs.includes("resp-c2-1"));
  });

  test("getByChallenge returns responses for a specific challenge", () => {
    const c1 = seedChallenge({ slug: "c1" });
    const c2 = seedChallenge({ slug: "c2" });

    responseModel.create({
      slug: "r1",
      response_title: "R1",
      response_content: "C",
      challenge_id: c1.id,
      published_draft: 1,
    });
    responseModel.create({
      slug: "r2",
      response_title: "R2",
      response_content: "C",
      challenge_id: c2.id,
      published_draft: 1,
    });

    const c1Responses = responseModel.getByChallenge(c1.id);
    assert.equal(c1Responses.length, 1);
    assert.equal(c1Responses[0].challenge_id, c1.id);
  });
});

// ── Pagination (API-8) ──────────────────────────────────────────────────────

describe("response.model: getAllPublished pagination", () => {
  beforeEach(clearTables);

  test("no page/limit returns a flat array (backward compatible)", () => {
    const challenge = seedChallenge();
    for (let i = 1; i <= 3; i += 1) {
      responseModel.create({
        slug: `page-resp-${i}`,
        response_title: `Page Resp ${i}`,
        response_content: "C",
        challenge_id: challenge.id,
        published_draft: 1,
      });
    }

    const result = responseModel.getAllPublished();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 3);
  });

  test("page/limit combined with challenge_id filter returns a scoped envelope", () => {
    const c1 = seedChallenge({ slug: "challenge-1" });
    const c2 = seedChallenge({ slug: "challenge-2" });

    for (let i = 1; i <= 3; i += 1) {
      responseModel.create({
        slug: `c1-resp-${i}`,
        response_title: `C1 Resp ${i}`,
        response_content: "C",
        challenge_id: c1.id,
        published_draft: 1,
      });
    }
    responseModel.create({
      slug: "c2-resp-1",
      response_title: "C2 Resp 1",
      response_content: "C",
      challenge_id: c2.id,
      published_draft: 1,
    });

    const result = responseModel.getAllPublished({
      challenge_id: c1.id,
      page: 1,
      limit: 2,
    });

    assert.deepStrictEqual(Object.keys(result).sort(), [
      "items",
      "limit",
      "page",
      "total",
      "totalPages",
    ]);
    assert.equal(result.items.length, 2);
    // total reflects only c1's 3 responses, not all 4 in the table.
    assert.equal(result.total, 3);
    assert.ok(result.items.every((r) => r.challenge_id === c1.id));
  });
});

// ── Composite create with child/junction rows ───────────────────────────────

describe("response.model: createComposite()", () => {
  beforeEach(clearTables);

  test("createComposite with breakouts writes child rows", () => {
    const challenge = seedChallenge();
    const composite = responseModel.createComposite({
      slug: "with-breakouts",
      response_title: "With Breakouts",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
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
    const challenge = seedChallenge();
    const composite = responseModel.createComposite({
      slug: "no-relations",
      response_title: "No Relations",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
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

describe("response.model: updateComposite()", () => {
  beforeEach(clearTables);

  test("updateComposite replaces breakouts array", () => {
    const challenge = seedChallenge();
    const created = responseModel.createComposite({
      slug: "update-test",
      response_title: "To Update",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
      breakouts: [{ title: "Old", content: "Old content" }],
    });

    const updated = responseModel.updateComposite(created.id, {
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
    const challenge = seedChallenge();
    const created = responseModel.createComposite({
      slug: "clear-relations",
      response_title: "Clear Relations",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
      breakouts: [{ title: "Original", content: "This" }],
    });

    const updated = responseModel.updateComposite(created.id, {
      response_title: "Updated Title",
      // No breakouts specified — implementation clears them
    });

    assert.equal(updated.response_title, "Updated Title");
    assert.equal(updated.breakouts.length, 0, "breakouts should be cleared when not specified");
  });
});

// ── CHECK constraint: published requires challenge_id ──────────────────────

describe("response.model: CHECK constraint (published_draft=1 requires challenge_id)", () => {
  beforeEach(clearTables);

  test("publishing without challenge_id fails with constraint error", () => {
    let threwError = false;
    try {
      responseModel.create({
        slug: "no-challenge",
        response_title: "No Challenge",
        response_content: "Content",
        challenge_id: null, // No challenge
        published_draft: 1, // But published
      });
    } catch (err) {
      threwError = true;
      assert.ok(err.message.toLowerCase().includes("constraint"));
    }
    assert.ok(threwError, "should throw a constraint error");
  });

  test("publishing without challenge_id leaves no row in database", () => {
    const initialCount = testDb
      .prepare("SELECT COUNT(*) as count FROM responses")
      .get().count;

    try {
      responseModel.create({
        slug: "no-challenge-2",
        response_title: "No Challenge 2",
        response_content: "Content",
        challenge_id: null,
        published_draft: 1,
      });
    } catch (err) {
      // Expected to fail
    }

    const finalCount = testDb
      .prepare("SELECT COUNT(*) as count FROM responses")
      .get().count;
    assert.equal(finalCount, initialCount, "no row should be inserted");
  });

  test("draft without challenge_id is allowed", () => {
    const row = responseModel.create({
      slug: "draft-no-challenge",
      response_title: "Draft No Challenge",
      response_content: "Content",
      challenge_id: null,
      published_draft: 0, // Draft
    });

    assert.ok(row.id, "draft without challenge_id should be allowed");
    assert.equal(row.challenge_id, null);
  });

  test("published WITH challenge_id succeeds", () => {
    const challenge = seedChallenge();
    const row = responseModel.create({
      slug: "with-challenge",
      response_title: "With Challenge",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
    });

    assert.ok(row.id);
    assert.equal(row.challenge_id, challenge.id);
  });
});

// ── getDetailBySlug and getAdminById assembly ───────────────────────────────

describe("response.model: detail assembly", () => {
  beforeEach(clearTables);

  test("getDetailBySlug assembles published row with all relations", () => {
    const challenge = seedChallenge();
    responseModel.createComposite({
      slug: "detail-test",
      response_title: "Detail Test",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = responseModel.getDetailBySlug("detail-test");
    assert.ok(detail);
    assert.equal(detail.response_title, "Detail Test");
    assert.equal(detail.breakouts.length, 1);
  });

  test("getDetailBySlug returns undefined if row is not published", () => {
    const challenge = seedChallenge();
    responseModel.create({
      slug: "unpublished",
      response_title: "Unpublished",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 0,
    });

    const detail = responseModel.getDetailBySlug("unpublished");
    assert.equal(detail, undefined);
  });

  test("getAdminById assembles row in any state with full relations", () => {
    const challenge = seedChallenge();
    const created = responseModel.createComposite({
      slug: "admin-detail",
      response_title: "Admin Detail",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 0,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = responseModel.getAdminById(created.id);
    assert.ok(detail);
    assert.equal(detail.response_title, "Admin Detail");
    assert.equal(detail.breakouts.length, 1);
  });
});

// ── Transaction integrity ──────────────────────────────────────────────────

describe("response.model: createComposite atomicity", () => {
  beforeEach(clearTables);

  test("createComposite writes base row and all relations in one transaction", () => {
    const challenge = seedChallenge();
    const before = testDb
      .prepare("SELECT COUNT(*) as count FROM responses")
      .get().count;

    const composite = responseModel.createComposite({
      slug: "atomic-test",
      response_title: "Atomic Test",
      response_content: "Content",
      challenge_id: challenge.id,
      published_draft: 1,
      breakouts: [
        { title: "B1", content: "C1" },
        { title: "B2", content: "C2" },
      ],
    });

    const after = testDb
      .prepare("SELECT COUNT(*) as count FROM responses")
      .get().count;
    assert.equal(after, before + 1, "base row should be written");
    assert.equal(composite.breakouts.length, 2, "all breakout rows should be written");

    // Verify breakouts are in database
    const fetched = responseModel.getAdminById(composite.id);
    assert.equal(fetched.breakouts.length, 2, "breakouts should persist");
  });
});
