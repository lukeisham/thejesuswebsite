// Excerpt builder tests — verifies renderExcerpt() strips markdown/shortcode
// syntax to plain text, truncates on a word boundary, then applies inline
// **bold**/*italic* formatting.
// Uses node:test + node:assert.
//
// Since renderExcerpt lives in a frontend ES module (not require-able from
// CommonJS), the function under test is reproduced inline here. Both copies
// must stay in sync — any change to frontend/assets/js/utils/excerpt.js
// should be mirrored here.
//
// NOTE: this file follows the same convention as api/tests/markdown.test.js
// (inline synced copy of a frontend-shared util).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Excerpt builder (synced copy of frontend/assets/js/utils/excerpt.js) ──────

function escapeHTML(str) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

function stripToPlainText(markdown) {
  let text = markdown;

  text = text.replace(/\[figure[^\]]*\]/g, "");
  text = text.replace(/\[(?:mla|id):\d+\]/g, "");
  text = text.replace(/\[pullquote\]([\s\S]*?)\[\/pullquote\]/g, "$1");

  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) return false;
    if (/^\|?[\s\-:|]+\|?$/.test(trimmed) && trimmed.includes("-")) return false;
    return true;
  });

  text = lines
    .map((line) => {
      let l = line.trim();
      l = l.replace(/^#{1,3}\s+/, "");
      l = l.replace(/^[\-\*]\s+/, "");
      l = l.replace(/^\d+\.\s+/, "");
      return l;
    })
    .join(" ");

  text = text.replace(/\\\\/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function truncatePlain(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

function formatInline(escaped) {
  let result = escaped.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, t) => `<em>${t}</em>`);
  result = result.replace(/\*/g, "");
  return result;
}

function renderExcerpt(markdown, maxLength) {
  if (typeof markdown !== "string" || markdown.length === 0) return "";

  const plain = stripToPlainText(markdown);
  if (plain.length === 0) return "";

  const truncated = truncatePlain(plain, maxLength);
  const escaped = escapeHTML(truncated);
  return formatInline(escaped);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("renderExcerpt", () => {

  test("headings are stripped to plain text", () => {
    const result = renderExcerpt("## Section Heading\n\nBody text follows.", 150);
    assert.ok(result.includes("Section Heading"));
    assert.ok(!result.includes("#"));
  });

  test("**bold** becomes <strong>", () => {
    const result = renderExcerpt("This is **bold** text.", 150);
    assert.ok(result.includes("<strong>bold</strong>"));
  });

  test("*italic* becomes <em>", () => {
    const result = renderExcerpt("This is *italic* text.", 150);
    assert.ok(result.includes("<em>italic</em>"));
  });

  test("[mla:N] and [id:N] markers are removed", () => {
    const result = renderExcerpt("As Meyers notes[mla:7], the inscription[id:12] dates early.", 150);
    assert.ok(!result.includes("[mla:"));
    assert.ok(!result.includes("[id:"));
    assert.ok(result.includes("Meyers notes"));
    assert.ok(result.includes("the inscription"));
  });

  test("[figure ...] shortcode is removed entirely", () => {
    const result = renderExcerpt('Before [figure src="/img.webp" caption="A caption"] after.', 150);
    assert.ok(!result.includes("[figure"));
    assert.ok(result.includes("Before"));
    assert.ok(result.includes("after"));
  });

  test("[pullquote]...[/pullquote] is reduced to its inner text", () => {
    const result = renderExcerpt("[pullquote]A memorable passage.[/pullquote] trailing text.", 150);
    assert.ok(!result.includes("[pullquote]"));
    assert.ok(!result.includes("[/pullquote]"));
    assert.ok(result.includes("A memorable passage."));
    assert.ok(result.includes("trailing text."));
  });

  test("table rows are dropped", () => {
    const result = renderExcerpt("| Name | Age |\n|------|-----|\n| Alice | 30 |\n\nAfter the table.", 150);
    assert.ok(!result.includes("|"));
    assert.ok(!result.includes("Alice"));
    assert.ok(result.includes("After the table."));
  });

  test("list bullets are stripped", () => {
    const result = renderExcerpt("- First item\n- Second item\n1. Ordered item", 150);
    assert.ok(!result.includes("-"));
    assert.ok(result.includes("First item"));
    assert.ok(result.includes("Second item"));
    assert.ok(result.includes("Ordered item"));
  });

  test("< and & in author text are escaped", () => {
    const result = renderExcerpt("Use <div> tags and & entities carefully.", 150);
    assert.ok(result.includes("&lt;div&gt;"));
    assert.ok(result.includes("&amp;"));
    assert.ok(!result.includes("<div>"));
  });

  test("truncation lands on a word boundary with an ellipsis", () => {
    const longText = "word ".repeat(60).trim();
    const result = renderExcerpt(longText, 30);
    assert.ok(result.endsWith("…"));
    assert.ok(result.length <= 31);
    assert.ok(!/\S…$/.test(result.slice(0, -1)) || result.slice(0, -1).endsWith(" ") === false);
  });

  test("truncation never cuts inside a generated tag — unmatched ** is stripped, not emitted", () => {
    const input = "Normal text then **unterminated bold that never closes and keeps going";
    const result = renderExcerpt(input, 30);
    assert.ok(!result.includes("<strong>"));
    assert.ok(!result.includes("*"));
  });

  test("empty string returns empty string", () => {
    assert.equal(renderExcerpt("", 150), "");
  });

  test("null and non-string input return empty string", () => {
    assert.equal(renderExcerpt(null, 150), "");
    assert.equal(renderExcerpt(undefined, 150), "");
    assert.equal(renderExcerpt(42, 150), "");
  });

  test("a body consisting only of a [figure] shortcode returns empty string", () => {
    assert.equal(renderExcerpt('[figure src="/img.webp" caption="Only a figure"]', 150), "");
  });

  test("the \\\\ paragraph-break token collapses to a space", () => {
    const result = renderExcerpt("First line\\\\second line", 150);
    assert.ok(result.includes("First line second line"));
    assert.ok(!result.includes("\\"));
  });
});
