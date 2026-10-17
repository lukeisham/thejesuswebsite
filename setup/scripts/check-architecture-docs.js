#!/usr/bin/env node
/**
 * check-architecture-docs.js — anti-staleness checker for setup/ARCHITECTURE/.
 *
 * Two modes:
 *
 *   node setup/scripts/check-architecture-docs.js
 *     Verifies every repo path mentioned in the architecture docs still exists.
 *     Moved/renamed files are the most common form of doc decay; this catches
 *     all of them. Exits 1 on any dead path.
 *
 *   node setup/scripts/check-architecture-docs.js --touched
 *     Reads your uncommitted changes and prints which docs make claims about
 *     the files you edited — i.e. your re-read list before calling work done.
 *
 * It cannot verify that a claim is TRUE, only that its anchors resolve. That is
 * deliberate: a checker that pretends to verify prose would be worse than none.
 *
 * Not wired into CI. The Definition of done in Website_guide.md is where an
 * agent is told to run it. (SR-1)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DOCS_DIR = path.join(REPO_ROOT, "setup", "ARCHITECTURE");

// A backticked token is treated as a repo path only if it starts with one of
// these. Everything else (URLs like /api/wikipedia, VPS paths like /var/www/,
// bare identifiers like pickWritable) is correctly ignored.
const REPO_PREFIXES = [
  "api/", "frontend/", "admin/", "database/", "deploy/", "setup/",
  "mcp-server/", "public/", "scripts/", "tools/", "docs/",
  "Wikipedia algorithm/", ".github/",
];
const ROOT_FILES = new Set(["deploy.sh", "dev-proxy.js", ".gitignore"]);

// Tokens containing these are patterns/placeholders, not real paths.
const PLACEHOLDER = /[*<>{}]|NNN|…|\.\.\./;

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

function docFiles() {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(DOCS_DIR, f));
}

/** Extract candidate repo paths from a doc, with line numbers. */
function extractPaths(text) {
  const found = [];
  const lines = text.split("\n");
  let inFence = false;

  lines.forEach((line, i) => {
    // Skip fenced code blocks — they hold templates and examples by design.
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;

    for (const match of line.matchAll(/`([^`\n]+)`/g)) {
      let token = match[1].trim();
      if (PLACEHOLDER.test(token)) continue;

      // Strip a trailing slash and any parenthetical/comma noise.
      token = token.replace(/[),.;:]+$/, "").replace(/\/$/, "");
      if (!token) continue;

      const isRepoPath =
        REPO_PREFIXES.some((p) => token.startsWith(p)) || ROOT_FILES.has(token);
      if (!isRepoPath) continue;

      found.push({ token, line: i + 1 });
    }
  });
  return found;
}

function checkPaths() {
  let dead = 0;
  let checked = 0;

  for (const doc of docFiles()) {
    const rel = path.relative(REPO_ROOT, doc);
    const text = fs.readFileSync(doc, "utf8");
    const misses = [];

    for (const { token, line } of extractPaths(text)) {
      checked++;
      if (!fs.existsSync(path.join(REPO_ROOT, token))) {
        misses.push({ token, line });
      }
    }

    if (misses.length) {
      dead += misses.length;
      console.log(`\n${bold(rel)}`);
      for (const { token, line } of misses) {
        console.log(`  ${red("✗")} ${dim(`:${line}`)} ${token}`);
      }
    }
  }

  console.log(
    `\n${checked} path reference(s) checked — ` +
      (dead ? red(`${dead} dead`) : green("all resolve")),
  );
  if (dead) {
    console.log(
      yellow(
        "\nA dead path means the doc describes a layout that no longer exists.\n" +
          "Fix the path, or delete the claim if the subsystem changed shape.",
      ),
    );
  }
  return dead === 0;
}

function changedFiles() {
  try {
    const out = execSync("git status --porcelain", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((l) => l.slice(3).trim())
      .filter(Boolean)
      // Renames show as "old -> new"; keep the new path.
      .map((p) => (p.includes(" -> ") ? p.split(" -> ")[1] : p))
      .map((p) => p.replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

function checkTouched() {
  const changed = changedFiles().filter((f) => !f.startsWith("setup/"));
  if (!changed.length) {
    console.log(dim("No uncommitted changes outside setup/. Nothing to re-read."));
    return true;
  }

  const docs = docFiles().map((doc) => ({
    rel: path.relative(REPO_ROOT, doc),
    text: fs.readFileSync(doc, "utf8"),
  }));

  const hits = new Map();
  for (const file of changed) {
    for (const doc of docs) {
      if (doc.text.includes(file)) {
        if (!hits.has(doc.rel)) hits.set(doc.rel, []);
        hits.get(doc.rel).push(file);
      }
    }
  }

  if (!hits.size) {
    console.log(
      `${green("✓")} ${changed.length} changed file(s); none are described in the architecture docs.`,
    );
    return true;
  }

  console.log(bold("\nRe-read before calling this done:\n"));
  for (const [doc, files] of hits) {
    console.log(`  ${yellow(doc)}`);
    for (const f of new Set(files)) console.log(`      claims something about ${f}`);
  }
  console.log(
    dim("\nUpdate or delete any row these edits made untrue. Deletion is maintenance."),
  );
  return true;
}

const ok = process.argv.includes("--touched") ? checkTouched() : checkPaths();
process.exit(ok ? 0 : 1);
