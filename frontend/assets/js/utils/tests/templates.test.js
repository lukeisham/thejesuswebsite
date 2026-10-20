// Smoke tests for utils/templates.js — node:test + node:assert.
// Loads the real ES module with dynamic import() (TEST-9). renderCard puts
// a caller-supplied URL in an href, so the blocked-scheme path is tested (TEST-7).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

const MODULE = "../templates.js";

describe("renderCard", () => {
  test("module imports and exports renderCard", async () => {
    const mod = await import(MODULE);
    assert.equal(typeof mod.renderCard, "function");
  });

  test("a relative url makes the card a link", async () => {
    const { renderCard } = await import(MODULE);
    const out = String(renderCard({ title: "A", url: "/contextual-essays/a" }));
    assert.ok(out.startsWith('<a href="/contextual-essays/a" class="card">'), out);
  });

  test("a javascript: url gives a card without a link", async () => {
    const { renderCard } = await import(MODULE);
    const out = String(renderCard({ title: "A", url: "javascript:alert(1)" }));
    assert.ok(out.startsWith('<div class="card">'), out);
    assert.ok(!out.includes("href="), out);
  });
});
