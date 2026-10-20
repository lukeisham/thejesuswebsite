// news-list.js tests — node:test + node:assert.
// Imports the real ES module with a stubbed `document` (TEST-8), since the
// module reads the DOM when it loads. The behaviour under test is that a
// stored article URL only reaches an href when safeHref accepts it (JS-6).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

globalThis.document = {
  readyState: "loading",
  getElementById: () => null,
  addEventListener() {},
};

const MODULE = path.resolve(__dirname, "news-list.js");

describe("resolveRowLink", () => {
  test("an https article URL opens externally", async () => {
    const { resolveRowLink } = await import(MODULE);
    assert.deepEqual(resolveRowLink({ news_article_url: "https://example.org/a", slug: "s" }), {
      href: "https://example.org/a",
      external: true,
    });
  });

  test("a javascript: URL falls back to the slug page, not external", async () => {
    const { resolveRowLink } = await import(MODULE);
    assert.deepEqual(resolveRowLink({ news_article_url: "javascript:alert(1)", slug: "my slug" }), {
      href: "/news-and-blog/news/my%20slug",
      external: false,
    });
  });

  test("a missing URL falls back to the slug page", async () => {
    const { resolveRowLink } = await import(MODULE);
    assert.equal(resolveRowLink({ slug: "abc" }).href, "/news-and-blog/news/abc");
  });
});
