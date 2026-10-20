/**
 * MLA citation formatter for mla_sources rows.
 *
 * Inspects an mla_sources row and formats it as MLA-style HTML per Style
 * guide §9. Detects source type by which field group is populated (journal
 * article → book → website). Returns "" when no group has enough data.
 *
 * Why frontend-only: the API exposes raw mla_sources rows; formatting is
 * presentation and lives here. The output is HTML that essay-detail.js passes
 * to raw(), so every interpolated field must go through `html` (JS-6).
 *
 * Type detection order: a row could populate multiple field groups, so the
 * most specific wins: journal article, then book, then website. A
 * book+website hybrid row therefore renders as a book.
 *
 * @module utils/mla
 */

import { html } from "./templates.js";

/**
 * Format an mla_sources row as an MLA-style HTML citation string.
 *
 * Every field is escaped via the `html` tagged template before interpolation
 * (JS-6). Handles rows with missing/partial fields and returns "" rather than
 * emitting broken citations (JS-2).
 *
 * @param {Object} source - Raw mla_sources row from the API.
 * @returns {string} MLA-formatted citation HTML, or "" if unformattable.
 */
export function formatMlaCitation(source) {
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

    // 'Article Title.'
    parts.push(html`'${title}.' `.toString());

    // Journal Title
    if (journal) parts.push(html`<em>${journal}</em>, `.toString());

    // vol. X, no. Y
    if (volume || issue) {
      const volIssue = [];
      if (volume) volIssue.push(html`vol. ${volume}`.toString());
      if (issue) volIssue.push(html`no. ${issue}`.toString());
      parts.push(volIssue.join(", ") + " ");
    }

    // (Date)
    if (date) parts.push(html`(${date})`.toString());

    // pp. X-Y
    if (pages) parts.push(html`, ${pages}`.toString());

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
    if (publisher) parts.push(html`, ${publisher}`.toString());

    // Date
    if (date) parts.push(html`, ${date}`.toString());

    // Page reference
    if (pageRef) parts.push(html`, ${pageRef}`.toString());

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

    // 'Page Title.'
    parts.push(html`'${title}.' `.toString());

    // Publisher,
    if (publisher) parts.push(html`<em>${publisher}</em>, `.toString());

    // Date,
    if (date) parts.push(html`${date}, `.toString());

    // URL.
    if (url) parts.push(html`${url}.`.toString());

    return parts.join("").replace(/ ,/g, ",").replace(/ \./g, ".");
  }

  // No recognised field group
  return "";
}
