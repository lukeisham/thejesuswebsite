// Generic owned-child-row helper for ordered 1:N child tables (pictures, breakouts).
// These tables have a foreign key back to a parent and a sort_order for ordering.
// All operations are synchronous (better-sqlite3). Uses the shared db connection
// from config so they participate in the caller's transactions automatically.

const db = require('../../config');

/**
 * Fetch all child rows for a given parent, ordered by sort_order then id.
 *
 * Why: every composite read (evidence, responses, essays, etc.) needs to pull
 * pictures and breakouts. This avoids duplicating the same SELECT pattern 10+
 * times across models.
 *
 * @param {string} table - child table name (e.g. 'evidence_pictures')
 * @param {string} fkColumn - foreign key column (e.g. 'evidence_id')
 * @param {number} parentId
 * @returns {object[]}
 */
function getChildren(table, fkColumn, parentId) {
  const sql = `SELECT * FROM ${table} WHERE ${fkColumn} = ? ORDER BY sort_order ASC, id ASC`;
  return db.prepare(sql).all(parentId);
}

/**
 * Replace all child rows for a parent atomically inside a transaction.
 * Old rows are deleted, then new rows are inserted with sequential sort_order.
 *
 * Why transactional: a partial replace (deleted old rows but failed to insert new
 * ones) would silently lose data. Running inside the caller's db.transaction()
 * guarantees all-or-nothing.
 *
 * @param {string} table - child table name (e.g. 'evidence_pictures')
 * @param {string} fkColumn - foreign key column (e.g. 'evidence_id')
 * @param {number} parentId
 * @param {object[]} rows - array of objects with column values (excluding id and fk)
 * @param {string[]} columns - column names to insert (excluding id and fkColumn)
 */
function replaceChildren(table, fkColumn, parentId, rows, columns) {
  // Delete existing children.
  db.prepare(`DELETE FROM ${table} WHERE ${fkColumn} = ?`).run(parentId);

  if (!rows || rows.length === 0) return;

  const colNames = [fkColumn, 'sort_order', ...columns];
  const placeholders = colNames.map((c) => `@${c}`);

  const insert = db.prepare(
    `INSERT INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders.join(', ')})`
  );

  for (let i = 0; i < rows.length; i++) {
    const row = { [fkColumn]: parentId, sort_order: i };
    for (const col of columns) {
      row[col] = rows[i][col] !== undefined ? rows[i][col] : null;
    }
    insert.run(row);
  }
}

module.exports = { getChildren, replaceChildren };
