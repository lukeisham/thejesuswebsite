// Smoke tests for utils/footnotes.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). The body element is
// a hand-built fake that answers only querySelector (TEST-8).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../footnotes.js";

function fakeBody(presentIds) {
  return {
    querySelector(selector) {
      const id = selector.replace(/^#/, "");
      return presentIds.includes(id) ? {} : null;
    },
  };
}

describe("footnoteListHTML", () => {
  test("a cited note gets an id and a return link", async () => {
    const { footnoteListHTML } = await import(MODULE);
    const out = footnoteListHTML([{ content: "Note one." }], fakeBody(["fnref-1"]));
    assert.ok(out.startsWith('<li id="fn-1">Note one.'), out);
    assert.ok(out.includes('href="#fnref-1"'), out);
    assert.ok(out.includes('aria-label="Back to text"'), out);
  });

  test("a note that no marker cites gets no return link", async () => {
    const { footnoteListHTML } = await import(MODULE);
    const out = footnoteListHTML(
      [{ content: "Cited." }, { content: "Uncited." }],
      fakeBody(["fnref-1"]),
    );
    assert.ok(out.includes('<li id="fn-2">Uncited.</li>'), out);
    assert.equal(out.split("footnote-backref").length - 1, 1);
  });

  test("HTML in the content is escaped", async () => {
    const { footnoteListHTML } = await import(MODULE);
    const out = footnoteListHTML([{ content: "<script>x</script>" }], fakeBody([]));
    assert.ok(!out.includes("<script>"), out);
    assert.ok(out.includes("&lt;script&gt;"), out);
  });

  test("an empty list returns an empty string", async () => {
    const { footnoteListHTML } = await import(MODULE);
    assert.equal(footnoteListHTML([], fakeBody([])), "");
  });
});
