// Spellcheck dictionary data access — all SQL for the `spellcheck_dictionary`
// table lives here. Functions are synchronous (better-sqlite3).
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");

// ── Prepared statements, cached in module scope (SQL-1) ──────────────────────

const stmtGetAll = db.prepare(
  "SELECT id, word, normalized, status, created_at FROM spellcheck_dictionary ORDER BY word",
);

const stmtUpsert = db.prepare(
  `INSERT INTO spellcheck_dictionary (word, normalized, status)
   VALUES (@word, @normalized, @status)
   ON CONFLICT(normalized) DO UPDATE SET status = excluded.status`,
);

const stmtRemove = db.prepare(
  "DELETE FROM spellcheck_dictionary WHERE normalized = ?",
);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Return every row — used to bulk-sync the dictionary to the client on
 * admin page load so the worker starts with the full suppression set.
 * @returns {{ id: number, word: string, normalized: string, status: string, created_at: string }[]}
 */
function getAll() {
  return stmtGetAll.all();
}

/**
 * Add or update a word. `word` is stored as-entered; `normalized` is the
 * lowercased key used for deduplication and lookup.
 * @param {string} word    - The word as typed by the admin.
 * @param {string} status  - 'learned' or 'ignored' (validated at the route).
 * @returns {{ id: number, word: string, normalized: string, status: string }}
 */
function add(word, status) {
  const normalized = word.toLowerCase();
  stmtUpsert.run({ word, normalized, status });
  return db
    .prepare("SELECT * FROM spellcheck_dictionary WHERE normalized = ?")
    .get(normalized);
}

/**
 * Remove a word from the dictionary so it will be flagged again.
 * @param {string} word - The word to remove (matched case-insensitively).
 * @returns {boolean} True if a row was deleted.
 */
function remove(word) {
  const result = stmtRemove.run(word.toLowerCase());
  return result.changes > 0;
}

module.exports = { getAll, add, remove };
