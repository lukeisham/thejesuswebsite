// Smoke test: full challenge data lifecycle for both Academic and Popular.
// Covers CREATE → READ → UPDATE (save/draft) → PUBLISH → UNPUBLISH → DELETE.
// Uses node:test + node:assert with an in-memory SQLite database.

const { test, describe, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const path = require("path");
const Module = require("module");

// ── In-memory database with challenges schema ─────────────────────────────────

const testDb = new Database(":memory:");
testDb.pragma("foreign_keys = ON");

// Minimal schema needed for challenge models
testDb.exec(`
  CREATE TABLE challenges (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                   TEXT UNIQUE NOT NULL,
    academic_popular       TEXT CHECK (academic_popular IN ('academic', 'popular')),
    challenge_title        TEXT,
    challenge_summary      TEXT,
    challenge_body         TEXT,
    challenge_picture      TEXT,
    challenge_rank_number  INTEGER,
    challenge_rank_pluses  INTEGER,
    challenge_rank_minuses INTEGER,
    published_draft        INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords      TEXT
  );

  CREATE TABLE mla_sources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mla_book_title  TEXT,
    mla_book_author TEXT,
    mla_book_date   TEXT,
    published_draft INTEGER DEFAULT 1
  );

  CREATE TABLE identifiers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn            TEXT,
    isbn_book_title TEXT,
    published_draft INTEGER DEFAULT 1
  );

  CREATE TABLE challenge_mla_sources (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id    INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    mla_source_id   INTEGER NOT NULL REFERENCES mla_sources(id) ON DELETE CASCADE,
    citation_order  INTEGER,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, mla_source_id)
  );

  CREATE TABLE challenge_identifiers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id    INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    identifier_id   INTEGER NOT NULL REFERENCES identifiers(id) ON DELETE CASCADE,
    citation_order  INTEGER,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, identifier_id)
  );

  CREATE TABLE responses (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    slug               TEXT UNIQUE NOT NULL,
    challenge_id       INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    response_title     TEXT,
    response_content   TEXT,
    response_author    TEXT,
    response_date      TEXT,
    response_publisher TEXT,
    response_headings  TEXT,
    published_draft    INTEGER DEFAULT 0 CHECK (published_draft IN (0, 1)),
    metadata_keywords  TEXT,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (published_draft = 0 OR challenge_id IS NOT NULL)
  );
`);

// Replace the real database with our in-memory copy so model requires pick it up.
const configPath = require.resolve(path.resolve(__dirname, "..", "config"));
Module._cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: testDb,
};

// Clear model caches so they re-require with the test db.
delete require.cache[require.resolve("../models/academic-challenges.model")];
delete require.cache[require.resolve("../models/popular-challenges.model")];

const academicModel = require("../models/academic-challenges.model");
const popularModel = require("../models/popular-challenges.model");

// ── Helper ─────────────────────────────────────────────────────────────────────

function dbRow(type, slug) {
  return testDb
    .prepare(
      "SELECT * FROM challenges WHERE academic_popular = ? AND slug = ?",
    )
    .get(type, slug);
}

// ── Tests: Academic Challenges ─────────────────────────────────────────────────

describe("Academic Challenge lifecycle", () => {
  let challengeId;

  beforeEach(() => {
    testDb.exec("DELETE FROM challenges");
    challengeId = null;
  });

  test("CREATE — inserts a new academic challenge", () => {
    const created = academicModel.create({
      slug: "criterion-of-embarrassment",
      challenge_title: "The Criterion of Embarrassment",
      challenge_summary: "A scholarly challenge about the criterion.",
      challenge_rank_number: 5,
      published_draft: 0,
      metadata_keywords: "criterion, embarrassment, historical Jesus",
    });

    assert.ok(created, "create() should return the new row");
    assert.ok(created.id, "new row should have an id");
    assert.equal(created.slug, "criterion-of-embarrassment");
    assert.equal(created.academic_popular, "academic");
    assert.equal(created.challenge_title, "The Criterion of Embarrassment");
    assert.equal(created.published_draft, 0);
    challengeId = created.id;
  });

  test("CREATE — auto-deduplicates slug", () => {
    const first = academicModel.create({
      slug: "my-challenge",
      challenge_title: "First",
    });
    const second = academicModel.create({
      slug: "my-challenge",
      challenge_title: "Second",
    });

    assert.equal(first.slug, "my-challenge");
    assert.equal(second.slug, "my-challenge-2");
    assert.notEqual(first.id, second.id);
  });

  test("READ — getById returns the challenge (admin view)", () => {
    const created = academicModel.create({
      slug: "test-read",
      challenge_title: "Read Test",
      challenge_summary: "Testing reads.",
      published_draft: 0,
    });

    const fetched = academicModel.getById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.challenge_title, "Read Test");
    assert.equal(fetched.slug, "test-read");
    assert.equal(fetched.academic_popular, "academic");
  });

  test("READ — getBySlug only returns published challenges", () => {
    academicModel.create({
      slug: "draft-challenge",
      challenge_title: "Draft",
      published_draft: 0,
    });
    academicModel.create({
      slug: "live-challenge",
      challenge_title: "Live",
      published_draft: 1,
    });

    const draft = academicModel.getBySlug("draft-challenge");
    const live = academicModel.getBySlug("live-challenge");

    assert.equal(draft, undefined, "draft should not be found by public slug lookup");
    assert.ok(live, "published challenge should be found");
    assert.equal(live.challenge_title, "Live");
  });

  test("READ — getAllPublished returns only published, ranked by challenge_rank_number", () => {
    academicModel.create({
      slug: "rank-3",
      challenge_title: "Rank 3",
      challenge_rank_number: 3,
      published_draft: 1,
    });
    academicModel.create({
      slug: "rank-1",
      challenge_title: "Rank 1",
      challenge_rank_number: 1,
      published_draft: 1,
    });
    academicModel.create({
      slug: "hidden-draft",
      challenge_title: "Hidden Draft",
      challenge_rank_number: 2,
      published_draft: 0,
    });

    const published = academicModel.getAllPublished();
    assert.equal(published.length, 2, "only published challenges should appear");
    assert.equal(published[0].title, "Rank 1", "should be sorted by rank ASC");
    assert.equal(published[1].title, "Rank 3");
  });

  test("READ — getAllPublished returns correct response shape with mapped field names", () => {
    academicModel.create({
      slug: "shape-test-1",
      challenge_title: "Shape Test",
      challenge_summary: "Testing the response shape.",
      challenge_rank_pluses: 10,
      challenge_rank_minuses: 3,
      challenge_rank_number: 1,
      published_draft: 1,
    });

    const published = academicModel.getAllPublished();
    assert.equal(Array.isArray(published), true, "getAllPublished() should return an array");

    if (published.length > 0) {
      const item = published[0];
      assert.equal(item.title, "Shape Test", "should have mapped 'title' field");
      assert.equal(item.summary, "Testing the response shape.", "should have mapped 'summary' field");
      assert.equal(item.upvotes, 10, "should have mapped 'upvotes' field");
      assert.equal(item.downvotes, 3, "should have mapped 'downvotes' field");
      assert.ok(Object.hasOwn(item, "response_count"), "should have 'response_count' field");
      assert.equal(typeof item.response_count, "number", "response_count should be a number");
      assert.ok(item.response_count >= 0, "response_count should be >= 0");
      assert.equal(item.response_count, 0, "response_count should be 0 when no responses exist");
    }
  });

  test("READ — getPublishedCount returns correct count", () => {
    academicModel.create({ slug: "a", challenge_title: "A", published_draft: 1 });
    academicModel.create({ slug: "b", challenge_title: "B", published_draft: 0 });
    academicModel.create({ slug: "c", challenge_title: "C", published_draft: 1 });

    assert.equal(academicModel.getPublishedCount(), 2);
  });

  test("READ — getAllAdmin returns BOTH draft and published, ranked, with raw column names", () => {
    academicModel.create({
      slug: "admin-rank-3",
      challenge_title: "Admin Rank 3",
      challenge_rank_number: 3,
      published_draft: 1,
    });
    academicModel.create({
      slug: "admin-rank-1",
      challenge_title: "Admin Rank 1",
      challenge_rank_number: 1,
      published_draft: 1,
    });
    academicModel.create({
      slug: "admin-draft-2",
      challenge_title: "Admin Draft 2",
      challenge_rank_number: 2,
      published_draft: 0,
    });

    const all = academicModel.getAllAdmin();
    assert.equal(Array.isArray(all), true, "getAllAdmin() should return an array");
    assert.equal(all.length, 3, "should include drafts as well as published");
    // Sorted by challenge_rank_number ASC.
    assert.equal(all[0].challenge_title, "Admin Rank 1");
    assert.equal(all[1].challenge_title, "Admin Draft 2");
    assert.equal(all[2].challenge_title, "Admin Rank 3");
    // The draft must be present (this is the whole point of the admin list).
    assert.ok(
      all.some((c) => c.published_draft === 0),
      "the draft challenge must appear in the admin list",
    );
    // Raw column names the admin table reads directly (not the getAllPublished aliases).
    assert.ok(Object.hasOwn(all[0], "challenge_title"), "raw challenge_title column");
    assert.ok(Object.hasOwn(all[0], "published_draft"), "published_draft column");
    assert.ok(Object.hasOwn(all[0], "slug"), "slug column");
  });

  test("READ — getAllAdmin only returns academic challenges", () => {
    academicModel.create({ slug: "acad-only", challenge_title: "Acad", published_draft: 0 });
    popularModel.create({ slug: "pop-excluded", challenge_title: "Pop", published_draft: 0 });

    const all = academicModel.getAllAdmin();
    assert.equal(all.length, 1);
    assert.equal(all[0].academic_popular, "academic");
  });

  test("UPDATE — modifies existing challenge fields (save as draft)", () => {
    const created = academicModel.create({
      slug: "before-update",
      challenge_title: "Before Update",
      challenge_summary: "Old summary.",
      published_draft: 0,
    });

    const updated = academicModel.update(created.id, {
      challenge_title: "After Update",
      challenge_summary: "New summary.",
      challenge_rank_number: 10,
    });

    assert.ok(updated, "update() should return the updated row");
    assert.equal(updated.challenge_title, "After Update");
    assert.equal(updated.challenge_summary, "New summary.");
    assert.equal(updated.challenge_rank_number, 10);
    // Fields not in the update payload should remain unchanged.
    assert.equal(updated.slug, "before-update");
    assert.equal(updated.published_draft, 0);
  });

  test("UPDATE — changing slug re-deduplicates", () => {
    academicModel.create({ slug: "existing", challenge_title: "Existing" });
    const created = academicModel.create({ slug: "to-rename", challenge_title: "To Rename" });

    const updated = academicModel.update(created.id, {
      slug: "existing",
    });

    assert.equal(updated.slug, "existing-2", "slug should be deduplicated");
  });

  test("UPDATE — returns undefined for non-existent id", () => {
    const result = academicModel.update(99999, { challenge_title: "Nope" });
    assert.equal(result, undefined);
  });

  test("PUBLISH — sets published_draft to 1 via update", () => {
    const created = academicModel.create({
      slug: "to-publish",
      challenge_title: "To Publish",
      published_draft: 0,
    });

    assert.equal(created.published_draft, 0);

    const published = academicModel.update(created.id, { published_draft: 1 });
    assert.equal(published.published_draft, 1);

    // Now it should be findable by public slug lookup.
    const publicView = academicModel.getBySlug("to-publish");
    assert.ok(publicView, "should be findable after publishing");
  });

  test("UNPUBLISH — sets published_draft back to 0 via update", () => {
    const created = academicModel.create({
      slug: "to-unpublish",
      challenge_title: "To Unpublish",
      published_draft: 1,
    });

    assert.equal(created.published_draft, 1);

    const unpublished = academicModel.update(created.id, { published_draft: 0 });
    assert.equal(unpublished.published_draft, 0);

    // Now it should NOT be findable by public slug lookup.
    const publicView = academicModel.getBySlug("to-unpublish");
    assert.equal(publicView, undefined);
  });

  test("PUBLISH → UNPUBLISH round-trip preserves all data", () => {
    const created = academicModel.create({
      slug: "round-trip",
      challenge_title: "Round Trip",
      challenge_summary: "Survives publish cycle.",
      challenge_rank_number: 7,
      metadata_keywords: "test, roundtrip",
      published_draft: 0,
    });

    // Publish
    let current = academicModel.update(created.id, { published_draft: 1 });
    assert.equal(current.published_draft, 1);
    assert.ok(academicModel.getBySlug("round-trip"));

    // Unpublish
    current = academicModel.update(created.id, { published_draft: 0 });
    assert.equal(current.published_draft, 0);
    assert.equal(academicModel.getBySlug("round-trip"), undefined);

    // All other fields intact
    assert.equal(current.challenge_title, "Round Trip");
    assert.equal(current.challenge_summary, "Survives publish cycle.");
    assert.equal(current.challenge_rank_number, 7);
    assert.equal(current.metadata_keywords, "test, roundtrip");
  });

  test("DELETE — removes challenge and returns true", () => {
    const created = academicModel.create({
      slug: "to-delete",
      challenge_title: "To Delete",
    });

    const result = academicModel.remove(created.id);
    assert.equal(result, true);

    const gone = academicModel.getById(created.id);
    assert.equal(gone, undefined);
  });

  test("DELETE — returns false for non-existent id", () => {
    const result = academicModel.remove(99999);
    assert.equal(result, false);
  });
});

// ── Tests: Popular Challenges ───────────────────────────────────────────────────

describe("Popular Challenge lifecycle", () => {
  let challengeId;

  beforeEach(() => {
    testDb.exec("DELETE FROM challenges");
    challengeId = null;
  });

  test("CREATE — inserts a new popular challenge", () => {
    const created = popularModel.create({
      slug: "minimal-facts-argument",
      challenge_title: "The Minimal Facts Argument",
      challenge_summary: "A popular apologetic challenge.",
      challenge_rank_number: 3,
      published_draft: 0,
      metadata_keywords: "minimal facts, resurrection, Habermas",
    });

    assert.ok(created, "create() should return the new row");
    assert.ok(created.id);
    assert.equal(created.academic_popular, "popular");
    assert.equal(created.challenge_title, "The Minimal Facts Argument");
    assert.equal(created.published_draft, 0);
    challengeId = created.id;
  });

  test("CREATE — auto-deduplicates slug within popular scope", () => {
    const first = popularModel.create({
      slug: "dup-slug",
      challenge_title: "First",
    });
    const second = popularModel.create({
      slug: "dup-slug",
      challenge_title: "Second",
    });

    assert.equal(first.slug, "dup-slug");
    assert.equal(second.slug, "dup-slug-2");
  });

  test("READ — getById returns challenge regardless of publish state", () => {
    const created = popularModel.create({
      slug: "pop-read",
      challenge_title: "Pop Read",
      published_draft: 0,
    });

    const fetched = popularModel.getById(created.id);
    assert.ok(fetched);
    assert.equal(fetched.challenge_title, "Pop Read");
    assert.equal(fetched.academic_popular, "popular");
  });

  test("READ — getBySlug only returns published challenges", () => {
    popularModel.create({
      slug: "pop-draft",
      challenge_title: "Pop Draft",
      published_draft: 0,
    });
    popularModel.create({
      slug: "pop-live",
      challenge_title: "Pop Live",
      published_draft: 1,
    });

    assert.equal(popularModel.getBySlug("pop-draft"), undefined);
    const live = popularModel.getBySlug("pop-live");
    assert.ok(live);
    assert.equal(live.challenge_title, "Pop Live");
  });

  test("READ — getAllPublished returns ranked published items only", () => {
    popularModel.create({
      slug: "pop-2",
      challenge_title: "Pop Two",
      challenge_rank_number: 2,
      published_draft: 1,
    });
    popularModel.create({
      slug: "pop-1",
      challenge_title: "Pop One",
      challenge_rank_number: 1,
      published_draft: 1,
    });
    popularModel.create({
      slug: "pop-draft-hidden",
      challenge_title: "Hidden",
      published_draft: 0,
    });

    const published = popularModel.getAllPublished();
    assert.equal(published.length, 2);
    assert.equal(published[0].title, "Pop One");
    assert.equal(published[1].title, "Pop Two");
  });

  test("READ — getAllPublished returns correct response shape with mapped field names", () => {
    popularModel.create({
      slug: "pop-shape-test-1",
      challenge_title: "Popular Shape Test",
      challenge_summary: "Testing popular response shape.",
      challenge_rank_pluses: 25,
      challenge_rank_minuses: 7,
      challenge_rank_number: 1,
      published_draft: 1,
    });

    const published = popularModel.getAllPublished();
    assert.equal(Array.isArray(published), true, "getAllPublished() should return an array");

    if (published.length > 0) {
      const item = published[0];
      assert.equal(item.title, "Popular Shape Test", "should have mapped 'title' field");
      assert.equal(item.summary, "Testing popular response shape.", "should have mapped 'summary' field");
      assert.equal(item.upvotes, 25, "should have mapped 'upvotes' field");
      assert.equal(item.downvotes, 7, "should have mapped 'downvotes' field");
      assert.ok(Object.hasOwn(item, "response_count"), "should have 'response_count' field");
      assert.equal(typeof item.response_count, "number", "response_count should be a number");
      assert.ok(item.response_count >= 0, "response_count should be >= 0");
      assert.equal(item.response_count, 0, "response_count should be 0 when no responses exist");
    }
  });

  test("READ — getAllAdmin returns BOTH draft and published popular challenges, ranked", () => {
    popularModel.create({
      slug: "pop-admin-2",
      challenge_title: "Pop Admin 2",
      challenge_rank_number: 2,
      published_draft: 1,
    });
    popularModel.create({
      slug: "pop-admin-draft-1",
      challenge_title: "Pop Admin Draft 1",
      challenge_rank_number: 1,
      published_draft: 0,
    });

    const all = popularModel.getAllAdmin();
    assert.equal(Array.isArray(all), true);
    assert.equal(all.length, 2, "should include the draft too");
    assert.equal(all[0].challenge_title, "Pop Admin Draft 1", "sorted by rank ASC");
    assert.equal(all[1].challenge_title, "Pop Admin 2");
    assert.ok(
      all.some((c) => c.published_draft === 0),
      "the draft challenge must appear in the admin list",
    );
    assert.ok(all.every((c) => c.academic_popular === "popular"));
  });

  test("UPDATE — modifies fields correctly", () => {
    const created = popularModel.create({
      slug: "pop-before",
      challenge_title: "Before",
      challenge_summary: "Old.",
      challenge_rank_number: 1,
      published_draft: 0,
    });

    const updated = popularModel.update(created.id, {
      challenge_title: "After",
      challenge_summary: "New.",
      challenge_rank_number: 99,
    });

    assert.ok(updated);
    assert.equal(updated.challenge_title, "After");
    assert.equal(updated.challenge_summary, "New.");
    assert.equal(updated.challenge_rank_number, 99);
    assert.equal(updated.slug, "pop-before");
    assert.equal(updated.published_draft, 0);
  });

  test("PUBLISH — sets published_draft to 1", () => {
    const created = popularModel.create({
      slug: "pop-publish",
      challenge_title: "Pop Publish",
      published_draft: 0,
    });

    const updated = popularModel.update(created.id, { published_draft: 1 });
    assert.equal(updated.published_draft, 1);
    assert.ok(popularModel.getBySlug("pop-publish"));
  });

  test("UNPUBLISH — sets published_draft to 0", () => {
    const created = popularModel.create({
      slug: "pop-unpublish",
      challenge_title: "Pop Unpublish",
      published_draft: 1,
    });

    const updated = popularModel.update(created.id, { published_draft: 0 });
    assert.equal(updated.published_draft, 0);
    assert.equal(popularModel.getBySlug("pop-unpublish"), undefined);
  });

  test("FULL LIFECYCLE — create → read → update → publish → unpublish → delete", () => {
    // 1. CREATE
    const created = popularModel.create({
      slug: "lifecycle-test",
      challenge_title: "Lifecycle Smoke Test",
      challenge_summary: "Testing the full lifecycle.",
      challenge_body: "Detailed body content for lifecycle testing.",
      challenge_rank_number: 42,
      published_draft: 0,
      metadata_keywords: "lifecycle, smoke, test",
    });

    assert.ok(created.id);
    assert.equal(created.academic_popular, "popular");
    assert.equal(created.published_draft, 0);

    // 2. READ (admin)
    let read = popularModel.getById(created.id);
    assert.equal(read.challenge_title, "Lifecycle Smoke Test");
    assert.equal(read.challenge_body, "Detailed body content for lifecycle testing.");
    // Draft should not be visible publicly
    assert.equal(popularModel.getBySlug("lifecycle-test"), undefined);

    // 3. UPDATE fields while still draft
    let updated = popularModel.update(created.id, {
      challenge_title: "Updated Lifecycle Test",
      challenge_summary: "Updated summary.",
    });
    assert.equal(updated.challenge_title, "Updated Lifecycle Test");
    assert.equal(updated.slug, "lifecycle-test");
    assert.equal(updated.published_draft, 0);

    // 4. PUBLISH
    updated = popularModel.update(created.id, { published_draft: 1 });
    assert.equal(updated.published_draft, 1);
    assert.ok(popularModel.getBySlug("lifecycle-test"));
    assert.equal(popularModel.getPublishedCount(), 1);

    // 5. UPDATE while published
    updated = popularModel.update(created.id, {
      challenge_rank_number: 1,
      metadata_keywords: "published, updated",
    });
    assert.equal(updated.challenge_rank_number, 1);
    // Should still be published and findable
    assert.equal(updated.published_draft, 1);
    assert.ok(popularModel.getBySlug("lifecycle-test"));

    // 6. UNPUBLISH
    updated = popularModel.update(created.id, { published_draft: 0 });
    assert.equal(updated.published_draft, 0);
    assert.equal(popularModel.getBySlug("lifecycle-test"), undefined);
    assert.equal(popularModel.getPublishedCount(), 0);

    // 7. DELETE
    const deleted = popularModel.remove(created.id);
    assert.equal(deleted, true);
    assert.equal(popularModel.getById(created.id), undefined);
  });

  test("DELETE — removes challenge and cascade junctions", () => {
    const created = popularModel.create({
      slug: "cascade-delete",
      challenge_title: "Cascade Delete",
    });

    // Add a related row
    testDb.prepare(
      "INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date) VALUES (?, ?, ?)",
    ).run("Test Book", "Author", "2024");
    const mlaId = testDb.prepare(
      "SELECT last_insert_rowid() as id",
    ).get().id;

    testDb.prepare(
      "INSERT INTO challenge_mla_sources (challenge_id, mla_source_id, citation_order) VALUES (?, ?, ?)",
    ).run(created.id, mlaId, 0);

    // Verify junction exists
    const beforeJunction = testDb
      .prepare("SELECT COUNT(*) as count FROM challenge_mla_sources WHERE challenge_id = ?")
      .get(created.id);
    assert.equal(beforeJunction.count, 1);

    // Delete
    const result = popularModel.remove(created.id);
    assert.equal(result, true);

    // Junction should be cascade-deleted
    const afterJunction = testDb
      .prepare("SELECT COUNT(*) as count FROM challenge_mla_sources WHERE challenge_id = ?")
      .get(created.id);
    assert.equal(afterJunction.count, 0, "junction rows should be cascade-deleted");
  });

  // ── Normalized detail contract (Plan 02) ─────────────────────────────────

  test("getDetailBySlug returns normalized title/summary/body/bibliography", () => {
    const created = popularModel.create({
      slug: "normalized-detail",
      challenge_title: "Normalized Title",
      challenge_summary: "Normalized summary.",
      challenge_body: "Normalized body.",
      published_draft: 1,
    });

    const detail = popularModel.getDetailBySlug("normalized-detail");
    assert.ok(detail, "detail should be found");
    assert.equal(detail.title, "Normalized Title");
    assert.equal(detail.summary, "Normalized summary.");
    assert.equal(detail.body, "Normalized body.");
    assert.ok(Array.isArray(detail.mla_sources), "mla_sources should be an array");
    assert.equal(detail.bibliography, detail.mla_sources, "bibliography should alias mla_sources");
    // Raw DB column names must not leak to public
    assert.equal(detail.challenge_title, undefined, "challenge_title must not leak");
    assert.equal(detail.challenge_summary, undefined, "challenge_summary must not leak");
    assert.equal(detail.challenge_body, undefined, "challenge_body must not leak");
  });

  test("challenge_body round-trips through create and update", () => {
    const created = popularModel.create({
      slug: "body-roundtrip",
      challenge_title: "Body Roundtrip",
      challenge_body: "long-form\nbody\ncontent",
    });
    assert.equal(created.challenge_body, "long-form\nbody\ncontent");

    const updated = popularModel.update(created.id, {
      challenge_body: "updated\nbody",
    });
    assert.equal(updated.challenge_body, "updated\nbody");
  });

  test("createComposite persists mla_source_ids and getAdminById returns them", () => {
    // Seed an MLA source
    testDb.prepare(
      "INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date) VALUES (?, ?, ?)",
    ).run("Composite Book", "Composite Author", "2025");
    const mlaId = testDb.prepare("SELECT last_insert_rowid() as id").get().id;

    const created = popularModel.createComposite({
      slug: "composite-create",
      challenge_title: "Composite Create",
      challenge_body: "Body with linked MLA source.",
      mla_source_ids: [mlaId],
    });

    assert.ok(created.id);
    assert.equal(created.challenge_title, "Composite Create");
    assert.equal(created.challenge_body, "Body with linked MLA source.");
    assert.ok(Array.isArray(created.mla_sources), "mla_sources should be present on admin read");
    assert.equal(created.mla_sources.length, 1);
    // getAdminById resolves through the junction to full mla_sources rows
    // (id = the source's own id), matching getDetailBySlug()'s shape — not
    // raw junction rows (which would carry a separate mla_source_id column).
    assert.equal(created.mla_sources[0].id, mlaId);

    // Verify junction row exists
    const junction = testDb
      .prepare("SELECT * FROM challenge_mla_sources WHERE challenge_id = ?")
      .all(created.id);
    assert.equal(junction.length, 1);
    assert.equal(junction[0].mla_source_id, mlaId);
  });

  test("updateComposite replaces mla_source_ids", () => {
    const created = popularModel.createComposite({
      slug: "composite-update",
      challenge_title: "Composite Update",
      mla_source_ids: [],
    });

    // Seed two MLA sources
    testDb.prepare(
      "INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date) VALUES (?, ?, ?)",
    ).run("Update Book A", "Author A", "2025");
    const mlaIdA = testDb.prepare("SELECT last_insert_rowid() as id").get().id;

    testDb.prepare(
      "INSERT INTO mla_sources (mla_book_title, mla_book_author, mla_book_date) VALUES (?, ?, ?)",
    ).run("Update Book B", "Author B", "2025");
    const mlaIdB = testDb.prepare("SELECT last_insert_rowid() as id").get().id;

    const updated = popularModel.updateComposite(created.id, {
      mla_source_ids: [mlaIdA, mlaIdB],
    });

    assert.equal(updated.mla_sources.length, 2);
    assert.equal(updated.mla_sources[0].id, mlaIdA);
    assert.equal(updated.mla_sources[1].id, mlaIdB);

    // Replace with empty
    const cleared = popularModel.updateComposite(created.id, {
      mla_source_ids: [],
    });
    assert.equal(cleared.mla_sources.length, 0);
  });

  test("challenge_url_* columns are no longer writable", () => {
    const created = popularModel.create({
      slug: "no-url-columns",
      challenge_title: "No URL Columns",
      challenge_url_a: "https://should-be-ignored.com",
    });

    const read = popularModel.getById(created.id);
    assert.equal(read.challenge_title, "No URL Columns");
    // pickWritable ignores non-whitelisted keys — they must not reach the DB
    assert.equal(read.challenge_url_a, undefined, "challenge_url_a must not be writable");
    assert.equal(read.challenge_body, null);
  });
});

// ── Cross-type isolation ──────────────────────────────────────────────────────

describe("Cross-type isolation", () => {
  beforeEach(() => {
    testDb.exec("DELETE FROM challenges");
  });

  test("popular and academic challenges share table but are isolated by academic_popular", () => {
    const pop = popularModel.create({
      slug: "shared-isolation-pop",
      challenge_title: "Popular Shared",
      published_draft: 1,
    });
    const acad = academicModel.create({
      slug: "shared-isolation-acad",
      challenge_title: "Academic Shared",
      published_draft: 1,
    });

    // Both exist in DB but are differentiated
    assert.notEqual(pop.id, acad.id);
    assert.equal(pop.academic_popular, "popular");
    assert.equal(acad.academic_popular, "academic");

    // Each model only sees its own items
    assert.equal(popularModel.getAllPublished().length, 1);
    assert.equal(academicModel.getAllPublished().length, 1);
    assert.equal(popularModel.getPublishedCount(), 1);
    assert.equal(academicModel.getPublishedCount(), 1);

    // Deleting popular doesn't affect academic
    popularModel.remove(pop.id);
    assert.equal(popularModel.getById(pop.id), undefined);
    assert.ok(academicModel.getById(acad.id), "academic should still exist");
  });

  test("slug uniqueness is global across both types (DB constraint)", () => {
    const pop = popularModel.create({ slug: "globally-unique", challenge_title: "Pop" });
    // Same slug with different type — should be deduplicated because DB has global UNIQUE on slug
    const acad = academicModel.create({ slug: "globally-unique", challenge_title: "Acad" });

    assert.equal(pop.slug, "globally-unique");
    assert.equal(acad.slug, "globally-unique-2");
    assert.notEqual(pop.id, acad.id);
  });
});
