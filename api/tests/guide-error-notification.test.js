// Guide test for setup/ARCHITECTURE/error-notification.md.
//
// This file does not test behaviour. It reads source files as text and fails
// when code breaks a rule that the guide states. Each failure message names
// the rule, the file, and the guide. Each exception has a one-line reason.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ERRORS = require("../lib/error-codes");

const REPO = path.resolve(__dirname, "..", "..");
const GUIDE = "setup/ARCHITECTURE/error-notification.md";
const ROUTES_DIR = path.join(REPO, "api", "routes");
const PAGES_DIR = path.join(REPO, "frontend", "assets", "js");

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

// ── Row 1: routes send errors through sendError() ─────────────────────────────

// A raw error body: `.json({ error: ...` or `.json({ status, error: ...`.
// The match can cross lines, because some calls put `.json(` on a new line.
const RAW_ERROR_BODY = /\.json\(\s*\{[^}]*?\berror\s*:/g;

// Routes that may send a raw `{ error: "text" }` body, with the reason.
const RAW_ERROR_EXCEPTIONS = {
  "deploy-webhook.js": "Deploy route, not a content or admin route (guide row 3).",
  "deploy-status.js": "Deploy route, not a content or admin route (guide row 3).",
  "dev-bypass.js": "Dev-login route, not a content or admin route (guide row 3).",
};

describe(`${GUIDE} row 1: routes use sendError()`, () => {
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".js"));

  test("finds route files to scan", () => {
    assert.ok(routeFiles.length > 0, `No route files found in ${ROUTES_DIR}.`);
  });

  test("every exception names a route file that exists", () => {
    for (const file of Object.keys(RAW_ERROR_EXCEPTIONS)) {
      assert.ok(
        routeFiles.includes(file),
        `RAW_ERROR_EXCEPTIONS lists api/routes/${file}, but it does not exist. Remove the stale exception.`
      );
    }
  });

  for (const file of routeFiles) {
    if (RAW_ERROR_EXCEPTIONS[file]) continue;

    test(`api/routes/${file} sends no raw error body`, () => {
      const text = read(`api/routes/${file}`);
      const hits = [...text.matchAll(RAW_ERROR_BODY)].map(
        (m) => `api/routes/${file}:${lineOf(text, m.index)}`
      );
      assert.deepEqual(
        hits,
        [],
        `Raw error body found at ${hits.join(", ")}. ` +
          `Use sendError(res, ERRORS.X) or sendValidationError() instead. ` +
          `Rule: ${GUIDE}, Invariants row 1.`
      );
    });
  }
});

// ── Row 2: detail pages compare against E-PERSIST-004 ─────────────────────────

const NOT_FOUND_CODE = "E-PERSIST-004";
const NOT_FOUND_COMPARE = `error.code === "${NOT_FOUND_CODE}"`;

// The detail-page scripts that the guide names, and the routes that serve
// each one.
const DETAIL_PAGES = {
  "evidence-detail.js": ["evidence.js"],
  "essay-detail.js": ["essays.js"],
  "blog-detail.js": ["blog-posts.js"],
  "response-detail.js": ["responses.js"],
  "historiography-detail.js": ["historiography.js"],
  "challenge-detail.js": ["academic-challenges.js", "popular-challenges.js"],
  "news-detail.js": ["news-articles.js"],
};

// Detail pages that do not compare the not-found code, with the reason.
const DETAIL_PAGE_EXCEPTIONS = {};

describe(`${GUIDE} row 2: not-found code ${NOT_FOUND_CODE}`, () => {
  test(`error-codes.js defines SQL_RECORD_NOT_FOUND as ${NOT_FOUND_CODE}`, () => {
    assert.equal(
      ERRORS.SQL_RECORD_NOT_FOUND?.code,
      NOT_FOUND_CODE,
      `api/lib/error-codes.js changed SQL_RECORD_NOT_FOUND. ` +
        `Update every detail-page script that compares "${NOT_FOUND_CODE}". ` +
        `Rule: ${GUIDE}, Invariants row 2 and "Extending it" step 4.`
    );
  });

  for (const [page, routes] of Object.entries(DETAIL_PAGES)) {
    test(`frontend/assets/js/${page} compares ${NOT_FOUND_CODE}`, () => {
      const text = read(`frontend/assets/js/${page}`);
      assert.ok(
        text.includes(NOT_FOUND_COMPARE),
        `frontend/assets/js/${page} no longer contains ${NOT_FOUND_COMPARE}. ` +
          `A missing slug will show a load-failure toast instead of "not found". ` +
          `Rule: ${GUIDE}, Invariants row 2.`
      );
    });

    for (const route of routes) {
      test(`api/routes/${route} returns SQL_RECORD_NOT_FOUND for ${page}`, () => {
        const text = read(`api/routes/${route}`);
        assert.ok(
          text.includes("ERRORS.SQL_RECORD_NOT_FOUND"),
          `api/routes/${route} does not send ERRORS.SQL_RECORD_NOT_FOUND, ` +
            `but frontend/assets/js/${page} expects ${NOT_FOUND_CODE} for a missing slug. ` +
            `Rule: ${GUIDE}, Invariants row 2.`
        );
      });
    }
  }

  test("every detail page is in the guide's list or has an exception", () => {
    const pages = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith("-detail.js"));
    const unlisted = pages.filter(
      (f) => !DETAIL_PAGES[f] && !DETAIL_PAGE_EXCEPTIONS[f]
    );
    assert.deepEqual(
      unlisted,
      [],
      `New detail page(s) ${unlisted.join(", ")} found. Make each compare ${NOT_FOUND_COMPARE}, ` +
        `then add it to DETAIL_PAGES here and to the list in ${GUIDE}.`
    );
  });
});
