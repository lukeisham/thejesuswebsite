// Generic junction (M:N) helper for link tables that connect two entities.
// Junction tables have two FK columns plus an ordering column (citation_order or
// sort_order). All operations are synchronous and use the shared db connection
// so they participate in the caller's transactions.

const db = require('../../config');

/**
 * Fetch all linked rows for a given source, ordered by the order column then id.
 *
 * Why: every composite read needs to assemble bibliography, identifiers, and
 * internal links. This generic helper avoids 30+ nearly identical SELECT queries
 * across the codebase.
 *
 * @param {string} table - junction table name (e.g. 'evidence_mla_sources')
 * @param {string} sourceColumn - the FK column for the "owning" entity (e.g. 'evidence_id')
 * @param {string} orderColumn - ordering column name ('citation_order' or 'sort_order')
 * @param {number} sourceId
 * @returns {object[]}
 */
function getLinked(table, sourceColumn, orderColumn, sourceId) {
  const sql = `SELECT * FROM ${table} WHERE ${sourceColumn} = ? ORDER BY ${orderColumn} ASC, id ASC`;
  return db.prepare(sql).all(sourceId);
}

/**
 * Replace all junction rows for a given source atomically inside a transaction.
 * Old rows are deleted, then new rows are inserted with sequential ordering.
 *
 * Why transactional: ensures the M:N set is always consistent — either the full
 * new set lands or nothing changes. Must be called inside a db.transaction().
 *
 * @param {string} table - junction table name
 * @param {string} sourceColumn - FK column for the owning entity
 * @param {string} targetColumn - FK column for the linked entity
 * @param {string} orderColumn - ordering column name ('citation_order' or 'sort_order')
 * @param {number} sourceId
 * @param {object[]} rows - array of objects, each must have the target FK as a property matching targetColumn
 */
function replaceLinks(table, sourceColumn, targetColumn, orderColumn, sourceId, rows) {
  // Delete existing links.
  db.prepare(`DELETE FROM ${table} WHERE ${sourceColumn} = ?`).run(sourceId);

  if (!rows || rows.length === 0) return;

  const insert = db.prepare(
    `INSERT INTO ${table} (${sourceColumn}, ${targetColumn}, ${orderColumn})
     VALUES (@source, @target, @order)`
  );

  for (let i = 0; i < rows.length; i++) {
    const targetId = typeof rows[i] === 'object' ? rows[i][targetColumn] : rows[i];
    insert.run({ source: sourceId, target: targetId, order: i });
  }
}

module.exports = { getLinked, replaceLinks };
