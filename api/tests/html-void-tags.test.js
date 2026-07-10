// html-void-tags.test.js — Guard test that ensures no hand-written HTML
// files contain invalid `</meta>`, `</link>`, or `</img>` closing tags.
// These are void elements in the HTML spec and should never have a closing tag.
//
// This test walks every .html file in frontend/ and admin/ and fails loudly if
// any of the three invalid patterns is found, preventing regressions.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SCAN_DIRS = [
  { name: "frontend", path: path.join(PROJECT_ROOT, "frontend") },
  { name: "admin", path: path.join(PROJECT_ROOT, "admin") },
];

const FORBIDDEN_PATTERNS = [
  { pattern: "</meta>", label: "</meta>" },
  { pattern: "</link>", label: "</link>" },
  { pattern: "</img>", label: "</img>" },
];

/**
 * Recursively collect all .html files under a directory.
 */
function collectHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
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

test("no void-element closing tags in hand-written HTML files", async (t) => {
  // Collect all HTML files.
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    const files = collectHtmlFiles(dir.path);
    for (const file of files) {
      allFiles.push({
        absolutePath: file,
        relativePath: path.relative(PROJECT_ROOT, file),
        scope: dir.name,
      });
    }
  }

  // Sanity: there should be at least a few files to test against.
  assert.ok(
    allFiles.length > 10,
    `Expected at least 11 HTML files to scan, found ${allFiles.length}`,
  );

  const violations = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file.absolutePath, "utf8");

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      let idx = content.indexOf(pattern);
      while (idx !== -1) {
        // Get line number for readable error messages.
        const lineNum = content.slice(0, idx).split("\n").length;
        violations.push({
          file: file.relativePath,
          line: lineNum,
          pattern: label,
        });
        idx = content.indexOf(pattern, idx + 1);
      }
    }
  }

  if (violations.length > 0) {
    const summary = violations
      .map((v) => `  ${v.file}:${v.line} — ${v.pattern}`)
      .join("\n");
    assert.fail(
      `Found ${violations.length} void-element closing tag(s) that must be removed:\n${summary}`,
    );
  }
});
