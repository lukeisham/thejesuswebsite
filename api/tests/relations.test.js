// Relations helper tests — uses node:test + node:assert.
// Tests the generic child-row and junction helpers with an in-memory SQLite DB.
// Verifies get/replace round-trips, ordering, and empty-set handling.

// Must set before any config require so better-sqlite3 opens :memory:.
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

// Require config first — it reads process.env.DB_PATH once and returns a singleton.
// The helpers will share this same DB instance via their require('../../config').
const db = require("../config");

// Apply the authoritative schema (all migrations already folded in).
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

// Now the helpers will use this same DB via their require('../../config').
const {
  getChildren,
  replaceChildren,
} = require("../models/relations/child-rows");
const { getLinked, replaceLinks } = require("../models/relations/junctions");

// ── Seed helpers ────────────────────────────────────────────────────────────
// Each helper uses a counter so slugs/titles stay unique across tests.

let evidenceCounter = 0;
function seedEvidence() {
  evidenceCounter++;
  return db
    .prepare(
      "INSERT INTO evidence (title, slug, published_draft) VALUES (?, ?, 1)",
    )
    .run("Test", "test-" + evidenceCounter).lastInsertRowid;
}

let essayCounter = 0;
function seedContextEssay() {
  essayCounter++;
  return db
    .prepare(
      "INSERT INTO context_essays (slug, essay_title, published_draft) VALUES (?, ?, 1)",
    )
    .run("test-" + essayCounter, "Test Essay " + essayCounter).lastInsertRowid;
}

function seedEssayBreakout(essayId, sortOrder, title, content) {
  return db
    .prepare(
      "INSERT INTO essay_breakouts (context_essay_id, sort_order, title, content) VALUES (?, ?, ?, ?)",
    )
    .run(essayId, sortOrder, title, content);
}

let mlaCounter = 0;
function seedMlaSource() {
  mlaCounter++;
  return db
    .prepare(
      "INSERT INTO mla_sources (mla_book_title, published_draft) VALUES (?, 1)",
    )
    .run("Book " + mlaCounter).lastInsertRowid;
}

function seedEvidenceMlaLink(evidenceId, mlaId, order) {
  return db
    .prepare(
      "INSERT INTO evidence_mla_sources (evidence_id, mla_source_id, citation_order) VALUES (?, ?, ?)",
    )
    .run(evidenceId, mlaId, order);
}

// ── Child Rows ──────────────────────────────────────────────────────────────

describe("child-rows: getChildren", () => {
  test("returns empty array when no children exist", () => {
    const essayId = seedContextEssay();
    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.deepStrictEqual(children, []);
  });

  test("returns children ordered by sort_order", () => {
    const essayId = seedContextEssay();
    seedEssayBreakout(essayId, 2, "Title B", "Content B");
    seedEssayBreakout(essayId, 0, "Title A", "Content A");
    seedEssayBreakout(essayId, 1, "Title C", "Content C");

    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.equal(children.length, 3);
    assert.equal(children[0].sort_order, 0);
    assert.equal(children[1].sort_order, 1);
    assert.equal(children[2].sort_order, 2);
    assert.equal(children[0].title, "Title A");
  });

  test("returns only children for the specified parent", () => {
    const ev1 = seedContextEssay();
    const ev2 = seedContextEssay();
    seedEssayBreakout(ev1, 0, "EV1 Title", "EV1 Content");
    seedEssayBreakout(ev2, 0, "EV2 Title", "EV2 Content");

    const children = getChildren("essay_breakouts", "context_essay_id", ev1);
    assert.equal(children.length, 1);
    assert.equal(children[0].title, "EV1 Title");
  });
});

describe("child-rows: replaceChildren", () => {
  test("inserts new children when table is empty", () => {
    const essayId = seedContextEssay();
    replaceChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
      [
        { title: "First", content: "Content first" },
        { title: "Second", content: "Content second" },
      ],
      ["title", "content"],
    );

    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.equal(children.length, 2);
    assert.equal(children[0].sort_order, 0);
    assert.equal(children[0].title, "First");
    assert.equal(children[1].sort_order, 1);
    assert.equal(children[1].title, "Second");
  });

  test("replaces existing children", () => {
    const essayId = seedContextEssay();
    seedEssayBreakout(essayId, 0, "Old", "Old content");
    seedEssayBreakout(essayId, 1, "Old2", "Old2 content");

    replaceChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
      [{ title: "New", content: "New content" }],
      ["title", "content"],
    );

    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.equal(children.length, 1);
    assert.equal(children[0].title, "New");
  });

  test("empty array deletes all children", () => {
    const essayId = seedContextEssay();
    seedEssayBreakout(essayId, 0, "Img", "Img content");

    replaceChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
      [],
      ["title", "content"],
    );

    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.equal(children.length, 0);
  });

  test("null/undefined rows argument deletes all children", () => {
    const essayId = seedContextEssay();
    seedEssayBreakout(essayId, 0, "Img", "Img content");

    replaceChildren("essay_breakouts", "context_essay_id", essayId, undefined, [
      "title",
      "content",
    ]);

    const children = getChildren(
      "essay_breakouts",
      "context_essay_id",
      essayId,
    );
    assert.equal(children.length, 0);
  });
});

// ── Junctions ───────────────────────────────────────────────────────────────

describe("junctions: getLinked", () => {
  test("returns empty array when no links exist", () => {
    const evidenceId = seedEvidence();
    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.deepStrictEqual(links, []);
  });

  test("returns links ordered by the order column", () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mla2, 0);
    seedEvidenceMlaLink(evidenceId, mla1, 2);

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 2);
    assert.equal(links[0].citation_order, 0);
    assert.equal(links[1].citation_order, 2);
  });
});

describe("junctions: replaceLinks", () => {
  test("inserts new links", () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();

    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      [mlaId],
    );

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 1);
    assert.equal(links[0].mla_source_id, mlaId);
    assert.equal(links[0].citation_order, 0);
  });

  test("replaces existing links", () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mla1, 0);

    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      [mla2],
    );

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 1);
    assert.equal(links[0].mla_source_id, mla2);
  });

  test("empty array deletes all links", () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mlaId, 0);

    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      [],
    );

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 0);
  });

  test("null/undefined rows deletes all links", () => {
    const evidenceId = seedEvidence();
    const mlaId = seedMlaSource();
    seedEvidenceMlaLink(evidenceId, mlaId, 0);

    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      undefined,
    );

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 0);
  });

  test("multiple links are ordered sequentially", () => {
    const evidenceId = seedEvidence();
    const mla1 = seedMlaSource();
    const mla2 = seedMlaSource();
    const mla3 = seedMlaSource();

    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      [mla1, mla2, mla3],
    );

    const links = getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidenceId,
    );
    assert.equal(links.length, 3);
    assert.equal(links[0].citation_order, 0);
    assert.equal(links[1].citation_order, 1);
    assert.equal(links[2].citation_order, 2);
  });
});
