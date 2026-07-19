// SQL-4 whitelist tests — verifies that the identifier-interpolating helpers
// in api/models/relations/junctions.js, api/models/relations/child-rows.js,
// api/models/model-helpers.js (generateUniqueSlug), and api/models/drafts.model.js
// (getDraftsFor/getDraftCounts) accept known table/column names and throw a
// clear error for anything else. Structural SQL-injection hardening — see
// setup/PLANS/Completed/sql-identifier-whitelisting.md.

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestDb } = require("./helpers/db");

const {
  getLinked,
  getLinkedMlaSources,
  getLinkedIdentifiers,
  replaceLinks,
} = require("../models/relations/junctions");
const { getChildren, replaceChildren } = require("../models/relations/child-rows");
const { generateUniqueSlug } = require("../models/model-helpers");
const { getDraftCounts } = require("../models/drafts.model");

// junctions.js and child-rows.js close over a module-scoped `db` from
// ../../config rather than accepting it as a parameter, so these tests set
// DB_PATH before requiring them (mirrors the pattern used by other model
// tests in this suite) and rely on the shared in-memory test schema.
describe("junctions.js identifier whitelisting", () => {
  test("getLinked accepts a whitelisted table/columns", () => {
    assert.doesNotThrow(() =>
      getLinked("evidence_links_evidence", "source_evidence_id", "sort_order", 1),
    );
  });

  test("getLinked throws for an unknown table", () => {
    assert.throws(
      () => getLinked("evidence_links_evidence; DROP TABLE evidence;--", "source_evidence_id", "sort_order", 1),
      /Unknown junction table/,
    );
  });

  test("getLinked throws for an unknown source column", () => {
    assert.throws(
      () => getLinked("evidence_links_evidence", "not_a_column", "sort_order", 1),
      /Unknown junction source column/,
    );
  });

  test("getLinked throws for an unknown order column", () => {
    assert.throws(
      () => getLinked("evidence_links_evidence", "source_evidence_id", "not_a_column", 1),
      /Unknown junction order column/,
    );
  });

  test("getLinkedMlaSources throws for an unknown table", () => {
    assert.throws(
      () => getLinkedMlaSources("not_a_table", "evidence_id", "citation_order", 1),
      /Unknown junction table/,
    );
  });

  test("getLinkedIdentifiers throws for an unknown table", () => {
    assert.throws(
      () => getLinkedIdentifiers("not_a_table", "evidence_id", "citation_order", 1),
      /Unknown junction table/,
    );
  });

  test("replaceLinks throws for an unknown target column", () => {
    assert.throws(
      () =>
        replaceLinks(
          "evidence_mla_sources",
          "evidence_id",
          "not_a_target_column",
          "citation_order",
          1,
          [],
        ),
      /Unknown junction target column/,
    );
  });
});

describe("child-rows.js identifier whitelisting", () => {
  test("getChildren accepts a whitelisted table/column", () => {
    assert.doesNotThrow(() => getChildren("response_breakouts", "response_id", 1));
  });

  test("getChildren throws for an unknown table", () => {
    assert.throws(
      () => getChildren("not_a_table", "response_id", 1),
      /Unknown child table/,
    );
  });

  test("getChildren throws for an unknown FK column", () => {
    assert.throws(
      () => getChildren("response_breakouts", "not_a_column", 1),
      /Unknown child FK column/,
    );
  });

  test("replaceChildren throws for an unknown writable column", () => {
    assert.throws(
      () => replaceChildren("response_breakouts", "response_id", 1, [], ["evil_column"]),
      /Unknown child writable column/,
    );
  });
});

describe("model-helpers.js generateUniqueSlug identifier whitelisting", () => {
  let db;
  beforeEach(() => {
    db = createTestDb();
  });

  test("accepts a whitelisted table", () => {
    assert.doesNotThrow(() => generateUniqueSlug(db, "evidence", "some-slug"));
  });

  test("throws for an unknown table", () => {
    assert.throws(
      () => generateUniqueSlug(db, "evidence; DROP TABLE evidence;--", "some-slug"),
      /Unknown table in generateUniqueSlug/,
    );
  });
});

describe("drafts.model.js identifier whitelisting", () => {
  test("getDraftCounts runs cleanly over every entry in DRAFTABLE", () => {
    // Every DRAFTABLE entry must pass its own whitelist check (built from the
    // same array) — this is a regression guard against DRAFTABLE and the
    // whitelist Sets drifting apart.
    assert.doesNotThrow(() => getDraftCounts());
  });
});
