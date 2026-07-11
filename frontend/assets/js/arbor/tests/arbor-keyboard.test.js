// Arbor keyboard tests — node:test + node:assert.
// Tests the aria-label composition and key-filter logic extracted from
// arbor-render.js / arbor-interactions.js.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Aria-label composition (mirrors modal arbor-render.js node creation) ────

function arborAriaLabel(title, verse) {
  const cleanTitle = title || "";
  const cleanVerse = verse || "";
  if (cleanTitle && cleanVerse) return `${cleanTitle}, ${cleanVerse}`;
  if (cleanTitle) return cleanTitle;
  return "";
}

describe("arbor keyboard: aria-label composition", () => {
  test("title + verse", () => {
    assert.equal(arborAriaLabel("Baptism", "Matthew 3:13"), "Baptism, Matthew 3:13");
  });

  test("title only", () => {
    assert.equal(arborAriaLabel("Baptism", ""), "Baptism");
  });

  test("verse only (edge case)", () => {
    assert.equal(arborAriaLabel("", "Matthew 3:13"), "");
  });

  test("both empty", () => {
    assert.equal(arborAriaLabel("", ""), "");
  });

  test("null values", () => {
    assert.equal(arborAriaLabel(null, null), "");
  });
});

// ── Key-down filter ─────────────────────────────────────────────────────────

function isActivationKey(key) {
  return key === "Enter" || key === " ";
}

function needsPreventDefault(key) {
  return key === " "; // Space scrolls the page by default
}

describe("arbor keyboard: key filter", () => {
  test("Enter activates", () => assert.equal(isActivationKey("Enter"), true));
  test("Space activates", () => assert.equal(isActivationKey(" "), true));
  test("ArrowRight does not", () => assert.equal(isActivationKey("ArrowRight"), false));
  test("Tab does not", () => assert.equal(isActivationKey("Tab"), false));

  test("Space needs preventDefault", () => assert.equal(needsPreventDefault(" "), true));
  test("Enter does not need preventDefault", () => assert.equal(needsPreventDefault("Enter"), false));
});
