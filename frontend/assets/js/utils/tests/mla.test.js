// Smoke tests for utils/mla.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). essay-detail.js
// passes the output to raw(), so the escaping assertion guards an XSS path.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../mla.js";

describe("formatMlaCitation", () => {
  test("module imports and exports formatMlaCitation", async () => {
    const mod = await import(MODULE);
    assert.equal(typeof mod.formatMlaCitation, "function");
  });

  test("a book row renders author, italic title, publisher, date and pages", async () => {
    const { formatMlaCitation } = await import(MODULE);
    const out = formatMlaCitation({
      mla_book_author: "Doe, Jane",
      mla_book_title: "A Title",
      mla_book_publisher: "Press",
      mla_book_date: "2001",
      mla_book_page_reference: "pp. 3-4",
    });
    assert.equal(out, "Doe, Jane. <em>A Title</em>, Press, 2001, pp. 3-4.");
  });

  test("markup in publisher, date and page reference is escaped", async () => {
    const { formatMlaCitation } = await import(MODULE);
    const out = formatMlaCitation({
      mla_book_title: "A Title",
      mla_book_publisher: "<script>alert(1)</script>",
      mla_book_date: "<b>x</b>",
      mla_book_page_reference: "<i>p</i>",
    });
    assert.ok(!out.includes("<script>"), out);
    assert.ok(!out.includes("<b>"), out);
    assert.ok(!out.includes("<i>"), out);
    assert.ok(out.includes("&lt;script&gt;"), out);
  });

  test("a row with no title returns an empty string", async () => {
    const { formatMlaCitation } = await import(MODULE);
    assert.equal(formatMlaCitation({ mla_book_author: "Doe" }), "");
  });
});
