// Guide test for setup/ARCHITECTURE/journal-article-fields.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file, and the guide. No row has an allowed exception.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  ABSTRACT_MAX_LENGTH,
  FOOTNOTE_MAX_LENGTH,
  FOOTNOTE_MAX_COUNT,
} = require("../lib/journal-field-validation");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/journal-article-fields.md";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

const ROUTES = ["essays", "responses", "historiography"].map(
  (name) => `api/routes/${name}.js`,
);
const ADMIN_PAGES = [
  "admin/essays/edit-[id].html",
  "admin/debate/edit-[id].html",
  "admin/historiography/edit-[id].html",
];
const DETAIL_PAGES = [
  "frontend/assets/js/essay-detail.js",
  "frontend/assets/js/response-detail.js",
  "frontend/assets/js/historiography-detail.js",
];
const FOOTNOTE_TABLES = [
  "essay_footnotes",
  "response_footnotes",
  "historiography_footnotes",
];

describe(`${GUIDE} row 1: every marker list names fn`, () => {
  const patterns = {
    "frontend/assets/js/utils/content-markers.js": "(mla|id|fn)",
    "frontend/assets/js/utils/markdown.js": "(?:mla|id|fn)",
    "frontend/assets/js/utils/excerpt.js": "(?:mla|id|fn)",
  };

  for (const [file, expected] of Object.entries(patterns)) {
    test(`${file} lists fn in its marker pattern`, () => {
      assert.ok(
        read(file).includes(expected),
        `Row 1 of ${GUIDE}: ${file} must contain the marker pattern "${expected}". ` +
          `A marker type missing here is escaped or left in excerpts.`,
      );
    });
  }
});

describe(`${GUIDE} row 4: admin limits equal the API limits`, () => {
  for (const page of ADMIN_PAGES) {
    test(`${page} sets the abstract maxLength to ${ABSTRACT_MAX_LENGTH}`, () => {
      const match = read(page).match(/id: "[a-z]+-abstract"[\s\S]*?maxLength: (\d+)/);
      assert.ok(match, `Row 4 of ${GUIDE}: ${page} has no abstract textarea with a maxLength.`);
      assert.equal(
        Number(match[1]),
        ABSTRACT_MAX_LENGTH,
        `Row 4 of ${GUIDE}: ${page} abstract maxLength is ${match[1]}, but ABSTRACT_MAX_LENGTH in api/lib/journal-field-validation.js is ${ABSTRACT_MAX_LENGTH}.`,
      );
    });
  }

  test("admin-footnotes-panel.js limits equal the validator limits", () => {
    const text = read("admin/assets/js/admin-footnotes-panel.js");
    const count = text.match(/var MAX_COUNT = (\d+);/);
    const length = text.match(/var MAX_LENGTH = (\d+);/);
    assert.ok(count && length, `Row 4 of ${GUIDE}: admin-footnotes-panel.js must declare MAX_COUNT and MAX_LENGTH.`);
    assert.equal(Number(count[1]), FOOTNOTE_MAX_COUNT, `Row 4 of ${GUIDE}: MAX_COUNT differs from FOOTNOTE_MAX_COUNT.`);
    assert.equal(Number(length[1]), FOOTNOTE_MAX_LENGTH, `Row 4 of ${GUIDE}: MAX_LENGTH differs from FOOTNOTE_MAX_LENGTH.`);
  });
});

describe(`${GUIDE} row 5: write routes validate the journal fields`, () => {
  for (const route of ROUTES) {
    test(`${route} calls validateJournalFields in POST and PUT`, () => {
      const calls = read(route).match(/validateJournalFields\(/g) || [];
      assert.ok(
        calls.length >= 2,
        `Row 5 of ${GUIDE}: ${route} calls validateJournalFields ${calls.length} time(s); POST and PUT each need one.`,
      );
    });
  }
});

describe(`${GUIDE} row 6: abstract and footnotes stay out of FTS`, () => {
  test("no fts5 table in schema.sql lists abstract or footnote columns", () => {
    const schema = read("database/schema.sql");
    const ftsBlocks = schema.match(/CREATE VIRTUAL TABLE[\s\S]*?\);/g) || [];
    assert.ok(ftsBlocks.length > 0, "schema.sql has no FTS tables to scan.");
    for (const block of ftsBlocks) {
      assert.ok(
        !/abstract|footnote/i.test(block),
        `Row 6 of ${GUIDE}: an FTS table in database/schema.sql lists abstract or footnote columns:\n${block}`,
      );
    }
  });
});

describe(`${GUIDE} row 7: footnote ids and return links`, () => {
  test("content-markers.js creates fnref ids", () => {
    assert.ok(
      read("frontend/assets/js/utils/content-markers.js").includes("fnref-"),
      `Row 7 of ${GUIDE}: content-markers.js must write id="fnref-N" on the first marker.`,
    );
  });

  test("footnotes.js links to fnref ids", () => {
    assert.ok(
      read("frontend/assets/js/utils/footnotes.js").includes("#fnref-"),
      `Row 7 of ${GUIDE}: footnotes.js must link back to #fnref-N.`,
    );
  });

  for (const page of DETAIL_PAGES) {
    test(`${page} builds its footnote list with footnoteListHTML`, () => {
      const text = read(page);
      assert.ok(
        text.includes('from "./utils/footnotes.js"') && text.includes("footnoteListHTML("),
        `Row 7 of ${GUIDE}: ${page} must import footnoteListHTML from utils/footnotes.js and call it.`,
      );
    });
  }
});

describe(`${GUIDE} shape: the footnote tables exist everywhere they must`, () => {
  for (const table of FOOTNOTE_TABLES) {
    test(`${table} is in schema.sql and CHILD_TABLES`, () => {
      assert.ok(
        new RegExp(`CREATE TABLE ${table} \\(`).test(read("database/schema.sql")),
        `Shape section of ${GUIDE}: database/schema.sql has no CREATE TABLE ${table}.`,
      );
      assert.ok(
        read("api/models/relations/child-rows.js").includes(`'${table}'`),
        `Shape section of ${GUIDE}: ${table} is missing from CHILD_TABLES in api/models/relations/child-rows.js.`,
      );
    });
  }
});
