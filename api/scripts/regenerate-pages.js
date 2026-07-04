#!/usr/bin/env node
// regenerate-pages.js — batch static page regeneration CLI.
//
// Iterates every published row across all content types and (re)generates
// its static HTML page from the template. Also removes orphaned generated
// files whose corresponding DB row is gone or unpublished.
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
 * a matching published row in the database. The [slug].html template file
 * itself is never deleted.
 */
function cleanOrphans(config) {
  if (!fs.existsSync(config.outputDir)) return;

  const files = fs.readdirSync(config.outputDir);
  let removed = 0;

  for (const file of files) {
    // Only consider .html files, and never delete the template itself.
    if (!file.endsWith(".html") || file === "[slug].html") continue;

    const slug = file.replace(/\.html$/, "");
    const result = removePage(config.type, slug);
    if (result.ok) removed++;
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

    // 2. Remove orphaned generated files (deleted/unpublished items).
    removed += cleanOrphans(config);
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
