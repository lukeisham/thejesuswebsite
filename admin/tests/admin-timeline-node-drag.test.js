// AdminTimelineNodeDrag tests — node:test + node:assert.
// Runs the real timeline-node-drag.js against a small hand-built fake DOM
// (TEST-8): an axis that keeps its listeners (the module delegates to it), dots,
// labels, a document that keeps its listeners, and animation frames that the
// test flushes. The offsets maths, the clamps and the axis are
// the real admin files, loaded through the bridge helper.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { loadBridge, runClassicScript } = require("./helpers/load-bridge");

// ── Fake DOM ─────────────────────────────────────────────────────────────────

function makeDot(eventId, left, top) {
  return {
    dataset: { eventId: String(eventId) },
    style: { left, top },
    classList: {
      names: new Set(),
      add(n) { this.names.add(n); },
      remove(n) { this.names.delete(n); },
    },
    closest(selector) { return selector === ".admin-timeline-event" ? this : null; },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
}

/** The part of the axis the module uses: delegated listeners and a way to fire them. */
function makeAxis() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, fn) {
      if (!(listeners[type] || []).includes(fn)) (listeners[type] ||= []).push(fn);
    },
    dispatch(type, e) { (listeners[type] || []).slice().forEach((fn) => fn(e)); },
  };
}

function makeLabel(eventId) {
  return { dataset: { eventId: String(eventId) }, style: {} };
}

/**
 * Build a window with the real drag module loaded.
 *
 * @param {Object} opts
 * @param {number} [opts.scale] - zoom scale
 * @param {Array} opts.dots - fake dots
 * @param {Object} opts.events - event id -> event
 */
function createEnv({ scale = 1, dots, events }) {
  const win = Object.assign({}, loadBridge("timeline-bridge.js"));

  const labels = {};
  for (const dot of dots) labels[dot.dataset.eventId] = makeLabel(dot.dataset.eventId);

  const axis = makeAxis();
  const listeners = {};
  const document = {
    getElementById: (id) => (id === "timeline-axis" ? axis : null),
    querySelector: (sel) => {
      const m = /data-event-id="(\d+)"/.exec(sel);
      return m ? labels[m[1]] || null : null;
    },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
    },
    dispatch(type, e) { (listeners[type] || []).slice().forEach((fn) => fn(e)); },
  };

  const frames = [];
  const relayouts = [];
  const staged = [];
  win.AdminTimelineZoom = {
    getScale: () => scale,
    effectivePxPerPeriod: () => 100 * scale,
  };
  win.AdminTimelineEvents = {
    getEventById: (id) => events[id],
    relayoutLabels: (glide) => relayouts.push(glide),
  };
  win.AdminTimelineStaged = {
    stageOffset: (id, x, y) => staged.push({ id, x, y }),
  };

  const extra = {
    document,
    requestAnimationFrame: (fn) => frames.push(fn),
    cancelAnimationFrame: (id) => { frames[id - 1] = null; },
  };
  runClassicScript("admin-timeline/timeline-geometry.js", win);
  runClassicScript("admin-timeline/timeline-axis.js", win, extra);
  runClassicScript("admin-timeline/timeline-node-bounds.js", win);
  runClassicScript("admin-timeline/timeline-node-drag.js", win, extra);
  win.AdminTimelineNodeDrag.attachDragListeners();

  return {
    attach: () => win.AdminTimelineNodeDrag.attachDragListeners(),
    axis,
    document,
    labels,
    relayouts,
    staged,
    flushFrames() { while (frames.length) { const f = frames.shift(); if (f) f(); } },
  };
}

/** A pointer event for a dot or the document. */
function pointer(type, x, y, extra = {}) {
  return {
    type,
    pointerId: 1,
    button: 0,
    clientX: x,
    clientY: y,
    preventDefault() {},
    stopPropagation() {},
    ...extra,
  };
}

/** Press on a dot: the pointerdown reaches the axis with the dot as its target. */
function press(env, dot, x, y, extra = {}) {
  env.axis.dispatch("pointerdown", { ...pointer("pointerdown", x, y, extra), target: dot });
}

/** Press on a dot, move to each point, release at the last one. */
function drag(env, dot, from, points) {
  press(env, dot, from[0], from[1]);
  for (const [x, y] of points) env.document.dispatch("pointermove", pointer("pointermove", x, y));
  const last = points[points.length - 1] || from;
  env.document.dispatch("pointerup", pointer("pointerup", last[0], last[1]));
}

// "OldTestament" is period 1, so its slot centre is x = 150.
const EVENTS = { 7: { id: 7, timeline_period: "OldTestament" } };

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AdminTimelineNodeDrag: attach and click", () => {
  test("attachDragListeners listens on the axis once, however often it is called", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    env.attach();
    assert.equal(env.axis.listeners.pointerdown.length, 1);
    assert.equal(env.axis.listeners.contextmenu.length, 1);
  });

  test("a press on something that is not a dot starts nothing", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    const axisLine = { closest: () => null };
    env.axis.dispatch("pointerdown", { ...pointer("pointerdown", 100, 100), target: axisLine });
    env.document.dispatch("pointermove", pointer("pointermove", 160, 100));
    env.document.dispatch("pointerup", pointer("pointerup", 160, 100));
    assert.deepEqual(env.staged, []);
  });

  test("the context menu is blocked on a dot only", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    let blocked = 0;
    const menu = (target) => ({ target, preventDefault() { blocked++; } });
    env.axis.dispatch("contextmenu", menu(dot));
    env.axis.dispatch("contextmenu", menu({ closest: () => null }));
    assert.equal(blocked, 1);
  });

  test("a movement under 4 px is a click: nothing is staged", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[103, 100]]);
    assert.deepEqual(env.staged, []);
    assert.equal(dot._timelineDragActive, undefined);
  });
});

describe("AdminTimelineNodeDrag: the dot follows the pointer", () => {
  test("x: 30 px of pointer is 30 world px at zoom 1", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [130, 100]]);
    assert.equal(dot.style.left, "180px");
    assert.equal(env.staged.length, 1);
    assert.ok(Math.abs(env.staged[0].x - 0.3) < 1e-9);
  });

  test("a single jump past the threshold still moves the dot the whole distance", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[130, 100]]);
    assert.equal(dot.style.left, "180px");
  });

  test("x at zoom 2: the same pointer distance is half the world distance", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ scale: 2, dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [140, 100]]);
    assert.equal(dot.style.left, "170px"); // 40 px of pointer = 20 world px
  });

  test("y: 28 px of pointer moves the dot 28 px of the 280 px field (10 percent)", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[100, 110], [100, 128]]);
    assert.ok(Math.abs(parseFloat(dot.style.top) - 60) < 1e-9);
    assert.ok(Math.abs(env.staged[0].y - (10 * 2) / 280) < 1e-9);
  });

  test("a dot at a cluster position moves from where it is shown, not from offset 0", () => {
    const dot = makeDot(7, "154px", "46%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [110, 100]]);
    assert.equal(dot.style.left, "164px"); // 154 + 10
    assert.ok(Math.abs(parseFloat(dot.style.top) - 46) < 1e-9); // no vertical move
  });

  test("x stops at the drag limit of 0.45 of a slot", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [900, 100]]);
    assert.equal(env.staged[0].x, 0.45);
    assert.equal(dot.style.left, "195px");
  });

  test("y stops at the stored limit of 0.4", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[100, 110], [100, 5000]]);
    assert.equal(env.staged[0].y, 0.4);
  });
});

describe("AdminTimelineNodeDrag: labels while dragging", () => {
  test("labels are laid out at most once per frame, and once more on drop", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    press(env, dot, 100, 100);
    for (const x of [110, 120, 130, 140]) {
      env.document.dispatch("pointermove", pointer("pointermove", x, 100));
    }
    assert.deepEqual(env.relayouts, []);
    env.flushFrames();
    assert.deepEqual(env.relayouts, [true]);
    env.document.dispatch("pointerup", pointer("pointerup", 140, 100));
    assert.deepEqual(env.relayouts, [true, true]);
  });
});

describe("AdminTimelineNodeDrag: drop", () => {
  test("a drop stages the offsets and keeps the click flag for the click that follows", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [130, 100]]);
    assert.equal(env.staged.length, 1);
    assert.equal(dot._timelineDragActive, true);
  });

  test("the next pointer-down clears the flag from the earlier drag", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ dots: [dot], events: EVENTS });
    drag(env, dot, [100, 100], [[110, 100], [130, 100]]);
    press(env, dot, 100, 100);
    assert.equal(dot._timelineDragActive, undefined);
  });

  test("a right-click drag needs SPREAD density, which is zoom 1.2 or more", () => {
    const dot = makeDot(7, "150px", "50%");
    const env = createEnv({ scale: 1, dots: [dot], events: EVENTS });
    press(env, dot, 100, 100, { button: 2 });
    env.document.dispatch("pointermove", pointer("pointermove", 160, 100, { button: 2 }));
    env.document.dispatch("pointerup", pointer("pointerup", 160, 100, { button: 2 }));
    assert.deepEqual(env.staged, []);

    const dot2 = makeDot(7, "150px", "50%");
    const env2 = createEnv({ scale: 2, dots: [dot2], events: EVENTS });
    press(env2, dot2, 100, 100, { button: 2 });
    env2.document.dispatch("pointermove", pointer("pointermove", 120, 100, { button: 2 }));
    env2.document.dispatch("pointerup", pointer("pointerup", 120, 100, { button: 2 }));
    assert.equal(env2.staged.length, 1);
  });
});
