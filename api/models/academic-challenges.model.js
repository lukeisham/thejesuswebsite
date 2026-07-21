// Academic challenges data access — filters the `challenges` table for academic items.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const {
  getLinked,
  getLinkedMlaSources,
  getLinkedIdentifiers,
  replaceLinks,
} = require("./relations/junctions");
const { pickWritable, runUpdate } = require("./model-helpers");

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  "slug",
  "challenge_title",
  "challenge_summary",
  "challenge_body",
  "challenge_picture",
  "challenge_rank_number",
  "challenge_rank_pluses",
  "challenge_rank_minuses",
  "published_draft",
  "metadata_keywords",
];

/**
 * Map a raw DB row to the public response shape.
 * challenge_title → title, challenge_summary → summary,
 * challenge_body → body, mla_sources → bibliography.
 * Kept separate so the admin path (getAdminById) still returns raw keys
 * the Plan 03 editors expect.
 */
function normalizeForPublic(row) {
  if (!row) return row;
  return {
    id: row.id,
    slug: row.slug,
    title: row.challenge_title,
    summary: row.challenge_summary,
    body: row.challenge_body,
    challenge_picture: row.challenge_picture,
    challenge_rank_number: row.challenge_rank_number,
    upvotes: row.upvotes !== undefined ? row.upvotes : row.challenge_rank_pluses,
    downvotes: row.downvotes !== undefined ? row.downvotes : row.challenge_rank_minuses,
    published_draft: row.published_draft,
    metadata_keywords: row.metadata_keywords,
    academic_popular: row.academic_popular,
    response_count: row.response_count,
    mla_sources: row.mla_sources,
    bibliography: row.mla_sources,
    identifiers: row.identifiers,
  };
}

/**
 * Build a slug unique within academic challenges only (scoped to
 * academic_popular = 'academic'). Kept inline because the shared helper
 * does not support the category-scoped constraint.
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
 * Published academic challenges, ranked by challenge_rank_number.
 * Transforms field names for frontend consumption and enriches each
 * challenge with its published response count via a LEFT JOIN.
 */
function getAllPublished() {
  return db
    .prepare(
      `SELECT
        c.id,
        c.slug,
        c.challenge_title AS title,
        c.challenge_summary AS summary,
        c.challenge_picture,
        c.challenge_rank_number,
        c.challenge_rank_pluses AS upvotes,
        c.challenge_rank_minuses AS downvotes,
        c.published_draft,
        c.metadata_keywords,
        c.academic_popular,
        COALESCE(rc.response_count, 0) AS response_count
      FROM challenges c
      LEFT JOIN (
        SELECT challenge_id, COUNT(*) AS response_count
        FROM responses
        WHERE published_draft = 1
        GROUP BY challenge_id
      ) rc ON c.id = rc.challenge_id
      WHERE c.academic_popular = ? AND c.published_draft = 1
      ORDER BY c.challenge_rank_number ASC`,
    )
    .all("academic");
}

/**
 * All academic challenges for the admin list — both draft and published,
 * ranked by challenge_rank_number. Unlike getAllPublished() this applies no
 * published_draft filter and returns raw column names (challenge_title,
 * published_draft, …) so the admin table can render them directly. Citations
 * are intentionally omitted here — the list view does not use them, and the
 * per-record admin editor loads them separately via getAdminById().
 */
function getAllAdmin() {
  return db
    .prepare(
      "SELECT * FROM challenges WHERE academic_popular = ? ORDER BY challenge_rank_number ASC",
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
 * Insert a new academic challenge with MLA source links in a transaction.
 * Accepts an optional mla_source_ids array; links are persisted atomically
 * with the challenge insert so a mid-write failure leaves nothing behind.
 */
function createComposite(data) {
  const { mla_source_ids, ...challengeData } = data;
  const txn = db.transaction(() => {
    const created = create(challengeData);
    if (mla_source_ids && mla_source_ids.length > 0) {
      replaceLinks(
        "challenge_mla_sources",
        "challenge_id",
        "mla_source_id",
        "citation_order",
        created.id,
        mla_source_ids.map((id) => ({ mla_source_id: id })),
      );
    }
    return getAdminById(created.id);
  });
  return txn();
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
 * Update an academic challenge with MLA source links in a transaction.
 * Accepts an optional mla_source_ids array; if absent, existing links are
 * left alone. If present (including an empty array), links are replaced.
 */
function updateComposite(id, data) {
  const { mla_source_ids, ...challengeData } = data;
  const txn = db.transaction(() => {
    const updated = update(id, challengeData);
    if (!updated) return undefined;
    if (mla_source_ids !== undefined) {
      replaceLinks(
        "challenge_mla_sources",
        "challenge_id",
        "mla_source_id",
        "citation_order",
        id,
        mla_source_ids.map((id) => ({ mla_source_id: id })),
      );
    }
    return getAdminById(id);
  });
  return txn();
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
 * Returns a normalized public shape (title/summary/body/bibliography).
 */
function getDetailBySlug(slug) {
  const challenge = getBySlug(slug);
  if (!challenge) return undefined;
  const mla_sources = getLinkedMlaSources(
    "challenge_mla_sources",
    "challenge_id",
    "citation_order",
    challenge.id,
  );
  const identifiers = getLinkedIdentifiers(
    "challenge_identifiers",
    "challenge_id",
    "citation_order",
    challenge.id,
  );
  return normalizeForPublic({
    ...challenge,
    mla_sources,
    identifiers,
  });
}

/**
 * Admin read by id — includes mla_sources and identifiers regardless of publish state.
 * Keeps raw column names (challenge_title, challenge_body, etc.) for the admin editors.
 * mla_sources resolves through the junction to full mla_sources rows (id = the
 * actual source id) so the admin editor's AdminMlaSources panel can reload
 * previously-linked sources by id — the same shape getDetailBySlug() returns.
 */
function getAdminById(id) {
  const challenge = getById(id);
  if (!challenge) return undefined;
  return {
    ...challenge,
    mla_sources: getLinkedMlaSources(
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
  getAllAdmin,
  getBySlug,
  getById,
  getDetailBySlug,
  getAdminById,
  getPublishedCount,
  create,
  createComposite,
  update,
  updateComposite,
  remove,
};
