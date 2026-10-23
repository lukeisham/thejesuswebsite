// Guide test for the text rules of setup/ARCHITECTURE/performance-and-caching.md.
//
// This file does not test behaviour. It reads deploy/nginx.conf, the map SVGs
// and the migrations as text, and fails when one breaks a rule that the guide
// states. The opt-in check of saved Lighthouse results for the same guide is
// api/tests/perf/guide-performance-and-caching.test.js. Only this file runs in
// `npm test`. The live site is checked after each deploy by
// api/scripts/check-live-headers.js, which reads the same nginx values through
// the helpers that this file imports from it.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/performance-and-caching.md";
const NGINX = "deploy/nginx.conf";
const { PRELOAD_PAGES } = require("../scripts/preload-modules");
const { CONTENT_PAGES } = require("../config/content-pages");
const { cacheControlOf, locationBlocks, NGINX_HTML, NGINX_ASSET_CODE, NGINX_ASSET_OTHER, NGINX_ASSET_MAPS } = require("../scripts/check-live-headers");

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// Rows 1 to 5: the Cache-Control of each static location in nginx. A year is
// safe only where the URL changes when the file changes: JS and CSS carry a
// deploy stamp, and a replaced image gets a new filename. Cloudflare holds an
// HTML page for longer by a Cache Rule in the dashboard, which no test can see
// (check-live-headers.js can). A browser copy of a page cannot be purged, so a
// longer HTML value here keeps old HTML in browsers after a deploy.
const YEAR_IMMUTABLE = "public, max-age=31536000, immutable";
const LOCATION_RULES = [
  { row: 1, header: NGINX_ASSET_CODE, expect: `exactly "${YEAR_IMMUTABLE}"`, holds: (value) => value === YEAR_IMMUTABLE, why: "Versioned JS and CSS are immutable for a year. Another value makes every visit revalidate, or keeps old code." },
  { row: 2, header: NGINX_ASSET_OTHER, expect: `exactly "${YEAR_IMMUTABLE}"`, holds: (value) => value === YEAR_IMMUTABLE, why: "Images keep stable URLs for a year. A replaced image gets a new filename." },
  { row: 3, header: NGINX_ASSET_MAPS, expect: "must-revalidate and no immutable", holds: (value) => /must-revalidate/.test(value) && !/immutable/.test(value), why: "A map SVG keeps its filename when the generator rewrites it, so a browser must revalidate." },
  { row: 4, header: NGINX_HTML, expect: 'exactly "public, max-age=60"', holds: (value) => value === "public, max-age=60", why: "A browser copy cannot be purged, so a longer value keeps old HTML after a deploy." },
  { row: 5, header: "/admin/", expect: 'exactly "no-cache"', holds: (value) => value === "no-cache", why: "Admin pages always revalidate, so an editor never sees an old admin page." },
];

describe(`${GUIDE} rows 1 to 5: each nginx location keeps its Cache-Control`, () => {
  const text = read(NGINX);

  for (const { row, header, expect, holds, why } of LOCATION_RULES) {
    test(`row ${row}: "location ${header}" sets Cache-Control once, ${expect}`, () => {
      const block = locationBlocks(text).find((candidate) => candidate.header === header);
      assert.ok(block, `${NGINX} has no "location ${header}" block, so its Cache-Control cannot be checked. Rule: ${GUIDE}, Invariants row ${row}.`);
      const values = cacheControlOf(text, header);
      assert.equal(values.length, 1, `${NGINX}:${lineOf(text, block.start)} "location ${header}" must set Cache-Control once, and it sets it ${values.length} times. Rule: ${GUIDE}, Invariants row ${row}.`);
      assert.ok(holds(values[0]), `${NGINX}:${lineOf(text, block.start)} "location ${header}" sends "${values[0]}", and it must be ${expect}. ${why} Rule: ${GUIDE}, Invariants row ${row}.`);
    });
  }

  // `^~` on the /assets/ prefix would make nginx skip the regex locations for
  // JS, CSS and maps, so they would all take the year-long image rule.
  test("rows 1 and 3: the /assets/ prefix location has no ^~ modifier", () => {
    assert.ok(
      !locationBlocks(text).some((block) => /^\^~\s*\/assets\/$/.test(block.header)),
      `${NGINX} has "location ^~ /assets/". That modifier makes nginx skip the regex locations for JS, CSS and maps, so they all take the image rule. Rule: ${GUIDE}, Invariants rows 1 and 3.`
    );
  });
});

// Row 3: the generator rewrites a map SVG at a stable URL, so the stored
// maps.image_path must carry a new ?v= after every change, or returning
// browsers keep the old artwork. A migration holds each ?v= (the latest one
// wins). MAP_STAMPS records the SVG that each ?v= was shipped with. When an SVG
// changes, this test fails until the table matches again, and the table
// matches only after a migration bumps ?v=. It cannot see an update of the hash
// alone: update the version in the same edit.
const MAP_STAMPS = {
  galilee: { sha: "8771783b6f8f55d7", v: 3 },
  jerusalem: { sha: "0fc7a910b1d7c7ef", v: 6 },
  judea: { sha: "3a2f752f110a8d30", v: 3 },
  levant: { sha: "0355bff6fcd00d5c", v: 3 },
  "roman-empire": { sha: "2b82644521a105d1", v: 3 },
};
const MAPS_DIR = "frontend/assets/images/maps";
const MIGRATIONS_DIR = "database/migrations";

/** The ?v= that the latest migration sets for each map key. */
function latestMapVersions() {
  const versions = {};
  for (const file of fs.readdirSync(path.join(REPO, MIGRATIONS_DIR)).filter((name) => name.endsWith(".sql")).sort()) {
    for (const match of read(`${MIGRATIONS_DIR}/${file}`).matchAll(/image_path\s*=\s*'\/assets\/images\/maps\/([\w-]+)\.svg\?v=(\d+)'/g)) {
      versions[match[1]] = Number(match[2]);
    }
  }
  return versions;
}

describe(`${GUIDE} row 3: a changed map SVG has a new ?v= in a migration`, () => {
  const svgFiles = fs.readdirSync(path.join(REPO, MAPS_DIR)).filter((name) => name.endsWith(".svg"));
  const latest = latestMapVersions();

  test("every map SVG has an entry in MAP_STAMPS, and every entry has a file", () => {
    const keys = svgFiles.map((name) => name.replace(/\.svg$/, "")).sort();
    assert.deepEqual(keys, Object.keys(MAP_STAMPS).sort(), `${MAPS_DIR}/ and MAP_STAMPS list different maps. Add or remove the entry, and add a migration that sets maps.image_path with a ?v=. Rule: ${GUIDE}, Invariants row 3.`);
  });

  for (const [key, { sha, v }] of Object.entries(MAP_STAMPS)) {
    test(`${key}: the SVG is the one that shipped as ?v=${v}, and the latest migration sets ?v=${v}`, () => {
      const actual = crypto.createHash("sha256").update(fs.readFileSync(path.join(REPO, MAPS_DIR, `${key}.svg`))).digest("hex").slice(0, 16);
      assert.equal(
        actual,
        sha,
        `${MAPS_DIR}/${key}.svg changed (${actual}, recorded ${sha}). Returning browsers keep the old file until its URL changes. Add a migration that sets maps.image_path to '/assets/images/maps/${key}.svg?v=${v + 1}' where map_key = '${key}', then set { sha: "${actual}", v: ${v + 1} } in MAP_STAMPS. Rule: ${GUIDE}, Invariants row 3.`
      );
      assert.equal(latest[key], v, `The latest migration under ${MIGRATIONS_DIR}/ sets ${key} to ?v=${latest[key]}, and MAP_STAMPS records ?v=${v}. Make them agree. Rule: ${GUIDE}, Invariants row 3.`);
    });
  }
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
