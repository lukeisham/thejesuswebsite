#!/usr/bin/env node
// preload-modules.js — deploy-time module preload writer.
//
// A page script learns about its imports one level at a time: the browser
// loads the script, reads its imports, loads those, and so on. The page data
// is requested only after the last import has run. This script writes a
// <link rel="modulepreload"> for every file in that import chain into the
// <head> of each HTML file under frontend/, so the browser fetches the whole
// chain at once.
//
// Run order matters. deploy.sh runs this after `npm run pages` (so generated
// pages get the block) and before `npm run version-assets`. The stamp then
// adds `?v=<commit>` to each link, the same way it stamps the imports inside
// the JS files, so every preload address equals the address that the browser
// imports. A link written after the stamp would carry no version and the
// browser would fetch each module twice (setup/ARCHITECTURE/deployment.md).
//
// The block sits between two comment markers and is replaced on every run, so
// the script is idempotent. It runs on the VPS working copy only, like the
// stamp: `git reset --hard` removes the block, and committed files never hold
// one (api/tests/guide-performance-and-caching.test.js).
//
// Run:  npm run preload-modules   or   node scripts/preload-modules.js

const fs = require("fs");
const path = require("path");
const { listFiles, isExternal, JS_IMPORT_RE } = require("./version-assets");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const JS_URL_PREFIX = "/assets/js/";

const BLOCK_START = "<!-- modulepreload -->";
const BLOCK_END = "<!-- /modulepreload -->";
const BLOCK_RE = new RegExp(`[ \\t]*${BLOCK_START}[\\s\\S]*?${BLOCK_END}\\n?`);

const MODULE_SCRIPT_RE = /<script\b[^>]*\btype="module"[^>]*>/g;
const SCRIPT_SRC_RE = /\bsrc="(\/assets\/js\/[^"?]+\.js)(?:\?[^"]*)?"/;

/**
 * Follow the static imports of one module, and return every file in the chain.
 *
 * @param {string} entryUrl - Address of the module, such as "/assets/js/main.js".
 * @param {string} frontendDir - Absolute path of the `frontend/` folder.
 * @returns {string[]} Addresses of the entry and everything it imports, with no repeats.
 * @throws {Error} When a file in the chain does not exist.
 */
function findModuleClosure(entryUrl, frontendDir) {
  const found = [];
  const queue = [{ url: entryUrl, importer: null }];

  while (queue.length > 0) {
    const { url, importer } = queue.shift();
    if (found.includes(url)) continue;

    const filePath = path.join(frontendDir, url);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${importer ?? "a page"} refers to ${url}, but ${filePath} does not exist`);
    }
    found.push(url);

    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(JS_IMPORT_RE)) {
      const specifier = match[2];
      if (isExternal(specifier)) continue;
      const imported = specifier.startsWith("/")
        ? path.posix.normalize(specifier)
        : path.posix.join(path.posix.dirname(url), specifier);
      if (imported.startsWith(JS_URL_PREFIX)) queue.push({ url: imported, importer: url });
    }
  }

  return found;
}

/**
 * Write the module preload block into the head of an HTML string, and replace
 * a block that an earlier run wrote.
 *
 * @param {string} html - The page.
 * @param {string[]} urls - Addresses to preload, in order.
 * @returns {string} The page with one block before `</head>`, or with no block when `urls` is empty.
 */
function injectPreloads(html, urls) {
  const clean = html.replace(BLOCK_RE, "");
  if (urls.length === 0) return clean;

  const links = urls.map((url) => `    <link rel="modulepreload" href="${url}" />`);
  const block = `    ${BLOCK_START}\n${links.join("\n")}\n    ${BLOCK_END}\n`;
  return clean.replace(/([ \t]*)<\/head>/, `${block}$1</head>`);
}

/**
 * Write the preload block into every HTML file under `frontend/`.
 * Exits the process non-zero when a page names a file that does not exist
 * (JS-2: a broken page must stop the deploy and say which one).
 *
 * @param {string} rootDir - Repository root.
 * @returns {{ scanned: number, written: number }} Pages scanned, and pages that changed.
 */
function run(rootDir) {
  const frontendDir = path.join(rootDir, "frontend");
  const closures = new Map();
  const pages = listFiles(frontendDir, ".html");
  let written = 0;

  for (const pagePath of pages) {
    const html = fs.readFileSync(pagePath, "utf8");
    const relative = path.relative(rootDir, pagePath);

    const urls = [];
    for (const tag of html.matchAll(MODULE_SCRIPT_RE)) {
      const entry = SCRIPT_SRC_RE.exec(tag[0])?.[1];
      if (!entry) continue;
      if (!closures.has(entry)) {
        try {
          closures.set(entry, findModuleClosure(entry, frontendDir));
        } catch (err) {
          console.error(`[preload-modules] ${relative}: ${err.message}`);
          process.exit(1);
        }
      }
      for (const url of closures.get(entry)) if (!urls.includes(url)) urls.push(url);
    }

    if (urls.length > 0 && !html.includes("</head>")) {
      console.warn(`[preload-modules] ${relative}: has module scripts but no </head>, skipped`);
      continue;
    }

    const updated = injectPreloads(html, urls);
    if (updated !== html) {
      fs.writeFileSync(pagePath, updated, "utf8");
      written++;
    }
  }

  console.log(`[preload-modules] Done: ${pages.length} pages scanned, ${written} changed`);
  return { scanned: pages.length, written };
}

if (require.main === module) {
  run(ROOT_DIR);
}

module.exports = { findModuleClosure, injectPreloads, run };
