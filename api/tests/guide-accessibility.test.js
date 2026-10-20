// Guide test for setup/ARCHITECTURE/accessibility.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file and line, and the guide.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/accessibility.md";
const SKIP_LINK = '<a class="skip-link" href="#main-content">';

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(REPO, relPath));
}

/** Every `.html` file below `relDir`, as repo-relative paths. */
function htmlFilesUnder(relDir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      out.push(...htmlFilesUnder(rel));
    } else if (entry.name.endsWith(".html")) {
      out.push(rel);
    }
  }
  return out;
}

// Pages and templates comment on the heading rule with the text "<h1>", so a
// comment is removed before the headings are counted.
function withoutHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

const pages = htmlFilesUnder("frontend");

// ── Row 2: one <h1> per page ──────────────────────────────────────────────────

describe(`${GUIDE} row 2: each page has one h1`, () => {
  test("finds pages to scan", () => {
    assert.ok(pages.length > 0, "No .html files found in frontend/.");
  });

  for (const page of pages) {
    test(`${page} has one <h1>`, () => {
      const count = (withoutHtmlComments(read(page)).match(/<h1[\s>]/g) || []).length;
      assert.equal(
        count,
        1,
        `${page} has ${count} <h1> elements. Each page needs exactly one, in the visually hidden header. Rule: ${GUIDE}, Invariants row 2.`
      );
    });
  }
});

// ── Row 3: the focus outline ──────────────────────────────────────────────────

describe(`${GUIDE} row 3: global focus outline`, () => {
  test("frontend/assets/css/base/reset.css styles :focus-visible", () => {
    assert.ok(
      read("frontend/assets/css/base/reset.css").includes(":focus-visible"),
      `frontend/assets/css/base/reset.css has no :focus-visible rule. Rule: ${GUIDE}, Invariants row 3.`
    );
  });
});

// ── Row 4: the skip link ──────────────────────────────────────────────────────

describe(`${GUIDE} row 4: each page template has the skip link`, () => {
  for (const page of pages) {
    test(`${page} carries the skip link`, () => {
      assert.ok(
        read(page).includes(SKIP_LINK),
        `${page} has no ${SKIP_LINK}. Rule: ${GUIDE}, Invariants row 4.`
      );
    });
  }

  test("frontend/assets/css/base/invisible-header.css styles .skip-link", () => {
    assert.ok(
      read("frontend/assets/css/base/invisible-header.css").includes(".skip-link"),
      `frontend/assets/css/base/invisible-header.css has no .skip-link rule. Rule: ${GUIDE}, Invariants row 4.`
    );
  });
});

// ── Row 5: keyboard tests for each visual ─────────────────────────────────────

describe(`${GUIDE} row 5: each visual has a keyboard test`, () => {
  for (const visual of ["arbor", "timeline", "maps"]) {
    test(`frontend/assets/js/${visual}/tests/${visual}-keyboard.test.js exists`, () => {
      const file = `frontend/assets/js/${visual}/tests/${visual}-keyboard.test.js`;
      assert.ok(exists(file), `${file} is missing. Rule: ${GUIDE}, Invariants row 5.`);
    });
  }
});
