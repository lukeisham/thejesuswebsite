// Shared model helpers — pure functions extracted from duplicated logic across
// the 18 model files (JS-3: keep each function small and single-purpose; DRY
// without abstraction frameworks).
//
// Every function here is a drop-in replacement for the inline code that
// existed in each model before extraction. Behavior must be byte-identical.

/**
 * Keep only whitelisted columns from an arbitrary input object.
 * Used by create() and update() in every model (JS-2: never let a stray
 * request-body field reach the database).
 *
 * @param {object} data      - Raw input object (e.g. request body).
 * @param {string[]} columns  - Whitelist of permitted column names.
 * @returns {object} A new object containing only whitelisted keys whose
 *                   values are not `undefined`.
 */
function pickWritable(data, columns) {
  const row = {};
  for (const column of columns) {
    if (data[column] !== undefined) row[column] = data[column];
  }
  return row;
}

/**
 * Build a slug guaranteed unique against a given table.
 * If `baseSlug` is taken, append a number: `slug`, `slug-2`, `slug-3`, ...
 * `excludeId` lets an update keep its own slug without colliding with itself.
 *
 * @param {object} db        - better-sqlite3 database instance.
 * @param {string} table     - Table name.
 * @param {string} baseSlug   - Desired base slug.
 * @param {number|null} [excludeId=null] - Row id to exclude from the
 *                                         uniqueness check.
 * @returns {string} A unique slug.
 */
function generateUniqueSlug(db, table, baseSlug, excludeId = null) {
  const slugExists = db.prepare(
    `SELECT 1 FROM ${table} WHERE slug = ? AND id IS NOT ?`,
  );

  let candidate = baseSlug;
  let suffix = 2;
  while (slugExists.get(candidate, excludeId)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Build and execute an `UPDATE ... SET a = @a, b = @b WHERE id = @id` for
 * whichever columns are present in `row`. Runs nothing and returns `false` if
 * `row` is empty (no columns to change) — the caller is expected to fall back
 * to returning the existing row in that case.
 *
 * @param {object} db      - better-sqlite3 database instance.
 * @param {string} table   - Table name.
 * @param {object} row     - Key/value pairs to set. Must include at least
 *                           one column; `id` is automatically appended.
 * @param {number} id      - Primary-key value for the WHERE clause.
 * @returns {boolean} `true` if the UPDATE was executed, `false` if `row`
 *                    was empty (no statement run).
 */
function runUpdate(db, table, row, id) {
  const columns = Object.keys(row);
  if (columns.length === 0) return false;

  const assignments = columns.map((column) => `${column} = @${column}`);
  db.prepare(
    `UPDATE ${table} SET ${assignments.join(", ")} WHERE id = @id`,
  ).run({ ...row, id });
  return true;
}

module.exports = { pickWritable, generateUniqueSlug, runUpdate };
