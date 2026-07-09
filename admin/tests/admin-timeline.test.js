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

vm.runInNewContext(axisSource, axisSandbox);

const {
  periodToX,
  xToPeriod,
  periodOrdinal,
  eraOrdinal,
  eraStartX,
  totalWidth,
} = axisSandbox.window.AdminTimelineAxis;

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
  test("maps the first period to x = 0 at default scale", function () {
    var x = periodToX("PreIncarnation", 80, 0);
    assert.equal(x, 0);
  });

  test("scales with pxPerUnit", function () {
    var x = periodToX("OldTestament", 80, 0);
    assert.equal(x, 80);

    x = periodToX("OldTestament", 160, 0);
    assert.equal(x, 160);
  });

  test("adds the pan offset", function () {
    var x = periodToX("PreIncarnation", 80, 100);
    assert.equal(x, 100);

    x = periodToX("OldTestament", 80, -50);
    assert.equal(x, 30);
  });

  test("defaults to 80 px/period when no scale given", function () {
    var x = periodToX("OldTestament");
    assert.equal(x, 80);
  });
});

// ── xToPeriod ────────────────────────────────────────────────────────────────

describe("xToPeriod", function () {
  test("maps x = 0 to PreIncarnation at default scale", function () {
    var period = xToPeriod(0, 80, 0);
    assert.equal(period, "PreIncarnation");
  });

  test("maps x = 80 to OldTestament at default scale", function () {
    var period = xToPeriod(80, 80, 0);
    assert.equal(period, "OldTestament");
  });

  test("snaps to the nearest period", function () {
    // x = 100 is between OldTestament (80) and EarlyLifeUnborn (160) → closer to 80
    var period = xToPeriod(100, 80, 0);
    assert.equal(period, "OldTestament");

    // x = 130 is closer to 160
    period = xToPeriod(130, 80, 0);
    assert.equal(period, "EarlyLifeUnborn");
  });

  test("accounts for pan offset", function () {
    // With offset 200: x=200 → period 0, x=360 → period 2 (160*1 + 200 = 360)
    var period = xToPeriod(360, 80, 200);
    assert.equal(period, "EarlyLifeUnborn");
  });

  test("clamps to the valid range", function () {
    var period = xToPeriod(-1000, 80, 0);
    assert.equal(period, "PreIncarnation");

    period = xToPeriod(999999, 80, 0);
    // Should be the last period (ReturnOfJesus)
    assert.ok(typeof period === "string");
    assert.ok(period.length > 0);
  });

  test("defaults to 80 px/period when no scale given", function () {
    var period = xToPeriod(0);
    assert.equal(period, "PreIncarnation");
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
    var x = eraStartX("PreIncarnation", 80, 0);
    assert.equal(x, periodToX("PreIncarnation", 80, 0));
  });

  test("maps GalileeMinistry era to GalileeCallingTwelve position", function () {
    var x = eraStartX("GalileeMinistry", 80, 0);
    assert.equal(x, periodToX("GalileeCallingTwelve", 80, 0));
  });

  test("maps PassionWeek era to PassionPalmSunday position", function () {
    var x = eraStartX("PassionWeek", 80, 0);
    assert.equal(x, periodToX("PassionPalmSunday", 80, 0));
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
    var w1 = totalWidth(80);
    var w2 = totalWidth(160);
    assert.equal(w2, w1 * 2);
  });

  test("defaults to 80 px/period when no scale given", function () {
    var w = totalWidth();
    assert.ok(w > 1000); // 38 periods * 80px = 3040
  });
});
