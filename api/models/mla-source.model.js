// MLA Source (bibliography) data access — all SQL for the `mla_sources` table.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  'mla_website_title',
  'mla_website_url',
  'mla_website_date',
  'mla_website_author',
  'mla_website_publisher',
  'mla_book_title',
  'mla_book_author',
  'mla_book_publisher',
  'mla_book_date',
  'mla_book_page_reference',
  'mla_journal_article_author',
  'mla_journal_article_title',
  'mla_journal_title',
  'mla_journal_volume',
  'mla_journal_issue',
  'mla_journal_date',
  'mla_journal_page_reference',
  'published_draft',
];

/**
 * All MLA sources, newest first.
 */
function getAll() {
  return db.prepare('SELECT * FROM mla_sources ORDER BY id DESC').all();
}

/**
 * Single MLA source by id, or undefined if not found.
 */
function getById(id) {
  return db.prepare('SELECT * FROM mla_sources WHERE id = ?').get(id);
}

/**
 * Insert a new MLA source. Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  const columns = Object.keys(row);
  if (columns.length === 0) return undefined;

  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(`INSERT INTO mla_sources (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`)
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing MLA source. Only writable fields present in `data` are changed.
 * Returns the updated row, or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (!runUpdate(db, 'mla_sources', row, id)) return getById(id);
  return getById(id);
}

/**
 * Delete by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare('DELETE FROM mla_sources WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = { getAll, getById, create, update, remove };
