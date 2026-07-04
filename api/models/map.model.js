// Map data access — all SQL for the `maps` and `map_pins` tables lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write for map creation/updates.
const MAP_WRITABLE_COLUMNS = [
    'map_key',
    'map_name',
    'description',
    'image_path',
];

// Columns the admin is allowed to write for map pin creation/updates.
const PIN_WRITABLE_COLUMNS = [
    'map_id',
    'evidence_id',
    'label',
    'x',
    'y',
];

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
 */
function getMapById(id) {
    const map = db.prepare('SELECT * FROM maps WHERE id = ?').get(id);
    if (!map) return undefined;

    const pins = db
        .prepare(
            `
        SELECT
            mp.id,
            mp.map_id,
            mp.evidence_id,
            mp.label,
            mp.x,
            mp.y,
            e.title AS evidence_title,
            e.slug AS evidence_slug
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.map_id = ?
        ORDER BY mp.label
    `
        )
        .all(id);

    return { ...map, pins };
}

/**
 * Get a map by its unique key (e.g., 'galilee', 'jerusalem').
 */
function getMapByKey(mapKey) {
    const map = db.prepare('SELECT * FROM maps WHERE map_key = ?').get(mapKey);
    if (!map) return undefined;

    const pins = db
        .prepare(
            `
        SELECT
            mp.id,
            mp.map_id,
            mp.evidence_id,
            mp.label,
            mp.x,
            mp.y,
            e.title AS evidence_title,
            e.slug AS evidence_slug
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.map_id = ?
        ORDER BY mp.label
    `
        )
        .all(map.id);

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
        .prepare(`INSERT INTO maps (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
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
    const result = db.prepare('DELETE FROM maps WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Create a new map pin. Returns the created pin with evidence data.
 */
function createPin(data) {
    const row = pickWritable(data, PIN_WRITABLE_COLUMNS);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO map_pins (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
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
            e.title AS evidence_title,
            e.slug AS evidence_slug
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.id = ?
    `
        )
        .get(id);
}

/**
 * Update an existing map pin. Only writable fields in `data` are changed.
 * Returns the updated pin, or undefined if not found.
 */
function updatePin(id, data) {
    if (!getPinById(id)) return undefined;

    const row = pickWritable(data, PIN_WRITABLE_COLUMNS);

    runUpdate(db, "map_pins", row, id);
    return getPinById(id);
}

/**
 * Delete a map pin by id. Returns true if removed.
 */
function removePin(id) {
    const result = db.prepare('DELETE FROM map_pins WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Get all pins for a specific map, with evidence data.
 */
function getPinsByMap(mapId) {
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
            e.title AS evidence_title,
            e.slug AS evidence_slug
        FROM map_pins mp
        LEFT JOIN evidence e ON mp.evidence_id = e.id
        WHERE mp.map_id = ?
        ORDER BY mp.label
    `
        )
        .all(mapId);
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
};
