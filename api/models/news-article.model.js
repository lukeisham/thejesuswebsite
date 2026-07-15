// News article data access — all SQL for the `news_articles` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, generateUniqueSlug, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
    'slug',
    'news_article_title',
    'news_article_url',
    'news_article_date',
    'news_article_author',
    'news_article_publisher',
    'news_article_thumbnail',
    'landing_page_display',
    'published_draft',
    'metadata_keywords',
];

/**
 * Published news articles for the public site, newest first.
 */
function getAllPublished() {
    return db
        .prepare(
            'SELECT * FROM news_articles WHERE published_draft = 1 ORDER BY news_article_date DESC, id DESC'
        )
        .all();
}

/**
 * Published news articles marked for landing page display, newest first.
 * Used for featured/promoted articles on the home page.
 */
function getLandingPageArticles() {
    return db
        .prepare(
            'SELECT * FROM news_articles WHERE published_draft = 1 AND landing_page_display = 1 ORDER BY news_article_date DESC, id DESC'
        )
        .all();
}

/**
 * Single published news article by slug, or undefined if not found.
 */
function getBySlug(slug) {
    return db
        .prepare('SELECT * FROM news_articles WHERE slug = ? AND published_draft = 1')
        .get(slug);
}

/**
 * Single news article by id regardless of publish state — for admin.
 */
function getById(id) {
    return db.prepare('SELECT * FROM news_articles WHERE id = ?').get(id);
}

/**
 * Insert a new news article. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 */
function create(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);
    row.slug = generateUniqueSlug(db, 'news_articles', row.slug);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO news_articles (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return getById(result.lastInsertRowid);
}

/**
 * Update an existing news article. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
    if (!getById(id)) return undefined;

    const row = pickWritable(data, WRITABLE_COLUMNS);
    if (row.slug !== undefined) {
        row.slug = generateUniqueSlug(db, 'news_articles', row.slug, id);
    }

    if (!runUpdate(db, 'news_articles', row, id)) return getById(id);
    return getById(id);
}

/**
 * Delete a news article by id. Returns true if a row was removed.
 */
function remove(id) {
    const result = db.prepare('DELETE FROM news_articles WHERE id = ?').run(id);
    return result.changes > 0;
}

module.exports = {
    getAllPublished,
    getLandingPageArticles,
    getBySlug,
    getById,
    create,
    update,
    remove,
};
