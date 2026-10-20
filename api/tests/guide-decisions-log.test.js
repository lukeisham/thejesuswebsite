// Guide test for the two decisions logs: setup/Decisions_log.md and
// Wikipedia algorithm/Classifier_decisions.md.
//
// This file does not test behaviour. It reads both logs as text and fails when
// a row breaks a rule in "How to write an entry" of setup/Decisions_log.md.
// Agents find changed decisions by searching the Status wording, so a free-text
// Status hides a superseded ruling from them.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/Decisions_log.md";
const LOGS = ["setup/Decisions_log.md", "Wikipedia algorithm/Classifier_decisions.md"];
const COLUMN_COUNT = 12;
const STATUS_COLUMN = 7;
const DATE_COLUMN = 3;

const ID_LINK = String.raw`D-\d{3}(?: \([^()]+\))?`;
const ID_LIST = `${ID_LINK}(?:, ${ID_LINK})*`;
const STATUS = new RegExp(
  `^(?:(?:Active|Provisional)(?:; (?:amends|amended by) ${ID_LIST})*|Superseded by ${ID_LIST})$`
);
// D-009 carries a bracketed note after its date; the Date cell of an old row
// cannot be rewritten, so the pattern allows one.
const DATE = /^(?:by )?(\d{4}-\d{2}-\d{2})(?: \([^()]+\))?$/;

// Luke dates entries in his own zone, up to a day ahead of UTC.
const LATEST_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function readRows(relPath) {
  const lines = fs.readFileSync(path.join(REPO, relPath), "utf8").split("\n");
  return lines.flatMap((line, index) => {
    if (!line.startsWith("| D-")) return [];
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim());
    return [{ where: `${relPath}:${index + 1}`, cells }];
  });
}

const rows = LOGS.flatMap(readRows);

describe(`${GUIDE}: entry rows`, () => {
  test("both logs have entries", () => {
    for (const log of LOGS) {
      assert.ok(readRows(log).length > 0, `No D-NNN rows found in ${log}.`);
    }
  });

  test(`every row has ${COLUMN_COUNT} cells`, () => {
    const bad = rows.filter((row) => row.cells.length !== COLUMN_COUNT).map((row) => row.where);
    assert.deepEqual(bad, [], `Wrong cell count at ${bad.join(", ")}. Escape a literal | as \\|. Rule: ${GUIDE}, "One row per entry".`);
  });

  test("IDs are unique across both logs", () => {
    const seen = new Map();
    const duplicates = [];
    for (const row of rows) {
      const id = row.cells[0];
      if (seen.has(id)) duplicates.push(`${id} at ${seen.get(id)} and ${row.where}`);
      seen.set(id, row.where);
    }
    assert.deepEqual(duplicates, [], `Duplicate IDs: ${duplicates.join("; ")}. Rule: ${GUIDE}, "Append only".`);
  });

  test("every Status cell uses the set wording", () => {
    const bad = rows
      .filter((row) => !STATUS.test(row.cells[STATUS_COLUMN]))
      .map((row) => `${row.where} "${row.cells[STATUS_COLUMN]}"`);
    assert.deepEqual(bad, [], `Non-standard Status at ${bad.join(", ")}. Rule: ${GUIDE}, "Status".`);
  });

  test("every ID named in a Status cell exists", () => {
    const ids = new Set(rows.map((row) => row.cells[0]));
    const missing = rows.flatMap((row) =>
      (row.cells[STATUS_COLUMN].match(/D-\d{3}/g) ?? [])
        .filter((id) => !ids.has(id))
        .map((id) => `${row.where} names ${id}`)
    );
    assert.deepEqual(missing, [], `Unknown IDs: ${missing.join(", ")}. Rule: ${GUIDE}, "Status".`);
  });

  test("every Date cell is a date no later than today", () => {
    const bad = rows.flatMap((row) => {
      const match = row.cells[DATE_COLUMN].match(DATE);
      if (!match) return [`${row.where} "${row.cells[DATE_COLUMN]}" is not a date`];
      if (match[1] > LATEST_DATE) return [`${row.where} ${match[1]} is in the future`];
      return [];
    });
    assert.deepEqual(bad, [], `${bad.join("; ")}. Rule: ${GUIDE}, "Dates".`);
  });
});
