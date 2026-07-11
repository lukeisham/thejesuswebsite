// Map data access — all SQL for the `maps` and `map_pins` tables lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { pickWritable, runUpdate } = require("./model-helpers");
const evidenceModel = require("./evidence.model");

// Columns the admin is allowed to write for map creation/updates.
const MAP_WRITABLE_COLUMNS = [
  "map_key",
  "map_name",
  "description",
  "image_path",
];

// Columns the admin is allowed to write for map pin creation/updates.
const PIN_WRITABLE_COLUMNS = [
  "map_id",
  "evidence_id",
  "label",
  "x",
  "y",
  "lat",
  "lng",
];

const {
  latLngToPercent,
  percentToLatLng,
  isInBounds,
  getBBox,
} = require("../lib/map-geo");

/**
 * Get all maps with their pin counts for listing.
 */
function getAllMaps() {
  const sql = `
        SELECT
            m.id,
            m.map_key,
            m.map_name,
            m.description,
            m.image_path,
            COUNT(mp.id) AS pin_count
        FROM maps m
        LEFT JOIN map_pins mp ON m.id = mp.map_id
        GROUP BY m.id
        ORDER BY m.map_key
    `;
  return db.prepare(sql).all();
}

/**
 * Get a single map by id with all associated pins and evidence data.
 * When `includeDrafts` is false (the default), pins linked to draft evidence
 * are excluded.
 *
 * @param {number} id
 * @param {Object} [opts]
 * @param {boolean} [opts.includeDrafts=false]
 * @returns {Object|undefined}
 */
function getMapById(id, { includeDrafts } = {}) {
  const map = db.prepare("SELECT * FROM maps WHERE id = ?").get(id);
  if (!map) return undefined;

  return { ...map, pins: getPinsByMap(id, { includeDrafts }) };
}

/**
 * Get a map by its unique key (e.g., 'galilee', 'jerusalem').
 * When `includeDrafts` is false (the default), pins linked to draft evidence
 * are excluded from the result.
 *
 * @param {string} mapKey
 * @param {Object} [opts]
 * @param {boolean} [opts.includeDrafts=false]
 * @returns {Object|undefined}
 */
function getMapByKey(mapKey, { includeDrafts } = {}) {
  const map = db.prepare("SELECT * FROM maps WHERE map_key = ?").get(mapKey);
  if (!map) return undefined;

  let pinsSql = `
        SELECT
            mp.id,
            mp.map_id,
            mp.evidence_id,
            mp.label,
            mp.x,
            mp.y,
            mp.lat,
            mp.lng,
            e.title AS evidence_title,
            e.slug AS evidence_slug,
            e.timeline_era,
            e.gospel_category,
            e.published_draft AS evidence_published
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.map_id = ?
    `;
  const params = [map.id];

  if (!includeDrafts) {
    pinsSql += " AND (e.published_draft = 1 OR mp.evidence_id IS NULL)";
  }

  pinsSql += " ORDER BY mp.label";

  const pins = db.prepare(pinsSql).all(...params);

  return { ...map, pins };
}

/**
 * Create a new map. Returns the created map (without pins).
 */
function createMap(data) {
  const row = pickWritable(data, MAP_WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO maps (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getMapById(result.lastInsertRowid);
}

/**
 * Update an existing map. Only writable fields in `data` are changed.
 * Returns the updated map, or undefined if not found.
 */
function updateMap(id, data) {
  if (!getMapById(id)) return undefined;

  const row = pickWritable(data, MAP_WRITABLE_COLUMNS);

  runUpdate(db, "maps", row, id);
  return getMapById(id);
}

/**
 * Delete a map by id. Cascading deletes its pins. Returns true if removed.
 */
function removeMap(id) {
  const result = db.prepare("DELETE FROM maps WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Create a new map pin. Returns the created pin with evidence data.
 * When lat/lng are supplied (both present and finite), x/y are derived
 * from them via the shared projection; otherwise the caller must supply
 * x/y directly.  Supplying both lat/lng AND x/y is valid — lat/lng
 * take precedence.
 * @throws {Error} if evidence_id does not reference an existing evidence row.
 * @throws {Error} if lat/lng are supplied but outside the map's bbox.
 * @throws {Error} if neither lat/lng nor x/y are supplied.
 */
function createPin(data) {
  // Validate evidence_id references an existing evidence row (draft or published)
  if (data.evidence_id != null) {
    const evidence = evidenceModel.getById(data.evidence_id);
    if (!evidence) {
      throw Object.assign(new Error("Evidence record not found."), {
        status: 404,
      });
    }
  }

  // Derive x/y from lat/lng when both are supplied
  if (
    data.lat != null &&
    data.lng != null &&
    Number.isFinite(Number(data.lat)) &&
    Number.isFinite(Number(data.lng))
  ) {
    const mapKey = _getMapKeyById(data.map_id);
    if (!mapKey) {
      throw Object.assign(new Error("map_id does not reference a known map."), {
        status: 404,
      });
    }
    const lat = Number(data.lat);
    const lng = Number(data.lng);

    // Per JS-2: reject out-of-bounds coordinates
    if (!isInBounds(mapKey, lat, lng)) {
      throw Object.assign(
        new Error(
          `Coordinates (${lat}, ${lng}) are outside the ${mapKey} map bounds.`,
        ),
        { status: 400 },
      );
    }

    const pct = latLngToPercent(mapKey, lat, lng);
    data.x = pct.x;
    data.y = pct.y;
    data.lat = roundToDecimal(lat, 5);
    data.lng = roundToDecimal(lng, 5);
  }

  // Must have x/y by now (either provided directly or derived from lat/lng)
  if (data.x == null || data.y == null) {
    throw Object.assign(
      new Error("Either (x, y) or (lat, lng) coordinates are required."),
      { status: 400 },
    );
  }

  const row = pickWritable(data, PIN_WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO map_pins (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getPinById(result.lastInsertRowid);
}

/**
 * Get a single map pin by id, with evidence data.
 */
function getPinById(id) {
  return db
    .prepare(
      `
        SELECT
            mp.id,
            mp.map_id,
            mp.evidence_id,
            mp.label,
            mp.x,
            mp.y,
            mp.lat,
            mp.lng,
            e.title AS evidence_title,
            e.slug AS evidence_slug,
            e.timeline_era,
            e.published_draft AS evidence_published
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.id = ?
    `,
    )
    .get(id);
}

/**
 * Update an existing map pin. Only writable fields in `data` are changed.
 * When lat/lng are supplied, x/y are derived from them (overriding any
 * simultaneously-supplied x/y).  Returns the updated pin, or undefined
 * if not found.
 * @throws {Error} if evidence_id is updated to a non-existent evidence row.
 * @throws {Error} if lat/lng are outside the pin's map bbox.
 */
function updatePin(id, data) {
  if (!getPinById(id)) return undefined;

  // Validate evidence_id references an existing evidence row if it's being changed
  if (data.evidence_id != null) {
    const evidence = evidenceModel.getById(data.evidence_id);
    if (!evidence) {
      throw Object.assign(new Error("Evidence record not found."), {
        status: 404,
      });
    }
  }

  // Derive x/y from lat/lng when both are supplied
  if (
    data.lat != null &&
    data.lng != null &&
    Number.isFinite(Number(data.lat)) &&
    Number.isFinite(Number(data.lng))
  ) {
    // Resolve the map_key from the pin's map_id
    const pin = getPinById(id);
    const mapKey = _getMapKeyById(pin.map_id);
    if (!mapKey) {
      throw Object.assign(
        new Error("Pin's map_id does not reference a known map."),
        { status: 404 },
      );
    }
    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (!isInBounds(mapKey, lat, lng)) {
      throw Object.assign(
        new Error(
          `Coordinates (${lat}, ${lng}) are outside the ${mapKey} map bounds.`,
        ),
        { status: 400 },
      );
    }

    const pct = latLngToPercent(mapKey, lat, lng);
    data.x = pct.x;
    data.y = pct.y;
    data.lat = roundToDecimal(lat, 5);
    data.lng = roundToDecimal(lng, 5);
  }

  // When only x/y are supplied (no lat/lng) — e.g. a manual drag — re-derive
  // lat/lng from the new x/y via the shared projection so geo-anchors are
  // preserved rather than silently destroyed.  (JS-2: never fail silently.)
  if (
    (data.x != null || data.y != null) &&
    !(
      data.lat != null &&
      data.lng != null &&
      Number.isFinite(Number(data.lat)) &&
      Number.isFinite(Number(data.lng))
    )
  ) {
    // Resolve the map_key from the pin's map_id
    const pin = getPinById(id);
    const mapKey = _getMapKeyById(pin.map_id);
    if (mapKey && data.x != null && data.y != null) {
      try {
        const geo = percentToLatLng(mapKey, Number(data.x), Number(data.y));
        data.lat = geo.lat;
        data.lng = geo.lng;
      } catch (_e) {
        // If the percentages are out of range, leave lat/lng as-is rather
        // than crashing — the caller may provide lat/lng explicitly instead.
      }
    }
  }

  const row = pickWritable(data, PIN_WRITABLE_COLUMNS);

  runUpdate(db, "map_pins", row, id);
  return getPinById(id);
}

/**
 * Delete a map pin by id. Returns true if removed.
 */
function removePin(id) {
  const result = db.prepare("DELETE FROM map_pins WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Get all pins for a specific map, with evidence data.
 * When `includeDrafts` is false (the default), pins linked to draft evidence
 * are excluded.
 *
 * @param {number} mapId
 * @param {Object} [opts]
 * @param {boolean} [opts.includeDrafts=false]
 * @returns {Array}
 */
function getPinsByMap(mapId, { includeDrafts } = {}) {
  let sql = `
        SELECT
            mp.id,
            mp.map_id,
            mp.evidence_id,
            mp.label,
            mp.x,
            mp.y,
            mp.lat,
            mp.lng,
            e.title AS evidence_title,
            e.slug AS evidence_slug,
            e.timeline_era,
            e.gospel_category,
            e.published_draft AS evidence_published
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.map_id = ?
    `;
  const params = [mapId];

  if (!includeDrafts) {
    sql += " AND (e.published_draft = 1 OR mp.evidence_id IS NULL)";
  }

  sql += " ORDER BY mp.label";

  return db.prepare(sql).all(...params);
}

/**
 * Get evidence rows that have a map_location set but no pin on the given map.
 * Includes both draft and published evidence — the admin may place drafts.
 *
 * @param {number} mapId
 * @returns {Array}
 */
function getUnplacedEvidence(mapId) {
  const sql = `
        SELECT
            e.id,
            e.title,
            e.slug,
            e.timeline_era,
            e.map_location,
            e.map_x,
            e.map_y
        FROM evidence e
        WHERE e.map_location IS NOT NULL
          AND e.map_location != ''
          AND e.id NOT IN (
              SELECT mp.evidence_id
              FROM map_pins mp
              WHERE mp.map_id = ?
                AND mp.evidence_id IS NOT NULL
          )
        ORDER BY e.title
    `;
  return db.prepare(sql).all(mapId);
}

module.exports = {
  getAllMaps,
  getMapById,
  getMapByKey,
  createMap,
  updateMap,
  removeMap,
  createPin,
  getPinById,
  updatePin,
  removePin,
  getPinsByMap,
  getUnplacedEvidence,
};

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Resolve a map's key from its database id.
 *
 * @param {number} mapId
 * @returns {string|undefined}
 */
function _getMapKeyById(mapId) {
  const row = db.prepare("SELECT map_key FROM maps WHERE id = ?").get(mapId);
  return row ? row.map_key : undefined;
}

/**
 * Round a number to a fixed number of decimal places.
 *
 * @param {number} n
 * @param {number} decimals
 * @returns {number}
 */
function roundToDecimal(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
