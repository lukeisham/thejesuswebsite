// Wrappers that turn better-sqlite3 exceptions into `{ ok, ... }` outcomes with
// a stable E-PERSIST-* code. The raw error goes to stderr for operators; the
// caller only sees the code. better-sqlite3 is synchronous, so these are too
// (JS-5).
//
// Only api/tests/db-guard.test.js calls these. Routes call the model
// functions directly and handle errors with sendError() from error-handler.js.

const { responseBody, httpStatus } = require("./error-codes");

/**
 * Execute a single database operation inside a safety net.
 *
 * Returns `{ ok: true, result }`, or `{ ok: false, code }` with a Category 3 code.
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
 * Run several operations in one transaction. `db.transaction()` rolls back
 * when the callback throws, so there is no manual BEGIN/COMMIT/ROLLBACK.
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
 * Send the standard error body for a failed safeQuery/safeTransaction outcome.
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
 * Not every throwable has a `.message` or `.code`, so both are read defensively
 * (JS-2).
 *
 * @param {Error & { code?: string, message?: string }} err
 * @returns {string} — a stable "E-PERSIST-XXX" code
 */
function mapDbError(err) {
  const msg = String(err.message || "").toLowerCase();
  const sqliteCode = String(err.code || "").toUpperCase();

  // better-sqlite3 puts the raw SQLite code in err.code. The specific
  // constraint codes must be checked before the generic SQLITE_CONSTRAINT.
  if (sqliteCode.includes("SQLITE_CANTOPEN")) return "E-PERSIST-001";
  if (sqliteCode.includes("SQLITE_CONSTRAINT_UNIQUE")) return "E-PERSIST-007";
  if (sqliteCode.includes("SQLITE_CONSTRAINT_FOREIGNKEY"))
    return "E-PERSIST-006";
  if (sqliteCode.includes("SQLITE_CONSTRAINT")) return "E-PERSIST-003";
  if (sqliteCode.includes("SQLITE_READONLY")) return "E-PERSIST-001";
  if (sqliteCode.includes("SQLITE_ERROR")) {
    // SQLITE_ERROR covers many causes; only the message tells them apart.
    if (msg.includes("no such table") || msg.includes("no such column"))
      return "E-PERSIST-025";
    if (msg.includes("fts5") || msg.includes("syntax error"))
      return "E-PERSIST-023";
  }

  // An error with no usable err.code is matched by message text instead.
  if (msg.includes("foreign key")) return "E-PERSIST-006";
  if (msg.includes("unique") || msg.includes("duplicate"))
    return "E-PERSIST-007";
  if (msg.includes("constraint")) return "E-PERSIST-003";
  if (msg.includes("no such table") || msg.includes("no such column"))
    return "E-PERSIST-025";
  if (msg.includes("syntax error") || msg.includes("fts5"))
    return "E-PERSIST-023";
  if (msg.includes("database is locked")) return "E-PERSIST-001";

  return "E-PERSIST-002";
}

module.exports = { safeQuery, safeTransaction, sendDbError, mapDbError };
