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

// evidence_pictures exists in migration 001 but not yet in schema.sql;
// create it here for the thumbnail_path test (schema drift — Issues.md row 19).
db.exec(`
  CREATE TABLE IF NOT EXISTS evidence_pictures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    image_path  TEXT NOT NULL,
    caption     TEXT
  );
`);

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

  test("returns thumbnail_path from first evidence_picture", () => {
    const created = evidenceModel.create({
      title: "With Picture",
      slug: "with-picture",
      published_draft: 1,
    });

    db.prepare(
      "INSERT INTO evidence_pictures (evidence_id, sort_order, image_path) VALUES (?, 0, ?)",
    ).run(created.id, "/uploads/test.webp");
    db.prepare(
      "INSERT INTO evidence_pictures (evidence_id, sort_order, image_path) VALUES (?, 1, ?)",
    ).run(created.id, "/uploads/test2.webp");

    const items = evidenceModel.getAllPublished();
    assert.equal(items.length, 1);
    assert.equal(items[0].thumbnail_path, "/uploads/test.webp");
  });

  test("thumbnail_path is null when no pictures exist", () => {
    evidenceModel.create({
      title: "No Picture",
      slug: "no-picture",
      published_draft: 1,
    });

    const items = evidenceModel.getAllPublished();
    assert.equal(items.length, 1);
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
