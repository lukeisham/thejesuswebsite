// Smoke tests for utils/content-markers.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9), as
// api/tests/excerpt.test.js does. Covers the [fn:N] marker and checks that
// [mla:N] and [id:N] still resolve.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../content-markers.js";

describe("parseContentBody: [fn:N] footnote markers", () => {
  test("a marker with a matching footnote becomes a superscript link with a ref id", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("A claim[fn:1] here.", {
      footnotes: [{ content: "Note." }],
    });
    assert.ok(
      out.includes(
        '<sup class="inline-citation"><a href="#fn-1" id="fnref-1">1</a></sup>',
      ),
      out,
    );
  });

  test("a second marker for the same number links to the note but has no id", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("One[fn:1] and two[fn:1].", {
      footnotes: [{ content: "Note." }],
    });
    assert.equal(out.split('id="fnref-1"').length - 1, 1);
    assert.equal(out.split('href="#fn-1"').length - 1, 2);
  });

  test("ids are tracked across paragraphs of one body", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("First[fn:1].\n\nSecond[fn:1].", {
      footnotes: [{ content: "Note." }],
    });
    assert.equal(out.split('id="fnref-1"').length - 1, 1);
  });

  test("a number past the end of the list renders nothing", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("A claim[fn:2] here.", {
      footnotes: [{ content: "Note." }],
    });
    assert.ok(!out.includes("fn:2"));
    assert.ok(!out.includes("<sup"));
  });

  test("a marker with no footnotes option renders nothing", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("A claim[fn:1] here.");
    assert.ok(!out.includes("<sup"));
    assert.ok(!out.includes("[fn:1]"));
  });

  test("[fn:0] renders nothing", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("A claim[fn:0] here.", {
      footnotes: [{ content: "Note." }],
    });
    assert.ok(!out.includes("<sup"));
  });

  test("a marker survives the markdown path", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("A **bold** claim[fn:1].", {
      footnotes: [{ content: "Note." }],
      useMarkdown: true,
    });
    assert.ok(out.includes('href="#fn-1"'), out);
    assert.ok(out.includes("<strong>bold</strong>"), out);
  });
});

describe("parseContentBody: existing markers still work", () => {
  test("[mla:N] and [id:N] resolve against their lists", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("Notes[mla:7] and badge[id:12].", {
      mlaSources: [{ id: 7, mla_book_author: "Meyers" }],
      identifiers: [{ id: 12, title: "Codex Sinaiticus" }],
    });
    assert.ok(out.includes('href="#mla-7"'), out);
    assert.ok(out.includes("Codex Sinaiticus"), out);
  });

  test("non-string input returns an empty string", async () => {
    const { parseContentBody } = await import(MODULE);
    assert.equal(parseContentBody(undefined), "");
  });
});

describe("parseContentBody: [pullquote] escaping", () => {
  const evil = "[pullquote]<img src=x onerror=1>[/pullquote]";

  test("useMarkdown without pullQuotes never emits raw HTML from a pullquote", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody(evil, { useMarkdown: true });
    assert.ok(!out.includes("<img"), out);
    assert.ok(out.includes("&lt;img"), out);
  });

  test("useMarkdown with pullQuotes renders an aside, escaped once", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody(evil, { useMarkdown: true, pullQuotes: true });
    assert.ok(
      out.includes('<aside class="pull-quote">&lt;img src=x onerror=1&gt;</aside>'),
      out,
    );
  });

  test("a quote character in a blog pullquote is escaped once", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody('[pullquote]He said "hi" & left[/pullquote]', {
      useMarkdown: true,
      pullQuotes: true,
    });
    assert.ok(
      out.includes('<aside class="pull-quote">He said &quot;hi&quot; &amp; left</aside>'),
      out,
    );
  });

  test("without markdown, a pullquote is still escaped once", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody(evil, { pullQuotes: true });
    assert.equal(out, '<aside class="pull-quote">&lt;img src=x onerror=1&gt;</aside>');
  });
});

describe("parseContentBody: identifier link URL", () => {
  test("an https external_url becomes a link", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("Badge[id:12].", {
      identifiers: [{ id: 12, title: "Codex", external_url: "https://example.org/codex" }],
    });
    assert.ok(out.includes('href="https://example.org/codex"'), out);
  });

  test("a javascript: external_url leaves the badge without a link", async () => {
    const { parseContentBody } = await import(MODULE);
    const out = parseContentBody("Badge[id:12].", {
      identifiers: [{ id: 12, title: "Codex", external_url: "javascript:alert(1)" }],
    });
    assert.ok(out.includes("Codex"), out);
    assert.ok(!out.includes("href="), out);
  });
});
