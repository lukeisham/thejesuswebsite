// Analytics data access — all SQL for the `analytics` table lives here.
// Records one row per page view and answers the dashboard's aggregate questions.
// No HTTP concerns in this file: no req, no res, no status codes.
// Bots are recorded (is_bot = 1) but only getBotStats counts them; every other
// statistic is human traffic, so the dashboard's visitor numbers exclude crawlers.

const db = require("../config");
const { pickWritable } = require("./model-helpers");

// Only these fields are ever written; `visited_at` defaults in the schema.
const WRITABLE_COLUMNS = [
  "page",
  "referrer",
  "user_agent",
  "ip_hash",
  "session_id",
  "device_type",
  "browser",
  "os",
  "country",
  "is_bot",
  "search_terms",
];

// Constant SQL, never user input. Rows saved before bot detection have
// is_bot NULL and count as human. Used by every stat except getBotStats' bot
// queries and getRecent; a statistic that omits it silently counts crawlers.
const HUMAN = "(is_bot = 0 OR is_bot IS NULL)";

/** Record a single page view. `page` is required; the rest are best-effort. */
function record(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO analytics (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return result.lastInsertRowid;
}

/** Most-viewed pages by humans over the whole history, highest first. */
function getTopPages(limit = 20) {
  return db
    .prepare(
      `SELECT page, COUNT(*) AS views FROM analytics WHERE ${HUMAN} GROUP BY page ORDER BY views DESC LIMIT ?`,
    )
    .all(limit);
}

/** Human views and unique sessions, optionally since an ISO date string. */
function getSummary(since = null) {
  const where = since
    ? `WHERE ${HUMAN} AND visited_at >= ?`
    : `WHERE ${HUMAN}`;
  const params = since ? [since] : [];
  return db
    .prepare(
      `SELECT COUNT(*) AS total_views, COUNT(DISTINCT session_id) AS unique_sessions FROM analytics ${where}`,
    )
    .get(...params);
}

/** Top human referrers, ignoring direct (null/empty) traffic.
 *  When `external` is truthy, also excludes same-site referrers
 *  (thejesuswebsite.org) so only outside traffic sources are shown. */
function getTopReferrers(limit = 20, external = false) {
  let sql =
    `SELECT referrer, COUNT(*) AS count FROM analytics WHERE ${HUMAN} AND referrer IS NOT NULL AND referrer <> ''`;
  const params = [];

  if (external) {
    sql += " AND LOWER(referrer) NOT LIKE '%thejesuswebsite.org%'";
  }

  sql += " GROUP BY referrer ORDER BY count DESC LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params);
}

/**
 * Top pages within the last `days`, each with views, unique sessions,
 * and a daily trend array (oldest first, zero-filled for missing days).
 * @param {number} days
 * @param {number} limit
 * @returns {{ page: string, views: number, unique: number, trend: number[] }[]}
 */
function getTopPagesWithTrend(days, limit = 5) {
  // JS-2 / SQL-safety: `days` cannot be bound as a parameter inside SQLite's
  // datetime modifier syntax, so it is validated against a strict allow-list
  // here rather than trusting route-level validation.
  if (![7, 30, 90].includes(days)) {
    throw new Error("Invalid days parameter");
  }

  const topPages = db
    .prepare(
      `
        SELECT page, COUNT(*) AS views, COUNT(DISTINCT session_id) AS unique_sessions
        FROM analytics
        WHERE ${HUMAN} AND visited_at >= datetime('now', '-${days} days')
        GROUP BY page
        ORDER BY views DESC
        LIMIT ?
    `,
    )
    .all(limit);

  const trendStmt = db.prepare(`
        WITH RECURSIVE dates(d) AS (
            SELECT date('now', '-${days} days')
            UNION ALL
            SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
        )
        SELECT COALESCE(COUNT(*), 0) AS cnt
        FROM dates
        LEFT JOIN analytics ON date(analytics.visited_at) = dates.d AND analytics.page = ?
          AND ${HUMAN}
        GROUP BY dates.d
        ORDER BY dates.d
    `);

  return topPages.map((page) => ({
    page: page.page,
    views: page.views,
    unique: page.unique_sessions,
    trend: trendStmt.all(page.page).map((r) => r.cnt),
  }));
}

/** Most recent visits, bots included (is_bot is on each row), newest first. */
function getRecent(limit = 50) {
  return db
    .prepare("SELECT * FROM analytics ORDER BY visited_at DESC LIMIT ?")
    .all(limit);
}

/** Top countries by human page views, optionally since an ISO date. */
function getTopCountries(since, limit = 10) {
  const where = since
    ? `WHERE ${HUMAN} AND visited_at >= ?`
    : `WHERE ${HUMAN}`;
  const params = since ? [since] : [];
  params.push(limit);
  return db
    .prepare(
      `SELECT country, COUNT(*) AS count
       FROM analytics
       ${where}
       GROUP BY country
       ORDER BY count DESC
       LIMIT ?`,
    )
    .all(...params);
}

/** Human device-type, browser, and OS breakdowns, optionally since an ISO date. */
function getDeviceBreakdown(since) {
  const where = since
    ? `WHERE ${HUMAN} AND visited_at >= ?`
    : `WHERE ${HUMAN}`;
  const params = since ? [since] : [];

  const deviceTypes = db
    .prepare(
      `SELECT device_type AS type, COUNT(*) AS count
       FROM analytics
       ${where}
       GROUP BY device_type
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all(...params);

  const browsers = db
    .prepare(
      `SELECT browser AS name, COUNT(*) AS count
       FROM analytics
       ${where}
       GROUP BY browser
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all(...params);

  const os = db
    .prepare(
      `SELECT os AS name, COUNT(*) AS count
       FROM analytics
       ${where}
       GROUP BY os
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all(...params);

  return { device_types: deviceTypes, browsers, os };
}

/** Top human search terms from search-engine referrers, optionally since an ISO date. */
function getSearchTerms(since, limit = 20) {
  const where = since
    ? `WHERE ${HUMAN} AND visited_at >= ? AND search_terms IS NOT NULL AND search_terms <> ''`
    : `WHERE ${HUMAN} AND search_terms IS NOT NULL AND search_terms <> ''`;
  const params = since ? [since] : [];
  params.push(limit);
  return db
    .prepare(
      `SELECT search_terms AS term, COUNT(*) AS count
       FROM analytics
       ${where}
       GROUP BY search_terms
       ORDER BY count DESC
       LIMIT ?`,
    )
    .all(...params);
}

/** Bot vs human stats, optionally since an ISO date.
 *  bot_breakdown groups by user_agent for rows flagged as bot. */
function getBotStats(since) {
  const whereClause = since ? "WHERE visited_at >= ?" : "";
  const params = since ? [since] : [];

  function buildWhere(existing, extra) {
    const parts = [existing];
    if (whereClause) parts.push(whereClause.replace("WHERE", "AND"));
    if (extra) parts.push(extra);
    return parts.join(" ");
  }

  const human = db
    .prepare(
      `SELECT COUNT(*) AS count FROM analytics ${buildWhere(`WHERE user_agent IS NOT NULL AND ${HUMAN}`)}`,
    )
    .get(...params);

  const bot = db
    .prepare(
      `SELECT COUNT(*) AS count FROM analytics ${buildWhere("WHERE is_bot = 1")}`,
    )
    .get(...params);

  const unknown = db
    .prepare(
      `SELECT COUNT(*) AS count FROM analytics ${buildWhere("WHERE user_agent IS NULL")}`,
    )
    .get(...params);

  const botBreakdown = db
    .prepare(
      `SELECT user_agent AS name, COUNT(*) AS count
       FROM analytics
       ${buildWhere("WHERE is_bot = 1")}
       GROUP BY user_agent
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all(...params);

  return {
    human: human.count,
    bot: bot.count,
    unknown: unknown.count,
    bot_breakdown: botBreakdown,
  };
}

/**
 * Delete rows visited more than `days` days ago.
 * Called daily by lib/analytics-retention.js; uses idx_analytics_visited_at.
 * @param {number} days
 * @returns {number} rows deleted
 */
function pruneOlderThan(days) {
  return db
    .prepare("DELETE FROM analytics WHERE visited_at < datetime('now', ?)")
    .run(`-${Number(days)} days`).changes;
}

module.exports = {
  record,
  pruneOlderThan,
  getTopPages,
  getSummary,
  getTopReferrers,
  getTopPagesWithTrend,
  getRecent,
  getTopCountries,
  getDeviceBreakdown,
  getSearchTerms,
  getBotStats,
};
