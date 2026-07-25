// Excerpt builder tests — verifies renderExcerpt() strips markdown/shortcode
// syntax to plain text, truncates on a word boundary, then applies inline
// **bold**/*italic* formatting.
// Uses node:test + node:assert.
//
// The real renderExcerpt lives in a frontend ES module and is loaded
// via dynamic import() so tests always run against the live implementation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("renderExcerpt", () => {

  test("headings are stripped to plain text", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("## Section Heading\n\nBody text follows.", 150);
    assert.ok(result.includes("Section Heading"));
    assert.ok(!result.includes("#"));
  });

  test("**bold** becomes <strong>", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("This is **bold** text.", 150);
    assert.ok(result.includes("<strong>bold</strong>"));
  });

  test("*italic* becomes <em>", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("This is *italic* text.", 150);
    assert.ok(result.includes("<em>italic</em>"));
  });

  test("[mla:N] and [id:N] markers are removed", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("As Meyers notes[mla:7], the inscription[id:12] dates early.", 150);
    assert.ok(!result.includes("[mla:"));
    assert.ok(!result.includes("[id:"));
    assert.ok(result.includes("Meyers notes"));
    assert.ok(result.includes("the inscription"));
  });

  test("[figure ...] shortcode is removed entirely", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt('Before [figure src="/img.webp" caption="A caption"] after.', 150);
    assert.ok(!result.includes("[figure"));
    assert.ok(result.includes("Before"));
    assert.ok(result.includes("after"));
  });

  test("[pullquote]...[/pullquote] is reduced to its inner text", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("[pullquote]A memorable passage.[/pullquote] trailing text.", 150);
    assert.ok(!result.includes("[pullquote]"));
    assert.ok(!result.includes("[/pullquote]"));
    assert.ok(result.includes("A memorable passage."));
    assert.ok(result.includes("trailing text."));
  });

  test("table rows are dropped", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("| Name | Age |\n|------|-----|\n| Alice | 30 |\n\nAfter the table.", 150);
    assert.ok(!result.includes("|"));
    assert.ok(!result.includes("Alice"));
    assert.ok(result.includes("After the table."));
  });

  test("list bullets are stripped", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("- First item\n- Second item\n1. Ordered item", 150);
    assert.ok(!result.includes("-"));
    assert.ok(result.includes("First item"));
    assert.ok(result.includes("Second item"));
    assert.ok(result.includes("Ordered item"));
  });

  test("< and & in author text are escaped", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("Use <div> tags and & entities carefully.", 150);
    assert.ok(result.includes("&lt;div&gt;"));
    assert.ok(result.includes("&amp;"));
    assert.ok(!result.includes("<div>"));
  });

  test("truncation lands on a word boundary with an ellipsis", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const longText = "word ".repeat(60).trim();
    const result = renderExcerpt(longText, 30);
    assert.ok(result.endsWith("…"));
    assert.ok(result.length <= 31);
    assert.ok(!/\S…$/.test(result.slice(0, -1)) || result.slice(0, -1).endsWith(" ") === false);
  });

  test("truncation never cuts inside a generated tag — unmatched ** is stripped, not emitted", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const input = "Normal text then **unterminated bold that never closes and keeps going";
    const result = renderExcerpt(input, 30);
    assert.ok(!result.includes("<strong>"));
    assert.ok(!result.includes("*"));
  });

  test("empty string returns empty string", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    assert.equal(renderExcerpt("", 150), "");
  });

  test("null and non-string input return empty string", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    assert.equal(renderExcerpt(null, 150), "");
    assert.equal(renderExcerpt(undefined, 150), "");
    assert.equal(renderExcerpt(42, 150), "");
  });

  test("a body consisting only of a [figure] shortcode returns empty string", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    assert.equal(renderExcerpt('[figure src="/img.webp" caption="Only a figure"]', 150), "");
  });

  test("the \\\\ paragraph-break token collapses to a space", async () => {
    const { renderExcerpt } = await import("../../frontend/assets/js/utils/excerpt.js");
    const result = renderExcerpt("First line\\\\second line", 150);
    assert.ok(result.includes("First line second line"));
    assert.ok(!result.includes("\\"));
  });
});
