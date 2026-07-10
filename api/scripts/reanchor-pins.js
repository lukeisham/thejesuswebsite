#!/usr/bin/env node
/**
 * Pin re-anchor script.
 *
 * Usage:  node api/scripts/reanchor-pins.js [map_key]
 *
 *   - With map_key: re-anchors only pins on that map.
 *   - Without arguments: re-anchors all pins that have lat/lng.
 *
 * For every pin with non-null lat/lng, recomputes x/y from the
 * current map bbox (via api/lib/map-geo.js) and updates the row.
 * Prints a per-pin report.
 *
 * Run this after any base-map SVG regeneration so the percentage
 * positions stay aligned with the updated geography.
 *
 * @module scripts/reanchor-pins
 */

const db = require("../config");
const { latLngToPercent, isInBounds, getMapKeys } = require("../lib/map-geo");

// ── Helpers ──────────────────────────────────────────────────────────────────

function reanchorPins(mapKey) {
  // Find all pins on this map that have lat/lng
  const pins = db
    .prepare(
      `SELECT mp.id, mp.label, mp.lat, mp.lng, mp.x, mp.y, mp.map_id, m.map_key
       FROM map_pins mp
       JOIN maps m ON mp.map_id = m.id
       WHERE m.map_key = ? AND mp.lat IS NOT NULL AND mp.lng IS NOT NULL`,
    )
    .all(mapKey);

  if (pins.length === 0) {
    console.log(`  No geo-anchored pins to re-anchor on ${mapKey}.`);
    return;
  }

  const updateStmt = db.prepare(
    "UPDATE map_pins SET x = ?, y = ? WHERE id = ?",
  );

  let updated = 0;
  let skipped = 0;

  for (const pin of pins) {
    if (!isInBounds(mapKey, pin.lat, pin.lng)) {
      console.log(
        `  [skip]  pin #${pin.id} "${pin.label}" — lat/lng (${pin.lat}, ${pin.lng}) outside ${mapKey} bbox`,
      );
      skipped++;
      continue;
    }

    const pct = latLngToPercent(mapKey, pin.lat, pin.lng);
    const oldX = pin.x;
    const oldY = pin.y;

    updateStmt.run(pct.x, pct.y, pin.id);

    console.log(
      `  [ok]    pin #${pin.id} "${pin.label}" — (${pin.lat}, ${pin.lng}) → x=${pct.x} y=${pct.y}  (was x=${oldX} y=${oldY})`,
    );
    updated++;
  }

  console.log(
    `  → ${updated} updated, ${skipped} skipped on ${mapKey}`,
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length > 0) {
  const mapKey = args[0];
  const validKeys = getMapKeys();
  if (!validKeys.includes(mapKey)) {
    console.error(`Unknown map key: "${mapKey}".`);
    console.error(`Valid keys: ${validKeys.join(", ")}`);
    process.exit(1);
  }
  console.log(`Re-anchoring pins on ${mapKey}...\n`);
  reanchorPins(mapKey);
} else {
  console.log("Re-anchoring all geo-anchored pins...\n");
  for (const mapKey of getMapKeys()) {
    console.log(`${mapKey}:`);
    reanchorPins(mapKey);
    console.log();
  }
  console.log("Done.");
}
