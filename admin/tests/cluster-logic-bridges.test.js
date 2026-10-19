// Cluster-logic bridge tests — uses node:test + node:assert.
// Each file in admin/assets/js/cluster-logic-bridge/ must be a pure re-export:
// every property of its window.Admin* global is the same value as the matching
// canonical export (compared with ===), and it adds no property of its own.
// A bridge that wraps or renames a function is a second copy of a rule, and the
// editor and the public page then drift apart without any error.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { loadBridge, loadCanonical } = require("./helpers/load-bridge");

const CLUSTER = "/assets/js/cluster-logic/";

// bridge file -> window global, canonical module, and the names it must expose.
const BRIDGES = [
  {
    file: "cluster-density-bridge.js",
    global: "AdminTimelineClusterDensity",
    canonical: CLUSTER + "cluster-density.js",
    names: [
      "DENSITY_COMPACT",
      "DENSITY_NORMAL",
      "DENSITY_SPREAD",
      "THRESHOLDS",
      "getClusterDensity",
    ],
  },
  {
    file: "cluster-placement-bridge.js",
    global: "AdminTimelineClusterPlacement",
    canonical: CLUSTER + "cluster-placement.js",
    names: ["computeDotPositions"],
  },
  {
    file: "cluster-labels-bridge.js",
    global: "AdminTimelineClusterLabels",
    canonical: CLUSTER + "cluster-labels.js",
    names: ["LABEL_FULL", "LABEL_TRUNCATED", "LABEL_HIDDEN", "computeLabelModes"],
  },
  {
    file: "cluster-label-layout-bridge.js",
    global: "AdminTimelineClusterLabelLayout",
    canonical: CLUSTER + "cluster-label-layout.js",
    names: [
      "DOT_CLEARANCE_PX",
      "MAX_LABEL_STEPS",
      "layoutLabelsBesideNodes",
      "computeLeaderLine",
    ],
  },
  {
    file: "cluster-map-pins-bridge.js",
    global: "AdminMapsClusterPins",
    canonical: CLUSTER + "cluster-map-pins.js",
    names: [
      "PROXIMITY_THRESHOLD",
      "detectClusters",
      "getZoomScaledSpacing",
      "computeRadialOffset",
      "computePinOffsets",
      "computePinLabelModes",
    ],
  },
  {
    file: "timeline-offsets-bridge.js",
    global: "AdminTimelineOffsets",
    canonical: CLUSTER + "timeline-offsets.js",
    names: [
      "OFFSET_LIMIT_X",
      "OFFSET_LIMIT_Y",
      "DRAG_LIMIT_X",
      "offsetXToPixels",
      "pixelsToOffsetX",
      "offsetYToPixels",
      "pixelsToOffsetY",
      "boxPixelsToCrossAxisPixels",
      "crossAxisToTopPercent",
      "clampDragOffsetX",
      "clampOffsetY",
    ],
  },
  {
    file: "timeline-era-heading-placement-bridge.js",
    global: "AdminTimelineEraHeadingPlacement",
    canonical: "/assets/js/timeline/timeline-era-heading-placement.js",
    names: ["computeEraBandLayout", "ERA_BAND_LANES"],
  },
];

describe("cluster-logic bridges are pure re-exports", () => {
  for (const bridge of BRIDGES) {
    test(`${bridge.file} publishes exactly the canonical exports it lists`, () => {
      const published = loadBridge(bridge.file)[bridge.global];
      const canonical = loadCanonical(bridge.canonical);

      assert.deepEqual(Object.keys(published).sort(), [...bridge.names].sort());
      for (const name of bridge.names) {
        assert.ok(
          name in canonical,
          `${bridge.canonical} does not export ${name}`,
        );
        assert.strictEqual(
          published[name],
          canonical[name],
          `${bridge.file}: ${name} is not the canonical value`,
        );
      }
    });
  }

  test("edge-path-bridge.js publishes computeEdgePath itself", () => {
    const published = loadBridge("edge-path-bridge.js").AdminArborComputeEdgePath;
    const canonical = loadCanonical(CLUSTER + "edge-path.js");
    assert.strictEqual(published, canonical.computeEdgePath);
  });

  test("a bridge file that does not exist fails loudly", () => {
    assert.throws(() => loadBridge("no-such-bridge.js"), /ENOENT/);
  });
});
