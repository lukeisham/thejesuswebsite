// Guide test for setup/STYLE_GUIDE/animation.md.
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
const GUIDE = "setup/STYLE_GUIDE/animation.md";
const ANIMATIONS_CSS = "frontend/assets/css/base/animations.css";

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

/** Index range of the `prefers-reduced-motion` block in `css`, or null. */
function reducedMotionBlock(css) {
  const start = css.indexOf("@media (prefers-reduced-motion");
  if (start === -1) return null;
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return [start, i];
  }
  return null;
}

// ── §6.1: durations are tokens ───────────────────────────────────────────────

describe(`${GUIDE} §6.1: durations are var(--…) tokens`, () => {
  // A property that sets motion timing. A name that starts with `--` is a token
  // definition, so the lookbehind keeps it out.
  const MOTION_DECLARATION = /(?<![\w-])(transition|transition-duration|animation|animation-duration)\s*:\s*([^;}]+)/g;
  const TIME_LITERAL = /(?<![\w-])\d*\.?\d+m?s\b/;

  for (const rel of ALL_CSS) {
    test(`${rel} sets no literal duration`, () => {
      const css = stripped(rel);
      const block = rel === ANIMATIONS_CSS ? reducedMotionBlock(css) : null;
      for (const m of css.matchAll(MOTION_DECLARATION)) {
        // The reduced-motion rule is the one place a literal duration is allowed (D-021).
        if (block && m.index > block[0] && m.index < block[1]) continue;
        const value = m[2].replace(/var\([^)]*\)/g, "");
        assert.ok(
          !TIME_LITERAL.test(value),
          `${rel}:${lineOf(css, m.index)} sets ${m[1]}: ${m[2].trim()}. Use a --duration-… token from variables.css. Rule: ${GUIDE} §6.1.`,
        );
      }
    });
  }
});

// ── §6.4: !important only in the reduced-motion rule ─────────────────────────

describe(`${GUIDE} §6.4: !important only in the reduced-motion block`, () => {
  test(`${ANIMATIONS_CSS} keeps its two !important durations in the reduced-motion block`, () => {
    const css = stripped(ANIMATIONS_CSS);
    const block = reducedMotionBlock(css);
    assert.ok(block, `${ANIMATIONS_CSS} has no prefers-reduced-motion block. Rule: ${GUIDE} §6.4.`);
    const inside = css.slice(block[0], block[1]);
    const important = inside.match(/!important/g) || [];
    assert.equal(important.length, 2, `${ANIMATIONS_CSS} reduced-motion block must set animation-duration and transition-duration with !important. Rule: ${GUIDE} §6.4 (D-021).`);
  });

  for (const rel of ALL_CSS) {
    test(`${rel} has no stray !important`, () => {
      const css = stripped(rel);
      const block = rel === ANIMATIONS_CSS ? reducedMotionBlock(css) : null;
      for (const m of css.matchAll(/!important/g)) {
        if (block && m.index > block[0] && m.index < block[1]) continue;
        assert.fail(`${rel}:${lineOf(css, m.index)} uses !important. Win by source order or one more class. Rule: ${GUIDE} §6.4 (CSS-5).`);
      }
    });
  }
});
