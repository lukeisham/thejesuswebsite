// Popular challenges data access — filters the `challenges` table for popular items.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { pickWritable, runUpdate } = require("./model-helpers");
const { getLinked } = require("./relations/junctions");

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
 * Build a slug that is guaranteed unique within popular challenges.
 * If `baseSlug` is taken, append a number: `challenge-title`, `challenge-title-2`, ...
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
function generateUniqueSlug(baseSlug, excludeId = null) {
  const slugExists = db.prepare(
    "SELECT 1 FROM challenges WHERE slug = ? AND id IS NOT ?",
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
 * Published popular challenges, ranked by challenge_rank_number.
 */
function getAllPublished() {
  return db
    .prepare(
      "SELECT * FROM challenges WHERE academic_popular = ? AND published_draft = 1 ORDER BY challenge_rank_number ASC",
    )
    .all("popular");
}

/**
 * Single published popular challenge by slug, or undefined if not found.
 */
function getBySlug(slug) {
  return db
    .prepare(
      "SELECT * FROM challenges WHERE slug = ? AND academic_popular = ? AND published_draft = 1",
    )
    .get(slug, "popular");
}

/**
 * Single popular challenge by id regardless of publish state — for admin.
 */
function getById(id) {
  return db
    .prepare("SELECT * FROM challenges WHERE id = ? AND academic_popular = ?")
    .get(id, "popular");
}

/**
 * Insert a new popular challenge. `data.slug` is de-duplicated automatically.
 * Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(row.slug);
  row.academic_popular = "popular";

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
 * Update an existing popular challenge. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(row.slug, id);
  }

  if (!runUpdate(db, 'challenges', row, id)) return getById(id);
  return getById(id);
}

/**
 * Delete a popular challenge by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db
    .prepare("DELETE FROM challenges WHERE id = ? AND academic_popular = ?")
    .run(id, "popular");
  return result.changes > 0;
}

/**
 * Count of published popular challenges.
 */
function getPublishedCount() {
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM challenges WHERE academic_popular = ? AND published_draft = 1",
    )
    .get("popular");
  return row.count;
}

/**
 * Published popular challenge by slug with its mla_sources and identifiers attached.
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
