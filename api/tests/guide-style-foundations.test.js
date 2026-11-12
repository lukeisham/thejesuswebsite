// Guide test for setup/STYLE_GUIDE/foundations.md.
//
// This file does not test behaviour. It reads every stylesheet under
// frontend/ and admin/ as text and fails when a stylesheet breaks a rule that
// the style guide states. Each failure message names the rule, the file and
// line, and the style guide section. Each exception has a one-line reason, and
// a stale exception fails the test.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/STYLE_GUIDE/foundations.md";

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

// Files that may hold a colour literal, with the reason (D-057, D-080).
const COLOUR_FILES = {
  "frontend/assets/css/base/variables.css": "The public colour tokens are defined here.",
  "admin/assets/css/admin-base/variables.css": "The admin colour tokens are defined here.",
  "admin/assets/css/admin-diagrams/timeline-tokens.css": "Frontend-named tokens for the timeline editor (D-057).",
  "admin/assets/css/admin-diagrams/maps-tokens.css": "Frontend-named tokens for the maps editor (D-057).",
  "admin/assets/css/admin-diagrams/arbor-tokens.css": "Frontend-named tokens for the arbor editor (D-080).",
};

// Breakpoints that variables.css documents (px).
const MIN_WIDTHS = new Set([480, 768, 1024, 1280, 1536]);
const MAX_WIDTHS = new Set([480, 600, 767, 1023]);

// ── §1: colour literals only in the token files ──────────────────────────────

describe(`${GUIDE} §1: colour literals live only in the token files`, () => {
  const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

  test("every colour file named here exists", () => {
    for (const rel of Object.keys(COLOUR_FILES)) {
      assert.ok(fs.existsSync(path.join(REPO, rel)), `Rule: ${GUIDE} §1. The colour list names ${rel}, which no longer exists.`);
    }
  });

  for (const rel of ALL_CSS.filter((f) => !(f in COLOUR_FILES))) {
    test(`${rel} holds no colour literal`, () => {
      const css = stripped(rel);
      for (const m of css.matchAll(COLOUR)) {
        assert.fail(`${rel}:${lineOf(css, m.index)} has the colour literal "${m[0]}". Use a token from variables.css. Rule: ${GUIDE} §1.6.`);
      }
    });
  }
});

// ── §2.1: every font-family is a token ───────────────────────────────────────

describe(`${GUIDE} §2.1: font-family is a token`, () => {
  const FAMILY = /font-family:\s*([^;}]+)/g;

  for (const rel of ALL_CSS.filter((f) => !f.endsWith("variables.css") && !/-tokens\.css$/.test(f))) {
    test(`${rel} sets font-family from a token`, () => {
      const css = stripped(rel);
      for (const m of css.matchAll(FAMILY)) {
        const value = m[1].trim();
        const ok = value === "inherit" || /^var\(--[\w-]+\)$/.test(value);
        assert.ok(ok, `${rel}:${lineOf(css, m.index)} sets font-family: ${value}. Use a var(--…) token or inherit. Rule: ${GUIDE} §2.1.`);
      }
    });
  }
});

// ── §4.1: media widths are the documented set ────────────────────────────────

describe(`${GUIDE} §4.1: @media widths are the documented breakpoints`, () => {
  const WIDTH = /\((min|max)-width:\s*([\d.]+)px\)/g;

  for (const rel of ALL_CSS) {
    test(`${rel} uses documented breakpoints`, () => {
      const css = stripped(rel);
      for (const m of css.matchAll(/@media[^{]*/g)) {
        for (const w of m[0].matchAll(WIDTH)) {
          const allowed = w[1] === "min" ? MIN_WIDTHS : MAX_WIDTHS;
          assert.ok(
            allowed.has(Number(w[2])),
            `${rel}:${lineOf(css, m.index)} has @media (${w[1]}-width: ${w[2]}px), which variables.css does not document. Rule: ${GUIDE} §4.1.`,
          );
        }
      }
    });
  }
});

// ── §1.7: the public site never reads an admin token (D-017) ─────────────────

describe(`${GUIDE} §1.7: frontend stylesheets hold no --admin- token`, () => {
  for (const rel of ALL_CSS.filter((f) => f.startsWith("frontend/"))) {
    test(`${rel} has no --admin-`, () => {
      const css = stripped(rel);
      const at = css.indexOf("--admin-");
      assert.ok(at === -1, `${rel}:${lineOf(css, at)} contains --admin-. Rule: ${GUIDE} §1.7 (D-017).`);
    });
  }
});
