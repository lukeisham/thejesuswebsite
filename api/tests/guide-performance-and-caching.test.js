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
