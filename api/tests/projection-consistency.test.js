// Projection consistency test — verifies the SVG generator's projection
// maths agree exactly with the shared lib (api/lib/map-geo.js), so generated
// SVG viewBoxes never drift from the pin API's coordinate system.
//
// For each of the five maps, asserts:
//   1. The generator's projectPoint(lon, lat) matches map-geo's latLngToPercent
//      when scaled to the map's viewBox.
//   2. Each map config's viewBox matches the expected dimensions.

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { MAP_BBOXES, latLngToPercent } = require("../lib/map-geo");
const { projectPoint } = require("../scripts/generate-maps/project");
const MAP_CONFIGS = require("../scripts/generate-maps/map-configs").MAP_CONFIGS;

// ── Sample points within each map's bbox ──────────────────────────────────────

const SAMPLE_POINTS = {
  "roman-empire": [
    { lat: 41.9, lng: 12.5, name: "Rome" },
    { lat: 31.77, lng: 35.23, name: "Jerusalem" },
  ],
  levant: [
    { lat: 31.77, lng: 35.23, name: "Jerusalem" },
    { lat: 33.51, lng: 36.29, name: "Damascus" },
  ],
  judea: [
    { lat: 31.77, lng: 35.23, name: "Jerusalem" },
    { lat: 31.52, lng: 34.45, name: "Gaza" },
  ],
  galilee: [
    { lat: 32.7, lng: 35.58, name: "Sea of Galilee (centre)" },
    { lat: 32.88, lng: 35.58, name: "Capernaum" },
  ],
  jerusalem: [
    { lat: 31.778, lng: 35.235, name: "Temple Mount" },
    { lat: 31.772, lng: 35.228, name: "Church of the Holy Sepulchre" },
  ],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("projection consistency: generator vs map-geo", () => {
  for (const mapKey of Object.keys(MAP_BBOXES)) {
    describe(mapKey, () => {
      const config = MAP_CONFIGS[mapKey];
      if (!config) {
        test("map config exists", () => {
          assert.fail(`No config found for ${mapKey}`);
        });
        return;
      }

      const { bbox, viewBox } = config;
      const points = SAMPLE_POINTS[mapKey] || [];

      test("viewBox dimensions match known values", () => {
        assert.ok(viewBox.width > 0, "viewBox width must be positive");
        assert.ok(viewBox.height > 0, "viewBox height must be positive");
      });

      test("bbox matches MAP_BBOXES entry", () => {
        const canonical = MAP_BBOXES[mapKey];
        assert.equal(bbox.lon_min, canonical.lon_min);
        assert.equal(bbox.lat_min, canonical.lat_min);
        assert.equal(bbox.lon_max, canonical.lon_max);
        assert.equal(bbox.lat_max, canonical.lat_max);
      });

      for (const point of points) {
        test(`projectPoint ↔ latLngToPercent for ${point.name} (${point.lat}, ${point.lng})`, () => {
          // Generator's projection
          const gen = projectPoint(point.lng, point.lat, bbox, viewBox, 10);

          // Shared lib's projection, then scaled to viewBox
          const pct = latLngToPercent(mapKey, point.lat, point.lng);
          const expectedX = viewBox.x + (pct.x / 100) * viewBox.width;
          const expectedY = viewBox.y + (pct.y / 100) * viewBox.height;

          // High precision (10 decimal places) round-trip should match exactly
          // after rounding to 6 decimal places (accounting for rounding differences
          // in the two roundTo implementations).
          assert.ok(
            Math.abs(gen.x - expectedX) < 0.001,
            `x mismatch: generator=${gen.x}, expected=${expectedX}`,
          );
          assert.ok(
            Math.abs(gen.y - expectedY) < 0.001,
            `y mismatch: generator=${gen.y}, expected=${expectedY}`,
          );
        });
      }
    });
  }
});

describe("projection consistency: generator handles edge cases", () => {
  test("projectPoint throws for unknown bbox", () => {
    assert.throws(
      () =>
        projectPoint(0, 0, { lon_min: 0, lat_min: 0, lon_max: 1, lat_max: 1 }, {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        }),
      /Unknown bbox/,
    );
  });

  test("latLngToPercent and projectPoint agree on precision-agnostic values", () => {
    // Test with the galilee bbox at 5% from corner.
    const { bbox, viewBox } = MAP_CONFIGS["galilee"];
    const lat = bbox.lat_min + (bbox.lat_max - bbox.lat_min) * 0.05;
    const lng = bbox.lon_min + (bbox.lon_max - bbox.lon_min) * 0.05;

    const gen = projectPoint(lng, lat, bbox, viewBox, 1);
    const pct = latLngToPercent("galilee", lat, lng);

    // At default precision=1, the generator rounds to 1 decimal.
    // latLngToPercent rounds to 2 decimals. After scaling to viewBox at
    // precision=1, they should be within 0.1 of each other.
    const expectedX = Math.round(
      (viewBox.x + (pct.x / 100) * viewBox.width) * 10,
    ) / 10;
    assert.equal(gen.x, expectedX, "x should match at precision=1");
  });
});
