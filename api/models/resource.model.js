// Resource data access — all SQL for the `resources` and `evidence_resource_lists` tables lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');
const ERRORS = require('../lib/error-codes');

// Valid resource list keys as defined in schema.
const VALID_LIST_KEYS = [
    'sermons-and-sayings',
    'parables',
    'objects',
    'people',
    'sites',
    'ot-verses',
    'internal-witnesses',
    'external-witnesses',
    'places',
    'world-events',
    'miracles',
    'events',
    'apologetics',
    'manuscripts',
    'sources',
];

// Columns the admin is allowed to write for resource creation/updates.
const WRITABLE_COLUMNS = [
    'list_key',
    'resource_title',
    'resource_url',
    'resource_description',
    'sort_order',
    'published_draft',
    'in_holding_pen',
    'item_type',
];

const VALID_ITEM_TYPES = ['item', 'subheading'];

/**
 * Get all resources for a specific list, ordered by sort_order.
 * Parked items are excluded — list_key alone is not proof of membership.
 */
function getByListKey(listKey) {
    if (!VALID_LIST_KEYS.includes(listKey)) return [];

    return db
        .prepare(
            'SELECT * FROM resources WHERE list_key = ? AND published_draft = 1 AND in_holding_pen = 0 ORDER BY sort_order, id'
        )
        .all(listKey);
}

/**
 * Get all resources for a list, including unpublished (for admin).
 * Parked items are excluded — they surface via getHoldingPen() instead.
 */
function getByListKeyAdmin(listKey) {
    if (!VALID_LIST_KEYS.includes(listKey)) return [];

    return db
        .prepare('SELECT * FROM resources WHERE list_key = ? AND in_holding_pen = 0 ORDER BY sort_order, id')
        .all(listKey);
}

/**
 * Get every parked resource, across all lists, ordered by title.
 * Each row keeps its originating list_key so a pen chip can show where it
 * came from.
 */
function getHoldingPen() {
    return db.prepare('SELECT * FROM resources WHERE in_holding_pen = 1 ORDER BY resource_title').all();
}

/**
 * Get a single resource by id, regardless of publish state.
 */
function getById(id) {
    return db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
}

/**
 * Get all resources grouped by list key, filtered to published only.
 * Parked items are excluded — list_key alone is not proof of membership,
 * so a parked-but-published item must not inflate its origin list's count.
 */
function getAllPublishedByListKey() {
    const sql = `
        SELECT
            list_key,
            COUNT(*) AS count,
            GROUP_CONCAT(id) AS resource_ids
        FROM resources
        WHERE published_draft = 1 AND in_holding_pen = 0 AND item_type = 'item'
        GROUP BY list_key
        ORDER BY list_key
    `;
    return db.prepare(sql).all();
}

/**
 * Create a new resource. Returns the created resource.
 */
function create(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);

    if (!VALID_LIST_KEYS.includes(row.list_key)) {
        const err = new Error(`Invalid list_key: ${row.list_key}`);
        err.code = ERRORS.INVALID_LIST_KEY.code;
        throw err;
    }

    if (row.item_type !== undefined && !VALID_ITEM_TYPES.includes(row.item_type)) {
        const err = new Error(`Invalid item_type: ${row.item_type}`);
        err.code = ERRORS.INVALID_RESOURCE_ITEM_TYPE.code;
        throw err;
    }

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO resources (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return getById(result.lastInsertRowid);
}

/**
 * Update an existing resource. Only writable fields present in `data` are changed.
 * Returns the updated resource, or undefined if not found.
 */
function update(id, data) {
    if (!getById(id)) return undefined;

    const row = pickWritable(data, WRITABLE_COLUMNS);

    if (row.list_key !== undefined && !VALID_LIST_KEYS.includes(row.list_key)) {
        const err = new Error(`Invalid list_key: ${row.list_key}`);
        err.code = ERRORS.INVALID_LIST_KEY.code;
        throw err;
    }

    if (row.item_type !== undefined && !VALID_ITEM_TYPES.includes(row.item_type)) {
        const err = new Error(`Invalid item_type: ${row.item_type}`);
        err.code = ERRORS.INVALID_RESOURCE_ITEM_TYPE.code;
        throw err;
    }

    if (!runUpdate(db, 'resources', row, id)) return getById(id);
    return getById(id);
}

/**
 * Delete a resource by id. Returns true if removed.
 */
function remove(id) {
    const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Link a resource to evidence. Returns the created link.
 */
function addToEvidence(evidenceId, resourceId, sortOrder = 0) {
    const result = db
        .prepare('INSERT INTO evidence_resource_lists (evidence_id, resource_id, sort_order) VALUES (?, ?, ?)')
        .run(evidenceId, resourceId, sortOrder);

    return db.prepare('SELECT * FROM evidence_resource_lists WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Remove a resource from evidence. Returns true if removed.
 */
function removeFromEvidence(evidenceId, resourceId) {
    const result = db
        .prepare('DELETE FROM evidence_resource_lists WHERE evidence_id = ? AND resource_id = ?')
        .run(evidenceId, resourceId);

    return result.changes > 0;
}

/**
 * Get all resources linked to a specific evidence item.
 */
function getResourcesForEvidence(evidenceId) {
    return db
        .prepare(
            `
        SELECT
            r.id,
            r.list_key,
            r.resource_title,
            r.resource_url,
            r.resource_description,
            r.sort_order,
            r.published_draft,
            erl.sort_order AS evidence_sort_order
        FROM evidence_resource_lists erl
        JOIN resources r ON erl.resource_id = r.id
        WHERE erl.evidence_id = ?
        ORDER BY erl.sort_order, r.id
    `
        )
        .all(evidenceId);
}

/**
 * Reorder resources within an evidence item (drag-to-reorder).
 * Accepts an array of {resourceId, sortOrder} objects.
 */
function reorderEvidenceResources(evidenceId, items) {
    const stmt = db.prepare(
        'UPDATE evidence_resource_lists SET sort_order = @sort_order WHERE evidence_id = ? AND resource_id = @resource_id'
    );

    const transaction = db.transaction(() => {
        for (const item of items) {
            stmt.run(evidenceId, item);
        }
    });

    transaction();
    return items.length;
}

/**
 * Reorder resources within a list (drag-to-reorder).
 * Accepts an array of {id, sortOrder} objects.
 */
function reorderList(items) {
    const stmt = db.prepare('UPDATE resources SET sort_order = @sort_order WHERE id = @id');
    const transaction = db.transaction(() => {
        for (const item of items) {
            stmt.run(item);
        }
    });
    transaction();
    return items.length;
}

module.exports = {
    getByListKey,
    getByListKeyAdmin,
    getHoldingPen,
    getById,
    getAllPublishedByListKey,
    create,
    update,
    remove,
    addToEvidence,
    removeFromEvidence,
    getResourcesForEvidence,
    reorderEvidenceResources,
    reorderList,
};
