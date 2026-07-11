// Admin timeline tests — uses node:test + node:assert.
// Tests the pure date↔position scale helpers from admin-timeline/timeline-axis.js
// (periodToX, xToPeriod, round-trip stability, era-boundary mapping).
//
// The DOM-bound drag/click timeline wiring is validated manually via browser
// testing (see setup/TESTS/admin_tests.md for the manual checklist).

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ── Load timeline-axis.js in a sandboxed context ─────────────────────────────

const axisPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-axis.js",
);
const axisSource = fs.readFileSync(axisPath, "utf8");

const axisSandbox = {
  window: {},
  document: {
    createElement: function (tag) {
      return {
        tagName: tag,
        setAttribute: function () {},
        appendChild: function () {},
        style: {},
        classList: { add: function () {} },
        addEventListener: function () {},
      };
    },
    querySelectorAll: function () {
      return [];
    },
  },
  console: { error: function () {} },
};

// ── Load timeline-geometry.js (shared constants required by timeline-axis) ────

const geometryPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-geometry.js",
);
const geometrySource = fs.readFileSync(geometryPath, "utf8");

vm.runInNewContext(geometrySource, axisSandbox);

// ── Load cluster modules (density, placement, labels) ─────────────────────────

const clusterDensityPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-cluster-density.js",
);
const clusterDensitySource = fs.readFileSync(clusterDensityPath, "utf8");
vm.runInNewContext(clusterDensitySource, axisSandbox);

const clusterPlacementPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-cluster-placement.js",
);
const clusterPlacementSource = fs.readFileSync(clusterPlacementPath, "utf8");
vm.runInNewContext(clusterPlacementSource, axisSandbox);

const clusterLabelsPath = path.resolve(
  __dirname,
  "..",
  "assets",
  "js",
  "admin-timeline",
  "timeline-cluster-labels.js",
);
const clusterLabelsSource = fs.readFileSync(clusterLabelsPath, "utf8");
vm.runInNewContext(clusterLabelsSource, axisSandbox);

vm.runInNewContext(axisSource, axisSandbox);

const {
  periodToX,
  xToPeriod,
  periodOrdinal,
  eraOrdinal,
  eraStartX,
  totalWidth,
} = axisSandbox.window.AdminTimelineAxis;

const DEFAULT_PX_PER_PERIOD =
  axisSandbox.window.AdminTimelineGeometry.DEFAULT_PX_PER_PERIOD;
const periodToXCentered =
  axisSandbox.window.AdminTimelineGeometry.periodToXCentered;

// ── periodOrdinal ────────────────────────────────────────────────────────────

describe("periodOrdinal", function () {
  test("returns 0 for PreIncarnation", function () {
    assert.equal(periodOrdinal("PreIncarnation"), 0);
  });

  test("returns correct ordinals for known periods", function () {
    assert.equal(periodOrdinal("OldTestament"), 1);
    assert.equal(periodOrdinal("EarlyLifeBirth"), 3);
    assert.equal(periodOrdinal("GalileeSermonMount"), 10);
  });

  test("returns last index for unknown periods (sorts last)", function () {
    var ord = periodOrdinal("NonExistentPeriod");
    // Should equal PERIOD_ORDER.length since it's unknown
    assert.ok(ord >= 37, "unknown period should sort at or after the end");
  });
});

// ── eraOrdinal ───────────────────────────────────────────────────────────────

describe("eraOrdinal", function () {
  test("returns 0 for PreIncarnation", function () {
    assert.equal(eraOrdinal("PreIncarnation"), 0);
  });

  test("returns 1 for OldTestament", function () {
    assert.equal(eraOrdinal("OldTestament"), 1);
  });

  test("returns 4 for GalileeMinistry", function () {
    assert.equal(eraOrdinal("GalileeMinistry"), 4);
  });

  test("returns 7 for Post-Passion", function () {
    assert.equal(eraOrdinal("Post-Passion"), 7);
  });

  test("sorts unknown eras last", function () {
    assert.equal(eraOrdinal("unknown"), 8);
  });
});

// ── periodToX ────────────────────────────────────────────────────────────────

describe("periodToX", function () {
  test("maps the first period to x = 50 at default scale (centred in slot)", function () {
    // PreIncarnation at index 0 with scale 100: 0*100 + 100/2 + 0 = 50
    var x = periodToX("PreIncarnation", 100, 0);
    assert.equal(x, 50);
  });

  test("scales with pxPerUnit", function () {
    // OldTestament at index 1 with scale 100: 1*100 + 100/2 + 0 = 150
    var x = periodToX("OldTestament", 100, 0);
    assert.equal(x, 150);

    // Same period at scale 160: 1*160 + 160/2 + 0 = 240
    x = periodToX("OldTestament", 160, 0);
    assert.equal(x, 240);
  });

  test("adds the pan offset", function () {
    // PreIncarnation with offset 100: 0*100 + 50 + 100 = 150
    var x = periodToX("PreIncarnation", 100, 100);
    assert.equal(x, 150);

    // OldTestament with offset -50: 1*100 + 50 + (-50) = 100
    x = periodToX("OldTestament", 100, -50);
    assert.equal(x, 100);
  });

  test("defaults to 100 px/period when no scale given", function () {
    // OldTestament default: 1*100 + 50 = 150
    var x = periodToX("OldTestament");
    assert.equal(x, 150);
  });

  test("DEFAULT_PX_PER_PERIOD is 100", function () {
    assert.equal(DEFAULT_PX_PER_PERIOD, 100);
  });

  test("periodToXCentered matches periodX formula", function () {
    // periodIndex * scale + scale/2 + offset
    assert.equal(periodToXCentered(0, 100, 0), 50);
    assert.equal(periodToXCentered(5, 100, 0), 550);
    assert.equal(periodToXCentered(5, 80, 50), 490);
  });
});

// ── xToPeriod ────────────────────────────────────────────────────────────────

describe("xToPeriod", function () {
  test("maps x = 50 to PreIncarnation at default scale (centred snap)", function () {
    // With centering: period 0 centre is at 50, snap range for period 0 is x ∈ [0, 100)
    var period = xToPeriod(50, 100, 0);
    assert.equal(period, "PreIncarnation");
  });

  test("maps x = 150 to OldTestament at default scale", function () {
    var period = xToPeriod(150, 100, 0);
    assert.equal(period, "OldTestament");
  });

  test("snaps to the nearest period", function () {
    // x = 110 is between OldTestament (centre 150) and EarlyLifeUnborn (centre 250) → closer to OldTestament
    var period = xToPeriod(110, 100, 0);
    assert.equal(period, "OldTestament");

    // x = 200 is closer to EarlyLifeUnborn (centre 250)
    period = xToPeriod(200, 100, 0);
    assert.equal(period, "EarlyLifeUnborn");
  });

  test("accounts for pan offset", function () {
    // With offset 200: periodToX(PreIncarnation, 100, 200) = 0*100 + 50 + 200 = 250
    // xToPeriod(250, 100, 200): index = round((250 - 200 - 50)/100) = round(0) = 0
    var period = xToPeriod(250, 100, 200);
    assert.equal(period, "PreIncarnation");
  });

  test("clamps to the valid range", function () {
    var period = xToPeriod(-1000, 100, 0);
    assert.equal(period, "PreIncarnation");

    period = xToPeriod(999999, 100, 0);
    // Should be the last period (ReturnOfJesus)
    assert.ok(typeof period === "string");
    assert.ok(period.length > 0);
  });

  test("defaults to 100 px/period when no scale given", function () {
    var period = xToPeriod(50);
    assert.equal(period, "PreIncarnation");
  });

  test("boundary between adjacent periods handles centring correctly", function () {
    // At scale 100, period 0 centre = 50, period 1 centre = 150, boundary = 100.
    // x = 99 should snap to period 0, x = 101 should snap to period 1.
    assert.equal(xToPeriod(99, 100, 0), "PreIncarnation");
    assert.equal(xToPeriod(101, 100, 0), "OldTestament");
  });
});

// ── Round-trip stability ─────────────────────────────────────────────────────

describe("periodToX ↔ xToPeriod round-trip", function () {
  test("round-trips the first period", function () {
    var x = periodToX("PreIncarnation", 100, 50);
    var period = xToPeriod(x, 100, 50);
    assert.equal(period, "PreIncarnation");
  });

  test("round-trips a middle period", function () {
    var x = periodToX("GalileeSermonMount", 100, 30);
    var period = xToPeriod(x, 100, 30);
    assert.equal(period, "GalileeSermonMount");
  });

  test("round-trips the last period", function () {
    var x = periodToX("ReturnOfJesus", 100, 0);
    var period = xToPeriod(x, 100, 0);
    assert.equal(period, "ReturnOfJesus");
  });

  test("round-trips multiple periods at various scales", function () {
    var periods = [
      "EarlyLifeBirth",
      "LifeBaptism",
      "PassionFridayDeath",
      "Ascension",
    ];
    var scales = [50, 80, 120, 200];
    for (var s = 0; s < scales.length; s++) {
      for (var p = 0; p < periods.length; p++) {
        var x = periodToX(periods[p], scales[s], 0);
        var period = xToPeriod(x, scales[s], 0);
        assert.equal(
          period,
          periods[p],
          "round-trip failed for " + periods[p] + " at scale " + scales[s],
        );
      }
    }
  });
});

// ── eraStartX ────────────────────────────────────────────────────────────────

describe("eraStartX", function () {
  test("maps PreIncarnation era to PreIncarnation position", function () {
    var x = eraStartX("PreIncarnation", 100, 0);
    assert.equal(x, periodToX("PreIncarnation", 100, 0));
  });

  test("maps GalileeMinistry era to GalileeCallingTwelve position", function () {
    var x = eraStartX("GalileeMinistry", 100, 0);
    assert.equal(x, periodToX("GalileeCallingTwelve", 100, 0));
  });

  test("maps PassionWeek era to PassionPalmSunday position", function () {
    var x = eraStartX("PassionWeek", 100, 0);
    assert.equal(x, periodToX("PassionPalmSunday", 100, 0));
  });

  test("handles scales and offsets", function () {
    var x = eraStartX("GalileeMinistry", 120, 50);
    var expected = periodToX("GalileeCallingTwelve", 120, 50);
    assert.equal(x, expected);
  });
});

// ── totalWidth ───────────────────────────────────────────────────────────────

describe("totalWidth", function () {
  test("is proportional to scale", function () {
    var w1 = totalWidth(100);
    var w2 = totalWidth(200);
    assert.equal(w2, w1 * 2);
  });

  test("defaults to 100 px/period when no scale given", function () {
    var w = totalWidth();
    // 38 periods * 100px = 3800
    assert.ok(w > 3500);
  });
});

// ── Mirror-consistency: period ordering ───────────────────────────────────────
// These tests verify the admin timeline axis produces results that mirror
// the public timeline rendering, so a dragged event lands in the same place.

describe("period ordering consistency", function () {
  test("ordinals are strictly increasing", function () {
    var prev = -1;
    // PERIOD_ORDER is captured via periodOrdinal on each value
    var periods = [
      "PreIncarnation",
      "OldTestament",
      "EarlyLifeUnborn",
      "EarlyLifeBirth",
      "EarlyLifeInfancy",
      "EarlyLifeChildhood",
      "LifeTradie",
      "LifeBaptism",
      "LifeTemptation",
      "GalileeCallingTwelve",
      "GalileeSermonMount",
      "GalileeMiraclesSea",
      "GalileeTransfiguration",
      "JudeanOutsideJudea",
      "JudeanMissionSeventy",
      "JudeanTeachingTemple",
      "JudeanRaisingLazarus",
      "JudeanFinalJourney",
      "PassionPalmSunday",
      "ReturnOfJesus",
    ];
    for (var i = 0; i < periods.length; i++) {
      var ord = periodOrdinal(periods[i]);
      assert.ok(
        ord > prev,
        periods[i] + " ordinal " + ord + " should be > " + prev,
      );
      prev = ord;
    }
  });
});

// ── Mirror-consistency: era-for-period mapping ────────────────────────────────

describe("era-for-period mapping matches schema CHECK groupings", function () {
  // Era boundaries defined in the admin axis and matching the public timeline.
  // These map each era to its first period — the same boundary used by eraStartX.
  test("era boundaries match expected periods", function () {
    var expectedBoundaries = {
      PreIncarnation: "PreIncarnation",
      OldTestament: "OldTestament",
      EarlyLife: "EarlyLifeUnborn",
      Life: "LifeTradie",
      GalileeMinistry: "GalileeCallingTwelve",
      JudeanMinistry: "JudeanOutsideJudea",
      PassionWeek: "PassionPalmSunday",
      "Post-Passion": "PostResurrectionAppearances",
    };

    var eras = Object.keys(expectedBoundaries);
    for (var e = 0; e < eras.length; e++) {
      var era = eras[e];
      var firstPeriod = expectedBoundaries[era];
      var x = eraStartX(era, 80, 0);
      var expectedX = periodToX(firstPeriod, 80, 0);
      assert.equal(
        x,
        expectedX,
        "era " + era + " should start at " + firstPeriod,
      );
    }
  });

  test("every era has at least one period in its range", function () {
    var eras = [
      "PreIncarnation",
      "OldTestament",
      "EarlyLife",
      "Life",
      "GalileeMinistry",
      "JudeanMinistry",
      "PassionWeek",
      "Post-Passion",
    ];
    for (var e = 0; e < eras.length - 1; e++) {
      var thisEra = eras[e];
      var nextEra = eras[e + 1];
      var thisStart = eraStartX(thisEra, 80, 0);
      var nextStart = eraStartX(nextEra, 80, 0);
      assert.ok(
        nextStart > thisStart,
        nextEra + " should start after " + thisEra,
      );
    }
  });
});

// ── Mirror-consistency: drag-snap round-trip identity ─────────────────────────

describe("drag-snap round-trip identity for every period", function () {
  test("periodToX then xToPeriod returns the same period for all periods", function () {
    // Verify round-trip for ALL periods at various scales
    var periods = [
      "PreIncarnation",
      "OldTestament",
      "EarlyLifeUnborn",
      "EarlyLifeBirth",
      "EarlyLifeInfancy",
      "EarlyLifeChildhood",
      "LifeTradie",
      "LifeBaptism",
      "LifeTemptation",
      "GalileeCallingTwelve",
      "GalileeSermonMount",
      "GalileeMiraclesSea",
      "GalileeTransfiguration",
      "JudeanOutsideJudea",
      "JudeanMissionSeventy",
      "JudeanTeachingTemple",
      "JudeanRaisingLazarus",
      "JudeanFinalJourney",
      "PassionPalmSunday",
      "PassionMondayCleansing",
      "PassionTuesdayTeaching",
      "PassionWednesdaySilent",
      "PassionMaundyThursday",
      "PassionMaundyLastSupper",
      "PassionMaundyGethsemane",
      "PassionMaundyBetrayal",
      "PassionFridaySanhedrin",
      "PassionFridayCivilTrials",
      "PassionFridayCrucifixionBegins",
      "PassionFridayDarkness",
      "PassionFridayDeath",
      "PassionFridayBurial",
      "PassionSaturdayWatch",
      "PassionSundayResurrection",
      "PostResurrectionAppearances",
      "Ascension",
      "OurResponse",
      "ReturnOfJesus",
    ];

    var offsets = [0, 50, -30];
    for (var o = 0; o < offsets.length; o++) {
      for (var p = 0; p < periods.length; p++) {
        var period = periods[p];
        var x = periodToX(period, 100, offsets[o]);
        var result = xToPeriod(x, 100, offsets[o]);
        assert.equal(
          result,
          period,
          "round-trip failed for " + period + " at offset " + offsets[o],
        );
      }
    }
  });
});

// ── Cluster Density Tiers ──────────────────────────────────────────────────

describe("cluster density tiers", function () {
  const DENSITY_COMPACT =
    axisSandbox.window.AdminTimelineClusterDensity.DENSITY_COMPACT;
  const DENSITY_NORMAL =
    axisSandbox.window.AdminTimelineClusterDensity.DENSITY_NORMAL;
  const DENSITY_SPREAD =
    axisSandbox.window.AdminTimelineClusterDensity.DENSITY_SPREAD;
  const getClusterDensity =
    axisSandbox.window.AdminTimelineClusterDensity.getClusterDensity.bind(
      axisSandbox.window.AdminTimelineClusterDensity,
    );

  test("compact at 30 px/period", function () {
    assert.equal(getClusterDensity(null, 30), DENSITY_COMPACT);
  });

  test("compact at 55 px/period (boundary)", function () {
    assert.equal(getClusterDensity(null, 55), DENSITY_COMPACT);
  });

  test("normal at 80 px/period", function () {
    assert.equal(getClusterDensity(null, 80), DENSITY_NORMAL);
  });

  test("normal at 119 px/period", function () {
    assert.equal(getClusterDensity(null, 119), DENSITY_NORMAL);
  });

  test("spread at 120 px/period (boundary)", function () {
    assert.equal(getClusterDensity(null, 120), DENSITY_SPREAD);
  });

  test("spread at 200 px/period", function () {
    assert.equal(getClusterDensity(null, 200), DENSITY_SPREAD);
  });
});

// ── Dot Placement ─────────────────────────────────────────────────────────

describe("dot placement", function () {
  const computeDotPositions =
    axisSandbox.window.AdminTimelineClusterPlacement.computeDotPositions.bind(
      axisSandbox.window.AdminTimelineClusterPlacement,
    );

  test("single event per period — y offset is 0", function () {
    var grouped = { PreIncarnation: [{ id: 1, title: "Test" }] };
    var result = computeDotPositions(grouped, 80);
    var positions = result["PreIncarnation"];
    assert.equal(positions.length, 1);
    assert.equal(positions[0].yOffset, 0);
    assert.equal(positions[0].xFan, 0);
  });

  test("two events in same period — stacked vertically", function () {
    var grouped = { PreIncarnation: [{ id: 1 }, { id: 2 }] };
    var result = computeDotPositions(grouped, 80);
    var positions = result["PreIncarnation"];
    assert.equal(positions.length, 2);
    // normal spacing is 16, so offsets are -8 and +8
    assert.equal(positions[0].yOffset, -8);
    assert.equal(positions[1].yOffset, 8);
  });

  test("no overlaps at any tier", function () {
    var grouped = {
      PreIncarnation: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    };
    var scales = [30, 55, 80, 119, 120, 200];
    for (var s = 0; s < scales.length; s++) {
      var result = computeDotPositions(grouped, scales[s]);
      var positions = result["PreIncarnation"];
      assert.equal(
        positions.length,
        5,
        "should have 5 positions at scale " + scales[s],
      );
      // Verify all y offsets are unique
      var offsets = positions.map(function (p) {
        return p.yOffset;
      });
      var unique = [];
      for (var o = 0; o < offsets.length; o++) {
        assert.ok(
          unique.indexOf(offsets[o]) === -1,
          "duplicate offset at scale " + scales[s],
        );
        unique.push(offsets[o]);
      }
    }
  });

  test("spread tier adds horizontal fan-out", function () {
    var grouped = { PreIncarnation: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    var result = computeDotPositions(grouped, 200); // spread tier
    var positions = result["PreIncarnation"];
    // At least some should have non-zero xFan
    var hasFan = positions.some(function (p) {
      return p.xFan !== 0;
    });
    assert.ok(hasFan, "spread tier should add horizontal fan-out");
  });
});

// ── Label Modes ───────────────────────────────────────────────────────────

describe("label modes", function () {
  const LABEL_FULL = axisSandbox.window.AdminTimelineClusterLabels.LABEL_FULL;
  const LABEL_TRUNCATED =
    axisSandbox.window.AdminTimelineClusterLabels.LABEL_TRUNCATED;
  const LABEL_HIDDEN =
    axisSandbox.window.AdminTimelineClusterLabels.LABEL_HIDDEN;
  const computeLabelModes =
    axisSandbox.window.AdminTimelineClusterLabels.computeLabelModes.bind(
      axisSandbox.window.AdminTimelineClusterLabels,
    );

  test("single event — full label in all tiers", function () {
    var descs = [{ event: { id: 1 }, timeline_period: "PreIncarnation" }];
    var modes = computeLabelModes(descs, "compact");
    assert.equal(modes[0].mode, LABEL_FULL);

    modes = computeLabelModes(descs, "normal");
    assert.equal(modes[0].mode, LABEL_FULL);

    modes = computeLabelModes(descs, "spread");
    assert.equal(modes[0].mode, LABEL_FULL);
  });

  test("compact tier: 2-3 events → truncated, 4+ → hidden", function () {
    var twoEvents = [
      { event: { id: 1 }, timeline_period: "Life" },
      { event: { id: 2 }, timeline_period: "Life" },
    ];
    var modes = computeLabelModes(twoEvents, "compact");
    assert.equal(modes[0].mode, LABEL_TRUNCATED);
    assert.equal(modes[1].mode, LABEL_TRUNCATED);

    var fourEvents = [
      { event: { id: 1 }, timeline_period: "Life" },
      { event: { id: 2 }, timeline_period: "Life" },
      { event: { id: 3 }, timeline_period: "Life" },
      { event: { id: 4 }, timeline_period: "Life" },
    ];
    modes = computeLabelModes(fourEvents, "compact");
    assert.equal(modes[0].mode, LABEL_HIDDEN);
  });

  test("normal and spread tiers: all labels full", function () {
    var descs = [
      { event: { id: 1 }, timeline_period: "Life" },
      { event: { id: 2 }, timeline_period: "Life" },
      { event: { id: 3 }, timeline_period: "Life" },
    ];
    var modes = computeLabelModes(descs, "normal");
    for (var i = 0; i < modes.length; i++) {
      assert.equal(modes[i].mode, LABEL_FULL);
    }

    modes = computeLabelModes(descs, "spread");
    for (var i = 0; i < modes.length; i++) {
      assert.equal(modes[i].mode, LABEL_FULL);
    }
  });
});
