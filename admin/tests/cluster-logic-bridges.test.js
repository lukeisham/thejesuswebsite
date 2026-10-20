// Cluster-logic bridge tests — uses node:test + node:assert.
// Each file in admin/assets/js/cluster-logic-bridge/ must be a pure re-export:
// every property of its window.Admin* globals is the same value as the matching
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
    file: "timeline-bridge.js",
    global: "AdminTimelineClusterDensity",
    canonical: CLUSTER + "cluster-density.js",
    names: ["DENSITY_SPREAD", "getClusterDensity"],
  },
  {
    file: "timeline-bridge.js",
    global: "AdminTimelineClusterPlacement",
    canonical: CLUSTER + "cluster-placement.js",
    names: ["computeDotPositions"],
  },
  {
    file: "timeline-bridge.js",
    global: "AdminTimelineClusterLabels",
    canonical: CLUSTER + "cluster-labels.js",
    names: ["computeLabelModes"],
  },
  {
    file: "timeline-bridge.js",
    global: "AdminTimelineClusterLabelLayout",
    canonical: CLUSTER + "cluster-label-layout.js",
    names: [
      "DOT_CLEARANCE_PX",
      "layoutLabelsBesideNodes",
      "computeLeaderLine",
    ],
  },
  {
    file: "cluster-map-pins-bridge.js",
    global: "AdminMapsClusterPins",
    canonical: CLUSTER + "cluster-map-pins.js",
    names: ["computePinOffsets"],
  },
  {
    file: "timeline-bridge.js",
    global: "AdminTimelineOffsets",
    canonical: CLUSTER + "timeline-offsets.js",
    names: [
      "offsetXToPixels",
      "pixelsToOffsetX",
      "offsetYToPixels",
      "pixelsToOffsetY",
      "boxPixelsToCrossAxisPixels",
      "crossAxisToTopPercent",
      "topPercentToCrossAxis",
      "clampDragOffsetX",
      "clampOffsetY",
    ],
  },
  {
    file: "timeline-bridge.js",
    global: "AdminTimelineEraHeadingPlacement",
    canonical: "/assets/js/timeline/timeline-era-heading-placement.js",
    names: ["computeEraBandLayout"],
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

  test("timeline-bridge.js publishes exactly the six timeline globals", () => {
    const win = loadBridge("timeline-bridge.js");
    assert.deepEqual(Object.keys(win).sort(), [
      "AdminTimelineClusterDensity",
      "AdminTimelineClusterLabelLayout",
      "AdminTimelineClusterLabels",
      "AdminTimelineClusterPlacement",
      "AdminTimelineEraHeadingPlacement",
      "AdminTimelineOffsets",
    ]);
  });

  test("a bridge file that does not exist fails loudly", () => {
    assert.throws(() => loadBridge("no-such-bridge.js"), /ENOENT/);
  });
});
