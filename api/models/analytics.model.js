// Analytics data access — all SQL for the `analytics` table lives here.
// Records one row per page view and answers the dashboard's aggregate questions.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable } = require('./model-helpers');

// Only these fields are ever written; `visited_at` defaults in the schema.
const WRITABLE_COLUMNS = ['page', 'referrer', 'user_agent', 'ip_hash', 'session_id'];

/** Record a single page view. `page` is required; the rest are best-effort. */
function record(data) {
    const row = pickWritable(data, WRITABLE_COLUMNS);

    const columns = Object.keys(row);
    const placeholders = columns.map((column) => `@${column}`);

    const result = db
        .prepare(`INSERT INTO analytics (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
        .run(row);

    return result.lastInsertRowid;
}

/** Most-viewed pages over the whole history, highest first. */
function getTopPages(limit = 20) {
    return db
        .prepare('SELECT page, COUNT(*) AS views FROM analytics GROUP BY page ORDER BY views DESC LIMIT ?')
        .all(limit);
}

/** Total views and unique sessions, optionally since an ISO date string. */
function getSummary(since = null) {
    const where = since ? 'WHERE visited_at >= ?' : '';
    const params = since ? [since] : [];
    return db
        .prepare(`SELECT COUNT(*) AS total_views, COUNT(DISTINCT session_id) AS unique_sessions FROM analytics ${where}`)
        .get(...params);
}

/** Top referrers, ignoring direct (null/empty) traffic. */
function getTopReferrers(limit = 20) {
    return db
        .prepare("SELECT referrer, COUNT(*) AS count FROM analytics WHERE referrer IS NOT NULL AND referrer <> '' GROUP BY referrer ORDER BY count DESC LIMIT ?")
        .all(limit);
}

/**
 * Top pages within the last `days`, each with views, unique sessions,
 * and a daily trend array (oldest first, zero-filled for missing days).
 * @param {number} days
 * @param {number} limit
 * @returns {{ page: string, views: number, unique: number, trend: number[] }[]}
 */
function getTopPagesWithTrend(days, limit = 5) {
    const topPages = db.prepare(`
        SELECT page, COUNT(*) AS views, COUNT(DISTINCT session_id) AS unique_sessions
        FROM analytics
        WHERE visited_at >= datetime('now', '-${days} days')
        GROUP BY page
        ORDER BY views DESC
        LIMIT ?
    `).all(limit);

    const trendStmt = db.prepare(`
        WITH RECURSIVE dates(d) AS (
            SELECT date('now', '-${days} days')
            UNION ALL
            SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
        )
        SELECT COALESCE(COUNT(*), 0) AS cnt
        FROM dates
        LEFT JOIN analytics ON date(analytics.visited_at) = dates.d AND analytics.page = ?
        GROUP BY dates.d
        ORDER BY dates.d
    `);

    return topPages.map(page => ({
        page: page.page,
        views: page.views,
        unique: page.unique_sessions,
        trend: trendStmt.all(page.page).map(r => r.cnt),
    }));
}

/** Most recent visits, newest first — for a live activity feed. */
function getRecent(limit = 50) {
    return db.prepare('SELECT * FROM analytics ORDER BY visited_at DESC LIMIT ?').all(limit);
}

module.exports = { record, getTopPages, getSummary, getTopReferrers, getTopPagesWithTrend, getRecent };
