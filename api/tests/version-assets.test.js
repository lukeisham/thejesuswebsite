// version-assets tests — verifies the deploy-time asset cache-busting
// stamper: plain references get `?v=<version>`, existing `?v=...` busters
// are replaced (not doubled), external/inline references are untouched,
// both frontend/ and admin/ are covered, and ASSET_VERSION overrides the
// git-derived default.
//
// Run:  node --test api/tests/version-assets.test.js

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  stampHtml,
  stampJs,
  isExternal,
  resolveVersion,
  listFiles,
  stampDirectory,
  run,
} = require("../scripts/version-assets");

// ── stampHtml (pure string transform) ────────────────────────────────────────

describe("stampHtml", () => {
  test("stamps a plain local script reference", () => {
    const html = '<script defer src="/assets/js/app.js"></script>';
    const out = stampHtml(html, "abc123");
    assert.equal(
      out,
      '<script defer src="/assets/js/app.js?v=abc123"></script>',
    );
  });

  test("stamps a plain local stylesheet reference", () => {
    const html = '<link rel="stylesheet" href="/assets/css/base.css">';
    const out = stampHtml(html, "abc123");
    assert.equal(
      out,
      '<link rel="stylesheet" href="/assets/css/base.css?v=abc123">',
    );
  });

  test("replaces an existing ?v=old buster instead of doubling it", () => {
    const html =
      '<link rel="stylesheet" href="/assets/css/pages/arbor/arbor-nodes.css?v=2" />';
    const out = stampHtml(html, "def456");
    assert.equal(
      out,
      '<link rel="stylesheet" href="/assets/css/pages/arbor/arbor-nodes.css?v=def456" />',
    );
    assert.ok(!out.includes("?v=2"));
  });

  test("idempotent: stamping twice with the same version is a no-op change", () => {
    const html = '<script src="/assets/js/app.js"></script>';
    const once = stampHtml(html, "abc123");
    const twice = stampHtml(once, "abc123");
    assert.equal(once, twice);
  });

  test("replaces hand-added admin arbor busters (commit precedent: ?v=2)", () => {
    const html =
      '<script defer src="../assets/js/admin-arbor/arbor-geometry.js?v=2"></script>';
    const out = stampHtml(html, "9f1a2b3");
    assert.equal(
      out,
      '<script defer src="../assets/js/admin-arbor/arbor-geometry.js?v=9f1a2b3"></script>',
    );
  });

  test("leaves external https:// references untouched", () => {
    const html =
      '<script src="https://example.com/lib.js"></script>';
    const out = stampHtml(html, "abc123");
    assert.equal(out, html);
  });

  test("leaves protocol-relative // references untouched", () => {
    const html = '<link rel="stylesheet" href="//cdn.example.com/style.css">';
    const out = stampHtml(html, "abc123");
    assert.equal(out, html);
  });

  test("leaves inline scripts untouched", () => {
    const html =
      '<script type="module">import { init } from "/assets/js/app.js";</script>';
    const out = stampHtml(html, "abc123");
    // No src= attribute to match — the import specifier is not touched.
    assert.equal(out, html);
  });

  test("leaves non-JS/CSS src references untouched", () => {
    const html = '<img src="/assets/images/hero.png" alt="">';
    const out = stampHtml(html, "abc123");
    assert.equal(out, html);
  });
});

// ── stampJs (pure string transform) ──────────────────────────────────────────

describe("stampJs", () => {
  test("stamps a relative import specifier", () => {
    const js = 'import { html } from "./utils/templates.js";';
    const out = stampJs(js, "abc123");
    assert.equal(out, 'import { html } from "./utils/templates.js?v=abc123";');
  });

  test("stamps a site-root-absolute import specifier", () => {
    const js = 'import { showToast } from "/assets/js/utils/toasts.js";';
    const out = stampJs(js, "abc123");
    assert.equal(
      out,
      'import { showToast } from "/assets/js/utils/toasts.js?v=abc123";',
    );
  });

  test("stamps a re-export specifier", () => {
    const js = 'export { getIdentifierLabel } from "./content-markers.js";';
    const out = stampJs(js, "abc123");
    assert.equal(
      out,
      'export { getIdentifierLabel } from "./content-markers.js?v=abc123";',
    );
  });

  test("supports single-quoted specifiers", () => {
    const js = "import { delegate } from './utils/dom.js';";
    const out = stampJs(js, "abc123");
    assert.equal(out, "import { delegate } from './utils/dom.js?v=abc123';");
  });

  test("replaces an existing ?v=old buster instead of doubling it", () => {
    const js = 'import { html } from "./utils/templates.js?v=2";';
    const out = stampJs(js, "def456");
    assert.equal(out, 'import { html } from "./utils/templates.js?v=def456";');
    assert.ok(!out.includes("?v=2"));
  });

  test("idempotent: stamping twice with the same version is a no-op change", () => {
    const js = 'import { html } from "./utils/templates.js";';
    const once = stampJs(js, "abc123");
    const twice = stampJs(once, "abc123");
    assert.equal(once, twice);
  });

  test("leaves external https:// import specifiers untouched", () => {
    const js = 'import lib from "https://example.com/lib.js";';
    const out = stampJs(js, "abc123");
    assert.equal(out, js);
  });

  test("stamps every import in a multi-import file", () => {
    const js = [
      'import { html } from "./utils/templates.js";',
      'import { showToast } from "./utils/toasts.js";',
    ].join("\n");
    const out = stampJs(js, "abc123");
    assert.ok(out.includes("templates.js?v=abc123"));
    assert.ok(out.includes("toasts.js?v=abc123"));
  });

  test("does not touch a JSDoc @type import() annotation (no from-clause, no .js)", () => {
    const js = '/** @type {import("nspell")|null} */';
    const out = stampJs(js, "abc123");
    assert.equal(out, js);
  });
});

// ── isExternal ────────────────────────────────────────────────────────────────

describe("isExternal", () => {
  test("flags http/https/protocol-relative/data URLs as external", () => {
    assert.ok(isExternal("http://example.com/a.js"));
    assert.ok(isExternal("https://example.com/a.js"));
    assert.ok(isExternal("//cdn.example.com/a.js"));
    assert.ok(isExternal("data:text/css;base64,abc"));
  });

  test("does not flag local absolute/relative paths as external", () => {
    assert.ok(!isExternal("/assets/js/app.js"));
    assert.ok(!isExternal("../assets/js/app.js"));
    assert.ok(!isExternal("assets/js/app.js"));
  });
});

// ── stampDirectory / run (filesystem) ───────────────────────────────────────

describe("stampDirectory", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "version-assets-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("stamps files in frontend/ and admin/ independently via run()", () => {
    const frontendDir = path.join(tmpDir, "frontend", "evidence");
    const adminDir = path.join(tmpDir, "admin", "diagrams");
    fs.mkdirSync(frontendDir, { recursive: true });
    fs.mkdirSync(adminDir, { recursive: true });

    fs.writeFileSync(
      path.join(frontendDir, "arbor.html"),
      '<link rel="stylesheet" href="/assets/css/pages/arbor/arbor-nodes.css?v=2" />',
    );
    fs.writeFileSync(
      path.join(adminDir, "arbor.html"),
      '<script defer src="../assets/js/admin-arbor/arbor-geometry.js?v=2"></script>',
    );

    const result = run(tmpDir, "cafe123");

    const frontendOut = fs.readFileSync(
      path.join(frontendDir, "arbor.html"),
      "utf8",
    );
    const adminOut = fs.readFileSync(path.join(adminDir, "arbor.html"), "utf8");

    assert.ok(frontendOut.includes("arbor-nodes.css?v=cafe123"));
    assert.ok(adminOut.includes("arbor-geometry.js?v=cafe123"));
    assert.equal(result.scanned, 2);
    assert.equal(result.stamped, 2);
  });

  test("recurses into nested directories", () => {
    const nested = path.join(tmpDir, "frontend", "evidence", "timeline");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(nested, "life.html"),
      '<script src="/assets/js/timeline.js"></script>',
    );

    const { scanned, stamped } = stampDirectory(
      path.join(tmpDir, "frontend"),
      "cafe123",
      ".html",
      stampHtml,
    );

    assert.equal(scanned, 1);
    assert.equal(stamped, 1);
    const out = fs.readFileSync(path.join(nested, "life.html"), "utf8");
    assert.ok(out.includes("timeline.js?v=cafe123"));
  });

  test("run() also stamps JS import specifiers, recursively, skipping *.test.js", () => {
    const utilsDir = path.join(tmpDir, "frontend", "assets", "js", "utils");
    fs.mkdirSync(utilsDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "frontend", "assets", "js", "evidence-detail.js"),
      'import { getIdentifierLabel } from "./utils/content-markers.js";',
    );
    fs.writeFileSync(
      path.join(utilsDir, "content-markers.test.js"),
      'import { getIdentifierLabel } from "./content-markers.js";',
    );

    const result = run(tmpDir, "cafe123");

    const entryOut = fs.readFileSync(
      path.join(tmpDir, "frontend", "assets", "js", "evidence-detail.js"),
      "utf8",
    );
    const testOut = fs.readFileSync(
      path.join(utilsDir, "content-markers.test.js"),
      "utf8",
    );

    assert.ok(entryOut.includes("content-markers.js?v=cafe123"));
    // .test.js files are never touched — they run under Node via require(),
    // not served to a browser, and query strings would break resolution.
    assert.equal(testOut, 'import { getIdentifierLabel } from "./content-markers.js";');
    assert.equal(result.stamped, 1);
  });

  test("run() skips a target directory that does not exist", () => {
    const frontendDir = path.join(tmpDir, "frontend");
    fs.mkdirSync(frontendDir, { recursive: true });
    fs.writeFileSync(
      path.join(frontendDir, "index.html"),
      '<script src="/assets/js/app.js"></script>',
    );

    // No admin/ directory created — run() must not throw.
    const result = run(tmpDir, "cafe123");
    assert.equal(result.scanned, 1);
    assert.equal(result.stamped, 1);
  });
});

// ── resolveVersion ───────────────────────────────────────────────────────────

describe("resolveVersion", () => {
  test("propagates a supplied ASSET_VERSION without touching git", () => {
    const original = process.env.ASSET_VERSION;
    process.env.ASSET_VERSION = "override-123";
    try {
      assert.equal(resolveVersion(), "override-123");
    } finally {
      if (original === undefined) delete process.env.ASSET_VERSION;
      else process.env.ASSET_VERSION = original;
    }
  });

  test("falls back to the git short commit hash when unset", () => {
    const original = process.env.ASSET_VERSION;
    delete process.env.ASSET_VERSION;
    try {
      const version = resolveVersion(path.resolve(__dirname, ".."));
      assert.match(version, /^[0-9a-f]{7,}$/);
    } finally {
      if (original !== undefined) process.env.ASSET_VERSION = original;
    }
  });
});

console.log("\nDone.");
