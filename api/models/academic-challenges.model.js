// Academic challenges data access — filters the `challenges` table for academic items.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { getLinked } = require("./relations/junctions");
const { pickWritable, runUpdate } = require("./model-helpers");

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  "slug",
  "challenge_title",
  "challenge_summary",
  "challenge_picture",
  "challenge_url_a",
  "challenge_url_b",
  "challenge_url_c",
  "challenge_url_d",
  "challenge_rank_number",
  "challenge_rank_pluses",
  "challenge_rank_minuses",
  "published_draft",
  "metadata_keywords",
];

/**
 * Build a slug unique within academic challenges only (scoped to
 * academic_popular = 'academic'). Kept inline because the shared helper
 * does not support the category-scoped constraint.
 */
function generateUniqueSlug(baseSlug, excludeId = null) {
  const slugExists = db.prepare(
    "SELECT 1 FROM challenges WHERE slug = ? AND academic_popular = ? AND id IS NOT ?",
  );

  let candidate = baseSlug;
  let suffix = 2;
  while (slugExists.get(candidate, "academic", excludeId)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Published academic challenges, ranked by challenge_rank_number.
 */
function getAllPublished() {
  return db
    .prepare(
      "SELECT * FROM challenges WHERE academic_popular = ? AND published_draft = 1 ORDER BY challenge_rank_number ASC",
    )
    .all("academic");
}

/**
 * Single published academic challenge by slug, or undefined if not found.
 */
function getBySlug(slug) {
  return db
    .prepare(
      "SELECT * FROM challenges WHERE slug = ? AND academic_popular = ? AND published_draft = 1",
    )
    .get(slug, "academic");
}

/**
 * Single academic challenge by id regardless of publish state — for admin.
 */
function getById(id) {
  return db
    .prepare("SELECT * FROM challenges WHERE id = ? AND academic_popular = ?")
    .get(id, "academic");
}

/**
 * Insert a new academic challenge. `data.slug` is de-duplicated automatically.
 * Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(row.slug);
  row.academic_popular = "academic";

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO challenges (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing academic challenge. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(row.slug, id);
  }

  runUpdate(db, "challenges", row, id);

  return getById(id);
}

/**
 * Delete an academic challenge by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db
    .prepare("DELETE FROM challenges WHERE id = ? AND academic_popular = ?")
    .run(id, "academic");
  return result.changes > 0;
}

/**
 * Count of published academic challenges.
 */
function getPublishedCount() {
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM challenges WHERE academic_popular = ? AND published_draft = 1",
    )
    .get("academic");
  return row.count;
}

/**
 * Published academic challenge by slug with its mla_sources and identifiers attached.
 */
function getDetailBySlug(slug) {
  const challenge = getBySlug(slug);
  if (!challenge) return undefined;
  return {
    ...challenge,
    mla_sources: getLinked(
      "challenge_mla_sources",
      "challenge_id",
      "citation_order",
      challenge.id,
    ),
    identifiers: getLinked(
      "challenge_identifiers",
      "challenge_id",
      "citation_order",
      challenge.id,
    ),
  };
}

/**
 * Admin read by id — includes mla_sources and identifiers regardless of publish state.
 */
function getAdminById(id) {
  const challenge = getById(id);
  if (!challenge) return undefined;
  return {
    ...challenge,
    mla_sources: getLinked(
      "challenge_mla_sources",
      "challenge_id",
      "citation_order",
      challenge.id,
    ),
    identifiers: getLinked(
      "challenge_identifiers",
      "challenge_id",
      "citation_order",
      challenge.id,
    ),
  };
}

module.exports = {
  getAllPublished,
  getBySlug,
  getById,
  getDetailBySlug,
  getAdminById,
  getPublishedCount,
  create,
  update,
  remove,
};
