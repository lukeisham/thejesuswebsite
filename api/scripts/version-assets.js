#!/usr/bin/env node
// version-assets.js — deploy-time asset cache-busting stamp.
//
// Walks every .html file under frontend/ and admin/, and rewrites local
// <script src="...js"> and <link href="...css"> references to carry
// `?v=<version>` — a stable per-deploy query string that busts both the
// browser cache and Cloudflare's edge cache (whose default cache key
// includes the query string) the instant a new commit lands.
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

/**
 * List every .html file under a directory, recursively.
 */
function listHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(listHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Stamp every .html file under a single directory. Exits the process
 * non-zero on any read/write failure (JS-2: never half-write, fail loudly).
 *
 * @returns {{ scanned: number, stamped: number }}
 */
function stampDirectory(dir, version) {
  const files = listHtmlFiles(dir);
  let stamped = 0;

  for (const filePath of files) {
    let html;
    try {
      html = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      console.error(`[version-assets] Failed to read ${filePath}:`, err.message);
      process.exit(1);
    }

    const updated = stampHtml(html, version);
    if (updated !== html) {
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
 * Stamp every target directory (frontend/, admin/) under rootDir.
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

    const { scanned, stamped } = stampDirectory(dir, version);
    console.log(
      `[version-assets] ${dirName}/: ${scanned} HTML files scanned, ${stamped} stamped`,
    );
    totalScanned += scanned;
    totalStamped += stamped;
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
  isExternal,
  resolveVersion,
  listHtmlFiles,
  stampDirectory,
  run,
};
