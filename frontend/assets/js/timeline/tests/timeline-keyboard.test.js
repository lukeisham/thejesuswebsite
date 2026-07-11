// Timeline keyboard tests — node:test + node:assert.
// Tests aria-label composition, key filter, filtered-out tabindex,
// and focus-return logic extracted from timeline-render.js / timeline-interactions.js.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Aria-label composition ──────────────────────────────────────────────────

function timelineAriaLabel(title, location) {
  const cleanTitle = title || "";
  const cleanLocation = location || "";
  if (cleanTitle && cleanLocation) return `${cleanTitle}, ${cleanLocation}`;
  if (cleanTitle) return cleanTitle;
  return "";
}

describe("timeline keyboard: aria-label", () => {
  test("title + location", () => {
    assert.equal(timelineAriaLabel("Sermon", "Galilee"), "Sermon, Galilee");
  });

  test("title only", () => {
    assert.equal(timelineAriaLabel("Sermon", ""), "Sermon");
  });

  test("both empty", () => {
    assert.equal(timelineAriaLabel("", ""), "");
  });
});

// ── Key filter ──────────────────────────────────────────────────────────────

function isActivationKey(key) {
  return key === "Enter" || key === " ";
}

function needsPreventDefault(key) {
  return key === " ";
}

describe("timeline keyboard: key filter", () => {
  test("Enter activates", () => assert.equal(isActivationKey("Enter"), true));
  test("Space activates", () => assert.equal(isActivationKey(" "), true));
  test("other keys", () => assert.equal(isActivationKey("x"), false));

  test("Space needs preventDefault", () =>
    assert.equal(needsPreventDefault(" "), true));
});

// ── Filtered-out → tabindex=-1 ─────────────────────────────────────────────

function filteredTabindex(isFiltered) {
  return isFiltered ? "-1" : "0";
}

describe("timeline keyboard: filtered tabindex", () => {
  test("visible dot → tabindex 0", () =>
    assert.equal(filteredTabindex(false), "0"));
  test("filtered-out dot → tabindex -1", () =>
    assert.equal(filteredTabindex(true), "-1"));
});

// ── Focus-return target check ──────────────────────────────────────────────

function shouldReturnFocus(target) {
  return !!(target && target.isConnected);
}

describe("timeline keyboard: focus-return", () => {
  test("null target → no return", () =>
    assert.equal(shouldReturnFocus(null), false));

  test("undefined target → no return", () =>
    assert.equal(shouldReturnFocus(undefined), false));

  test("connected target → return", () => {
    // Simulate a connected element with isConnected = true
    assert.equal(shouldReturnFocus({ isConnected: true }), true);
  });

  test("disconnected target → no return", () => {
    assert.equal(shouldReturnFocus({ isConnected: false }), false);
  });
});
