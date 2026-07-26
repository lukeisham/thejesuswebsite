// Markdown parser tests — verifies renderMarkdown() produces correct HTML
// for headings, bold, italic, lists, tables, and paragraphs.
// Uses node:test + node:assert.
//
// The real renderMarkdown lives in a frontend ES module and is loaded
// via dynamic import() so tests always run against the live implementation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {

  test("headings — h1, h2, h3", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "# Top Heading\n\n## Section\n\n### Subsection\n\nSome text.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<h1>Top Heading</h1>"));
    assert.ok(result.includes("<h2>Section</h2>"));
    assert.ok(result.includes("<h3>Subsection</h3>"));
    assert.ok(result.includes("<p>Some text.</p>"));
  });

  test("bold and italic inline formatting", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "This is **bold** and *italic* text.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<strong>bold</strong>"));
    assert.ok(result.includes("<em>italic</em>"));
  });

  test("bold-italic nesting: **text with *italic* inside**", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "Outer **bold and *nested italic* here** end.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<strong>bold and"));
    assert.ok(result.includes("<em>nested italic</em>"));
  });

  test("unordered list with dashes", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "- First item\n- Second item\n- Third item";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<ul>"));
    assert.ok(result.includes("<li>First item</li>"));
    assert.ok(result.includes("<li>Second item</li>"));
    assert.ok(result.includes("<li>Third item</li>"));
    assert.ok(result.includes("</ul>"));
  });

  test("ordered list", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "1. Alpha\n2. Beta\n3. Gamma";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<ol>"));
    assert.ok(result.includes("<li>Alpha</li>"));
    assert.ok(result.includes("<li>Beta</li>"));
    assert.ok(result.includes("<li>Gamma</li>"));
    assert.ok(result.includes("</ol>"));
  });

  test("pipe table with header, separator, and body rows", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<table class="content-table">'));
    assert.ok(result.includes("<thead>"));
    assert.ok(result.includes("<th>Name</th>"));
    assert.ok(result.includes("<th>Age</th>"));
    assert.ok(result.includes("<td>Alice</td>"));
    assert.ok(result.includes("<td>30</td>"));
    assert.ok(result.includes("<td>Bob</td>"));
    assert.ok(result.includes("<td>25</td>"));
    assert.ok(result.includes("</table>"));
  });

  test("pipe table with alignment — right-aligned column", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| Item | Price |\n|------|------:|\n| Apple | 1.50 |";
    const result = renderMarkdown(input);
    // Verify right alignment is present on a table header cell
    assert.ok(result.includes('style="text-align:right"'), `expected text-align:right in output, got: ${result}`);
    // Verify it's on a <th>, not a <td>
    assert.ok(/<th[^>]*text-align:right/.test(result), `right alignment should be on a <th>, got: ${result}`);
  });

  test("pipe table with center alignment still emits style on cells", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|:---:|---:|\n| x | y |";
    const result = renderMarkdown(input);
    assert.ok(/<th[^>]*text-align:center/.test(result));
    assert.ok(/<th[^>]*text-align:right/.test(result));
  });

  test("pipe table cell with long multi-word text is emitted verbatim (wrapping is CSS, not markup)", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const longText = "This is a very long sentence that should wrap inside the table cell instead of forcing the table wide";
    const input = `| Note |\n|------|\n| ${longText} |`;
    const result = renderMarkdown(input);
    assert.ok(result.includes(`<td>${longText}</td>`));
  });

  test("pipe table with {w:N} proportional widths", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|{w:1}---|{w:3}---|\n| x | y |";
    const result = renderMarkdown(input);
    assert.ok(result.includes("content-table--fixed"), `expected content-table--fixed class, got: ${result}`);
    assert.ok(/<th[^>]*style="width:25%"/.test(result), `expected 25% width on first <th>, got: ${result}`);
    assert.ok(/<th[^>]*style="width:75%"/.test(result), `expected 75% width on second <th>, got: ${result}`);
  });

  test("pipe table with {w:N} mixed explicit and absent weights", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    // A explicit weight 2, B and C absent (implicit weight 1 each) — sum = 4 → 50/25/25
    const input = "| A | B | C |\n|{w:2}---|---|---|\n| x | y | z |";
    const result = renderMarkdown(input);
    assert.ok(/<th[^>]*style="width:50%"/.test(result));
    const quarterMatches = result.match(/style="width:25%"/g) || [];
    assert.equal(quarterMatches.length, 4, `expected 4 occurrences (2 <th> + 2 <td>), got: ${result}`);
  });

  test("pipe table with {w:N} width combined with alignment", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|---:{w:1}|{w:2}---|\n| x | y |";
    const result = renderMarkdown(input);
    assert.ok(
      /<th[^>]*style="text-align:right;width:33\.33%"/.test(result),
      `expected right-align + 33.33% width on first <th>, got: ${result}`,
    );
    assert.ok(
      /<th[^>]*style="width:66\.67%"/.test(result),
      `expected 66.67% width (no alignment) on second <th>, got: ${result}`,
    );
  });

  test("pipe table with {w:N} decimal weights", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|{w:1.5}---|{w:1.5}---|\n| x | y |";
    const result = renderMarkdown(input);
    const halfMatches = result.match(/style="width:50%"/g) || [];
    assert.equal(halfMatches.length, 4, `expected 4 occurrences (2 <th> + 2 <td>) of 50%, got: ${result}`);
  });

  test("pipe table with invalid {w:N} token falls back to auto width", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|{w:abc}---|---|\n| x | y |";
    const result = renderMarkdown(input);
    assert.ok(!result.includes("content-table--fixed"), `expected no fixed class, got: ${result}`);
    assert.ok(!result.includes("width:"), `expected no width style, got: ${result}`);
  });

  test("pipe table with negative or zero {w:N} tokens falls back to auto width", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|{w:-1}---|{w:0}---|\n| x | y |";
    const result = renderMarkdown(input);
    assert.ok(!result.includes("content-table--fixed"), `expected no fixed class, got: ${result}`);
  });

  test("pipe table without {w:N} tokens renders unchanged (no width styles, no fixed class)", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| Name | Age |\n|------|-----|\n| Alice | 30 |";
    const result = renderMarkdown(input);
    assert.equal(result, '<table class="content-table"><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>');
  });

  test("pipe table with {colspan:N} merges a full-width body row", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B | C |\n|---|---|---|\n| {colspan:3}Section header | {continue} | {continue} |\n| x | y | z |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<td colspan="3">Section header</td>'), `expected a single colspan="3" cell, got: ${result}`);
    assert.ok(!result.includes("{continue}"), `expected no leftover {continue} markers, got: ${result}`);
    assert.ok(result.includes("<td>x</td><td>y</td><td>z</td>"), `expected the following row untouched, got: ${result}`);
  });

  test("pipe table with {colspan:N} on a header cell", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| {colspan:2}Group | {continue} | C |\n|---|---|---|\n| x | y | z |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<th colspan="2">Group</th>'), `expected a colspan="2" <th>, got: ${result}`);
  });

  test("pipe table {colspan:N} clamps to the number of consecutive {continue} cells present", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B | C | D | E |\n|---|---|---|---|---|\n| {colspan:5}Wide | {continue} | {continue} | real | more |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<td colspan="3">Wide</td>'), `expected colspan clamped to 3, got: ${result}`);
    assert.ok(result.includes("<td>real</td>") && result.includes("<td>more</td>"), `expected real content preserved, got: ${result}`);
  });

  test("pipe table with {rowspan:N} merges a cell down two body rows", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|---|---|\n| {rowspan:3}Label | 1 |\n| {continue} | 2 |\n| {continue} | 3 |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<td rowspan="3">Label</td>'), `expected a single rowspan="3" cell, got: ${result}`);
    assert.ok(!result.includes("{continue}"), `expected no leftover {continue} markers, got: ${result}`);
    assert.ok(
      result.includes("<td>1</td>") && result.includes("<td>2</td>") && result.includes("<td>3</td>"),
      `expected sibling cells in every row, got: ${result}`,
    );
  });

  test("pipe table {rowspan:N} clamps to the number of consecutive {continue} rows present", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|---|---|\n| {rowspan:4}Label | 1 |\n| {continue} | 2 |\n| Real | 3 |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<td rowspan="2">Label</td>'), `expected rowspan clamped to 2, got: ${result}`);
    assert.ok(result.includes("<td>Real</td>"), `expected real content preserved, got: ${result}`);
  });

  test("pipe table cell declaring both {colspan:N} and {rowspan:N} keeps only the colspan", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B | C |\n|---|---|---|\n| {colspan:2}{rowspan:2}Both | {continue} | 1 |\n| x | y | z |";
    const result = renderMarkdown(input);
    assert.ok(result.includes('<td colspan="2">Both</td>'), `expected colspan applied with no rowspan attribute, got: ${result}`);
  });

  test("pipe table with a stray unclaimed {continue} renders an ordinary empty cell", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B |\n|---|---|\n| x | {continue} |";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<td>x</td><td></td>"), `expected an empty cell, not broken markup, got: ${result}`);
  });

  test("pipe table {colspan:N} width sums the spanned columns' {w:N} percentages", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| A | B | C |\n|{w:1}---|{w:1}---|{w:2}---|\n| {colspan:2}Wide | {continue} | z |";
    const result = renderMarkdown(input);
    assert.ok(
      result.includes('<td colspan="2" style="width:50%">Wide</td>'),
      `expected summed width of 50% (25%+25%), got: ${result}`,
    );
  });

  test("pipe table with no merge tokens renders unchanged (no colspan/rowspan attributes)", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| Name | Age |\n|------|-----|\n| Alice | 30 |";
    const result = renderMarkdown(input);
    assert.equal(result, '<table class="content-table"><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>');
  });

  test("paragraph with multiple lines", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "Line one.\nLine two.\nLine three.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<p>Line one.\nLine two.\nLine three.</p>"));
  });

  test("shortcode markers pass through untouched", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = 'See [mla:1] for details and [figure src="/img.webp" caption="A caption"] here.';
    const result = renderMarkdown(input);
    assert.ok(result.includes("[mla:1]"));
    assert.ok(result.includes('[figure src="/img.webp" caption="A caption"]'));
    // Should be wrapped in a paragraph
    assert.ok(result.startsWith("<p>"));
  });

  test("HTML special characters are escaped", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "Use <div> tags and & entities carefully.";
    const result = renderMarkdown(input);
    assert.ok(result.includes("&lt;div&gt;"));
    assert.ok(result.includes("&amp;"));
    assert.ok(!result.includes("<div>"));
  });

  test("pullquote shortcode passes through", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "[pullquote]A memorable quote[/pullquote]";
    const result = renderMarkdown(input);
    assert.ok(result.includes("[pullquote]"));
    assert.ok(result.includes("[/pullquote]"));
  });

  test("empty string returns empty string", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    assert.equal(renderMarkdown(""), "");
  });

  test("non-string returns empty string", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    assert.equal(renderMarkdown(null), "");
    assert.equal(renderMarkdown(undefined), "");
    assert.equal(renderMarkdown(123), "");
  });
});

describe("renderMarkdown: paragraph break (\\\\)", () => {

  test("\\\\ mid-paragraph produces <br>", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "First line\\\\\nSecond line";
    const result = renderMarkdown(input);
    assert.ok(result.includes("First line<br>\nSecond line"), result);
  });

  test("\\\\ inside a list item produces <br>", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "- First item\\\\continued";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<li>First item<br>continued</li>"), result);
  });

  test("\\\\ inside a table cell produces <br>", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "| Note |\n|------|\n| Line one\\\\line two |";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<td>Line one<br>line two</td>"), result);
  });

  test("two consecutive \\\\ \\\\ produce two <br>s", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "First\\\\\\\\\nSecond";
    const result = renderMarkdown(input);
    assert.ok(result.includes("First<br><br>\nSecond"), result);
  });

  test("trailing \\\\ at the end of a paragraph does not leave a stray <br></p>", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "Only line\\\\";
    const result = renderMarkdown(input);
    assert.equal(result, "<p>Only line</p>");
  });

  test("a single backslash renders literally", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "Path is C:\\Users\\test";
    const result = renderMarkdown(input);
    assert.ok(result.includes("C:\\Users\\test"), result);
  });

  test("**bold**\\\\ still emits <strong> plus <br> (ordering regression)", async () => {
    const { renderMarkdown } = await import("../../frontend/assets/js/utils/markdown.js");
    const input = "**bold**\\\\\nnext line";
    const result = renderMarkdown(input);
    assert.ok(result.includes("<strong>bold</strong><br>\nnext line"), result);
  });
});
