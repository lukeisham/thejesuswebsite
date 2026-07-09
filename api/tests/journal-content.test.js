// Journal content composite CRUD tests — uses node:test + node:assert.
// Tests responses, essays, blog posts, and historiography composite operations
// including breakouts, sources, and links.
// Uses an in-memory SQLite DB for isolation.

process.env.DB_PATH = ":memory:";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "schema.sql",
);
const MIGRATION_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "database",
  "migrations",
  "003_journal_article_metadata.sql",
);

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

// Migration 003 also adds two_column/doi/author_bio to `historiography`, but
// schema.sql now defines those columns directly on that table — re-applying
// migration 003 unfiltered would fail with "duplicate column name". Apply it
// only for the two tables (context_essays, responses) still stale in
// schema.sql.
const migration = fs
  .readFileSync(MIGRATION_PATH, "utf8")
  .split("\n")
  .filter((line) => !line.startsWith("ALTER TABLE historiography"))
  .join("\n");
db.exec(migration);

const responseModel = require("../models/response.model");
const essayModel = require("../models/essay.model");
const blogPostModel = require("../models/blog-post.model");
const historiographyModel = require("../models/historiography.model");

// Seed supporting data.
function seedMlaSource() {
  return db
    .prepare(
      "INSERT INTO mla_sources (mla_book_title, published_draft) VALUES ('Test Book', 1)",
    )
    .run().lastInsertRowid;
}

function seedIdentifier() {
  return db
    .prepare(
      "INSERT INTO identifiers (isbn, published_draft) VALUES ('978-3-16-148410-0', 1)",
    )
    .run().lastInsertRowid;
}

function seedChallenge() {
  return db
    .prepare(
      "INSERT INTO challenges (slug, academic_popular, challenge_title, published_draft) VALUES ('test-challenge', 'popular', 'Test', 1)",
    )
    .run().lastInsertRowid;
}

function seedEvidence() {
  return db
    .prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES ('Test Evidence', 'test-ev', 1)",
    )
    .run().lastInsertRowid;
}

function seedContextEssay() {
  return db
    .prepare(
      "INSERT INTO context_essays (slug, essay_title, published_draft) VALUES ('link-target', 'Target Essay', 1)",
    )
    .run().lastInsertRowid;
}

function clearTables() {
  db.exec("DELETE FROM responses");
  db.exec("DELETE FROM response_breakouts");
  db.exec("DELETE FROM response_mla_sources");
  db.exec("DELETE FROM response_identifiers");
  db.exec("DELETE FROM response_links_evidence");
  db.exec("DELETE FROM response_links_context");
  db.exec("DELETE FROM context_essays");
  db.exec("DELETE FROM essay_breakouts");
  db.exec("DELETE FROM context_essay_mla_sources");
  db.exec("DELETE FROM context_essay_identifiers");
  db.exec("DELETE FROM context_essay_links_evidence");
  db.exec("DELETE FROM context_essay_links_context");
  db.exec("DELETE FROM blog_posts");
  db.exec("DELETE FROM blog_breakouts");
  db.exec("DELETE FROM blog_post_mla_sources");
  db.exec("DELETE FROM blog_post_identifiers");
  db.exec("DELETE FROM blog_post_links_evidence");
  db.exec("DELETE FROM blog_post_links_context");
  db.exec("DELETE FROM historiography");
  db.exec("DELETE FROM historiography_breakouts");
  db.exec("DELETE FROM historiography_mla_sources");
  db.exec("DELETE FROM historiography_identifiers");
  db.exec("DELETE FROM historiography_links_evidence");
  db.exec("DELETE FROM historiography_links_context");
  db.exec("DELETE FROM mla_sources");
  db.exec("DELETE FROM identifiers");
  db.exec("DELETE FROM challenges");
  db.exec("DELETE FROM evidence");
}

// ── Responses ───────────────────────────────────────────────────────────────

describe("responses: composite CRUD", () => {
  beforeEach(() => {
    clearTables();
  });

  test("createComposite with breakouts", () => {
    const challengeId = seedChallenge();
    const mlaId = seedMlaSource();

    const created = responseModel.createComposite({
      slug: "composite-response",
      challenge_id: challengeId,
      published_draft: 1,
      breakouts: [
        { title: "Breakout 1", content: "Content 1" },
        { title: "Breakout 2", content: "Content 2" },
      ],
      mla_source_ids: [mlaId],
    });

    assert.ok(created);
    assert.equal(created.slug, "composite-response");
    assert.equal(created.breakouts.length, 2);
    assert.equal(created.breakouts[0].title, "Breakout 1");
    assert.equal(created.breakouts[1].sort_order, 1);
    assert.equal(created.mla_sources.length, 1);
    assert.equal(created.mla_sources[0].id, mlaId);
  });

  test("createComposite with identifiers and links", () => {
    const challengeId = seedChallenge();
    const identifierId = seedIdentifier();
    const evidenceId = seedEvidence();
    const essayId = seedContextEssay();

    const created = responseModel.createComposite({
      slug: "linked-response",
      challenge_id: challengeId,
      published_draft: 1,
      identifier_ids: [identifierId],
      link_evidence_ids: [evidenceId],
      link_context_ids: [essayId],
    });

    assert.equal(created.identifiers.length, 1);
    assert.equal(created.identifiers[0].id, identifierId);
    assert.equal(created.links_evidence.length, 1);
    assert.equal(created.links_evidence[0].target_evidence_id, evidenceId);
    assert.equal(created.links_context.length, 1);
    assert.equal(created.links_context[0].target_context_essay_id, essayId);
  });

  test("getDetailBySlug returns full detail", () => {
    const challengeId = seedChallenge();
    responseModel.createComposite({
      slug: "detail-response",
      challenge_id: challengeId,
      published_draft: 1,
      breakouts: [{ title: "Detail", content: "Content" }],
    });

    const detail = responseModel.getDetailBySlug("detail-response");
    assert.ok(detail);
    assert.equal(detail.breakouts.length, 1);
  });

  test("getDetailBySlug returns undefined for draft", () => {
    const challengeId = seedChallenge();
    responseModel.createComposite({
      slug: "draft-response",
      challenge_id: challengeId,
      published_draft: 0,
    });

    assert.equal(responseModel.getDetailBySlug("draft-response"), undefined);
  });

  test("getAdminById returns draft with relations", () => {
    const challengeId = seedChallenge();
    const created = responseModel.createComposite({
      slug: "admin-response",
      challenge_id: challengeId,
      published_draft: 0,
      breakouts: [{ title: "Admin Breakout", content: "Admin Content" }],
    });

    const admin = responseModel.getAdminById(created.id);
    assert.ok(admin);
    assert.equal(admin.breakouts.length, 1);
    assert.equal(admin.breakouts[0].title, "Admin Breakout");
  });

  test("updateComposite replaces breakouts", () => {
    const challengeId = seedChallenge();
    const created = responseModel.createComposite({
      slug: "update-response",
      challenge_id: challengeId,
      published_draft: 1,
      breakouts: [{ title: "Old", content: "Old content" }],
    });

    const updated = responseModel.updateComposite(created.id, {
      breakouts: [{ title: "New", content: "New content" }],
    });

    assert.equal(updated.breakouts.length, 1);
    assert.equal(updated.breakouts[0].title, "New");
  });

  test("updateComposite returns undefined for non-existent id", () => {
    assert.equal(
      responseModel.updateComposite(99999, { response_title: "Ghost" }),
      undefined,
    );
  });

  test("two_column, doi, and author_bio round-trip through create and update", () => {
    const challengeId = seedChallenge();
    const created = responseModel.create({
      slug: "metadata-response",
      challenge_id: challengeId,
      published_draft: 1,
      two_column: 1,
      doi: "10.1234/response.1",
      author_bio: "Jane Doe is a writer.",
    });

    assert.equal(created.two_column, 1);
    assert.equal(created.doi, "10.1234/response.1");
    assert.equal(created.author_bio, "Jane Doe is a writer.");

    // Defaults.
    const createdDefault = responseModel.create({
      slug: "default-response",
      challenge_id: challengeId,
      published_draft: 0,
    });
    assert.equal(createdDefault.two_column, 0);
    assert.equal(createdDefault.doi, null);
    assert.equal(createdDefault.author_bio, null);

    // Update.
    const updated = responseModel.update(created.id, {
      two_column: 0,
      doi: "10.1234/response.2",
    });
    assert.equal(updated.two_column, 0);
    assert.equal(updated.doi, "10.1234/response.2");
    assert.equal(updated.author_bio, "Jane Doe is a writer.");
  });
});

// ── Essays ──────────────────────────────────────────────────────────────────

describe("essays: composite CRUD", () => {
  beforeEach(() => {
    clearTables();
  });

  test("createComposite with breakouts", () => {
    const created = essayModel.createComposite({
      slug: "composite-essay",
      published_draft: 1,
      breakouts: [{ title: "Essay Breakout", content: "Content" }],
    });

    assert.ok(created);
    assert.equal(created.slug, "composite-essay");
    assert.equal(created.breakouts.length, 1);
  });

  test("getDetailBySlug returns full detail", () => {
    essayModel.createComposite({
      slug: "detail-essay",
      published_draft: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = essayModel.getDetailBySlug("detail-essay");
    assert.ok(detail);
    assert.equal(detail.breakouts.length, 1);
  });

  test("updateComposite replaces breakouts", () => {
    const created = essayModel.createComposite({
      slug: "pic-essay",
      published_draft: 1,
      breakouts: [{ title: "Old", content: "Old content" }],
    });

    const updated = essayModel.updateComposite(created.id, {
      breakouts: [{ title: "New", content: "New content" }],
    });

    assert.equal(updated.breakouts.length, 1);
    assert.equal(updated.breakouts[0].title, "New");
  });

  test("two_column, doi, and author_bio round-trip through create and update", () => {
    const created = essayModel.create({
      slug: "metadata-essay",
      published_draft: 1,
      two_column: 1,
      doi: "10.1234/essay.1",
      author_bio: "Dr. Test is a scholar.",
    });

    assert.equal(created.two_column, 1);
    assert.equal(created.doi, "10.1234/essay.1");
    assert.equal(created.author_bio, "Dr. Test is a scholar.");

    // Defaults: two_column should be 0 when not provided.
    const createdDefault = essayModel.create({
      slug: "default-essay",
      published_draft: 0,
    });
    assert.equal(createdDefault.two_column, 0);
    assert.equal(createdDefault.doi, null);
    assert.equal(createdDefault.author_bio, null);

    // Update should persist new values.
    const updated = essayModel.update(created.id, {
      two_column: 0,
      doi: "10.1234/essay.2",
    });
    assert.equal(updated.two_column, 0);
    assert.equal(updated.doi, "10.1234/essay.2");
    assert.equal(updated.author_bio, "Dr. Test is a scholar.");
  });

  test("getAllPublished normalizes DB column names for the frontend", () => {
    essayModel.create({
      slug: "normalized-essay",
      essay_title: "The Title",
      essay_author: "The Author",
      essay_content: "The Body",
      metadata_keywords: "one, two, three",
      published_draft: 1,
    });

    const [item] = essayModel.getAllPublished();

    assert.equal(item.title, "The Title");
    assert.equal(item.author, "The Author");
    assert.equal(item.body, "The Body");
    assert.deepEqual(item.keywords, ["one", "two", "three"]);
    assert.equal(item.essay_title, undefined);
    assert.equal(item.essay_author, undefined);
    assert.equal(item.essay_content, undefined);
    assert.equal(item.metadata_keywords, undefined);
  });

  test("getDetailBySlug normalizes fields and exposes bibliography", () => {
    const mlaId = seedMlaSource();
    essayModel.createComposite({
      slug: "normalized-detail-essay",
      essay_title: "Detail Title",
      essay_author: "Detail Author",
      essay_content: "Detail Body",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = essayModel.getDetailBySlug("normalized-detail-essay");

    assert.equal(detail.title, "Detail Title");
    assert.equal(detail.author, "Detail Author");
    assert.equal(detail.body, "Detail Body");
    assert.equal(detail.bibliography.length, 1);
    assert.equal(detail.mla_sources.length, 1);
    assert.equal(detail.mla_sources[0].id, mlaId);
  });

  test("getAdminById returns raw DB column names, not normalized", () => {
    const created = essayModel.create({
      slug: "admin-raw-essay",
      essay_title: "Admin Title",
      essay_author: "Admin Author",
      essay_content: "Admin Body",
      published_draft: 0,
    });

    const admin = essayModel.getAdminById(created.id);

    assert.equal(admin.essay_title, "Admin Title");
    assert.equal(admin.essay_author, "Admin Author");
    assert.equal(admin.essay_content, "Admin Body");
    assert.equal(admin.title, undefined);
  });
});

// ── Blog Posts ──────────────────────────────────────────────────────────────

describe("blog posts: composite CRUD", () => {
  beforeEach(() => {
    clearTables();
  });

  test("createComposite with breakouts", () => {
    const created = blogPostModel.createComposite({
      slug: "composite-blog",
      published_draft: 1,
      breakouts: [{ title: "Blog Breakout", content: "Content" }],
    });

    assert.ok(created);
    assert.equal(created.breakouts.length, 1);
  });

  test("getDetailBySlug returns full detail", () => {
    blogPostModel.createComposite({
      slug: "detail-blog",
      published_draft: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
    });

    const detail = blogPostModel.getDetailBySlug("detail-blog");
    assert.ok(detail);
    assert.equal(detail.breakouts.length, 1);
  });

  test("hero_image round-trips through createComposite and getDetailBySlug", () => {
    blogPostModel.createComposite({
      slug: "hero-blog",
      published_draft: 1,
      hero_image: "/uploads/2026/07/hero.jpg",
      hero_image_alt: "A scenic view",
    });

    const detail = blogPostModel.getDetailBySlug("hero-blog");
    assert.ok(detail);
    assert.equal(detail.hero_image, "/uploads/2026/07/hero.jpg");
    assert.equal(detail.hero_image_alt, "A scenic view");
  });

  test("hero_image round-trips through updateComposite", () => {
    const created = blogPostModel.createComposite({
      slug: "update-hero",
      published_draft: 1,
    });

    const updated = blogPostModel.updateComposite(created.id, {
      hero_image: "/uploads/2026/07/updated.jpg",
      hero_image_alt: "Updated alt",
    });

    assert.ok(updated);
    assert.equal(updated.hero_image, "/uploads/2026/07/updated.jpg");
    assert.equal(updated.hero_image_alt, "Updated alt");
  });

  test("hero_image appears in getAdminById", () => {
    const created = blogPostModel.createComposite({
      slug: "admin-hero",
      published_draft: 0,
      hero_image: "/uploads/2026/07/draft-hero.jpg",
      hero_image_alt: "Draft alt",
    });

    const admin = blogPostModel.getAdminById(created.id);
    assert.ok(admin);
    assert.equal(admin.hero_image, "/uploads/2026/07/draft-hero.jpg");
    assert.equal(admin.hero_image_alt, "Draft alt");
  });
});

// ── Historiography ──────────────────────────────────────────────────────────

describe("historiography: composite CRUD", () => {
  beforeEach(() => {
    clearTables();
  });

  test("createComposite with breakouts", () => {
    const created = historiographyModel.createComposite({
      slug: "composite-hist",
      published_draft: 1,
      breakouts: [{ title: "Hist Breakout", content: "Content" }],
    });

    assert.ok(created);
    assert.equal(created.breakouts.length, 1);
  });

  test("getDetailBySlug returns full detail", () => {
    const mlaId = seedMlaSource();
    historiographyModel.createComposite({
      slug: "detail-hist",
      published_draft: 1,
      breakouts: [{ title: "Breakout", content: "Content" }],
      mla_source_ids: [mlaId],
    });

    const detail = historiographyModel.getDetailBySlug("detail-hist");
    assert.ok(detail);
    assert.equal(detail.breakouts.length, 1);
    assert.equal(detail.bibliography.length, 1);
  });

  test("updateComposite replaces all relations", () => {
    const mla1 = seedMlaSource();
    const mla2 = db
      .prepare(
        "INSERT INTO mla_sources (mla_book_title, published_draft) VALUES ('Book 2', 1)",
      )
      .run().lastInsertRowid;

    const created = historiographyModel.createComposite({
      slug: "update-hist",
      published_draft: 1,
      breakouts: [{ title: "Old", content: "Old" }],
      mla_source_ids: [mla1],
    });

    const updated = historiographyModel.updateComposite(created.id, {
      breakouts: [{ title: "New", content: "New" }],
      mla_source_ids: [mla2],
    });

    assert.equal(updated.breakouts.length, 1);
    assert.equal(updated.breakouts[0].title, "New");
    assert.equal(updated.mla_sources.length, 1);
    assert.equal(updated.mla_sources[0].id, mla2);
  });

  test("two_column, doi, and author_bio round-trip through create and update", () => {
    const created = historiographyModel.create({
      slug: "metadata-hist",
      published_draft: 1,
      two_column: 1,
      doi: "10.1234/hist.1",
      author_bio: "Prof. Smith researches historiography.",
    });

    assert.equal(created.two_column, 1);
    assert.equal(created.doi, "10.1234/hist.1");
    assert.equal(created.author_bio, "Prof. Smith researches historiography.");

    // Defaults.
    const createdDefault = historiographyModel.create({
      slug: "default-hist",
      published_draft: 0,
    });
    assert.equal(createdDefault.two_column, 0);
    assert.equal(createdDefault.doi, null);
    assert.equal(createdDefault.author_bio, null);

    // Update.
    const updated = historiographyModel.update(created.id, {
      two_column: 0,
      doi: "10.1234/hist.2",
    });
    assert.equal(updated.two_column, 0);
    assert.equal(updated.doi, "10.1234/hist.2");
    assert.equal(updated.author_bio, "Prof. Smith researches historiography.");
  });

  test("historiography_period rejects values outside the fixed 8-period set", () => {
    assert.throws(() => {
      historiographyModel.create({
        slug: "bad-period-hist",
        published_draft: 0,
        historiography_period: "not-a-real-period",
      });
    }, /CHECK constraint failed/);
  });

  test("historiography_period and period_sort_order round-trip through create", () => {
    const created = historiographyModel.create({
      slug: "period-hist",
      published_draft: 0,
      historiography_period: "medieval",
      period_sort_order: 2,
    });

    assert.equal(created.historiography_period, "medieval");
    assert.equal(created.period_sort_order, 2);
  });

  test("getAllPublished normalizes DB column names for the frontend", () => {
    historiographyModel.create({
      slug: "normalized-hist",
      essay_title: "The Title",
      essay_author: "The Author",
      essay_content: "The Body",
      metadata_keywords: "one, two, three",
      published_draft: 1,
      historiography_period: "third-quest",
      period_sort_order: 7,
    });

    const [item] = historiographyModel.getAllPublished();

    assert.equal(item.title, "The Title");
    assert.equal(item.author, "The Author");
    assert.equal(item.body, "The Body");
    assert.deepEqual(item.keywords, ["one", "two", "three"]);
    assert.equal(item.essay_title, undefined);
    assert.equal(item.essay_author, undefined);
    assert.equal(item.essay_content, undefined);
    assert.equal(item.metadata_keywords, undefined);
    // Non-renamed fields pass through untouched.
    assert.equal(item.historiography_period, "third-quest");
  });

  test("getDetailBySlug normalizes fields and exposes bibliography", () => {
    const mlaId = seedMlaSource();
    historiographyModel.createComposite({
      slug: "normalized-detail-hist",
      essay_title: "Detail Title",
      essay_author: "Detail Author",
      essay_content: "Detail Body",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = historiographyModel.getDetailBySlug(
      "normalized-detail-hist",
    );

    assert.equal(detail.title, "Detail Title");
    assert.equal(detail.author, "Detail Author");
    assert.equal(detail.body, "Detail Body");
    assert.equal(detail.bibliography.length, 1);
    assert.equal(detail.mla_sources.length, 1);
    assert.equal(detail.mla_sources[0].id, mlaId);
  });

  test("getAllPublished orders by period_sort_order ascending, then created_at descending", () => {
    historiographyModel.create({
      slug: "order-third",
      essay_title: "Third",
      published_draft: 1,
      historiography_period: "third-quest",
      period_sort_order: 3,
    });
    historiographyModel.create({
      slug: "order-first",
      essay_title: "First",
      published_draft: 1,
      historiography_period: "early-church",
      period_sort_order: 1,
    });
    historiographyModel.create({
      slug: "order-second",
      essay_title: "Second",
      published_draft: 1,
      historiography_period: "medieval",
      period_sort_order: 2,
    });

    const items = historiographyModel.getAllPublished();
    assert.deepEqual(
      items.map((i) => i.slug),
      ["order-first", "order-second", "order-third"],
    );
  });

  test("getAllAdmin returns drafts and published rows with raw column names", () => {
    historiographyModel.create({
      slug: "admin-draft-hist",
      essay_title: "Admin Draft",
      published_draft: 0,
      historiography_period: "contemporary",
      period_sort_order: 8,
    });
    historiographyModel.create({
      slug: "admin-published-hist",
      essay_title: "Admin Published",
      published_draft: 1,
      historiography_period: "early-church",
      period_sort_order: 1,
    });

    const items = historiographyModel.getAllAdmin();

    assert.equal(items.length, 2);
    assert.ok(items.every((i) => i.essay_title !== undefined));
    assert.ok(items.some((i) => i.published_draft === 0));
    assert.ok(items.some((i) => i.published_draft === 1));
  });
});
