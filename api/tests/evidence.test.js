// Evidence composite CRUD tests — uses node:test + node:assert.
// Tests create/read/update/delete with related child/junction data.
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

const db = require("../config");
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

const evidenceModel = require("../models/evidence.model");

// Seed supporting data for junction links.
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

function seedContextEssay() {
  return db
    .prepare(
      "INSERT INTO context_essays (slug, essay_title, published_draft) VALUES ('target-essay', 'Target', 1)",
    )
    .run().lastInsertRowid;
}

// Public list + filter tests.
describe("evidence: getAllPublished", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM evidence_links_evidence");
    db.exec("DELETE FROM evidence_links_context");
  });

  test("returns only published items", () => {
    evidenceModel.create({
      title: "Published",
      slug: "pub",
      published_draft: 1,
    });
    evidenceModel.create({ title: "Draft", slug: "draft", published_draft: 0 });

    const items = evidenceModel.getAllPublished();
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Published");
  });

  test("returns primary_verse on list items", () => {
    evidenceModel.create({
      title: "Verse Item",
      slug: "verse-item",
      primary_verse: "John 3:16",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished();
    assert.equal(items.length, 1);
    assert.equal(items[0].primary_verse, "John 3:16");
  });

  test("thumbnail_path is null when no thumbnail was generated on upload", () => {
    evidenceModel.create({
      title: "With Figure",
      slug: "with-figure",
      description: '[figure src="/uploads/test.webp" caption="Test"]',
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished();
    assert.equal(items.length, 1);
    // thumbnail_path (migration 034) is populated by the upload route when
    // Sharp resizes an image; records created without an upload stay null.
    assert.equal(items[0].thumbnail_path, null);
  });

  test("filters by gospel_category", () => {
    evidenceModel.create({
      title: "Miracle One",
      slug: "miracle-1",
      gospel_category: "miracles",
      published_draft: 1,
    });
    evidenceModel.create({
      title: "Parable One",
      slug: "parable-1",
      gospel_category: "parables",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished({
      gospel_category: "miracles",
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Miracle One");
  });
});

// Composite create + read tests.
describe("evidence: createComposite + getDetailBySlug", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM evidence_links_evidence");
    db.exec("DELETE FROM evidence_links_context");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
    db.exec("DELETE FROM context_essays");
  });

  test("creates with MLA sources", () => {
    const mlaId = seedMlaSource();
    const created = evidenceModel.createComposite({
      title: "With MLA",
      slug: "with-mla",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    assert.ok(created);
    assert.equal(created.title, "With MLA");
    assert.equal(created.mla_sources.length, 1);
    assert.equal(created.mla_sources[0].id, mlaId);
  });

  test("creates with identifiers", () => {
    const identifierId = seedIdentifier();
    const created = evidenceModel.createComposite({
      title: "With Identifiers",
      slug: "with-ids",
      published_draft: 1,
      identifier_ids: [identifierId],
    });

    assert.equal(created.identifiers.length, 1);
    assert.equal(created.identifiers[0].id, identifierId);
  });

  test("creates with internal links", () => {
    // Create a target evidence item to link to
    const target = evidenceModel.create({
      title: "Target",
      slug: "target",
      published_draft: 1,
    });
    const essayId = seedContextEssay();

    const created = evidenceModel.createComposite({
      title: "With Links",
      slug: "with-links",
      published_draft: 1,
      link_evidence_ids: [target.id],
      link_context_ids: [essayId],
    });

    assert.equal(created.links_evidence.length, 1);
    assert.equal(created.links_evidence[0].target_evidence_id, target.id);
    assert.equal(created.links_context.length, 1);
    assert.equal(created.links_context[0].target_context_essay_id, essayId);
  });

  test("public getDetailBySlug returns complete detail", () => {
    const mlaId = seedMlaSource();
    evidenceModel.createComposite({
      title: "Detail Test",
      slug: "detail-test",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const detail = evidenceModel.getDetailBySlug("detail-test");
    assert.ok(detail);
    assert.equal(detail.title, "Detail Test");
    assert.equal(detail.mla_sources.length, 1);
  });

  test("public getDetailBySlug returns undefined for draft", () => {
    evidenceModel.createComposite({
      title: "Draft Detail",
      slug: "draft-detail",
      published_draft: 0,
    });

    const detail = evidenceModel.getDetailBySlug("draft-detail");
    assert.equal(detail, undefined);
  });

  test("admin getAdminById returns draft with relations", () => {
    const mlaId = seedMlaSource();
    const created = evidenceModel.createComposite({
      title: "Admin Draft",
      slug: "admin-draft",
      published_draft: 0,
      mla_source_ids: [mlaId],
    });

    const admin = evidenceModel.getAdminById(created.id);
    assert.ok(admin);
    assert.equal(admin.title, "Admin Draft");
    assert.equal(admin.mla_sources.length, 1);
  });
});

// Composite update tests.
describe("evidence: updateComposite", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM evidence_links_evidence");
    db.exec("DELETE FROM evidence_links_context");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("updates base fields", () => {
    const created = evidenceModel.createComposite({
      title: "Original",
      slug: "original",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      title: "Updated",
    });
    assert.equal(updated.title, "Updated");
    assert.equal(updated.slug, "original"); // slug unchanged
  });

  test("replaces mla sources on update", () => {
    const mla1 = seedMlaSource();
    const mla2 = db
      .prepare(
        "INSERT INTO mla_sources (mla_book_title, published_draft) VALUES ('Book 2', 1)",
      )
      .run().lastInsertRowid;

    const created = evidenceModel.createComposite({
      title: "MLA Test",
      slug: "mla-test",
      published_draft: 1,
      mla_source_ids: [mla1],
    });

    const updated = evidenceModel.updateComposite(created.id, {
      mla_source_ids: [mla2],
    });

    assert.equal(updated.mla_sources.length, 1);
    assert.equal(updated.mla_sources[0].id, mla2);
  });

  test("removes mla sources when empty array is sent", () => {
    const mla1 = seedMlaSource();
    const created = evidenceModel.createComposite({
      title: "Remove MLA",
      slug: "remove-mla",
      published_draft: 1,
      mla_source_ids: [mla1],
    });

    const updated = evidenceModel.updateComposite(created.id, {
      mla_source_ids: [],
    });

    assert.equal(updated.mla_sources.length, 0);
  });

  test("returns undefined for non-existent id", () => {
    const result = evidenceModel.updateComposite(99999, { title: "Ghost" });
    assert.equal(result, undefined);
  });
});

// Delete tests.
describe("evidence: remove", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("deletes evidence and cascades to children", () => {
    const mlaId = seedMlaSource();
    const created = evidenceModel.createComposite({
      title: "To Delete",
      slug: "to-delete",
      published_draft: 1,
      mla_source_ids: [mlaId],
    });

    const removed = evidenceModel.remove(created.id);
    assert.equal(removed, true);

    // Verify cascaded delete
    const detail = evidenceModel.getAdminById(created.id);
    assert.equal(detail, undefined);

    const sources = db
      .prepare("SELECT * FROM evidence_mla_sources WHERE evidence_id = ?")
      .all(created.id);
    assert.equal(sources.length, 0);
  });

  test("returns false for non-existent id", () => {
    assert.equal(evidenceModel.remove(99999), false);
  });
});

// Admin list tests.
describe("evidence: getAllAdmin", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM evidence_links_evidence");
    db.exec("DELETE FROM evidence_links_context");
  });

  test("returns empty array when no evidence exists", () => {
    const items = evidenceModel.getAllAdmin();
    assert.equal(Array.isArray(items), true);
    assert.equal(items.length, 0);
  });

  test("returns all evidence regardless of publish state", () => {
    evidenceModel.create({
      title: "Published Item",
      slug: "pub-item",
      published_draft: 1,
    });
    evidenceModel.create({
      title: "Draft Item",
      slug: "draft-item",
      published_draft: 0,
    });

    const items = evidenceModel.getAllAdmin();
    assert.equal(items.length, 2);
    assert.equal(items[0].title, "Draft Item"); // sorted by title
    assert.equal(items[1].title, "Published Item");
  });

  test("returns items sorted by title ascending", () => {
    evidenceModel.create({ title: "Zebra", slug: "zebra", published_draft: 1 });
    evidenceModel.create({ title: "Apple", slug: "apple", published_draft: 1 });
    evidenceModel.create({ title: "Mango", slug: "mango", published_draft: 1 });

    const items = evidenceModel.getAllAdmin();
    assert.equal(items.length, 3);
    assert.equal(items[0].title, "Apple");
    assert.equal(items[1].title, "Mango");
    assert.equal(items[2].title, "Zebra");
  });
});

// Edge-case tests for coverage gaps.
describe("evidence: edge cases", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    db.exec("DELETE FROM evidence_mla_sources");
    db.exec("DELETE FROM evidence_identifiers");
    db.exec("DELETE FROM evidence_links_evidence");
    db.exec("DELETE FROM evidence_links_context");
    db.exec("DELETE FROM mla_sources");
    db.exec("DELETE FROM identifiers");
  });

  test("getAdminById returns undefined for non-existent ID", () => {
    assert.equal(evidenceModel.getAdminById(99999), undefined);
  });

  test("createComposite with undefined relation arrays creates clean record", () => {
    const created = evidenceModel.createComposite({
      title: "No Relations",
      slug: "no-relations",
      published_draft: 1,
      mla_source_ids: undefined,
      identifier_ids: undefined,
      link_evidence_ids: undefined,
      link_context_ids: undefined,
    });

    assert.ok(created);
    assert.equal(created.title, "No Relations");
    assert.equal(created.mla_sources.length, 0);
    assert.equal(created.identifiers.length, 0);
    assert.equal(created.links_evidence.length, 0);
    assert.equal(created.links_context.length, 0);
  });

  test("getAllPublished with multiple simultaneous filters", () => {
    evidenceModel.create({
      title: "Miracle in Galilee",
      slug: "miracle-galilee",
      gospel_category: "miracles",
      timeline_era: "GalileeMinistry",
      published_draft: 1,
    });
    evidenceModel.create({
      title: "Miracle in Judea",
      slug: "miracle-judea",
      gospel_category: "miracles",
      timeline_era: "JudeanMinistry",
      published_draft: 1,
    });
    evidenceModel.create({
      title: "Parable in Galilee",
      slug: "parable-galilee",
      gospel_category: "parables",
      timeline_era: "GalileeMinistry",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished({
      gospel_category: "miracles",
      timeline_era: "GalileeMinistry",
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Miracle in Galilee");
  });

  test("filter keys outside VALID_FILTERS are silently ignored", () => {
    evidenceModel.create({
      title: "Test",
      slug: "test-filter",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished({
      nonsense: "value",
      alsoBad: "x",
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Test");
  });

  test("update() with zero writable fields returns existing row unchanged", () => {
    const created = evidenceModel.create({
      title: "Unchanged",
      slug: "unchanged",
      published_draft: 1,
    });

    const result = evidenceModel.update(created.id, {});
    assert.ok(result);
    assert.equal(result.title, "Unchanged");
    assert.equal(result.slug, "unchanged");
  });
});

// Dedicated image field tests.
describe("evidence: image and image_alt columns", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("createComposite writes image and image_alt", () => {
    const created = evidenceModel.createComposite({
      title: "With Image",
      slug: "with-image",
      published_draft: 1,
      image: "/uploads/evidence-hero.webp",
      image_alt: "A photograph of the Jordan River.",
    });

    assert.equal(created.image, "/uploads/evidence-hero.webp");
    assert.equal(created.image_alt, "A photograph of the Jordan River.");
  });

  test("updateComposite writes image and image_alt", () => {
    const created = evidenceModel.createComposite({
      title: "Image Update",
      slug: "image-update",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      image: "/uploads/evidence-updated.webp",
      image_alt: "Updated alt text.",
    });

    assert.equal(updated.image, "/uploads/evidence-updated.webp");
    assert.equal(updated.image_alt, "Updated alt text.");
  });

  test("stray image fields are rejected by WRITABLE_COLUMNS", () => {
    const created = evidenceModel.createComposite({
      title: "Stray Field",
      slug: "stray-field",
      published_draft: 1,
      some_other_image_field: "/uploads/should-not-save.webp",
    });

    assert.equal(created.some_other_image_field, undefined);
  });

  test("image_caption round-trips through create → getDetailBySlug → update", () => {
    const created = evidenceModel.createComposite({
      title: "With Caption",
      slug: "with-caption",
      published_draft: 1,
      image: "/uploads/evidence-hero.webp",
      image_alt: "A photograph of the Jordan River.",
      image_caption: "The Jordan River near Bethany, 2024.",
    });
    assert.equal(created.image_caption, "The Jordan River near Bethany, 2024.");

    const detail = evidenceModel.getDetailBySlug("with-caption");
    assert.equal(detail.image_caption, "The Jordan River near Bethany, 2024.");

    const updated = evidenceModel.updateComposite(created.id, {
      image_caption: "Updated caption.",
    });
    assert.equal(updated.image_caption, "Updated caption.");
  });

  test("a stray non-whitelisted field alongside image_caption is still stripped", () => {
    const created = evidenceModel.createComposite({
      title: "Caption Plus Stray",
      slug: "caption-plus-stray",
      published_draft: 1,
      image_caption: "A real caption.",
      not_a_real_column: "should not persist",
    });

    assert.equal(created.image_caption, "A real caption.");
    assert.equal(created.not_a_real_column, undefined);
  });

  test("null image and image_alt are accepted (legacy records)", () => {
    const created = evidenceModel.createComposite({
      title: "Legacy Record",
      slug: "legacy-record",
      published_draft: 1,
      image: null,
      image_alt: null,
    });

    assert.equal(created.image, null);
    assert.equal(created.image_alt, null);
  });
});

// Slug fallback tests.
describe("evidence: slug fallback on create", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("create() generates slug from title when slug is missing", () => {
    const created = evidenceModel.create({
      title: "My Test Title",
      published_draft: 1,
    });

    assert.ok(created);
    assert.equal(created.slug, "my-test-title");
    assert.equal(created.title, "My Test Title");
  });

  test("create() still uses provided slug when both title and slug are present", () => {
    const created = evidenceModel.create({
      title: "My Test Title",
      slug: "custom-slug",
      published_draft: 1,
    });

    assert.equal(created.slug, "custom-slug");
    assert.equal(created.title, "My Test Title");
  });

  test("create() deduplicates title-derived slug on collision", () => {
    evidenceModel.create({
      title: "My Test Title",
      slug: "my-test-title",
      published_draft: 1,
    });

    const second = evidenceModel.create({
      title: "My Test Title",
      published_draft: 1,
    });

    assert.equal(second.slug, "my-test-title-2");
  });
});

// Server-side pagination tests.
describe("evidence: getAllPublished pagination", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
    // Seed 25 items so we have enough for multi-page tests.
    for (let i = 1; i <= 25; i++) {
      evidenceModel.create({
        title: `Item ${String(i).padStart(2, "0")}`,
        slug: `item-${i}`,
        published_draft: 1,
      });
    }
  });

  test("returns flat array when no page/limit (backward compatible)", () => {
    const items = evidenceModel.getAllPublished({});
    assert.equal(Array.isArray(items), true);
    assert.equal(items.length, 25);
  });

  test("returns paginated response with default limit=20", () => {
    const result = evidenceModel.getAllPublished({ page: "1" });
    assert.equal(result.page, 1);
    assert.equal(result.limit, 20);
    assert.equal(result.total, 25);
    assert.equal(result.totalPages, 2);
    assert.equal(result.items.length, 20);
  });

  test("page 2 returns remaining items", () => {
    const result = evidenceModel.getAllPublished({ page: "2" });
    assert.equal(result.page, 2);
    assert.equal(result.items.length, 5);
  });

  test("custom limit returns exactly that many items", () => {
    const result = evidenceModel.getAllPublished({ page: "1", limit: "5" });
    assert.equal(result.limit, 5);
    assert.equal(result.items.length, 5);
    assert.equal(result.totalPages, 5);
  });

  test("page=999 returns empty items array", () => {
    const result = evidenceModel.getAllPublished({ page: "999" });
    assert.equal(result.items.length, 0);
    assert.equal(result.total, 25);
  });

  test("filters + pagination work together", () => {
    // Create a specific item for filtering.
    evidenceModel.create({
      title: "Filtered Miracle",
      slug: "filtered-miracle",
      gospel_category: "miracles",
      timeline_era: "GalileeMinistry",
      published_draft: 1,
    });

    const result = evidenceModel.getAllPublished({
      gospel_category: "miracles",
      timeline_era: "GalileeMinistry",
      page: "1",
      limit: "10",
    });
    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "Filtered Miracle");
  });

  test("flat array still works with filters (no page/limit)", () => {
    evidenceModel.create({
      title: "Flat Filtered",
      slug: "flat-filtered",
      gospel_category: "miracles",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished({
      gospel_category: "miracles",
    });
    assert.equal(Array.isArray(items), true);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Flat Filtered");
  });
});

// Timeline offset validation tests.
describe("evidence: timeline offset fields", () => {
  beforeEach(() => {
    db.exec("DELETE FROM evidence");
  });

  test("updateComposite accepts null timeline offsets", () => {
    const created = evidenceModel.create({
      title: "Offset Test",
      slug: "offset-test",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      timeline_offset_x: null,
      timeline_offset_y: null,
    });
    assert.equal(updated.timeline_offset_x, null);
    assert.equal(updated.timeline_offset_y, null);
  });

  test("updateComposite clamps timeline_offset_x to [-0.5, 0.5]", () => {
    const created = evidenceModel.create({
      title: "Clamp X",
      slug: "clamp-x",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      timeline_offset_x: 1.5,
    });
    assert.equal(updated.timeline_offset_x, 0.5);

    const updated2 = evidenceModel.updateComposite(created.id, {
      timeline_offset_x: -2.0,
    });
    assert.equal(updated2.timeline_offset_x, -0.5);

    const updated3 = evidenceModel.updateComposite(created.id, {
      timeline_offset_x: 0.25,
    });
    assert.equal(updated3.timeline_offset_x, 0.25);
  });

  test("updateComposite clamps timeline_offset_y to [-0.4, 0.4]", () => {
    const created = evidenceModel.create({
      title: "Clamp Y",
      slug: "clamp-y",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      timeline_offset_y: 1.0,
    });
    assert.equal(updated.timeline_offset_y, 0.4);

    const updated2 = evidenceModel.updateComposite(created.id, {
      timeline_offset_y: -1.0,
    });
    assert.equal(updated2.timeline_offset_y, -0.4);

    const updated3 = evidenceModel.updateComposite(created.id, {
      timeline_offset_y: 0.15,
    });
    assert.equal(updated3.timeline_offset_y, 0.15);
  });

  test("updateComposite sets invalid offsets to null", () => {
    const created = evidenceModel.create({
      title: "Invalid Offset",
      slug: "invalid-offset",
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      timeline_offset_x: "not a number",
      timeline_offset_y: Infinity,
    });
    assert.equal(updated.timeline_offset_x, null);
    assert.equal(updated.timeline_offset_y, null);
  });

  test("updateComposite preserves offsets not in update data", () => {
    const created = evidenceModel.create({
      title: "Preserve Offset",
      slug: "preserve-offset",
      timeline_offset_x: 0.1,
      timeline_offset_y: 0.2,
      published_draft: 1,
    });

    const updated = evidenceModel.updateComposite(created.id, {
      title: "Updated Title",
    });
    // Offsets not touched by this update, so they should remain
    assert.equal(updated.title, "Updated Title");
  });
});
