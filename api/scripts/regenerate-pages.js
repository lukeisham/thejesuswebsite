#!/usr/bin/env node
// regenerate-pages.js — batch static page regeneration CLI.
//
// For every content type, queries the database for published slugs, (re)generates
// their static HTML pages from the [slug].html template, then removes any .html
// files in the output directory whose slug is NOT in the published set.
// index.html and [slug].html are always preserved.
//
// Run:  npm run pages   or   node scripts/regenerate-pages.js
//
// Used after a bulk content upload, a template change, or on deploy.

const fs = require("fs");
const path = require("path");
const { CONTENT_PAGES } = require("../config/content-pages");
const { generatePage, removePage } = require("../services/page-generator");

/**
 * Remove generated .html files in an output directory that no longer have
 * a matching published row in the database (JS-2: validate against DB before
 * deleting — never unlink based on filesystem state alone).
 *
 * index.html and [slug].html are always skipped — they are static assets
 * managed by git, not generated per-item pages.
 */
function cleanOrphans(config, publishedSlugs) {
  if (!fs.existsSync(config.outputDir)) return;

  const files = fs.readdirSync(config.outputDir);
  let removed = 0;

  // Build a set for O(1) lookup (JS-2: predictable performance even on
  // directories with many files).
  const slugSet = new Set(publishedSlugs);

  for (const file of files) {
    // Only consider .html files, and never delete the template or the index.
    if (
      !file.endsWith(".html") ||
      file === "[slug].html" ||
      file === "index.html"
    )
      continue;

    const slug = file.replace(/\.html$/, "");

    // Only remove files whose slug is NOT in the published set.
    if (!slugSet.has(slug)) {
      console.log(`[pages] Removing orphan: ${config.type}/${slug}`);
      const result = removePage(config.type, slug);
      if (result.ok) removed++;
    }
  }

  return removed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  let generated = 0;
  let removed = 0;
  const errors = [];

  for (const type of Object.keys(CONTENT_PAGES)) {
    const config = CONTENT_PAGES[type];

    // 1. Generate pages for all currently-published items.
    const db = require("../config");
    const rows = db
      .prepare(
        `SELECT ${config.slugColumn} AS slug
         FROM ${config.table}
         WHERE published_draft = 1
           AND ${config.slugColumn} IS NOT NULL
           ${config.extraWhere || ""}`,
      )
      .all();

    for (const row of rows) {
      const result = generatePage(type, row.slug);
      if (result.ok) {
        generated++;
      } else {
        errors.push(`${type}/${row.slug}: ${result.error}`);
      }
    }

    // 2. Remove orphaned generated files — only slugs not in the
    //    published set (JS-2: validate against DB before deleting).
    const publishedSlugs = rows.map((r) => r.slug);
    removed += cleanOrphans(config, publishedSlugs);
  }

  console.log(`[pages] Generated: ${generated}`);
  if (removed > 0) {
    console.log(`[pages] Removed orphans: ${removed}`);
  }
  if (errors.length > 0) {
    console.error(`[pages] Errors (${errors.length}):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

main();
