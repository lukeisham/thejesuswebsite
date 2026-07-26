// MLA citation formatter tests — verifies formatMlaCitation() uses the
// real schema column names (mla_journal_date, mla_journal_page_reference,
// mla_book_date, mla_book_page_reference) and produces non-empty citation
// strings for journal, book, and website sources.
// Uses node:test + node:assert.
//
// The real formatMlaCitation lives in a frontend ES module and is loaded
// via dynamic import() so tests always run against the live implementation.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Tests ────────────────────────────────────────────────────────────────────

describe("formatMlaCitation", () => {

  test("journal article with real schema columns produces non-empty citation", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_journal_article_author: "Dunn, James D. G.",
      mla_journal_article_title: "The Historical Jesus",
      mla_journal_title: "Journal of Biblical Literature",
      mla_journal_volume: "115",
      mla_journal_issue: "2",
      mla_journal_date: "1996",
      mla_journal_page_reference: "pp. 223-245",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("Dunn"), "should include author surname");
    assert.ok(result.includes("'The Historical Jesus.'"), "should include article title in single quotes");
    assert.ok(result.includes("<em>Journal of Biblical Literature</em>"), "should include italicised journal name");
    assert.ok(result.includes("vol. 115"), "should include volume");
    assert.ok(result.includes("no. 2"), "should include issue");
    assert.ok(result.includes("(1996)"), "should include date");
    assert.ok(result.includes("pp. 223-245"), "should include page reference");
  });

  test("journal article with minimal fields (just title and author)", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_journal_article_author: "Smith, John",
      mla_journal_article_title: "A Study of Evidence",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("Smith"), "should include author");
    assert.ok(result.includes("'A Study of Evidence.'"), "should include title in single quotes");
  });

  test("book with real schema columns produces non-empty citation", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_book_author: "Ehrman, Bart D.",
      mla_book_title: "Did Jesus Exist?",
      mla_book_publisher: "HarperOne",
      mla_book_date: "2012",
      mla_book_page_reference: "p. 45",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("Ehrman"), "should include author");
    assert.ok(result.includes("<em>Did Jesus Exist?</em>"), "should include italicised title");
    assert.ok(result.includes("HarperOne"), "should include publisher");
    assert.ok(result.includes("2012"), "should include date");
    assert.ok(result.includes("p. 45"), "should include page reference");
  });

  test("book with minimal fields (just title)", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_book_title: "The Jesus Mystery",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("<em>The Jesus Mystery</em>"), "should include italicised title");
  });

  test("website with real schema columns produces non-empty citation", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_website_author: "Johnson, Luke Timothy",
      mla_website_title: "Who Was Jesus?",
      mla_website_publisher: "Yale University Press Blog",
      mla_website_date: "15 March 2021",
      mla_website_url: "https://example.com/who-was-jesus",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("Johnson"), "should include author");
    assert.ok(result.includes("'Who Was Jesus?.'"), "should include page title in single quotes");
    assert.ok(result.includes("<em>Yale University Press Blog</em>"), "should include italicised publisher");
    assert.ok(result.includes("15 March 2021"), "should include date");
    assert.ok(result.includes("https://example.com/who-was-jesus"), "should include URL");
  });

  test("website with just title (no author)", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_website_title: "Historical Jesus Resources",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("'Historical Jesus Resources.'"), "should include title in single quotes");
  });

  test("stale field mla_website_name is not used (no site name in citation)", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    // If someone still sends the old field name, it should have no effect
    const source = {
      mla_website_name: "should-not-appear",
      mla_website_title: "Actual Page Title",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("Actual Page Title"), "should use mla_website_title");
    assert.ok(!result.includes("should-not-appear"), "should not use stale mla_website_name");
  });

  test("stale book fields mla_book_year and mla_book_edition are not used", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_book_title: "A Book",
      mla_book_year: "1999",       // stale — schema uses mla_book_date
      mla_book_edition: "2nd ed.", // stale — schema uses mla_book_page_reference
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("<em>A Book</em>"), "should include italicised title");
    assert.ok(!result.includes("1999"), "should not use stale mla_book_year");
    assert.ok(!result.includes("2nd ed."), "should not use stale mla_book_edition");
  });

  test("stale journal fields mla_journal_year and mla_journal_pages are not used", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_journal_article_title: "Journal Article",
      mla_journal_year: "2000",    // stale — schema uses mla_journal_date
      mla_journal_pages: "10-20",  // stale — schema uses mla_journal_page_reference
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("Journal Article"), "should include title");
    assert.ok(!result.includes("2000"), "should not use stale mla_journal_year");
    assert.ok(!result.includes("10-20"), "should not use stale mla_journal_pages");
  });

  test("empty object returns empty string", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    assert.equal(formatMlaCitation({}), "");
  });

  test("null/undefined returns empty string", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    assert.equal(formatMlaCitation(null), "");
    assert.equal(formatMlaCitation(undefined), "");
  });

  test("non-object returns empty string", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    assert.equal(formatMlaCitation("string"), "");
    assert.equal(formatMlaCitation(123), "");
  });

  test("HTML special characters in fields are escaped by html tagged template", async () => {
    const { formatMlaCitation } = await import("../../frontend/assets/js/utils/mla.js");
    const source = {
      mla_journal_article_title: "Jesus & the <Scrolls>",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should not crash on special characters");
    // The real html tagged template escapes interpolated values
    assert.ok(result.includes("&amp;"), "& should be escaped to &amp;");
    assert.ok(result.includes("&lt;"), "< should be escaped to &lt;");
    assert.ok(!result.includes("<Scrolls>"), "raw < > should not appear");
    assert.ok(!result.includes("Jesus & the"), "raw & should not appear");
  });
});
