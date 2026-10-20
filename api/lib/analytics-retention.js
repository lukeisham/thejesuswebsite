// Daily retention for the analytics table: the admin dashboard (routes/analytics.js
// -> models/analytics.model.js) only reads recent history, so older rows are deleted
// to keep the table, and its indexes, bounded.
// Started once from server.js after the server listens. Pattern follows the
// in-process session sweep in middleware/auth.js (no cron, no extra process).

const analyticsModel = require("../models/analytics.model");

const RETENTION_DAYS = 365;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Delete expired rows. A failure is logged and never thrown, so the server stays up. */
function pruneOnce() {
  try {
    const deleted = analyticsModel.pruneOlderThan(RETENTION_DAYS);
    if (deleted > 0) {
      console.log(`Analytics retention: deleted ${deleted} rows older than ${RETENTION_DAYS} days.`);
    }
  } catch (error) {
    console.error("Analytics retention prune failed:", error);
  }
}

/**
 * Prune analytics rows older than the retention window now, then every 24 hours.
 * The timer is unref'd so it never keeps the process alive.
 * @returns {NodeJS.Timeout} the interval handle, so a caller can clear it
 */
function startAnalyticsPruning() {
  pruneOnce();
  return setInterval(pruneOnce, PRUNE_INTERVAL_MS).unref();
}

module.exports = { startAnalyticsPruning, RETENTION_DAYS };
