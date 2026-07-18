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
  isExternal,
  resolveVersion,
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
    );

    assert.equal(scanned, 1);
    assert.equal(stamped, 1);
    const out = fs.readFileSync(path.join(nested, "life.html"), "utf8");
    assert.ok(out.includes("timeline.js?v=cafe123"));
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
