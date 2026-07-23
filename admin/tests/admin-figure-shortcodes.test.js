// AdminFigureShortcodes unit tests
// Run with: node --test admin/tests/admin-figure-shortcodes.test.js

const test = require("node:test");
const assert = require("node:assert");
const AdminFigureShortcodes = require("../assets/js/admin-figure-shortcodes.js");

const { parseFigures, buildFigureShortcode, replaceFigureAt, removeFigureAt } =
  AdminFigureShortcodes;

// ── parseFigures ────────────────────────────────────────────────────────────

test("parseFigures: zero figures", function () {
  assert.deepStrictEqual(parseFigures("just some prose"), []);
});

test("parseFigures: one figure", function () {
  const text = '[figure src="/a.webp" caption="A cap" align="right"]';
  const figures = parseFigures(text);
  assert.strictEqual(figures.length, 1);
  assert.strictEqual(figures[0].src, "/a.webp");
  assert.strictEqual(figures[0].caption, "A cap");
  assert.strictEqual(figures[0].align, "right");
  assert.strictEqual(figures[0].start, 0);
  assert.strictEqual(figures[0].end, text.length);
});

test("parseFigures: many figures, offsets correct when two share a src", function () {
  const text =
    '[figure src="/a.webp" caption="One"]\n\n[figure src="/a.webp" caption="Two"]';
  const figures = parseFigures(text);
  assert.strictEqual(figures.length, 2);
  assert.strictEqual(figures[0].caption, "One");
  assert.strictEqual(figures[1].caption, "Two");
  assert.strictEqual(text.slice(figures[0].start, figures[0].end), figures[0].raw);
  assert.strictEqual(text.slice(figures[1].start, figures[1].end), figures[1].raw);
});

test("parseFigures: decodes &quot; in caption", function () {
  const text = '[figure src="/a.webp" caption="He said &quot;hi&quot;"]';
  const figures = parseFigures(text);
  assert.strictEqual(figures[0].caption, 'He said "hi"');
});

test("parseFigures: no align attribute yields null", function () {
  const figures = parseFigures('[figure src="/a.webp"]');
  assert.strictEqual(figures[0].align, null);
});

// ── buildFigureShortcode ─────────────────────────────────────────────────────

test("buildFigureShortcode: caption with embedded quote round-trips", function () {
  const out = buildFigureShortcode({
    src: "/a.webp",
    caption: 'He said "hi"',
  });
  assert.strictEqual(out, '[figure src="/a.webp" caption="He said &quot;hi&quot;"]');
});

test("buildFigureShortcode: empty caption drops caption= attribute", function () {
  const out = buildFigureShortcode({ src: "/a.webp", caption: "" });
  assert.ok(!out.includes("caption="));
});

test("buildFigureShortcode: align none/empty/undefined drops align= attribute", function () {
  for (const align of ["none", "", null, undefined]) {
    const out = buildFigureShortcode({ src: "/a.webp", align });
    assert.ok(!out.includes("align="), `align=${align} leaked into: ${out}`);
  }
});

test("buildFigureShortcode: align left/right preserved", function () {
  assert.ok(buildFigureShortcode({ src: "/a.webp", align: "left" }).includes('align="left"'));
  assert.ok(buildFigureShortcode({ src: "/a.webp", align: "right" }).includes('align="right"'));
});

// ── replaceFigureAt ──────────────────────────────────────────────────────────

test("replaceFigureAt: align preserved when only caption is edited", function () {
  const text = '[figure src="/a.webp" caption="Old" align="right"]';
  const [figure] = parseFigures(text);
  const out = replaceFigureAt(text, figure, { caption: "New", align: figure.align });
  assert.ok(out.includes('caption="New"'));
  assert.ok(out.includes('align="right"'));
});

test("replaceFigureAt: caption cleared drops caption= attribute", function () {
  const text = '[figure src="/a.webp" caption="Old"]';
  const [figure] = parseFigures(text);
  const out = replaceFigureAt(text, figure, { caption: "" });
  assert.ok(!out.includes("caption="));
});

test("replaceFigureAt: text outside the shortcode is byte-identical", function () {
  const text = 'Before.\n\n[figure src="/a.webp" caption="Old"]\n\nAfter.';
  const [figure] = parseFigures(text);
  const out = replaceFigureAt(text, figure, { caption: "New" });
  assert.strictEqual(out.slice(0, figure.start), text.slice(0, figure.start));
  assert.strictEqual(
    out.slice(out.length - (text.length - figure.end)),
    text.slice(figure.end),
  );
});

// ── removeFigureAt ───────────────────────────────────────────────────────────

test("removeFigureAt: excises the right figure when two share a src", function () {
  const text =
    '[figure src="/a.webp" caption="One"]\n\n[figure src="/a.webp" caption="Two"]';
  const figures = parseFigures(text);
  const out = removeFigureAt(text, figures[1]);
  assert.ok(out.includes("One"));
  assert.ok(!out.includes("Two"));
});

test("removeFigureAt: no double blank line left behind", function () {
  const text = 'Before.\n\n[figure src="/a.webp" caption="Cap"]\n\nAfter.';
  const [figure] = parseFigures(text);
  const out = removeFigureAt(text, figure);
  assert.ok(!out.includes("\n\n\n"));
});
