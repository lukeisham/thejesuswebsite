#!/usr/bin/env node
// stamp-about-dates.js — deploy-time git-history date stamp for about.html.
//
// frontend/about.html is a plain static file (not DB-backed), so its
// Created/Edited dates come from git history instead of a database row.
// Runs `git log --follow --format=%aI` against the file (newest-first),
// taking the last line (oldest commit) as "created" and the first line
// (most recent commit) as "edited". Writes both as ISO dates to
// frontend/assets/data/about-dates.json, which about.js fetches at runtime
// and feeds into the same shared renderCreatedEditedLine util used by the
// DB-backed detail pages.
//
// Run:  npm run stamp-about-dates   or   node scripts/stamp-about-dates.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const TARGET_FILE = "frontend/about.html";
const OUTPUT_PATH = path.resolve(
  ROOT_DIR,
  "frontend",
  "assets",
  "data",
  "about-dates.json",
);

/**
 * Parse `git log --format=%aI` output (newest-first, one ISO date per line)
 * into { created, edited }. Throws if there are no lines — a file with no
 * git history has nothing to stamp (JS-2: fail loudly, never guess a date).
 *
 * @param {string} gitLogOutput
 * @returns {{created: string, edited: string}}
 */
function parseGitLogDates(gitLogOutput) {
  const lines = gitLogOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`No git history found for ${TARGET_FILE}`);
  }

  return {
    created: lines[lines.length - 1],
    edited: lines[0],
  };
}

function main() {
  const gitLogOutput = execSync(
    `git log --follow --format=%aI -- ${TARGET_FILE}`,
    { cwd: ROOT_DIR, encoding: "utf8" },
  );
  const dates = parseGitLogDates(gitLogOutput);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(dates, null, 2) + "\n",
    "utf8",
  );
  console.log(`[stamp-about-dates] Wrote ${OUTPUT_PATH}:`, dates);
}

if (require.main === module) {
  main();
}

module.exports = { parseGitLogDates };
