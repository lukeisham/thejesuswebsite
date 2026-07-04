// Collection data access — all SQL for the `collections` and `collection_evidence` tables lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, generateUniqueSlug, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write for collection creation/updates.
const WRITABLE_COLUMNS = [
    'slug',
    'title',
    'description',
    'published_draft',
];

/**
 * Get all published collections with their evidence counts.
 */
function getAllPublished() {
    const sql = `
        SELECT
            c.id,
            c.slug,
            c.title,
            c.description,
            c.published_draft,
            c.created_at,
            c.updated_at,
            COUNT(ce.evidence_id) AS evidence_count
        FROM collections c
        LEFT JOIN collection_evidence ce ON c.id = ce.collection_id
        WHERE c.published_draft = 1
        GROUP BY c.id
        ORDER BY c.created_at DESC
    `;
    return db.prepare(sql).all();
}

/**
 * Single published collection by slug, with all evidence items, or undefined if not found.
 */
function getBySlug(slug) {
    const collection = db
        .prepare('SELECT * FROM collections WHERE slug = ? AND published_draft = 1')
        .get(slug);

    if (!collection) return undefined;

    const evidence = db
        .prepare(
            `
        SELECT
            e.id,
            e.title,
            e.slug,
            e.description,
            e.gospel_category,
            e.timeline_era,
            e.timeline_period,
            e.map_location,
            ce.sort_order
        FROM collection_evidence ce
        JOIN evidence e ON ce.evidence_id = e.id
        WHERE ce.collection_id = ?
        ORDER BY ce.sort_order, ce.created_at
    `
        )
        .all(collection.id);

    return { ...collection, evidence };
}

/**
 * Single collection by id regardless of publish state — for admin, with evidence.
 */
function getById(id) {
    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);

    if (!collection) return undefined;

    const evidence = db
        .prepare(
            `
        SELECT
            e.id,
            e.title,
            e.slug,
            e.description,
            e.gospel_category,
            e.timeline_era,
            e.timeline_period,
            e.map_location,
            ce.sort_order
        FROM collection_evidence ce
        JOIN evidence e ON ce.evidence_id = e.id
        WHERE ce.collection_id = ?
        ORDER BY ce.sort_order, ce.created_at
    `
        )
        .all(id);

    return { ...collection, evidence };
}

/**
 * Create a new collection. Returns the created collection (without evidence).
 */
function create(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);
    row.slug = generateUniqueSlug(db, 'collections', row.slug);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO collections (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return getById(result.lastInsertRowid);
}

/**
 * Update an existing collection. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated collection with evidence,
 * or undefined if no collection has that id.
 */
function update(id, data) {
    if (!getById(id)) return undefined;

    const row = pickWritable(data, WRITABLE_COLUMNS);
    if (row.slug !== undefined) {
        row.slug = generateUniqueSlug(db, 'collections', row.slug, id);
    }

    runUpdate(db, 'collections', row, id);
    return getById(id);
}

/**
 * Delete a collection by id. Cascading deletes its evidence links. Returns true if removed.
 */
function remove(id) {
    const result = db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Add evidence to a collection. Returns the created link.
 */
function addEvidence(collectionId, evidenceId, sortOrder = 0) {
    const result = db
        .prepare('INSERT INTO collection_evidence (collection_id, evidence_id, sort_order) VALUES (?, ?, ?)')
        .run(collectionId, evidenceId, sortOrder);

    return db.prepare('SELECT * FROM collection_evidence WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Remove evidence from a collection. Returns true if removed.
 */
function removeEvidence(collectionId, evidenceId) {
    const result = db
        .prepare('DELETE FROM collection_evidence WHERE collection_id = ? AND evidence_id = ?')
        .run(collectionId, evidenceId);

    return result.changes > 0;
}

/**
 * Reorder evidence within a collection (drag-to-reorder).
 * Accepts an array of {evidenceId, sortOrder} objects.
 */
function reorderEvidence(collectionId, items) {
    const stmt = db.prepare(
        'UPDATE collection_evidence SET sort_order = @sort_order WHERE collection_id = ? AND evidence_id = @evidence_id'
    );

    const transaction = db.transaction(() => {
        for (const item of items) {
            stmt.run(collectionId, item);
        }
    });

    transaction();
    return items.length;
}

module.exports = {
    getAllPublished,
    getBySlug,
    getById,
    create,
    update,
    remove,
    addEvidence,
    removeEvidence,
    reorderEvidence,
};
