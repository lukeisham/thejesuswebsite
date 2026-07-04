// About Page data access — all SQL for the `about_pages` table.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  'about_section_title',
  'about_section_content',
  'published_draft',
  'version_update',
  'metadata_keywords',
];

/**
 * All about sections, ordered by id (insertion order).
 */
function getAll() {
  return db.prepare('SELECT * FROM about_pages ORDER BY id ASC').all();
}

/**
 * Published about sections for the public site, ordered by id.
 */
function getAllPublished() {
  return db.prepare('SELECT * FROM about_pages WHERE published_draft = 1 ORDER BY id ASC').all();
}

/**
 * Single about page by id regardless of publish state — for admin.
 */
function getById(id) {
  return db.prepare('SELECT * FROM about_pages WHERE id = ?').get(id);
}

/**
 * Insert a new about section. Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  if (columns.length === 0) return undefined;

  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(`INSERT INTO about_pages (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing about section. Only writable fields present in `data` are changed.
 * Returns the updated row, or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  runUpdate(db, 'about_pages', row, id);

  return getById(id);
}

/**
 * Delete by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare('DELETE FROM about_pages WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { getAll, getAllPublished, getById, create, update, remove };
