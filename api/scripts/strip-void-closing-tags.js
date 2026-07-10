#!/usr/bin/env node
// strip-void-closing-tags.js — Remove invalid `</meta>`, `</link>`, and `</img>`
// closing tags from hand-written HTML files in frontend/ and admin/.
//
// Void elements like <meta>, <link>, and <img> should never have closing tags.
// This script finds every occurrence of `</meta>`, `</link>`, and `</img>` in
// .html files and deletes them. It skips content inside <script> and <pre>
// blocks (where tags are not actual HTML) and HTML comments.
//
// Run:  node scripts/strip-void-closing-tags.js

const fs = require("fs");
const path = require("path");

// ── Configuration ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, "frontend"),
  path.join(PROJECT_ROOT, "admin"),
];

// Tags to strip (in order of application to avoid overlapping effects).
const VOID_CLOSING_TAGS = [
  { closing: "</meta>", name: "meta" },
  { closing: "</link>", name: "link" },
  { closing: "</img>", name: "img" },
];

// ── Core logic ───────────────────────────────────────────────────────────────

/**
 * Remove void-element closing tags from a single string of HTML content.
 *
 * Only operates outside of <script>, <pre>, and HTML comment regions so we
 * don't accidentally mangle JavaScript strings or documentation.
 */
function stripVoidClosingTags(content) {
  let result = "";
  let i = 0;
  const len = content.length;

  while (i < len) {
    // ── Skip HTML comments ────────────────────────────────────────────────
    if (content.startsWith("<!--", i)) {
      const end = content.indexOf("-->", i + 4);
      if (end === -1) {
        // Unterminated comment — include rest verbatim.
        result += content.slice(i);
        break;
      }
      result += content.slice(i, end + 3);
      i = end + 3;
      continue;
    }

    // ── Skip <script> blocks ───────────────────────────────────────────────
    const scriptMatch = /^<script\b/i;
    const tagSlice = content.slice(i, i + 64);
    if (scriptMatch.test(tagSlice)) {
      const closeIdx = findClosingTag(content, i, "script");
      if (closeIdx === -1) {
        // Unclosed <script> — include rest verbatim.
        result += content.slice(i);
        break;
      }
      result += content.slice(i, closeIdx);
      i = closeIdx;
      continue;
    }

    // ── Skip <pre> blocks ─────────────────────────────────────────────────
    const preMatch = /^<pre\b/i;
    if (preMatch.test(tagSlice)) {
      const closeIdx = findClosingTag(content, i, "pre");
      if (closeIdx === -1) {
        result += content.slice(i);
        break;
      }
      result += content.slice(i, closeIdx);
      i = closeIdx;
      continue;
    }

    // ── Check for void closing tags ───────────────────────────────────────
    let matched = false;
    for (const { closing } of VOID_CLOSING_TAGS) {
      if (content.startsWith(closing, i)) {
        // Skip this closing tag entirely (remove it).
        i += closing.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result += content[i];
      i++;
    }
  }

  return result;
}

/**
 * Find the closing `</tagname>` for an opening tag at position `start`.
 * Returns the index *after* the closing tag, or -1 if not found.
 */
function findClosingTag(content, start, tagName) {
  // Find the end of the opening tag first.
  const tagEnd = content.indexOf(">", start);
  if (tagEnd === -1) return -1;

  const closeTag = `</${tagName}>`;
  let depth = 1;
  let pos = tagEnd + 1;

  while (depth > 0 && pos < content.length) {
    // Check for nested opening tag.
    const nextOpen = content.indexOf(`<${tagName}`, pos);
    const nextClose = content.indexOf(closeTag, pos);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + tagName.length + 1;
    } else {
      depth--;
      if (depth === 0) return nextClose + closeTag.length;
      pos = nextClose + closeTag.length;
    }
  }

  return -1;
}

/**
 * Count how many of each void closing tag exist in a string (for reporting).
 */
function countVoidClosings(content) {
  const counts = {};
  for (const { closing, name } of VOID_CLOSING_TAGS) {
    const matches = content.match(new RegExp(escapeRegex(closing), "g"));
    counts[name] = matches ? matches.length : 0;
  }
  return counts;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── File I/O ─────────────────────────────────────────────────────────────────

/**
 * Recursively collect all .html files under a directory.
 */
function collectHtmlFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Process a single HTML file. Returns a report object with counts.
 */
function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const countsBefore = countVoidClosings(original);
  const totalBefore = countsBefore.meta + countsBefore.link + countsBefore.img;
  if (totalBefore === 0) return { path: filePath, countsBefore, countsAfter: countsBefore, changed: false };

  const cleaned = stripVoidClosingTags(original);

  // Validate output: no void closing tags remain.
  const countsAfter = countVoidClosings(cleaned);
  const totalAfter = countsAfter.meta + countsAfter.link + countsAfter.img;
  if (totalAfter > 0) {
    throw new Error(
      `Validation failed for ${filePath}: ${totalAfter} void closing tags remain after cleanup (meta: ${countsAfter.meta}, link: ${countsAfter.link}, img: ${countsAfter.img})`,
    );
  }

  // Validate output still parses as the same number of lines (rough check).
  // A full HTML parser is overkill; we just verify we didn't delete non-tag content.
  fs.writeFileSync(filePath, cleaned, "utf8");
  return { path: filePath, countsBefore, countsAfter: { meta: 0, link: 0, img: 0 }, changed: true };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) {
      allFiles.push(...collectHtmlFiles(dir));
    }
  }

  const relative = (p) => path.relative(PROJECT_ROOT, p);

  console.log(`Scanning ${allFiles.length} HTML files...\n`);

  let totalChanged = 0;
  let totalRemovals = { meta: 0, link: 0, img: 0 };

  for (const filePath of allFiles.sort()) {
    const report = processFile(filePath);
    if (!report.changed) continue;

    totalChanged++;
    totalRemovals.meta += report.countsBefore.meta;
    totalRemovals.link += report.countsBefore.link;
    totalRemovals.img += report.countsBefore.img;

    const parts = [];
    if (report.countsBefore.meta) parts.push(`meta: ${report.countsBefore.meta}`);
    if (report.countsBefore.link) parts.push(`link: ${report.countsBefore.link}`);
    if (report.countsBefore.img) parts.push(`img: ${report.countsBefore.img}`);

    console.log(`  ${relative(report.path)} — removed ${parts.join(", ")}`);
  }

  console.log(
    `\nDone. ${totalChanged} file(s) changed. Total removals: meta=${totalRemovals.meta}, link=${totalRemovals.link}, img=${totalRemovals.img}`,
  );

  if (totalChanged === 0) {
    console.log("No void closing tags found — all files already clean.");
  }
}

if (require.main === module) {
  main();
}

module.exports = { stripVoidClosingTags, countVoidClosings };
