// Site Settings data access — all SQL for the singleton `site_settings` table.
// Functions are synchronous (better-sqlite3) and return plain objects.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');
const { pickWritable, runUpdate } = require('./model-helpers');

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = ['title', 'description', 'og_image'];

/**
 * The singleton site-settings row (id = 1).
 */
function get() {
  return db.prepare('SELECT * FROM site_settings WHERE id = 1').get();
}

/**
 * Update the singleton site-settings row. Only writable fields present in
 * `data` are changed. `title` and `description` are NOT NULL columns, so a
 * blank value for either is dropped rather than blanking out the existing
 * value. Returns undefined if no field survives (caller returns 400).
 */
function update(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);

  if (typeof row.title === 'string' && row.title.trim() === '') delete row.title;
  if (typeof row.description === 'string' && row.description.trim() === '') delete row.description;

  if (Object.keys(row).length === 0) return undefined;

  runUpdate(db, 'site_settings', row, 1);
  return get();
}

module.exports = { get, update };
