// Timeline zoom tests — node:test + node:assert.
// Imports the real timeline-zoom.js and mounts it on a hand-built fake viewport
// (admin/tests/admin-editor-utils.test.js pattern). The module keeps its zoom in
// module state, so each test sets its own start scale with startAt().

const { test, describe, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-zoom.js");

// ── Fake DOM ────────────────────────────────────────────────────────────────

function fakeElement() {
  return {
    style: {
      props: {},
      transform: "",
      setProperty(name, value) { this.props[name] = value; },
    },
    classList: { add() {}, remove() {} },
    children: [],
    className: "",
    innerHTML: "",
    appendChild(child) { this.children.push(child); },
    setAttribute() {},
    addEventListener() {},
    dispatchEvent() {},
  };
}

/** A viewport whose world and controls can be replaced, as a render does. */
function fakeViewport() {
  const viewport = fakeElement();
  viewport.world = fakeElement();
  viewport.controls = null;
  viewport.querySelector = function (selector) {
    if (selector === ".timeline-world") return this.world;
    if (selector === ".timeline-controls") return this.controls;
    return null;
  };
  viewport.appendChild = function (child) {
    if (child.className === "timeline-controls") this.controls = child;
  };
  return viewport;
}

// ── Setup ───────────────────────────────────────────────────────────────────

const windowListeners = [];
const transformsSeen = [];
let zoom;
let viewport;

before(async () => {
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    addEventListener: (type) => windowListeners.push(type),
    removeEventListener() {},
  };
  globalThis.document = { createElement: fakeElement };

  zoom = await import(pathToFileURL(MODULE).href);
  viewport = fakeViewport();
  zoom.mountZoomControls(viewport);
  zoom.onTransformChange((state) => transformsSeen.push(state));
});

beforeEach(() => {
  transformsSeen.length = 0;
});

/** Put the module at a known scale, then forget the transform that did it. */
function startAt(scale) {
  zoom.setTransform(0, 0, scale);
  transformsSeen.length = 0;
}

// ── Zoom steps ──────────────────────────────────────────────────────────────

describe("timeline zoom: zoomIn", () => {
  test("multiplies the scale by 1.25 and reports it to listeners", () => {
    startAt(1.0);
    zoom.zoomIn();
    assert.equal(zoom.getScale(), 1.25);
    assert.equal(transformsSeen.length, 1);
    assert.equal(transformsSeen[0].scale, 1.25);
  });

  test("stops at SCALE_MAX", () => {
    startAt(2.5);
    zoom.zoomIn();
    assert.equal(zoom.getScale(), zoom.SCALE_MAX);
  });

  test("at SCALE_MAX it changes nothing and notifies nobody", () => {
    startAt(zoom.SCALE_MAX);
    zoom.zoomIn();
    assert.equal(zoom.getScale(), zoom.SCALE_MAX);
    assert.equal(transformsSeen.length, 0);
  });
});

describe("timeline zoom: zoomOut", () => {
  test("divides the scale by 1.25", () => {
    startAt(2.0);
    zoom.zoomOut();
    assert.equal(zoom.getScale(), 1.6);
  });

  test("a zoomIn then a zoomOut returns to the start scale", () => {
    startAt(1.0);
    zoom.zoomIn();
    zoom.zoomOut();
    assert.equal(zoom.getScale(), 1.0);
    assert.equal(transformsSeen.length, 2);
  });

  test("stops at SCALE_MIN", () => {
    startAt(0.35);
    zoom.zoomOut();
    assert.equal(zoom.getScale(), zoom.SCALE_MIN);
  });

  test("at SCALE_MIN it changes nothing and notifies nobody", () => {
    startAt(zoom.SCALE_MIN);
    zoom.zoomOut();
    assert.equal(zoom.getScale(), zoom.SCALE_MIN);
    assert.equal(transformsSeen.length, 0);
  });
});

describe("timeline zoom: the transform written to the world", () => {
  test("publishes the scale as --timeline-zoom-scale for the line-stability CSS", () => {
    startAt(1.0);
    zoom.zoomIn();
    assert.equal(viewport.world.style.props["--timeline-zoom-scale"], "1.25");
    assert.match(viewport.world.style.transform, /scale\(1\.25\)$/);
  });
});

// ── setTransform ────────────────────────────────────────────────────────────

describe("timeline zoom: setTransform", () => {
  test("clamps the scale to the limits", () => {
    zoom.setTransform(0, 0, 10);
    assert.equal(zoom.getScale(), zoom.SCALE_MAX);
    zoom.setTransform(0, 0, 0.01);
    assert.equal(zoom.getScale(), zoom.SCALE_MIN);
  });

  test("keeps part of the 3800 px world in view", () => {
    zoom.setTransform(-5000, 0, 1);
    assert.deepEqual(zoom.getPan(), { x: -3420, y: 0 });
    zoom.setTransform(2000, 0, 1);
    assert.deepEqual(zoom.getPan(), { x: 380, y: 0 });
  });

  test("ignores a non-finite value and warns", () => {
    startAt(1.0);
    const before = zoom.getPan();
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    try {
      zoom.setTransform(Number.NaN, 0, 2);
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(zoom.getScale(), 1.0);
    assert.deepEqual(zoom.getPan(), before);
    assert.equal(warnings.length, 1);
  });
});

// ── roundToGrid ─────────────────────────────────────────────────────────────

describe("timeline zoom: roundToGrid", () => {
  test("rounds to the nearest 0.5 px grid line", () => {
    assert.equal(zoom.roundToGrid(0.24, 0.5), 0);
    assert.equal(zoom.roundToGrid(12.37, 0.5), 12.5);
  });

  test("leaves exact grid values unchanged", () => {
    assert.equal(zoom.roundToGrid(12.5, 0.5), 12.5);
    assert.equal(zoom.roundToGrid(0, 0.5), 0);
  });

  test("rounds negative values symmetrically", () => {
    assert.equal(zoom.roundToGrid(-0.26, 0.5), -0.5);
    assert.equal(zoom.roundToGrid(-12.24, 0.5), -12);
  });

  test("defaults the grid size to 0.5", () => {
    assert.equal(zoom.roundToGrid(0.26), 0.5);
  });
});

// ── Re-render keeps the zoom ────────────────────────────────────────────────
// timeline-render.js builds a new .timeline-world on every render and calls
// mountZoomControls again. The new world must get the current zoom, and the pan
// listeners must not be bound a second time.

describe("timeline zoom: a re-render keeps the zoom", () => {
  test("the new world element gets the scale that the buttons already use", () => {
    const rendered = fakeViewport();
    const mousemoveBefore = windowListeners.filter((t) => t === "mousemove").length;

    startAt(1.0);
    zoom.mountZoomControls(rendered);
    zoom.zoomIn();
    assert.match(rendered.world.style.transform, /scale\(1\.25\)/);

    // A render replaces the world and the controls.
    rendered.world = fakeElement();
    rendered.controls = null;
    zoom.mountZoomControls(rendered);

    assert.match(rendered.world.style.transform, /scale\(1\.25\)/);
    assert.equal(rendered.world.style.props["--timeline-zoom-scale"], "1.25");
    const mousemoveAfter = windowListeners.filter((t) => t === "mousemove").length;
    assert.equal(mousemoveAfter - mousemoveBefore, 1);
  });
});
