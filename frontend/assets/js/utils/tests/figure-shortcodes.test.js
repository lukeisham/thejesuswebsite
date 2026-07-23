// Figure-shortcode grammar tests — node:test + node:assert.
// Tests parseFigureShortcodes / FIGURE_SHORTCODE_PATTERN from
// figure-shortcodes.js. Replicated here so tests can run without ES module
// tooling (see announce.test.js / data-revalidation.test.js for the same
// convention); the Tier 1 smoke check for this plan additionally
// dynamic-imports the real module to prove behaviour didn't drift.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Mirror figure-shortcodes.js ──────────────────────────────────────────────

const FIGURE_SHORTCODE_SOURCE =
  '\\[figure\\s+src="([^"]*)"(?:\\s+caption="([^"]*)")?(?:\\s+align="(left|right)")?\\]';

function FIGURE_SHORTCODE_PATTERN() {
  return new RegExp(FIGURE_SHORTCODE_SOURCE, "g");
}

function parseFigureShortcodes(text) {
  if (typeof text !== "string") return [];

  const figures = [];
  const re = FIGURE_SHORTCODE_PATTERN();
  let match;

  while ((match = re.exec(text)) !== null) {
    figures.push({
      src: match[1] || "",
      caption: match[2] || "",
      align: match[3] || null,
    });
  }

  return figures;
}

// ── parseFigureShortcodes ─────────────────────────────────────────────────────

describe("parseFigureShortcodes", () => {
  test("zero figures", () => {
    assert.deepEqual(parseFigureShortcodes("just some prose"), []);
  });

  test("one figure, no caption or align", () => {
    const figures = parseFigureShortcodes('[figure src="/a.webp"]');
    assert.deepEqual(figures, [{ src: "/a.webp", caption: "", align: null }]);
  });

  test("many figures, in document order", () => {
    const text =
      '[figure src="/a.webp" caption="One"]\n\n[figure src="/b.webp" caption="Two"]';
    const figures = parseFigureShortcodes(text);
    assert.equal(figures.length, 2);
    assert.equal(figures[0].caption, "One");
    assert.equal(figures[1].caption, "Two");
  });

  test("align variants: left, right, and absent", () => {
    assert.equal(
      parseFigureShortcodes('[figure src="/a.webp" align="left"]')[0].align,
      "left",
    );
    assert.equal(
      parseFigureShortcodes('[figure src="/a.webp" align="right"]')[0].align,
      "right",
    );
    assert.equal(
      parseFigureShortcodes('[figure src="/a.webp"]')[0].align,
      null,
    );
  });

  test("captions containing escaped quotes are preserved verbatim (caller decodes)", () => {
    const figures = parseFigureShortcodes(
      '[figure src="/a.webp" caption="He said &quot;hi&quot;"]',
    );
    assert.equal(figures[0].caption, "He said &quot;hi&quot;");
  });

  test("non-string input returns an empty array", () => {
    assert.deepEqual(parseFigureShortcodes(null), []);
    assert.deepEqual(parseFigureShortcodes(undefined), []);
  });
});

// ── FIGURE_SHORTCODE_PATTERN (lastIndex trap regression) ─────────────────────

describe("FIGURE_SHORTCODE_PATTERN", () => {
  test("two consecutive calls return independent regexes with the same result", () => {
    const text = '[figure src="/a.webp"]\n\n[figure src="/b.webp"]';

    const re1 = FIGURE_SHORTCODE_PATTERN();
    const firstRun = [];
    let m;
    while ((m = re1.exec(text)) !== null) firstRun.push(m[1]);

    // A shared module-level /g literal would have lastIndex stuck at the
    // end of the string here, causing this second run to find nothing.
    const re2 = FIGURE_SHORTCODE_PATTERN();
    const secondRun = [];
    while ((m = re2.exec(text)) !== null) secondRun.push(m[1]);

    assert.deepEqual(firstRun, ["/a.webp", "/b.webp"]);
    assert.deepEqual(secondRun, ["/a.webp", "/b.webp"]);
  });
});
