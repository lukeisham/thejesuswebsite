// Identifiers data access — all SQL for the `identifiers` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
    'isbn',
    'isbn_book_title',
    'isbn_book_author',
    'iaa_number',
    'iaa_location',
    'pleiades_number',
    'pleiades_name',
    'event_name',
    'event_date',
    'event_location',
    'source_title',
    'source_location',
    'source_author',
    'source_date',
    'individual',
    'individual_location',
    'manuscript_number',
    'manuscript_title',
    'manuscript_location',
    'published_draft',
];

/**
 * Get all published identifiers. Returns all identifiers marked as published.
 */
function getAllPublished() {
    return db.prepare('SELECT * FROM identifiers WHERE published_draft = 1 ORDER BY id DESC').all();
}

/**
 * Get a single identifier by id, regardless of publish state — for admin.
 */
function getById(id) {
    return db.prepare('SELECT * FROM identifiers WHERE id = ?').get(id);
}

/**
 * Insert a new identifier. Returns the created row.
 */
function create(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO identifiers (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return getById(result.lastInsertRowid);
}

/**
 * Update an existing identifier. Only writable fields present in `data` are changed.
 * Returns the updated row, or undefined if no row has that id.
 */
function update(id, data) {
    if (!getById(id)) return undefined;

    const row = pickWritable(data, WRITABLE_COLUMNS);

    runUpdate(db, "identifiers", row, id);
    return getById(id);
}

/**
 * Delete an identifier by id. Returns true if a row was removed.
 */
function remove(id) {
    const result = db.prepare('DELETE FROM identifiers WHERE id = ?').run(id);
    return result.changes > 0;
}



module.exports = { getAllPublished, getById, create, update, remove };
