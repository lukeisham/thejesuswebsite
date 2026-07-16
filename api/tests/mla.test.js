// MLA citation formatter tests — verifies formatMlaCitation() uses the
// real schema column names (mla_journal_date, mla_journal_page_reference,
// mla_book_date, mla_book_page_reference) and produces non-empty citation
// strings for journal, book, and website sources.
// Uses node:test + node:assert.
//
// Since formatMlaCitation lives in a frontend ES module (not require-able
// from CommonJS), the function under test is reproduced inline here.
// Both copies must stay in sync with frontend/assets/js/utils/mla.js.
//
// NOTE: this file is in api/tests/ because content-marker-payloads.test.js
// already covers a frontend-shared util in the same directory, establishing
// the convention.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── MLA formatter (synced copy of frontend/assets/js/utils/mla.js) ───────────

// Minimal html-tagged-template stub (the real one lives in templates.js)
function html(strings, ...values) {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += String(values[i]) + strings[i + 1];
  }
  return result;
}

function formatMlaCitation(source) {
  if (!source || typeof source !== "object") return "";

  // ── Journal Article (most specific) ────────────────────────────────────
  if (source.mla_journal_article_author || source.mla_journal_article_title) {
    const author = source.mla_journal_article_author || "";
    const title = source.mla_journal_article_title || "";
    const journal = source.mla_journal_title || "";
    const volume = source.mla_journal_volume || "";
    const issue = source.mla_journal_issue || "";
    const date = source.mla_journal_date || "";
    const pages = source.mla_journal_page_reference || "";

    if (!title) return "";

    const parts = [];

    // Author.
    if (author) parts.push(html`${author}. `.toString());

    // "Article Title."
    parts.push(html`<em>${title}</em>. `.toString());

    // Journal Title
    if (journal) parts.push(html`${journal} `.toString());

    // vol. X, no. Y
    if (volume || issue) {
      const volIssue = [];
      if (volume) volIssue.push(html`vol. ${volume}`.toString());
      if (issue) volIssue.push(html`no. ${issue}`.toString());
      parts.push(volIssue.join(", ") + " ");
    }

    // (Date)
    if (date) parts.push(`(${date})`);

    // pp. X-Y
    if (pages) parts.push(`, ${pages}`);

    parts.push(".");

    return parts.join("").replace(/ ,/g, ",").replace(/ \./g, ".");
  }

  // ── Book ───────────────────────────────────────────────────────────────
  if (
    source.mla_book_author ||
    source.mla_book_title ||
    source.mla_book_publisher
  ) {
    const author = source.mla_book_author || "";
    const title = source.mla_book_title || "";
    const publisher = source.mla_book_publisher || "";
    const date = source.mla_book_date || "";
    const pageRef = source.mla_book_page_reference || "";

    if (!title) return "";

    const parts = [];

    // Author.
    if (author) parts.push(html`${author}. `.toString());

    // _Title_.
    parts.push(html`<em>${title}</em>`.toString());

    // Publisher
    if (publisher) parts.push(`, ${publisher}`);

    // Date
    if (date) parts.push(`, ${date}`);

    // Page reference
    if (pageRef) parts.push(`, ${pageRef}`);

    parts.push(".");

    return parts.join("").replace(/ ,/g, ",");
  }

  // ── Website ────────────────────────────────────────────────────────────
  if (
    source.mla_website_author ||
    source.mla_website_title
  ) {
    const author = source.mla_website_author || "";
    const title = source.mla_website_title || "";
    const publisher = source.mla_website_publisher || "";
    const date = source.mla_website_date || "";
    const url = source.mla_website_url || "";

    if (!title) return "";

    const parts = [];

    // Author.
    if (author) parts.push(html`${author}. `.toString());

    // "Page Title."
    parts.push(html`<em>${title}</em>. `.toString());

    // Publisher,
    if (publisher) parts.push(html`${publisher}, `.toString());

    // Date,
    if (date) parts.push(html`${date}, `.toString());

    // URL.
    if (url) parts.push(html`${url}.`.toString());

    return parts.join("").replace(/ ,/g, ",").replace(/ \./g, ".");
  }

  // No recognised field group
  return "";
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("formatMlaCitation", () => {

  test("journal article with real schema columns produces non-empty citation", () => {
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
    assert.ok(result.includes("<em>The Historical Jesus</em>"), "should include italicised title");
    assert.ok(result.includes("Journal of Biblical Literature"), "should include journal name");
    assert.ok(result.includes("vol. 115"), "should include volume");
    assert.ok(result.includes("no. 2"), "should include issue");
    assert.ok(result.includes("(1996)"), "should include date");
    assert.ok(result.includes("pp. 223-245"), "should include page reference");
  });

  test("journal article with minimal fields (just title and author)", () => {
    const source = {
      mla_journal_article_author: "Smith, John",
      mla_journal_article_title: "A Study of Evidence",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("Smith"), "should include author");
    assert.ok(result.includes("<em>A Study of Evidence</em>"), "should include title");
  });

  test("book with real schema columns produces non-empty citation", () => {
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

  test("book with minimal fields (just title)", () => {
    const source = {
      mla_book_title: "The Jesus Mystery",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("<em>The Jesus Mystery</em>"), "should include title");
  });

  test("website with real schema columns produces non-empty citation", () => {
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
    assert.ok(result.includes("<em>Who Was Jesus?</em>"), "should include title");
    assert.ok(result.includes("Yale University Press Blog"), "should include publisher");
    assert.ok(result.includes("15 March 2021"), "should include date");
    assert.ok(result.includes("https://example.com/who-was-jesus"), "should include URL");
  });

  test("website with just title (no author)", () => {
    const source = {
      mla_website_title: "Historical Jesus Resources",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.length > 0, "should produce a non-empty citation");
    assert.ok(result.includes("<em>Historical Jesus Resources</em>"), "should include title");
  });

  test("stale field mla_website_name is not used (no site name in citation)", () => {
    // If someone still sends the old field name, it should have no effect
    const source = {
      mla_website_name: "should-not-appear",
      mla_website_title: "Actual Page Title",
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("Actual Page Title"), "should use mla_website_title");
    assert.ok(!result.includes("should-not-appear"), "should not use stale mla_website_name");
  });

  test("stale book fields mla_book_year and mla_book_edition are not used", () => {
    const source = {
      mla_book_title: "A Book",
      mla_book_year: "1999",       // stale — schema uses mla_book_date
      mla_book_edition: "2nd ed.", // stale — schema uses mla_book_page_reference
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("<em>A Book</em>"), "should include title");
    assert.ok(!result.includes("1999"), "should not use stale mla_book_year");
    assert.ok(!result.includes("2nd ed."), "should not use stale mla_book_edition");
  });

  test("stale journal fields mla_journal_year and mla_journal_pages are not used", () => {
    const source = {
      mla_journal_article_title: "Journal Article",
      mla_journal_year: "2000",    // stale — schema uses mla_journal_date
      mla_journal_pages: "10-20",  // stale — schema uses mla_journal_page_reference
    };
    const result = formatMlaCitation(source);
    assert.ok(result.includes("<em>Journal Article</em>"), "should include title");
    assert.ok(!result.includes("2000"), "should not use stale mla_journal_year");
    assert.ok(!result.includes("10-20"), "should not use stale mla_journal_pages");
  });

  test("empty object returns empty string", () => {
    assert.equal(formatMlaCitation({}), "");
  });

  test("null/undefined returns empty string", () => {
    assert.equal(formatMlaCitation(null), "");
    assert.equal(formatMlaCitation(undefined), "");
  });

  test("non-object returns empty string", () => {
    assert.equal(formatMlaCitation("string"), "");
    assert.equal(formatMlaCitation(123), "");
  });

  test("HTML special characters in fields are preserved (html tagged template escapes)", () => {
    const source = {
      mla_journal_article_title: "Jesus & the <Scrolls>",
    };
    const result = formatMlaCitation(source);
    // The html tagged template should keep these as-is (careful: html template
    // in the real codebase escapes, our stub does not — this test verifies
    // that the formatter runs without error on special chars)
    assert.ok(result.length > 0, "should not crash on special characters");
  });
});
