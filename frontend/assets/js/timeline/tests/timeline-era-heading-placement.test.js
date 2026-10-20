// Timeline era heading placement tests — node:test + node:assert.
// Imports the real module. The band layout (horizontal) and the mobile layout
// (vertical) are covered with a module-loads check, a happy path and a guard.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MODULE = path.resolve(__dirname, "..", "timeline-era-heading-placement.js");

// Same eras and spans as ERA_BOUNDARIES in timeline-data.js.
const ERA_BOUNDARIES = {
  PreIncarnation: { start: 0, end: 0, label: "Pre-Incarnation" },
  OldTestament: { start: 1, end: 1, label: "Old Testament" },
  EarlyLife: { start: 2, end: 5, label: "Early Life" },
  Life: { start: 6, end: 8, label: "Life" },
  GalileeMinistry: { start: 9, end: 12, label: "Galilee Ministry" },
  JudeanMinistry: { start: 13, end: 17, label: "Judean Ministry" },
  PassionWeek: { start: 18, end: 33, label: "Passion Week" },
  "Post-Passion": { start: 34, end: 37, label: "Post-Passion" },
};

// Heading widths in px, as a browser measures them at the fixed heading size.
const TEXT_WIDTHS = {
  PreIncarnation: 150,
  OldTestament: 125,
  EarlyLife: 85,
  Life: 40,
  GalileeMinistry: 135,
  JudeanMinistry: 130,
  PassionWeek: 105,
  "Post-Passion": 100,
};

let placement;

async function load() {
  if (!placement) placement = await import(pathToFileURL(MODULE).href);
  return placement;
}

/** Run `fn` with console.warn captured; returns the captured messages. */
function captureWarnings(fn) {
  const original = console.warn;
  const messages = [];
  console.warn = (...args) => messages.push(args.join(" "));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return messages;
}

describe("computeEraBandLayout", () => {
  test("returns one entry per era, in order", async () => {
    const { computeEraBandLayout } = await load();
    const layout = computeEraBandLayout(ERA_BOUNDARIES, 100, TEXT_WIDTHS);
    assert.deepEqual(
      layout.map((e) => e.era),
      Object.keys(ERA_BOUNDARIES),
    );
  });

  test("an era's x and width follow its period span", async () => {
    const { computeEraBandLayout } = await load();
    const layout = computeEraBandLayout(ERA_BOUNDARIES, 50, TEXT_WIDTHS);
    const early = layout.find((e) => e.era === "EarlyLife");
    assert.equal(early.x, 100);
    assert.equal(early.width, 200);
  });

  test("heading text starts a little inside the left edge of its era", async () => {
    const { computeEraBandLayout } = await load();
    const [first] = computeEraBandLayout(ERA_BOUNDARIES, 100, TEXT_WIDTHS);
    assert.ok(first.textX > first.x && first.textX - first.x < 10);
  });

  test("a heading that fits its era stays in the first lane without a leader", async () => {
    const { computeEraBandLayout } = await load();
    const layout = computeEraBandLayout(ERA_BOUNDARIES, 300, TEXT_WIDTHS);
    const galilee = layout.find((e) => e.era === "GalileeMinistry");
    assert.equal(galilee.lane, 0);
    assert.equal(galilee.leader, false);
  });

  test("Pre-Incarnation is wider than its 100 px era, so it gets a leader", async () => {
    const { computeEraBandLayout } = await load();
    const layout = computeEraBandLayout(ERA_BOUNDARIES, 100, TEXT_WIDTHS);
    const pre = layout.find((e) => e.era === "PreIncarnation");
    assert.equal(pre.leader, true);
  });

  test("a heading whose lane is taken moves down and gets a leader", async () => {
    const { computeEraBandLayout } = await load();
    const layout = computeEraBandLayout(ERA_BOUNDARIES, 100, TEXT_WIDTHS);
    const old = layout.find((e) => e.era === "OldTestament");
    assert.equal(old.lane, 1);
    assert.equal(old.leader, true);
  });

  test("no two headings overlap in the same lane at zoom 0.3, 1 and 3", async () => {
    const { computeEraBandLayout } = await load();
    for (const px of [30, 100, 300]) {
      const layout = computeEraBandLayout(ERA_BOUNDARIES, px, TEXT_WIDTHS);
      for (const a of layout) {
        for (const b of layout) {
          if (a === b || a.lane !== b.lane || a.x >= b.x) continue;
          assert.ok(
            a.x + 4 + TEXT_WIDTHS[a.era] <= b.x + 4,
            `at ${px} px per period, ${a.era} overlaps ${b.era} in lane ${a.lane}`,
          );
        }
      }
    }
  });

  test("a missing text width counts as zero and warns about nothing", async () => {
    const { computeEraBandLayout } = await load();
    const warnings = captureWarnings(() => {
      const layout = computeEraBandLayout(ERA_BOUNDARIES, 100, {});
      assert.ok(layout.every((e) => e.lane === 0));
    });
    assert.deepEqual(warnings, []);
  });

  test("with every lane taken it uses the last lane and warns", async () => {
    const { computeEraBandLayout, ERA_BAND_LANES } = await load();
    const crowded = {};
    const widths = {};
    for (let i = 0; i < ERA_BAND_LANES + 1; i++) {
      crowded["E" + i] = { start: i, end: i, label: "E" + i };
      widths["E" + i] = 5000;
    }
    const warnings = captureWarnings(() => {
      const layout = computeEraBandLayout(crowded, 100, widths);
      assert.equal(layout[ERA_BAND_LANES].lane, ERA_BAND_LANES - 1);
    });
    assert.equal(warnings.length, 1);
  });

  test("invalid input returns an empty list and warns", async () => {
    const { computeEraBandLayout } = await load();
    const warnings = captureWarnings(() => {
      assert.deepEqual(computeEraBandLayout(null, 100, TEXT_WIDTHS), []);
      assert.deepEqual(computeEraBandLayout(ERA_BOUNDARIES, 0, TEXT_WIDTHS), []);
    });
    assert.equal(warnings.length, 2);
  });
});

describe("computeEraHeadingPositions (mobile layout)", () => {
  test("headings start at a fixed left offset, at the start of their era", async () => {
    const { computeEraHeadingPositions } = await load();
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1);
    assert.equal(result.length, 8);
    const early = result.find((h) => h.era === "EarlyLife");
    assert.equal(early.x, 8);
    assert.equal(early.y, 2 * 100 + 8);
    assert.equal(early.tier, 0);
  });

  test("an event box over a heading moves the heading along x", async () => {
    const { computeEraHeadingPositions } = await load();
    const blocker = [{ era: "EarlyLife", x: 8, y: 208, width: 150, height: 30 }];
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, blocker, 1);
    const early = result.find((h) => h.era === "EarlyLife");
    assert.ok(early.tier > 0 || early.x !== 8, "the heading did not move");
  });

  test("every heading stays inside its era's vertical span", async () => {
    const { computeEraHeadingPositions } = await load();
    const result = computeEraHeadingPositions(ERA_BOUNDARIES, [], 1);
    for (const h of result) {
      const bounds = ERA_BOUNDARIES[h.era];
      assert.ok(h.y >= bounds.start * 100, `${h.era} starts above its era`);
      assert.ok(h.y <= (bounds.end + 1) * 100, `${h.era} starts below its era`);
    }
  });

  test("invalid input returns an empty list and warns", async () => {
    const { computeEraHeadingPositions } = await load();
    const warnings = captureWarnings(() => {
      assert.deepEqual(computeEraHeadingPositions(null, [], 1), []);
      assert.deepEqual(computeEraHeadingPositions(ERA_BOUNDARIES, [], 0), []);
    });
    assert.equal(warnings.length, 2);
  });
});
