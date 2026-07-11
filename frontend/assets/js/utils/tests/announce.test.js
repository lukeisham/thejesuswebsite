// Announce utility tests — node:test + node:assert.
// Tests the message-composition helpers for keyboard-accessible visuals.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// ── Aria-label composition (arbor nodes) ────────────────────────────────────

/**
 * Compose an aria-label for an arbor node.
 * Mirrors the logic in arbor-render.js.
 */
function arborAriaLabel(title, verse) {
  if (title && verse) return `${title}, ${verse}`;
  if (title) return title;
  return "";
}

describe("announce: arbor node aria-label", () => {
  test("title + verse", () => {
    assert.equal(
      arborAriaLabel("Baptism of Jesus", "Matthew 3:13"),
      "Baptism of Jesus, Matthew 3:13",
    );
  });

  test("title only", () => {
    assert.equal(arborAriaLabel("Baptism of Jesus", ""), "Baptism of Jesus");
  });

  test("empty", () => {
    assert.equal(arborAriaLabel("", ""), "");
  });

  test("null/undefined", () => {
    assert.equal(arborAriaLabel(null, undefined), "");
  });
});

// ── Aria-label composition (timeline dots) ─────────────────────────────────

/**
 * Compose an aria-label for a timeline dot.
 * Mirrors the logic in timeline-render.js.
 */
function timelineAriaLabel(title, location) {
  if (title && location) return `${title}, ${location}`;
  if (title) return title;
  return "";
}

describe("announce: timeline dot aria-label", () => {
  test("title + location", () => {
    assert.equal(
      timelineAriaLabel("Feeding the 5000", "Galilee"),
      "Feeding the 5000, Galilee",
    );
  });

  test("title only, no location", () => {
    assert.equal(
      timelineAriaLabel("Sermon on the Mount", ""),
      "Sermon on the Mount",
    );
  });

  test("empty", () => {
    assert.equal(timelineAriaLabel("", ""), "");
  });
});

// ── Key filter (Enter/Space activation) ────────────────────────────────────

/**
 * Check whether a keyboard event should activate the element.
 * Enter and Space are the activation keys; Space needs preventDefault
 * to avoid page scroll.
 */
function isActivationKey(key) {
  return key === "Enter" || key === " ";
}

describe("announce: key filter", () => {
  test("Enter activates", () => {
    assert.equal(isActivationKey("Enter"), true);
  });

  test("Space activates", () => {
    assert.equal(isActivationKey(" "), true);
  });

  test("other keys do not", () => {
    assert.equal(isActivationKey("a"), false);
    assert.equal(isActivationKey("ArrowRight"), false);
    assert.equal(isActivationKey("Tab"), false);
  });
});

// ── Tabindex decision for filtered dots ────────────────────────────────────

/**
 * Determine tabindex for a timeline dot based on filter state.
 */
function filteredTabindex(isFiltered) {
  return isFiltered ? "-1" : "0";
}

describe("announce: filtered dot tabindex", () => {
  test("visible dot gets tabindex 0", () => {
    assert.equal(filteredTabindex(false), "0");
  });

  test("filtered-out dot gets tabindex -1", () => {
    assert.equal(filteredTabindex(true), "-1");
  });
});

// ── Focus-return target ────────────────────────────────────────────────────

/**
 * Check whether a focus-return target is still connected to the DOM.
 */
function isStillConnected(el) {
  return !!(el && el.isConnected);
}

describe("announce: focus-return connected check", () => {
  test("returns false for null", () => {
    assert.equal(isStillConnected(null), false);
  });

  test("returns false for undefined", () => {
    assert.equal(isStillConnected(undefined), false);
  });
});
