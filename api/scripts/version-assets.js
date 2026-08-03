#!/usr/bin/env node
// version-assets.js — deploy-time asset cache-busting stamp.
//
// Walks every .html file under frontend/ and admin/, and rewrites local
// <script src="...js"> and <link href="...css"> references to carry
// `?v=<version>` — a stable per-deploy query string that busts both the
// browser cache and Cloudflare's edge cache (whose default cache key
// includes the query string) the instant a new commit lands.
//
// It also walks every .js file under frontend/ and admin/ and stamps local
// `from "...js"` import/export specifiers the same way. HTML stamping alone
// only busts the *entry* script's URL — any module it imports (e.g.
// content-markers.js) keeps an unversioned URL forever, so a browser that
// cached it under the old immutable, max-age=1yr Cache-Control header would
// never refetch it, even after the entry script changes. Stamping the
// import specifier itself changes that URL too, so every deploy forces a
// fresh fetch of the whole dependency graph, not just the entry point.
// Test files (`*.test.js`) are skipped — they run under Node via
// `require()`, never served to a browser.
//
// version defaults to `git rev-parse --short HEAD`, overridable via
// ASSET_VERSION (useful for local testing without a git commit).
//
// Idempotent: an existing `?v=...` query string on a reference is replaced,
// never doubled. External (http(s)://, protocol-relative //, data:)
// references and non-JS/CSS attributes are left untouched.
//
// Run:  npm run version-assets   or   node scripts/version-assets.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const TARGET_DIRS = ["frontend", "admin"];

const ASSET_REF_RE = /(src|href)="([^"]+\.(?:js|css))(\?[^"]*)?"/g;

/**
 * True if a reference path points off-site — never stamped.
 */
function isExternal(refPath) {
  return (
    refPath.startsWith("http://") ||
    refPath.startsWith("https://") ||
    refPath.startsWith("//") ||
    refPath.startsWith("data:")
  );
}

/**
 * Resolve the version string to stamp with: ASSET_VERSION env var if set,
 * otherwise the short git commit hash of the working tree.
 */
function resolveVersion(cwd = ROOT_DIR) {
  if (process.env.ASSET_VERSION) return process.env.ASSET_VERSION;
  return execSync("git rev-parse --short HEAD", { cwd }).toString().trim();
}

/**
 * Rewrite every local .js/.css src/href reference in an HTML string to
 * carry `?v=<version>`, replacing any existing query string.
 */
function stampHtml(html, version) {
  return html.replace(ASSET_REF_RE, (match, attr, refPath) => {
    if (isExternal(refPath)) return match;
    return `${attr}="${refPath}?v=${version}"`;
  });
}

// Matches `from "path.js"` / `from 'path.js'` in `import ... from "..."`
// and `export ... from "..."` statements — the only import form used in
// this codebase (no bare side-effect imports, no bundler-style specifiers).
const JS_IMPORT_RE = /\bfrom\s+(['"])([^'"]+\.js)(?:\?[^'"]*)?\1/g;

/**
 * Rewrite every local `from "...js"` import/export specifier in a JS source
 * string to carry `?v=<version>`, replacing any existing query string.
 */
function stampJs(js, version) {
  return js.replace(JS_IMPORT_RE, (match, quote, refPath) => {
    if (isExternal(refPath)) return match;
    return `from ${quote}${refPath}?v=${version}${quote}`;
  });
}

/**
 * List every file under a directory, recursively, whose name ends with
 * `suffix` — used for both `.html` and `.js` file discovery. `.test.js`
 * files are always skipped regardless of suffix: they run under Node via
 * `require()` and are never served to a browser.
 */
function listFiles(dir, suffix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listFiles(fullPath, suffix));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(suffix) &&
      !entry.name.endsWith(".test.js")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Stamp every file of one kind (HTML or JS) under a single directory.
 * Exits the process non-zero on any read/write failure (JS-2: never
 * half-write, fail loudly).
 *
 * @param {string} dir
 * @param {string} version
 * @param {string} suffix - ".html" or ".js"
 * @param {(source: string, version: string) => string} stampFn
 * @returns {{ scanned: number, stamped: number }}
 */
function stampDirectory(dir, version, suffix, stampFn) {
  const files = listFiles(dir, suffix);
  let stamped = 0;

  for (const filePath of files) {
    let source;
    try {
      source = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      console.error(`[version-assets] Failed to read ${filePath}:`, err.message);
      process.exit(1);
    }

    const updated = stampFn(source, version);
    if (updated !== source) {
      try {
        fs.writeFileSync(filePath, updated, "utf8");
      } catch (err) {
        console.error(`[version-assets] Failed to write ${filePath}:`, err.message);
        process.exit(1);
      }
      stamped++;
    }
  }

  return { scanned: files.length, stamped };
}

/**
 * Stamp every target directory (frontend/, admin/) under rootDir: HTML
 * script/link references, then JS import/export specifiers.
 */
function run(rootDir, version, targetDirs = TARGET_DIRS) {
  let totalScanned = 0;
  let totalStamped = 0;

  for (const dirName of targetDirs) {
    const dir = path.join(rootDir, dirName);
    if (!fs.existsSync(dir)) {
      console.log(`[version-assets] SKIP (not found): ${dirName}/`);
      continue;
    }

    const html = stampDirectory(dir, version, ".html", stampHtml);
    console.log(
      `[version-assets] ${dirName}/: ${html.scanned} HTML files scanned, ${html.stamped} stamped`,
    );

    const js = stampDirectory(dir, version, ".js", stampJs);
    console.log(
      `[version-assets] ${dirName}/: ${js.scanned} JS files scanned, ${js.stamped} stamped`,
    );

    totalScanned += html.scanned + js.scanned;
    totalStamped += html.stamped + js.stamped;
  }

  console.log(
    `[version-assets] Done: ${totalScanned} files scanned, ${totalStamped} stamped (version=${version})`,
  );
  return { scanned: totalScanned, stamped: totalStamped };
}

function main() {
  const version = resolveVersion();
  console.log(`[version-assets] Stamping with version: ${version}`);
  run(ROOT_DIR, version);
}

if (require.main === module) {
  main();
}

module.exports = {
  stampHtml,
  stampJs,
  isExternal,
  resolveVersion,
  listFiles,
  stampDirectory,
  run,
};
