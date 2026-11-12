// Guide test for setup/STYLE_GUIDE/pages-and-admin.md.
//
// This file does not test behaviour. It reads every stylesheet under
// frontend/ and admin/ as text and fails when a stylesheet breaks a rule that
// the style guide states. Each failure message names the rule, the file and
// line, and the style guide section.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/STYLE_GUIDE/pages-and-admin.md";

/** Every .css file below `relDir`, as repo-relative paths. */
function cssFilesUnder(relDir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "tests") continue;
      out.push(...cssFilesUnder(rel));
    } else if (entry.name.endsWith(".css")) {
      out.push(rel);
    }
  }
  return out;
}

const ALL_CSS = [...cssFilesUnder("frontend"), ...cssFilesUnder("admin")];

/** CSS text with comments blanked, so positions and line numbers stay the same. */
function stripped(rel) {
  return fs.readFileSync(path.join(REPO, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// ── §11.5: stylesheets select by class, never by ID ──────────────────────────

describe(`${GUIDE} §11.5: no ID selectors`, () => {
  // The text before a `{`. A declaration value such as `#fff` ends in `;` or
  // `}`, never `{`, so the selector scan skips it. At-rule lines are skipped.
  const SELECTOR = /(?:^|[;{}])\s*([^;{}@]+)\{/g;

  for (const rel of ALL_CSS) {
    test(`${rel} has no ID selector`, () => {
      const css = stripped(rel);
      for (const m of css.matchAll(SELECTOR)) {
        const hit = m[1].match(/#[A-Za-z_-]/);
        if (!hit) continue;
        assert.fail(`${rel}:${lineOf(css, m.index + m[0].indexOf(m[1]) + hit.index)} selects by ID "${m[1].trim()}". Select by class. Rule: ${GUIDE} §11.5 (CSS-5).`);
      }
    });
  }
});
