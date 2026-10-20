// Timeline drag tests — node:test + node:assert.
// Imports the real timeline-zoom.js, mounts it on a hand-built fake viewport and
// fires the handlers that mountZoomControls binds, so the real onPanStart,
// onPanMove and onPanEnd run. Covers the .timeline-world--panning class, which
// switches off the zoom transition while a drag is under way, and where each
// listener is bound.

const { test, describe, before, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-zoom.js");
const PANNING = "timeline-world--panning";

// ── Fake DOM ────────────────────────────────────────────────────────────────

/** An event target that remembers its listeners so a test can fire them. */
function fakeTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn, options) {
      (listeners[type] ??= []).push({ fn, options });
    },
    fire(type, event) {
      for (const { fn } of listeners[type] ?? []) fn(event);
    },
  };
}

function fakeElement() {
  const classes = new Set();
  return Object.assign(fakeTarget(), {
    style: { props: {}, transform: "", cursor: "", setProperty(name, value) { this.props[name] = value; } },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    children: [],
    className: "",
    innerHTML: "",
    appendChild(child) { this.children.push(child); },
    setAttribute() {},
  });
}

const BLANK_TARGET = { closest: () => null };
const mouseEvent = (clientX, clientY, extra = {}) => ({ button: 0, clientX, clientY, target: BLANK_TARGET, ...extra });
const touchEvent = (clientX, clientY, extra = {}) => ({
  touches: [{ clientX, clientY }],
  target: BLANK_TARGET,
  preventDefault() { this.prevented = true; },
  ...extra,
});

// ── Setup ───────────────────────────────────────────────────────────────────

let zoom;
let viewport;
let world;
let windowTarget;
let vertical = false;
let clock = 1000;
const realNow = Date.now;

before(async () => {
  windowTarget = fakeTarget();
  globalThis.window = {
    matchMedia: () => ({ matches: vertical }),
    addEventListener: windowTarget.addEventListener,
    removeEventListener() {},
  };
  globalThis.document = { createElement: fakeElement };

  zoom = await import(pathToFileURL(MODULE).href);

  viewport = fakeElement();
  world = fakeElement();
  viewport.querySelector = (selector) => (selector === ".timeline-world" ? world : null);
  viewport.appendChild = () => {};
  zoom.mountZoomControls(viewport);
});

afterEach(() => {
  vertical = false;
  Date.now = realNow;
  windowTarget.fire("mouseup", mouseEvent(0, 0));
  viewport.fire("touchend", {});
});

/** Move the clock past the 16 ms pan throttle so the next move is applied at once. */
function passThrottle() {
  clock += 100;
  Date.now = () => clock;
}

// ── Mouse ───────────────────────────────────────────────────────────────────

describe("timeline drag: mouse", () => {
  test("mousedown adds the panning class and the grabbing cursor", () => {
    viewport.fire("mousedown", mouseEvent(100, 50));
    assert.ok(world.classList.contains(PANNING));
    assert.equal(viewport.style.cursor, "grabbing");
  });

  test("mousemove during a drag pans the world and keeps the class", () => {
    const start = zoom.getPan();
    viewport.fire("mousedown", mouseEvent(100, 50));
    passThrottle();
    windowTarget.fire("mousemove", mouseEvent(130, 40));

    assert.deepEqual(zoom.getPan(), { x: start.x + 30, y: start.y - 10 });
    assert.ok(world.style.transform.startsWith(`translate(${start.x + 30}px, ${start.y - 10}px)`));
    assert.ok(world.classList.contains(PANNING));
  });

  test("mouseup removes the panning class and the cursor", () => {
    viewport.fire("mousedown", mouseEvent(100, 50));
    windowTarget.fire("mouseup", mouseEvent(100, 50));
    assert.ok(!world.classList.contains(PANNING));
    assert.equal(viewport.style.cursor, "");
  });

  test("mouseup without a mousedown leaves the world untouched", () => {
    windowTarget.fire("mouseup", mouseEvent(0, 0));
    assert.ok(!world.classList.contains(PANNING));
  });

  test("mousemove without a mousedown does not pan", () => {
    const before = zoom.getPan();
    passThrottle();
    windowTarget.fire("mousemove", mouseEvent(500, 500));
    assert.deepEqual(zoom.getPan(), before);
  });

  test("a press on a dot or a control does not start a pan", () => {
    for (const hit of [".timeline-dot", ".timeline-stack", ".timeline-controls", ".timeline-era-filters"]) {
      const target = { closest: (selector) => (selector === hit ? {} : null) };
      viewport.fire("mousedown", mouseEvent(100, 50, { target }));
      assert.ok(!world.classList.contains(PANNING), hit);
    }
  });

  test("a non-primary button does not start a pan", () => {
    viewport.fire("mousedown", mouseEvent(100, 50, { button: 2 }));
    assert.ok(!world.classList.contains(PANNING));
  });

  test("vertical mode does not start a pan", () => {
    vertical = true;
    viewport.fire("mousedown", mouseEvent(100, 50));
    assert.ok(!world.classList.contains(PANNING));
  });
});

// ── Touch ───────────────────────────────────────────────────────────────────

describe("timeline drag: touch", () => {
  test("touchstart, touchmove and touchend run the same pan as the mouse", () => {
    const start = zoom.getPan();
    viewport.fire("touchstart", touchEvent(100, 50));
    assert.ok(world.classList.contains(PANNING));

    passThrottle();
    const move = touchEvent(120, 70);
    viewport.fire("touchmove", move);
    assert.deepEqual(zoom.getPan(), { x: start.x + 20, y: start.y + 20 });
    assert.equal(move.prevented, true);

    viewport.fire("touchend", {});
    assert.ok(!world.classList.contains(PANNING));
  });

  test("a two-finger touch does not start a pan", () => {
    const event = touchEvent(100, 50, { touches: [{ clientX: 1, clientY: 1 }, { clientX: 2, clientY: 2 }] });
    viewport.fire("touchstart", event);
    assert.ok(!world.classList.contains(PANNING));
  });

  test("touchmove and touchend are bound to the viewport, not the window", () => {
    assert.equal(windowTarget.listeners.touchmove, undefined);
    assert.equal(windowTarget.listeners.touchend, undefined);
    assert.equal(viewport.listeners.touchmove.length, 1);
    assert.equal(viewport.listeners.touchmove[0].options.passive, false);
    assert.equal(viewport.listeners.touchend.length, 1);
  });
});
