// Map-pin clustering tests — uses node:test + node:assert.
// Tests the pure, DOM-free exports of
// frontend/assets/js/cluster-logic/cluster-map-pins.js directly
// (proximity detection, radial offset computation at various zoom levels,
// label-mode delegation), loaded via the same VM-sandbox / ESM-strip
// pattern used in admin-timeline.test.js for the other canonical
// cluster-logic modules.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEsmAsPlainScript(absPath, sandbox) {
  const source = fs
    .readFileSync(absPath, "utf8")
    .replace(/^import\s+\{[^}]*\}\s+from\s+["'][^"']+["'];?$/gm, "")
    .replace(/^export\s+const\s+/gm, "var ")
    .replace(/^export\s+function\s+/gm, "function ")
    .replace(/^export\s+\{[^}]*\};?$/gm, "");
  vm.runInNewContext(source, sandbox);
}

const sandbox = { console: { error: function () {} } };

const clusterLabelsPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "assets",
  "js",
  "cluster-logic",
  "cluster-labels.js",
);
const clusterDensityPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "assets",
  "js",
  "cluster-logic",
  "cluster-density.js",
);
const clusterMapPinsPath = path.resolve(
  __dirname,
  "..",
  "..",
  "frontend",
  "assets",
  "js",
  "cluster-logic",
  "cluster-map-pins.js",
);

// cluster-labels.js imports from cluster-density.js — load density first so
// its exports (getClusterDensity, DENSITY_*) are present in the sandbox,
// then labels, then the map-pins module under test.
loadEsmAsPlainScript(clusterDensityPath, sandbox);
loadEsmAsPlainScript(clusterLabelsPath, sandbox);
loadEsmAsPlainScript(clusterMapPinsPath, sandbox);

const {
  PROXIMITY_THRESHOLD,
  detectClusters,
  getZoomScaledSpacing,
  computeRadialOffset,
  computePinOffsets,
  computePinLabelModes,
} = sandbox;

// ── detectClusters ───────────────────────────────────────────────────────

describe("detectClusters", function () {
  test("each pin is its own cluster when far apart", function () {
    var pins = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ];
    var clusters = detectClusters(pins);
    assert.equal(clusters.length, 3);
    clusters.forEach(function (c) {
      assert.equal(c.length, 1);
    });
  });

  test("groups pins at identical coordinates into one cluster", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ];
    var clusters = detectClusters(pins);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].length, 3);
  });

  test("groups pins within the proximity threshold", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 10.5, y: 10.5 },
    ];
    var clusters = detectClusters(pins, PROXIMITY_THRESHOLD);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].length, 2);
  });

  test("does not group pins beyond the proximity threshold", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ];
    var clusters = detectClusters(pins, 2);
    assert.equal(clusters.length, 2);
  });

  test("single-linkage chains pins through intermediate proximity", function () {
    var pins = [
      { x: 0, y: 0 },
      { x: 1.5, y: 0 },
      { x: 3, y: 0 },
    ];
    var clusters = detectClusters(pins, 2);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].length, 3);
  });

  test("returns one cluster per pin for an empty proximity threshold", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ];
    var clusters = detectClusters(pins, 0);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].length, 2);
  });

  test("handles an empty pin list", function () {
    assert.equal(detectClusters([]).length, 0);
  });
});

// ── getZoomScaledSpacing ─────────────────────────────────────────────────

describe("getZoomScaledSpacing", function () {
  test("defaults to zoomLevel 1.0 when not provided", function () {
    assert.equal(getZoomScaledSpacing(), getZoomScaledSpacing(1.0));
  });

  test("spacing is tighter at high zoom (near ZOOM_MAX)", function () {
    var tight = getZoomScaledSpacing(3.0);
    var normal = getZoomScaledSpacing(1.0);
    assert.ok(tight < normal, "spacing at zoom 3.0 should be tighter than at 1.0");
  });

  test("spacing is wider at low zoom (near ZOOM_MIN)", function () {
    var wide = getZoomScaledSpacing(0.5);
    var normal = getZoomScaledSpacing(1.0);
    assert.ok(wide > normal, "spacing at zoom 0.5 should be wider than at 1.0");
  });

  test("clamps zoom levels outside the valid range", function () {
    assert.equal(getZoomScaledSpacing(10), getZoomScaledSpacing(3.0));
    assert.equal(getZoomScaledSpacing(-5), getZoomScaledSpacing(0.5));
  });

  test("spacing decreases monotonically as zoom increases", function () {
    var levels = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    var prev = Infinity;
    for (var i = 0; i < levels.length; i++) {
      var spacing = getZoomScaledSpacing(levels[i]);
      assert.ok(spacing <= prev, "spacing should not increase with zoom");
      prev = spacing;
    }
  });
});

// ── computeRadialOffset ──────────────────────────────────────────────────

describe("computeRadialOffset", function () {
  test("cluster of size 1 gets zero offset", function () {
    var offset = computeRadialOffset(1, 0, 5);
    assert.equal(offset.xOffset, 0);
    assert.equal(offset.yOffset, 0);
  });

  test("cluster of size 2 fans in opposite directions", function () {
    var a = computeRadialOffset(2, 0, 5);
    var b = computeRadialOffset(2, 1, 5);
    assert.ok(Math.abs(a.xOffset - -b.xOffset) < 1e-9);
    assert.ok(Math.abs(a.yOffset - -b.yOffset) < 1e-9);
  });

  test("every pin in a cluster is the same radial distance from the anchor", function () {
    var size = 5;
    var spacing = 3;
    for (var i = 0; i < size; i++) {
      var offset = computeRadialOffset(size, i, spacing);
      var radius = Math.sqrt(
        offset.xOffset * offset.xOffset + offset.yOffset * offset.yOffset,
      );
      assert.ok(Math.abs(radius - spacing) < 1e-9);
    }
  });

  test("offsets are evenly distributed around the circle", function () {
    var size = 4;
    var spacing = 2;
    var offsets = [];
    for (var i = 0; i < size; i++) {
      offsets.push(computeRadialOffset(size, i, spacing));
    }
    // Opposite pairs (0 and 2, 1 and 3) should be negatives of each other
    assert.ok(Math.abs(offsets[0].xOffset - -offsets[2].xOffset) < 1e-9);
    assert.ok(Math.abs(offsets[0].yOffset - -offsets[2].yOffset) < 1e-9);
    assert.ok(Math.abs(offsets[1].xOffset - -offsets[3].xOffset) < 1e-9);
    assert.ok(Math.abs(offsets[1].yOffset - -offsets[3].yOffset) < 1e-9);
  });
});

// ── computePinOffsets ─────────────────────────────────────────────────────

describe("computePinOffsets", function () {
  test("unclustered pins get zero offset", function () {
    var pins = [
      { x: 0, y: 0 },
      { x: 90, y: 90 },
    ];
    var offsets = computePinOffsets(pins);
    assert.equal(offsets[0].xOffset, 0);
    assert.equal(offsets[0].yOffset, 0);
    assert.equal(offsets[1].xOffset, 0);
    assert.equal(offsets[1].yOffset, 0);
  });

  test("clustered pins get distinct non-zero offsets", function () {
    var pins = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ];
    var offsets = computePinOffsets(pins);
    assert.equal(offsets.length, 3);
    offsets.forEach(function (o) {
      assert.ok(o.xOffset !== 0 || o.yOffset !== 0);
    });
    // No two pins should land on the exact same offset
    var seen = [];
    offsets.forEach(function (o) {
      var key = o.xOffset.toFixed(6) + "," + o.yOffset.toFixed(6);
      assert.ok(seen.indexOf(key) === -1, "duplicate offset found");
      seen.push(key);
    });
  });

  test("returns one entry per input pin, in the same order", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 80, y: 80 },
    ];
    var offsets = computePinOffsets(pins);
    assert.equal(offsets.length, 3);
  });

  test("spacing scales with the provided zoom level", function () {
    var pins = [
      { x: 50, y: 50 },
      { x: 50, y: 50 },
    ];
    var tightOffsets = computePinOffsets(pins, 3.0);
    var wideOffsets = computePinOffsets(pins, 0.5);

    var tightRadius = Math.sqrt(
      tightOffsets[0].xOffset ** 2 + tightOffsets[0].yOffset ** 2,
    );
    var wideRadius = Math.sqrt(
      wideOffsets[0].xOffset ** 2 + wideOffsets[0].yOffset ** 2,
    );
    assert.ok(tightRadius < wideRadius);
  });

  test("assigns distinct clusterId to separate clusters", function () {
    var pins = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 90, y: 90 },
      { x: 90, y: 90 },
    ];
    var offsets = computePinOffsets(pins);
    assert.equal(offsets[0].clusterId, offsets[1].clusterId);
    assert.equal(offsets[2].clusterId, offsets[3].clusterId);
    assert.notEqual(offsets[0].clusterId, offsets[2].clusterId);
  });
});

// ── computePinLabelModes ──────────────────────────────────────────────────

describe("computePinLabelModes", function () {
  test("single unclustered pin — full label in all tiers", function () {
    var offsets = [{ clusterId: 0, clusterSize: 1 }];
    assert.equal(computePinLabelModes(offsets, "compact")[0].mode, "full");
    assert.equal(computePinLabelModes(offsets, "normal")[0].mode, "full");
    assert.equal(computePinLabelModes(offsets, "spread")[0].mode, "full");
  });

  test("compact tier: cluster of 2-3 → truncated, 4+ → hidden", function () {
    var twoPin = [
      { clusterId: 0, clusterSize: 2 },
      { clusterId: 0, clusterSize: 2 },
    ];
    var modes = computePinLabelModes(twoPin, "compact");
    assert.equal(modes[0].mode, "truncated");
    assert.equal(modes[1].mode, "truncated");

    var fourPin = [
      { clusterId: 1, clusterSize: 4 },
      { clusterId: 1, clusterSize: 4 },
      { clusterId: 1, clusterSize: 4 },
      { clusterId: 1, clusterSize: 4 },
    ];
    modes = computePinLabelModes(fourPin, "compact");
    modes.forEach(function (m) {
      assert.equal(m.mode, "hidden");
    });
  });

  test("normal and spread tiers: always full regardless of cluster size", function () {
    var offsets = [
      { clusterId: 0, clusterSize: 5 },
      { clusterId: 0, clusterSize: 5 },
      { clusterId: 0, clusterSize: 5 },
      { clusterId: 0, clusterSize: 5 },
      { clusterId: 0, clusterSize: 5 },
    ];
    computePinLabelModes(offsets, "normal").forEach(function (m) {
      assert.equal(m.mode, "full");
    });
    computePinLabelModes(offsets, "spread").forEach(function (m) {
      assert.equal(m.mode, "full");
    });
  });

  test("distinct clusters of equal size are not merged for label counting", function () {
    // Two separate 2-pin clusters — each should be treated as its own
    // 2-count group (truncated in compact tier), not merged into a 4-count
    // group (which would incorrectly hide labels).
    var offsets = [
      { clusterId: 0, clusterSize: 2 },
      { clusterId: 0, clusterSize: 2 },
      { clusterId: 1, clusterSize: 2 },
      { clusterId: 1, clusterSize: 2 },
    ];
    var modes = computePinLabelModes(offsets, "compact");
    modes.forEach(function (m) {
      assert.equal(m.mode, "truncated");
    });
  });
});
