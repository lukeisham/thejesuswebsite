// Unit tests for api/lib/map-geo.js — lat/lng ↔ percentage conversion,
// bbox validation, and round-trip stability across all five maps.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  MAP_BBOXES,
  latLngToPercent,
  percentToLatLng,
  isInBounds,
  getBBox,
  getMapKeys,
} = require("../lib/map-geo");

// ── MAP_BBOXES structure ─────────────────────────────────────────────────────

describe("MAP_BBOXES", () => {
  test("has all five canonical maps", () => {
    const keys = getMapKeys();
    assert.deepEqual(keys.sort(), [
      "galilee",
      "jerusalem",
      "judea",
      "levant",
      "roman-empire",
    ]);
  });

  test("every bbox has valid lon/lat ranges", () => {
    for (const [key, bbox] of Object.entries(MAP_BBOXES)) {
      assert.ok(bbox.lon_max > bbox.lon_min, `${key}: lon_max > lon_min`);
      assert.ok(bbox.lat_max > bbox.lat_min, `${key}: lat_max > lat_min`);
      assert.ok(
        bbox.lon_min >= -180 && bbox.lon_max <= 180,
        `${key}: lon in range`,
      );
      assert.ok(
        bbox.lat_min >= -90 && bbox.lat_max <= 90,
        `${key}: lat in range`,
      );
    }
  });
});

// ── getBBox ──────────────────────────────────────────────────────────────────

describe("getBBox", () => {
  test("returns the galilee bbox", () => {
    const bbox = getBBox("galilee");
    assert.ok(bbox);
    assert.equal(bbox.lon_min, 34.9);
    assert.equal(bbox.lat_max, 33.5);
  });

  test("returns undefined for unknown key", () => {
    assert.equal(getBBox("atlantis"), undefined);
  });
});

// ── latLngToPercent ──────────────────────────────────────────────────────────

describe("latLngToPercent", () => {
  test("converts galilee centre to ~50%", () => {
    const result = latLngToPercent("galilee", 32.85, 35.45);
    assert.ok(Math.abs(result.x - 50) < 1);
    assert.ok(Math.abs(result.y - 50) < 1);
  });

  test("known site — Capernaum on galilee map", () => {
    // Capernaum: ~32.8811, 35.5751
    const result = latLngToPercent("galilee", 32.8811, 35.5751);
    // Should land roughly on the NW shore of the Sea of Galilee
    assert.ok(
      result.x > 40 && result.x < 80,
      `x=${result.x} should be in 40-80 range`,
    );
    assert.ok(
      result.y > 30 && result.y < 70,
      `y=${result.y} should be in 30-70 range`,
    );
  });

  test("converts bbox corners to 0%/100% for jerusalem", () => {
    const topLeft = latLngToPercent("jerusalem", 31.7895, 35.216);
    assert.equal(topLeft.x, 0);
    assert.equal(topLeft.y, 0);

    const bottomRight = latLngToPercent("jerusalem", 31.7625, 35.248);
    assert.equal(bottomRight.x, 100);
    assert.equal(bottomRight.y, 100);
  });

  test("known site — Golgotha on jerusalem map", () => {
    // Golgotha: ~35.2296, 31.7784
    const result = latLngToPercent("jerusalem", 31.7784, 35.2296);
    // Should land in the Old City area (central ~third)
    assert.ok(
      result.x > 35 && result.x < 50,
      `x=${result.x} should be in Old City`,
    );
    assert.ok(
      result.y > 35 && result.y < 50,
      `y=${result.y} should be central`,
    );
  });

  test("throws for unknown map key", () => {
    assert.throws(() => latLngToPercent("narnia", 0, 0));
  });

  test("throws for non-finite lat", () => {
    assert.throws(() => latLngToPercent("galilee", NaN, 35));
  });

  test("throws for lat out of range", () => {
    assert.throws(() => latLngToPercent("galilee", 100, 35));
    assert.throws(() => latLngToPercent("galilee", -100, 35));
  });

  test("throws for lng out of range", () => {
    assert.throws(() => latLngToPercent("galilee", 32, 200));
    assert.throws(() => latLngToPercent("galilee", 32, -200));
  });
});

// ── percentToLatLng ──────────────────────────────────────────────────────────

describe("percentToLatLng", () => {
  test("converts 50% back to centre for galilee", () => {
    const result = percentToLatLng("galilee", 50, 50);
    assert.ok(Math.abs(result.lat - 32.85) < 0.1);
    assert.ok(Math.abs(result.lng - 35.45) < 0.1);
  });

  test("converts 0% to top-left corner for jerusalem", () => {
    const result = percentToLatLng("jerusalem", 0, 0);
    assert.ok(Math.abs(result.lat - 31.7895) < 0.001);
    assert.ok(Math.abs(result.lng - 35.216) < 0.001);
  });

  test("converts 100% to bottom-right corner for jerusalem", () => {
    const result = percentToLatLng("jerusalem", 100, 100);
    assert.ok(Math.abs(result.lat - 31.7625) < 0.001);
    assert.ok(Math.abs(result.lng - 35.248) < 0.001);
  });

  test("throws for unknown map key", () => {
    assert.throws(() => percentToLatLng("narnia", 50, 50));
  });

  test("throws for non-finite percentage", () => {
    assert.throws(() => percentToLatLng("galilee", NaN, 50));
    assert.throws(() => percentToLatLng("galilee", 50, Infinity));
  });
});

// ── Round-trip stability ─────────────────────────────────────────────────────

describe("latLngToPercent ↔ percentToLatLng round-trip", () => {
  const testCases = [
    { mapKey: "galilee", lat: 32.8811, lng: 35.5751, label: "Capernaum" },
    { mapKey: "jerusalem", lat: 31.778, lng: 35.2354, label: "Temple Mount" },
    { mapKey: "judea", lat: 31.778, lng: 35.2354, label: "Jerusalem in Judea" },
    {
      mapKey: "levant",
      lat: 31.778,
      lng: 35.2354,
      label: "Jerusalem in Levant",
    },
    { mapKey: "roman-empire", lat: 41.9, lng: 12.5, label: "Rome" },
  ];

  for (const tc of testCases) {
    test(`round-trips ${tc.label} on ${tc.mapKey} map`, () => {
      const pct = latLngToPercent(tc.mapKey, tc.lat, tc.lng);
      const back = percentToLatLng(tc.mapKey, pct.x, pct.y);
      // Allow small float error from percentage rounding (2 decimal places)
      assert.ok(
        Math.abs(back.lat - tc.lat) < 0.02,
        `lat: ${back.lat} should be ~${tc.lat}`,
      );
      assert.ok(
        Math.abs(back.lng - tc.lng) < 0.02,
        `lng: ${back.lng} should be ~${tc.lng}`,
      );
    });
  }

  test("round-trips percentages back to percentages for all five maps", () => {
    for (const mapKey of getMapKeys()) {
      for (const testPct of [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 100 },
        { x: 25.5, y: 73.8 },
      ]) {
        const geo = percentToLatLng(mapKey, testPct.x, testPct.y);
        const pct = latLngToPercent(mapKey, geo.lat, geo.lng);
        assert.ok(
          Math.abs(pct.x - testPct.x) < 0.05,
          `${mapKey}: x ${pct.x} should round-trip to ${testPct.x}`,
        );
        assert.ok(
          Math.abs(pct.y - testPct.y) < 0.05,
          `${mapKey}: y ${pct.y} should round-trip to ${testPct.y}`,
        );
      }
    }
  });
});

// ── isInBounds ───────────────────────────────────────────────────────────────

describe("isInBounds", () => {
  test("returns true for a point inside the bbox", () => {
    assert.equal(isInBounds("galilee", 32.85, 35.45), true);
  });

  test("returns true for a point exactly on the boundary", () => {
    assert.equal(isInBounds("galilee", 32.2, 34.9), true);
  });

  test("returns false for a point outside the bbox", () => {
    assert.equal(isInBounds("galilee", 0, 0), false);
    assert.equal(isInBounds("galilee", 32.85, 0), false);
  });

  test("returns false for unknown map key", () => {
    assert.equal(isInBounds("narnia", 0, 0), false);
  });

  test("Temple Mount is in bounds on jerusalem map", () => {
    assert.equal(isInBounds("jerusalem", 31.778, 35.2354), true);
  });

  test("Capernaum is in bounds on galilee map", () => {
    assert.equal(isInBounds("galilee", 32.8811, 35.5751), true);
  });

  test("Rome is NOT in bounds on galilee map", () => {
    assert.equal(isInBounds("galilee", 41.9, 12.5), false);
  });
});

// ── Boundary edge cases ──────────────────────────────────────────────────────

describe("edge cases", () => {
  test("point just outside a bbox edge is out of bounds", () => {
    // Jerusalem bbox: lat 31.7625–31.7895, lon 35.216–35.248
    assert.equal(isInBounds("jerusalem", 31.75, 35.23), false);
    assert.equal(isInBounds("jerusalem", 31.78, 35.21), false);
  });

  test("point just inside a bbox edge is in bounds", () => {
    assert.equal(isInBounds("jerusalem", 31.763, 35.217), true);
  });

  test("Bethany is out of bounds on jerusalem map", () => {
    // Bethany: ~35.2606, 31.7712 — intentionally off-map (shown as edge arrow)
    assert.equal(isInBounds("jerusalem", 31.7712, 35.2606), false);
  });

  test("Bethphage is at the eastern margin of jerusalem map", () => {
    // Bethphage: ~35.248, 31.778 — at the eastern edge
    assert.equal(isInBounds("jerusalem", 31.778, 35.248), true);
  });

  test("Mount of Olives is in bounds on jerusalem map", () => {
    assert.equal(isInBounds("jerusalem", 31.779, 35.243), true);
  });

  test("Gethsemane is in bounds on jerusalem map", () => {
    assert.equal(isInBounds("jerusalem", 31.7795, 35.2395), true);
  });
});
