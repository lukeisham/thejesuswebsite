// Smoke tests for utils/safe-url.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). The module guards
// every database URL that reaches an href, so the blocked schemes are the
// behaviour under test (TEST-7).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../safe-url.js";

describe("safeHref", () => {
  test("module imports and exports safeHref", async () => {
    const mod = await import(MODULE);
    assert.equal(typeof mod.safeHref, "function");
  });

  test("http, https and relative URLs pass unchanged", async () => {
    const { safeHref } = await import(MODULE);
    assert.equal(safeHref("https://example.org/a?b=1"), "https://example.org/a?b=1");
    assert.equal(safeHref("http://example.org"), "http://example.org");
    assert.equal(safeHref("/contextual-essays/a-b"), "/contextual-essays/a-b");
  });

  test("javascript:, data: and vbscript: URLs are blocked, also when disguised", async () => {
    const { safeHref } = await import(MODULE);
    assert.equal(safeHref("javascript:alert(1)"), "");
    assert.equal(safeHref("  JaVaScRiPt:alert(1)"), "");
    assert.equal(safeHref("java\nscript:alert(1)"), "");
    assert.equal(safeHref("data:text/html,<script>alert(1)</script>"), "");
    assert.equal(safeHref("vbscript:msgbox(1)"), "");
  });

  test("a non-string, an empty string and an unparsable URL give an empty string", async () => {
    const { safeHref } = await import(MODULE);
    assert.equal(safeHref(null), "");
    assert.equal(safeHref(undefined), "");
    assert.equal(safeHref(42), "");
    assert.equal(safeHref("   "), "");
    assert.equal(safeHref("http://"), "");
  });
});
