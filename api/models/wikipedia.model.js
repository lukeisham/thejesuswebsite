// Wikipedia articles data access — all SQL for the `wikipedia_articles` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, generateUniqueSlug, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
    'slug',
    'wikipedia_article_title',
    'wikipedia_article_url',
    'wikipedia_article_latest_revision_date',
    'wikipedia_article_rank_number',
    'wikipedia_rank_pluses',
    'wikipedia_rank_minuses',
    'published_draft',
    'metadata_keywords',
];

/**
 * Published Wikipedia articles, ranked by wikipedia_article_rank_number.
 */
function getAllPublished() {
    return db
        .prepare(
            'SELECT * FROM wikipedia_articles WHERE published_draft = 1 ORDER BY wikipedia_article_rank_number ASC'
        )
        .all();
}

/**
 * All Wikipedia articles regardless of publish state — for the admin list view.
 * Requires auth at the route level.
 */
function getAllAdmin() {
    return db
        .prepare(
            'SELECT * FROM wikipedia_articles ORDER BY wikipedia_article_rank_number ASC'
        )
        .all();
}

/**
 * Single published Wikipedia article by slug, or undefined if not found.
 */
function getBySlug(slug) {
    return db
        .prepare('SELECT * FROM wikipedia_articles WHERE slug = ? AND published_draft = 1')
        .get(slug);
}

/**
 * Single Wikipedia article by id regardless of publish state — for admin.
 */
function getById(id) {
    return db.prepare('SELECT * FROM wikipedia_articles WHERE id = ?').get(id);
}

/**
 * Insert a new Wikipedia article. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 */
function create(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);
    row.slug = generateUniqueSlug(db, 'wikipedia_articles', row.slug);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO wikipedia_articles (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return getById(result.lastInsertRowid);
}

/**
 * Update an existing Wikipedia article. Only writable fields present in `data` are
 * changed. If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
    if (!getById(id)) return undefined;

    const row = pickWritable(data, WRITABLE_COLUMNS);
    if (row.slug !== undefined) {
        row.slug = generateUniqueSlug(db, 'wikipedia_articles', row.slug, id);
    }

    if (!runUpdate(db, 'wikipedia_articles', row, id)) return getById(id);
    return getById(id);
}

/**
 * Delete a Wikipedia article by id. Returns true if a row was removed.
 */
function remove(id) {
    const result = db.prepare('DELETE FROM wikipedia_articles WHERE id = ?').run(id);
    return result.changes > 0;
}

/**
 * Delete every Wikipedia article. Returns the number of rows removed.
 */
function deleteAll() {
    const result = db.prepare('DELETE FROM wikipedia_articles').run();
    return result.changes;
}

module.exports = { getAllPublished, getAllAdmin, getBySlug, getById, create, update, remove, deleteAll };
