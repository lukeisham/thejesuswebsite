// Guide test for the text rules of setup/ARCHITECTURE/performance-and-caching.md.
//
// This file does not test behaviour. It reads deploy/nginx.conf as text and
// fails when it breaks a rule that the guide states. The opt-in check of saved
// Lighthouse results for the same guide is api/tests/perf/guide-performance-and-caching.test.js.
// Only this file runs in `npm test`.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/performance-and-caching.md";
const NGINX = "deploy/nginx.conf";
const { PRELOAD_PAGES } = require("../scripts/preload-modules");
const { CONTENT_PAGES } = require("../config/content-pages");

// Row 4: the only HTML value that the guide allows. Cloudflare holds a page
// for longer by a Cache Rule in the dashboard, which no test can see. A
// browser copy cannot be purged, so a longer value here keeps old HTML in
// browsers after a deploy.
const HTML_CACHE_CONTROL = "public, max-age=60";

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Comment lines explain the rule and name the very values that the test looks
// for. A comment line is blanked so that it never matches, and the line
// numbers stay the same.
function withoutHashComments(text) {
  return text
    .split("\n")
    .map((line) => (/^\s*#/.test(line) ? "" : line))
    .join("\n");
}

/** The text of `location / { ... }` in the server block, and its start index. */
function rootLocation(text) {
  const start = text.search(/^\s*location \/ \{/m);
  if (start === -1) return null;
  const end = text.indexOf("\n    }", start);
  return { body: text.slice(start, end), start };
}

describe(`${GUIDE} row 4: the HTML Cache-Control stays ${HTML_CACHE_CONTROL}`, () => {
  const text = withoutHashComments(read(NGINX));
  const location = rootLocation(text);

  test(`${NGINX} has a "location /" block`, () => {
    assert.ok(location, `${NGINX} has no "location /" block, so the HTML Cache-Control cannot be checked. Rule: ${GUIDE}, Invariants row 4.`);
  });

  test(`the "location /" Cache-Control is exactly "${HTML_CACHE_CONTROL}"`, () => {
    const headers = [...location.body.matchAll(/add_header\s+Cache-Control\s+"([^"]*)"/g)];
    assert.equal(
      headers.length,
      1,
      `${NGINX}:${lineOf(text, location.start)} "location /" must set Cache-Control once, and it sets it ${headers.length} times. Rule: ${GUIDE}, Invariants row 4.`
    );
    assert.equal(
      headers[0][1],
      HTML_CACHE_CONTROL,
      `${NGINX}:${lineOf(text, location.start)} "location /" sends "${headers[0][1]}". A browser copy cannot be purged, so it must stay "${HTML_CACHE_CONTROL}", or browsers keep old HTML after a deploy. Rule: ${GUIDE}, Invariants row 4.`
    );
  });
});

// Row 9: module preload links are written at deploy by api/scripts/preload-modules.js.
// A block that was committed carries the stamps of an old deploy, so the links
// would name files that the page no longer imports.
const PRELOAD_MARKER = "<!-- modulepreload -->";

/** Every .html file below `relDir`, as repo-relative paths. */
function htmlFilesUnder(relDir) {
  const found = [];
  for (const entry of fs.readdirSync(path.join(REPO, relDir), { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") found.push(...htmlFilesUnder(rel));
    } else if (entry.name.endsWith(".html")) {
      found.push(rel);
    }
  }
  return found;
}

describe(`${GUIDE} row 9: no committed file holds the module preload block`, () => {
  test(`no .html file under frontend/ contains ${PRELOAD_MARKER}`, () => {
    for (const file of htmlFilesUnder("frontend")) {
      const text = read(file);
      const at = text.indexOf(PRELOAD_MARKER);
      assert.equal(
        at,
        -1,
        `${file}:${at === -1 ? 0 : lineOf(text, at)} holds a committed ${PRELOAD_MARKER} block. deploy.sh writes it with api/scripts/preload-modules.js, and a committed block carries old version stamps. Remove it. Rule: ${GUIDE}, Invariants row 9.`
      );
    }
  });
});

// Row 9: which pages get the module preload. A page type earns an entry in
// PRELOAD_PAGES when its median LCP is at least 150 ms lower with the preload.
// These pages were measured and do not, so no entry may name them. A content
// template that is in this list is exempt from the "every template is named"
// check. Measured as median LCP with against without the preload.
const NOT_PRELOADED = {
  "frontend/index.html": "Home: 2406 against 2405 ms.",
  "frontend/news-and-blog/news/index.html": "List page: 2709 against 2557 ms, so it is slower with the preload.",
  "frontend/evidence/[slug].html": "Evidence detail: 3232 against 3239 ms. Its LCP waits for a picture. Measure again after the picture work.",
  "frontend/evidence/timeline/index.html": "Timeline: 3757 against 3766 ms, and first paint 600 ms later.",
  "frontend/evidence/arbor.html": "Arbor: 2258 against 2409 ms. The gain is at the noise floor and first paint is 375 ms later.",
  "frontend/evidence/maps/galilee.html": "Maps: 2708 against 2708 ms, and first paint 150 ms later.",
  "frontend/debate/index.html": "Debate: 1806 against 1957 ms. The gain is at the noise floor and the page already passes.",
  "frontend/resources/index.html": "Resources: 2032 against 2032 ms.",
};

/** Every .html file below frontend/ as a repo-relative path with forward slashes. */
function frontendPages() {
  return htmlFilesUnder("frontend");
}

const named = (page) => PRELOAD_PAGES.some((rule) => rule.test.test(page));

describe(`${GUIDE} row 9: the pages that get the module preload`, () => {
  test("every content template is named by PRELOAD_PAGES, or is in NOT_PRELOADED", () => {
    for (const { templatePath } of Object.values(CONTENT_PAGES)) {
      const page = path.relative(REPO, templatePath).split(path.sep).join("/");
      if (page in NOT_PRELOADED) continue;
      assert.ok(
        named(page),
        `${page} is a content template that no PRELOAD_PAGES entry names, so its script chain loads one level at a time. Add an entry in api/scripts/preload-modules.js after you measure it, or name it in NOT_PRELOADED with the measured reason. Rule: ${GUIDE}, Invariants row 9.`
      );
    }
  });

  test("every PRELOAD_PAGES entry names at least one page under frontend/", () => {
    const pages = frontendPages();
    for (const rule of PRELOAD_PAGES) {
      assert.ok(
        pages.some((page) => rule.test.test(page)),
        `A PRELOAD_PAGES entry (${rule.reason}) matches no page under frontend/, so it is stale. Remove it from api/scripts/preload-modules.js. Rule: ${GUIDE}, Invariants row 9.`
      );
    }
  });

  test("no page that was measured and gained nothing is named by PRELOAD_PAGES", () => {
    for (const [page, reason] of Object.entries(NOT_PRELOADED)) {
      assert.ok(fs.existsSync(path.join(REPO, page)), `NOT_PRELOADED names ${page} (${reason}), but the file is missing. Remove the exception.`);
      assert.ok(
        !named(page),
        `${page} is named by PRELOAD_PAGES, but it was measured and does not gain from the preload (${reason}). The links delay its first paint. Rule: ${GUIDE}, Invariants row 9.`
      );
    }
  });
});
