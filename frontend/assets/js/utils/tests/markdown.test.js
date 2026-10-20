// Smoke tests for utils/markdown.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). The escaping tests
// guard JS-6: only a [figure] that matches the shared grammar may pass through
// unescaped.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../markdown.js";

describe("renderMarkdown: basic output", () => {
  test("a heading and bold text render as HTML", async () => {
    const { renderMarkdown } = await import(MODULE);
    const out = renderMarkdown("# Title\n\nSome **bold** text.");
    assert.ok(out.includes("<h1>Title</h1>"), out);
    assert.ok(out.includes("<strong>bold</strong>"), out);
  });
});

describe("renderMarkdown: [figure] marker protection", () => {
  test("a valid figure is passed through untouched", async () => {
    const { renderMarkdown } = await import(MODULE);
    const marker = '[figure src="/img/a.webp" caption="A caption" align="left"]';
    const out = renderMarkdown(marker);
    assert.ok(out.includes(marker), out);
  });

  test("a malformed figure holding markup is escaped", async () => {
    const { renderMarkdown } = await import(MODULE);
    const out = renderMarkdown('[figure src="x" <img onerror=1>]');
    assert.ok(!out.includes("<img"), out);
    assert.ok(out.includes("&lt;img onerror=1&gt;"), out);
  });

  test("a figure with a trailing attribute outside the grammar is escaped", async () => {
    const { renderMarkdown } = await import(MODULE);
    const out = renderMarkdown('[figure src="x" onerror="alert(1)"]');
    assert.ok(!out.includes('onerror="alert(1)"'), out);
    assert.ok(out.includes("&quot;"), out);
  });

  test("markup in a valid figure caption is escaped by the content-markers pass", async () => {
    const { renderMarkdown } = await import(MODULE);
    const { parseContentBody } = await import("../content-markers.js");
    const out = parseContentBody(
      renderMarkdown('[figure src="/a.webp" caption="<img onerror=1>"]'),
    );
    assert.ok(!out.includes("<img onerror"), out);
    assert.ok(out.includes("<figure"), out);
  });
});

describe("renderMarkdown: [pullquote] marker protection", () => {
  test("markers survive and the text between them is escaped once", async () => {
    const { renderMarkdown } = await import(MODULE);
    const out = renderMarkdown("[pullquote]<img src=x onerror=1>[/pullquote]");
    assert.ok(!out.includes("<img"), out);
    assert.ok(
      out.includes("[pullquote]&lt;img src=x onerror=1&gt;[/pullquote]"),
      out,
    );
  });
});
