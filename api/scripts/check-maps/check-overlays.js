/**
 * Check 3: do the drawn roads, borders and lakes match AD 30 geography?
 *
 * The shapes come from api/scripts/generate-maps/overlays/ancient-features.geo.json,
 * the same file that the generator draws. This check compares them with the
 * reference roads, boundaries and lakes, and tests that no road runs through
 * the sea as the base map draws it.
 *
 * @module check-maps/check-overlays
 */

const { getFeatureByName } = require("./reference");
const { haversineKm, pxToLonLat, lonLatToPx, pointToPolylineKm } = require("./geo-units");

// Boundary and road references only make sense on a regional map.
const REGIONAL_SPAN_DEGREES = 10;
const MIN_TOLERANCE_KM = 8;
const MAX_TOLERANCE_KM = 40;
const TOLERANCE_FRACTION_OF_DIAGONAL = 0.03;
const SAMPLE_STEP_PX = 4;
// More than this share of a drawn road in the sea means the road is misplaced.
const MAX_WATER_SHARE = 0.2;

/**
 * Allowed miss in kilometres. It grows with the map so a continent-scale map
 * is not judged to a village-scale rule.
 *
 * @param {Object} bbox
 * @returns {number}
 */
function toleranceKm(bbox) {
  const diagonal = haversineKm(bbox.lon_min, bbox.lat_min, bbox.lon_max, bbox.lat_max);
  return Math.min(MAX_TOLERANCE_KM, Math.max(MIN_TOLERANCE_KM, diagonal * TOLERANCE_FRACTION_OF_DIAGONAL));
}

function inBBox(bbox, lon, lat) {
  return lon >= bbox.lon_min && lon <= bbox.lon_max && lat >= bbox.lat_min && lat <= bbox.lat_max;
}

/**
 * Pick the features that the generator draws on one map, as lon/lat lines.
 *
 * @param {string} mapKey
 * @param {{roads: Array, boundaries: Array, lakes: Array}} features - From loadAncientFeatures().
 * @returns {{roads: Array, boundaries: Array, lakes: Array<{lon: number, lat: number}>}}
 */
function selectGeoShapes(mapKey, features) {
  const shown = (list) => list.filter((f) => f.maps.includes(mapKey));
  const toLine = (pairs) => pairs.map(([lon, lat]) => ({ lon, lat }));
  return {
    roads: shown(features.roads).map((f) => toLine(f.points)),
    boundaries: shown(features.boundaries).map((f) => toLine(f.points)),
    lakes: shown(features.lakes).map((f) => {
      const ring = toLine(f.polygon);
      return {
        lon: ring.reduce((sum, p) => sum + p.lon, 0) / ring.length,
        lat: ring.reduce((sum, p) => sum + p.lat, 0) / ring.length,
      };
    }),
  };
}

/**
 * Points along a drawn line, one every SAMPLE_STEP_PX pixels.
 *
 * @param {Array<{x: number, y: number}>} pixels
 * @returns {Array<{x: number, y: number}>}
 */
function samplePixels(pixels) {
  const samples = [pixels[0]];
  for (let i = 0; i < pixels.length - 1; i++) {
    const a = pixels[i];
    const b = pixels[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE_STEP_PX));
    for (let s = 1; s <= steps; s++) {
      samples.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps });
    }
  }
  return samples;
}

function describeLine(line) {
  const first = line[0];
  const last = line[line.length - 1];
  return `${first.lon.toFixed(2)}°E ${first.lat.toFixed(2)}°N to ${last.lon.toFixed(2)}°E ${last.lat.toFixed(2)}°N`;
}

function checkRoads(mapKey, cfg, reference, overlay, isWater, tolerance) {
  const findings = [];
  const lines = overlay.roads;

  lines.forEach((line, i) => {
    const samples = samplePixels(line.map((p) => lonLatToPx(cfg, p.lon, p.lat))).map((p) => pxToLonLat(cfg, p.x, p.y));
    const wet = samples.filter((p) => isWater(p.lon, p.lat)).length / samples.length;
    if (wet > MAX_WATER_SHARE) {
      findings.push({
        map: mapKey,
        check: "road",
        severity: "error",
        message: `Drawn road ${describeLine(line)} runs ${Math.round(wet * 100)}% through water.`,
      });
    }
  });

  const matched = new Set();
  for (const road of reference.roads) {
    const stops = road.via
      .map((name) => getFeatureByName(reference.features, name))
      .filter((f) => f && inBBox(cfg.bbox, f.lng, f.lat));
    if (stops.length < 2) continue;
    const span = Math.max(...stops.map((s) => haversineKm(stops[0].lng, stops[0].lat, s.lng, s.lat)));
    if (span < tolerance * 2) continue;

    let best = { mean: Infinity, index: -1 };
    lines.forEach((line, i) => {
      const misses = stops.map((s) => pointToPolylineKm({ lon: s.lng, lat: s.lat }, line));
      const mean = misses.reduce((a, b) => a + b, 0) / misses.length;
      if (mean < best.mean) best = { mean, index: i };
    });

    const stopNames = stops.map((s) => s.names[0]).join(", ");
    if (best.index === -1) {
      findings.push({ map: mapKey, check: "road", severity: "warn", message: `No road is drawn for "${road.name}" (${stopNames}).` });
    } else if (best.mean > tolerance) {
      findings.push({
        map: mapKey,
        check: "road",
        severity: "error",
        message: `"${road.name}" is missed by ${best.mean.toFixed(0)} km on average (limit ${tolerance.toFixed(0)} km). Nearest drawn line: ${describeLine(lines[best.index])}. Stops: ${stopNames}.`,
      });
    } else {
      matched.add(best.index);
    }
  }

  lines.forEach((line, i) => {
    if (matched.has(i)) return;
    findings.push({
      map: mapKey,
      check: "road",
      severity: "info",
      message: `Drawn road ${describeLine(line)} matches no reference road.`,
    });
  });
  return findings;
}

// The reference boundaries are approximate lines from Josephus, so they get a wider miss than roads.
const BOUNDARY_TOLERANCE_FACTOR = 2;

function checkBoundaries(mapKey, cfg, reference, overlay, roadTolerance) {
  const tolerance = roadTolerance * BOUNDARY_TOLERANCE_FACTOR;
  const span = cfg.bbox.lat_max - cfg.bbox.lat_min;
  if (span > REGIONAL_SPAN_DEGREES) return [];

  const findings = [];
  const lines = overlay.boundaries;
  const meanLat = (line) => line.reduce((sum, p) => sum + p.lat, 0) / line.length;
  const applicable = reference.boundaries.filter(
    (b) => (!b.maps || b.maps.includes(mapKey)) && inBBox(cfg.bbox, (b.lonMin + b.lonMax) / 2, b.lat),
  );

  // Pair the closest reference and drawn boundaries first, and use each drawn line once.
  // Without this, one drawn line is the nearest match for every reference boundary.
  const pairs = [];
  applicable.forEach((boundary, r) => {
    lines.forEach((line, i) => pairs.push({ r, i, km: Math.abs(meanLat(line) - boundary.lat) * 111.19 }));
  });
  pairs.sort((a, b) => a.km - b.km);
  const matched = new Set();
  const assigned = new Map();
  for (const pair of pairs) {
    if (assigned.has(pair.r) || matched.has(pair.i)) continue;
    assigned.set(pair.r, pair);
    matched.add(pair.i);
  }

  applicable.forEach((boundary, r) => {
    const pair = assigned.get(r);
    if (!pair) {
      findings.push({ map: mapKey, check: "boundary", severity: "warn", message: `No boundary is drawn for "${boundary.name}".` });
    } else if (pair.km > tolerance) {
      findings.push({
        map: mapKey,
        check: "boundary",
        severity: "error",
        message: `"${boundary.name}" should lie near ${boundary.lat}°N. The closest unused drawn boundary is ${pair.km.toFixed(0)} km away (${describeLine(lines[pair.i])}).`,
      });
    }
  });

  lines.forEach((line, i) => {
    if (matched.has(i)) return;
    findings.push({
      map: mapKey,
      check: "boundary",
      severity: "info",
      message: `Drawn boundary ${describeLine(line)} cannot be checked against a reference.`,
    });
  });
  return findings;
}

function checkLakes(mapKey, cfg, reference, overlay) {
  const findings = [];
  for (const lake of overlay.lakes) {
    const { lon, lat } = lake;
    const inside = reference.features.filter((f) => f.kind === "lake" && inBBox(cfg.bbox, f.lng, f.lat));
    if (!inside.length) continue;
    const nearest = inside
      .map((f) => ({ f, km: haversineKm(lon, lat, f.lng, f.lat) }))
      .sort((a, b) => a.km - b.km)[0];
    if (nearest.km > nearest.f.radiusKm) {
      findings.push({
        map: mapKey,
        check: "lake",
        severity: "error",
        message: `Drawn lake at ${lon.toFixed(2)}°E ${lat.toFixed(2)}°N is ${nearest.km.toFixed(0)} km from ${nearest.f.names[0]} (limit ${nearest.f.radiusKm} km).`,
      });
    }
  }
  return findings;
}

/**
 * @param {string} mapKey
 * @param {Object} cfg - Map config from map-configs.js.
 * @param {Object} reference - From loadReference().
 * @param {Object} overlay - From selectGeoShapes().
 * @param {function(number, number): boolean} isWater - From buildWaterTest().
 * @returns {Array<{map: string, check: string, severity: string, message: string}>}
 */
function checkOverlays(mapKey, cfg, reference, overlay, isWater) {
  const tolerance = toleranceKm(cfg.bbox);
  return [
    ...checkRoads(mapKey, cfg, reference, overlay, isWater, tolerance),
    ...checkBoundaries(mapKey, cfg, reference, overlay, tolerance),
    ...checkLakes(mapKey, cfg, reference, overlay),
  ];
}

module.exports = { checkOverlays, selectGeoShapes };
