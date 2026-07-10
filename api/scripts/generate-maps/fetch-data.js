#!/usr/bin/env node
/**
 * One-off data-prep script: downloads Natural Earth 10m physical vector
 * layers and clips them to a generous bbox covering all five canonical map
 * configs, so the committed data/*.geojson files stay small while keeping
 * full 10m fidelity for our region. Not part of the build — run manually
 * whenever the source data needs refreshing:
 *
 *   node api/scripts/generate-maps/fetch-data.js
 *
 * Source: Natural Earth 10m Physical Vectors, "Land", "Lakes", and
 * "Rivers + lake centerlines" layers (naturalearthdata.com), fetched as
 * pre-converted GeoJSON from the community mirror:
 *   https://github.com/nvkelso/natural-earth-vector (geojson/ directory)
 * Natural Earth data is public domain — no attribution required
 * (https://www.naturalearthdata.com/about/terms-of-use/).
 *
 * Layers fetched (remote -> local):
 *   ne_10m_land.geojson                     -> data/coastline.geojson (land-fill polygons)
 *   ne_10m_lakes.geojson                    -> data/lakes.geojson
 *   ne_10m_rivers_lake_centerlines.geojson  -> data/rivers.geojson
 *
 * @module generate-maps/fetch-data
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const { MAP_CONFIGS } = require("./map-configs");
const { clipGeometryToBBox } = require("./project");

const DATA_DIR = path.resolve(__dirname, "data");
const MIRROR_BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

const SOURCES = [
  { remote: "ne_10m_land", local: "coastline.geojson" },
  { remote: "ne_10m_lakes", local: "lakes.geojson" },
  { remote: "ne_10m_rivers_lake_centerlines", local: "rivers.geojson" },
];

// Generous margin (degrees) added around the union of all map bboxes, so
// per-map clipping at generation time always has data to work with.
const UNION_MARGIN_DEGREES = 3;

function unionBBox(configs) {
  const boxes = Object.values(configs).map((c) => c.bbox);
  return {
    lon_min: Math.min(...boxes.map((b) => b.lon_min)) - UNION_MARGIN_DEGREES,
    lat_min: Math.min(...boxes.map((b) => b.lat_min)) - UNION_MARGIN_DEGREES,
    lon_max: Math.max(...boxes.map((b) => b.lon_max)) + UNION_MARGIN_DEGREES,
    lat_max: Math.max(...boxes.map((b) => b.lat_max)) + UNION_MARGIN_DEGREES,
  };
}

function bboxesIntersect(a, b) {
  return !(
    a.lon_max < b.lon_min ||
    a.lon_min > b.lon_max ||
    a.lat_max < b.lat_min ||
    a.lat_min > b.lat_max
  );
}

function geometryBBox(geometry) {
  let lon_min = Infinity;
  let lat_min = Infinity;
  let lon_max = -Infinity;
  let lat_max = -Infinity;

  const visit = (coords) => {
    if (typeof coords[0] === "number") {
      const [lon, lat] = coords;
      if (lon < lon_min) lon_min = lon;
      if (lon > lon_max) lon_max = lon;
      if (lat < lat_min) lat_min = lat;
      if (lat > lat_max) lat_max = lat;
      return;
    }
    for (const c of coords) visit(c);
  };
  visit(geometry.coordinates);

  return { lon_min, lat_min, lon_max, lat_max };
}

function fetchURL(url, redirectsLeft) {
  const remaining = redirectsLeft == null ? 5 : redirectsLeft;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (remaining <= 0) {
            reject(new Error(`Too many redirects fetching ${url}`));
            return;
          }
          resolve(fetchURL(res.headers.location, remaining - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GET ${url} failed with status ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function fetchAndClip(source, bbox) {
  const url = `${MIRROR_BASE}/${source.remote}.geojson`;
  console.log(`Fetching ${url} ...`);
  const raw = await fetchURL(url);
  const fc = JSON.parse(raw);
  if (!fc || fc.type !== "FeatureCollection") {
    throw new Error(`Expected a FeatureCollection from ${url}`);
  }

  const clippedFeatures = [];
  for (const feature of fc.features) {
    if (!feature || !feature.geometry) continue;
    if (!bboxesIntersect(geometryBBox(feature.geometry), bbox)) continue;
    const clipped = clipGeometryToBBox(feature.geometry, bbox);
    if (!clipped) continue;
    clippedFeatures.push({
      type: "Feature",
      properties: feature.properties || {},
      geometry: clipped,
    });
  }

  const out = { type: "FeatureCollection", features: clippedFeatures };
  const json = JSON.stringify(out);
  const outPath = path.join(DATA_DIR, source.local);
  fs.writeFileSync(outPath, json, "utf8");
  const sizeKB = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);
  console.log(`  -> ${outPath} (${clippedFeatures.length} features, ${sizeKB} KB)`);
}

async function main() {
  const bbox = unionBBox(MAP_CONFIGS);
  console.log(
    `Union bbox (with ${UNION_MARGIN_DEGREES}° margin): ` +
      `lon [${bbox.lon_min}, ${bbox.lon_max}], lat [${bbox.lat_min}, ${bbox.lat_max}]`,
  );
  fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const source of SOURCES) {
    await fetchAndClip(source, bbox);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("fetch-data failed:", e.message);
  process.exit(1);
});
