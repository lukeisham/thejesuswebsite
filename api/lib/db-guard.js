// Database operation wrappers for better-sqlite3.
// Catches raw SQLite errors before they reach route handlers and maps them to
// structured error codes. The raw error is always logged to stderr so operators
// can diagnose, but callers only see the stable error code.
//
// JS-2: every db operation is wrapped — raw errors never propagate.
// JS-5: better-sqlite3 is synchronous, so these helpers are synchronous too.

const { lookup, responseBody, httpStatus } = require("./error-codes");
const ERRORS = require("./error-codes");

/**
 * Execute a single database operation inside a safety net.
 *
 * Returns `{ ok: true, result }` on success. On failure logs the raw error,
 * maps it to a Category 3 code, and returns `{ ok: false, code }`.
 *
 * @template T
 * @param {import("better-sqlite3").Database} db — active database handle
 * @param {(db: import("better-sqlite3").Database) => T} operation — callback that performs the query
 * @returns {{ ok: true, result: T } | { ok: false, code: string }}
 */
function safeQuery(db, operation) {
  try {
    const result = operation(db);
    return { ok: true, result };
  } catch (err) {
    console.error("Database operation failed:", err.message);
    return { ok: false, code: mapDbError(err) };
  }
}

/**
 * Wrap multiple operations in a transaction with automatic rollback on failure.
 *
 * Uses better-sqlite3's `db.transaction()` which rolls back if the callback
 * throws — no manual BEGIN/COMMIT/ROLLBACK needed.
 *
 * @template T
 * @param {import("better-sqlite3").Database} db
 * @param {(db: import("better-sqlite3").Database) => T} operations
 * @returns {{ ok: true, result: T } | { ok: false, code: string }}
 */
function safeTransaction(db, operations) {
  const tx = db.transaction(() => operations(db));
  try {
    const result = tx();
    return { ok: true, result };
  } catch (err) {
    console.error("Transaction failed and was rolled back:", err.message);
    return { ok: false, code: mapDbError(err) };
  }
}

/**
 * Build an Express error response from a failed safeQuery/safeTransaction outcome.
 * Convenience helper so routes can write a one-liner:
 *   if (!outcome.ok) return sendDbError(res, outcome.code);
 *
 * @param {import("express").Response} res
 * @param {string} code
 * @returns {void}
 */
function sendDbError(res, code) {
  const status = httpStatus(code);
  const body = responseBody(code);
  res.status(status).json(body);
}

// ── Internal error mapping ────────────────────────────────────────────────────

/**
 * Map a SQLite Error (or generic Error) to a Category 3 persistence code.
 *
 * JS-2: guard against malformed error objects — not every throwable has a
 * `.message` or `.code` property.
 *
 * @param {Error & { code?: string, message?: string }} err
 * @returns {string} — a stable "E-PERSIST-XXX" code
 */
function mapDbError(err) {
  const msg = String(err.message || "").toLowerCase();
  const sqliteCode = String(err.code || "").toUpperCase();

  // better-sqlite3 sets err.code to the raw SQLite error code (e.g. SQLITE_CONSTRAINT_UNIQUE).
  if (sqliteCode.includes("SQLITE_CANTOPEN")) return "E-PERSIST-001";
  if (sqliteCode.includes("SQLITE_CONSTRAINT_UNIQUE")) return "E-PERSIST-007";
  if (sqliteCode.includes("SQLITE_CONSTRAINT_FOREIGNKEY"))
    return "E-PERSIST-006";
  if (sqliteCode.includes("SQLITE_CONSTRAINT")) return "E-PERSIST-003";
  if (sqliteCode.includes("SQLITE_READONLY")) return "E-PERSIST-001";
  if (sqliteCode.includes("SQLITE_ERROR")) {
    // SQLITE_ERROR is a catch-all — narrow it further by message content.
    if (msg.includes("no such table") || msg.includes("no such column"))
      return "E-PERSIST-025";
    if (msg.includes("fts5") || msg.includes("syntax error"))
      return "E-PERSIST-023";
  }

  // Fallback heuristics on the error message text.
  if (msg.includes("foreign key")) return "E-PERSIST-006";
  if (msg.includes("unique") || msg.includes("duplicate"))
    return "E-PERSIST-007";
  if (msg.includes("constraint")) return "E-PERSIST-003";
  if (msg.includes("no such table") || msg.includes("no such column"))
    return "E-PERSIST-025";
  if (msg.includes("syntax error") || msg.includes("fts5"))
    return "E-PERSIST-023";
  if (msg.includes("database is locked")) return "E-PERSIST-001";

  // Generic query failure — the most common fallback.
  return "E-PERSIST-002";
}

module.exports = { safeQuery, safeTransaction, sendDbError, mapDbError };
