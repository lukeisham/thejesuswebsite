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
 * The 27 reliability-signal rows for one article (id, signal_key, contribution, cap).
 * Empty array if the article predates this feature or has no scored signals.
 */
function getSignalsForArticle(articleId) {
    return db
        .prepare(
            'SELECT id, signal_key, contribution, cap FROM wikipedia_article_signals WHERE wikipedia_article_id = ?'
        )
        .all(articleId);
}

/**
 * Attach a `signals` array to each article via a single query grouped in JS
 * (simpler than a JOIN at this scale — at most a few hundred articles).
 */
function attachSignals(articles) {
    if (articles.length === 0) return articles;

    const ids = articles.map((article) => article.id);
    const placeholders = ids.map(() => '?').join(', ');
    const rows = db
        .prepare(
            `SELECT id, wikipedia_article_id, signal_key, contribution, cap FROM wikipedia_article_signals WHERE wikipedia_article_id IN (${placeholders})`
        )
        .all(...ids);

    const signalsByArticleId = new Map();
    for (const row of rows) {
        const list = signalsByArticleId.get(row.wikipedia_article_id) || [];
        list.push({ id: row.id, signal_key: row.signal_key, contribution: row.contribution, cap: row.cap });
        signalsByArticleId.set(row.wikipedia_article_id, list);
    }

    return articles.map((article) => ({
        ...article,
        signals: signalsByArticleId.get(article.id) || [],
    }));
}

/**
 * Published Wikipedia articles, ranked by wikipedia_article_rank_number.
 * Each article carries a `signals` array (see attachSignals).
 */
function getAllPublished() {
    const articles = db
        .prepare(
            'SELECT * FROM wikipedia_articles WHERE published_draft = 1 ORDER BY wikipedia_article_rank_number ASC'
        )
        .all();
    return attachSignals(articles);
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
 * Carries a `signals` array (see attachSignals).
 */
function getBySlug(slug) {
    const article = db
        .prepare('SELECT * FROM wikipedia_articles WHERE slug = ? AND published_draft = 1')
        .get(slug);
    if (!article) return undefined;
    return attachSignals([article])[0];
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

module.exports = {
    getAllPublished,
    getAllAdmin,
    getBySlug,
    getById,
    getSignalsForArticle,
    create,
    update,
    remove,
    deleteAll,
};
