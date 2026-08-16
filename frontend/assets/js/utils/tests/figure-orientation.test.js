// figure-orientation tests — uses node:test + node:assert.
// Loads the real figure-orientation.js source into a sandboxed VM context
// with a minimal fake DOM, per TEST-8. The ESM `export` statements are
// rewritten to `globalThis.*` assignments so they run in the VM.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.resolve(__dirname, "..", "figure-orientation.js");
const sourceText = fs.readFileSync(sourcePath, "utf8");

// ── Transform ESM exports → plain function/const declarations ────────────
// Stripping `export` leaves the declarations at global scope inside the VM
// context so they resolve by name (e.g. classify() calls resolveOrientation()).
// After the VM runs, the functions are accessible as properties of the sandbox.

const transformedSource = sourceText
  .replace(/export function (\w+)/g, "function $1")
  .replace(/export const (\w+)/g, "const $1");

// ── Minimal fake DOM ──────────────────────────────────────────────────────

/**
 * Build a fake <img> element with just enough surface area for classify():
 *   - img.naturalWidth / img.naturalHeight
 *   - img.closest(selector)
 *   - img.setAttribute(name, value)
 * Classify also touches fig.classList and fig (the parent figure).
 *
 * @param {object} opts
 * @param {number} opts.naturalWidth
 * @param {number} opts.naturalHeight
 * @param {object|null} [opts.closestReturn] — what img.closest() returns
 * @param {boolean} [opts.complete=true]
 * @returns {object} fake img
 */
function makeImg(opts) {
  const attrs = {};
  const listeners = {};
  return {
    naturalWidth: opts.naturalWidth,
    naturalHeight: opts.naturalHeight,
    complete: opts.complete !== undefined ? opts.complete : true,
    closest: function (selector) {
      return opts.closestReturn || null;
    },
    setAttribute: function (name, value) {
      attrs[name] = String(value);
    },
    getAttribute: function (name) {
      return attrs[name] || null;
    },
    addEventListener: function (event, fn) {
      listeners[event] = fn;
    },
    removeEventListener: function (event, fn) {
      delete listeners[event];
    },
    _listeners: listeners,
  };
}

/**
 * Build a fake <figure> element with classList.
 */
function makeFigure(className) {
  const classSet = new Set(className ? className.split(/\s+/) : []);
  return {
    classList: {
      add: function () {
        for (let i = 0; i < arguments.length; i++) classSet.add(arguments[i]);
      },
      remove: function () {
        for (let i = 0; i < arguments.length; i++) classSet.delete(arguments[i]);
      },
      contains: function (c) {
        return classSet.has(c);
      },
    },
    _classes: classSet,
  };
}

function makeSandbox() {
  const sandbox = {
    console: { warn: function () {}, error: function () {}, log: function () {} },
    Element: function Element() {}, // for container instanceof Element check
  };
  vm.runInNewContext(transformedSource, sandbox);
  return sandbox;
}

// ── resolveOrientation (pure, no DOM needed) ──────────────────────────────

describe("resolveOrientation", () => {
  const { resolveOrientation } = makeSandbox();

  test("landscape image returns 'landscape'", () => {
    assert.equal(resolveOrientation(1200, 800), "landscape");
  });

  test("portrait image returns 'portrait'", () => {
    assert.equal(resolveOrientation(800, 1200), "portrait");
  });

  test("square image returns 'square'", () => {
    assert.equal(resolveOrientation(600, 600), "square");
  });

  test("invalid dimensions return 'portrait' (safe default)", () => {
    assert.equal(resolveOrientation(0, 100), "portrait");
    assert.equal(resolveOrientation(-1, 100), "portrait");
    assert.equal(resolveOrientation(100, NaN), "portrait");
    assert.equal(resolveOrientation(Infinity, 100), "portrait");
  });
});

// ── classify (DOM-dependent — sets orientation class + width/height) ──────

describe("classify", () => {
  const { classify } = makeSandbox();

  test("sets width and height attributes from naturalWidth/naturalHeight", () => {
    const fig = makeFigure("figure-standard");
    const img = makeImg({
      naturalWidth: 1136,
      naturalHeight: 1246,
      closestReturn: fig,
    });

    classify(img);

    assert.equal(img.getAttribute("width"), "1136");
    assert.equal(img.getAttribute("height"), "1246");
  });

  test("adds figure--portrait class for portrait images", () => {
    const fig = makeFigure("figure-standard");
    const img = makeImg({
      naturalWidth: 800,
      naturalHeight: 1200,
      closestReturn: fig,
    });

    classify(img);

    assert.equal(fig._classes.has("figure--portrait"), true);
    assert.equal(fig._classes.has("figure--landscape"), false);
  });

  test("adds figure--landscape class for landscape images", () => {
    const fig = makeFigure("figure-standard");
    const img = makeImg({
      naturalWidth: 1200,
      naturalHeight: 800,
      closestReturn: fig,
    });

    classify(img);

    assert.equal(fig._classes.has("figure--landscape"), true);
    assert.equal(fig._classes.has("figure--portrait"), false);
  });

  test("does nothing when image is not inside a figure.figure-standard", () => {
    const img = makeImg({
      naturalWidth: 800,
      naturalHeight: 600,
      closestReturn: null,
    });

    // Should not throw
    classify(img);

    // width/height should not have been set
    assert.equal(img.getAttribute("width"), null);
  });

  test("does not set width/height when naturalWidth is zero", () => {
    const fig = makeFigure("figure-standard");
    const img = makeImg({
      naturalWidth: 0,
      naturalHeight: 480,
      closestReturn: fig,
    });

    classify(img);

    assert.equal(img.getAttribute("width"), null);
    assert.equal(img.getAttribute("height"), null);
  });

  test("removes previous orientation classes before adding the new one", () => {
    const fig = makeFigure("figure-standard figure--landscape");
    const img = makeImg({
      naturalWidth: 600,
      naturalHeight: 900,
      closestReturn: fig,
    });

    classify(img);

    assert.equal(fig._classes.has("figure--portrait"), true);
    assert.equal(fig._classes.has("figure--landscape"), false);
    assert.equal(fig._classes.has("figure--square"), false);
  });
});
