// Response data access — all SQL for the `responses` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const {
  pickWritable,
  generateUniqueSlug,
  runUpdate,
} = require("./model-helpers");
const { getChildren, replaceChildren } = require("./relations/child-rows");
const {
  getLinked,
  getLinkedMlaSources,
  getLinkedIdentifiers,
  replaceLinks,
} = require("./relations/junctions");

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  "slug",
  "challenge_id",
  "response_title",
  "response_content",
  "response_author",
  "response_date",
  "response_publisher",
  "response_headings",
  "published_draft",
  "metadata_keywords",
  "two_column",
  "doi",
  "author_bio",
];

/**
 * Published responses for the public site, optionally narrowed to one challenge.
 * Only the whitelisted `challenge_id` filter is honoured (JS-2: no stray query
 * key can reach the SQL).
 */
function getAllPublished(filters = {}) {
  const conditions = ["published_draft = 1"];
  const params = [];

  if (filters.challenge_id) {
    conditions.push("challenge_id = ?");
    params.push(filters.challenge_id);
  }

  const sql = `
        SELECT * FROM responses
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at ASC
    `;
  return db.prepare(sql).all(...params);
}

/**
 * Published responses for a specific challenge.
 * Returns responses ordered by creation (oldest first, typically).
 */
function getByChallenge(challengeId) {
  return db
    .prepare(
      "SELECT * FROM responses WHERE challenge_id = ? AND published_draft = 1 ORDER BY created_at ASC",
    )
    .all(challengeId);
}

/**
 * Single published response by its public slug, or undefined if not found.
 */
function getBySlug(slug) {
  return db
    .prepare("SELECT * FROM responses WHERE slug = ? AND published_draft = 1")
    .get(slug);
}

/**
 * Single response by id regardless of publish state — for admin.
 */
function getById(id) {
  return db.prepare("SELECT * FROM responses WHERE id = ?").get(id);
}

/**
 * Full detail for public consumption — the base response row plus all related
 * breakouts, pictures, mla_sources, identifiers, and internal links
 * (evidence + context). Filters to published_draft = 1 at the base level.
 *
 * Why composite: the public response detail page needs to display breakouts,
 * pictures, bibliography citations, identifiers, and internal links. Assembling
 * this in one function avoids N+1 query storms on the frontend.
 */
function getDetailBySlug(slug) {
  const response = getBySlug(slug);
  if (!response) return undefined;
  return assembleDetail(response);
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 * This lets the admin edit form load drafts with their existing breakouts,
 * pictures, sources, identifiers, and links exactly as they were last saved.
 *
 * Why separate: the public slug-based read must never leak drafts. The admin
 * id-based read intentionally skips the publish filter so drafts are editable.
 */
function getAdminById(id) {
  const response = getById(id);
  if (!response) return undefined;
  return assembleDetail(response);
}

/**
 * Assemble a detail object from a base response row by attaching all related
 * child and junction data. This is the shared assembly logic — both public and
 * admin reads route through here so the shape is always consistent.
 *
 * Why prepared statements: each child query is a prepared statement, avoiding
 * query-plan recompilation on every request.
 */
function assembleDetail(response) {
  return {
    ...response,
    breakouts: getChildren("response_breakouts", "response_id", response.id),
    mla_sources: getLinkedMlaSources(
      "response_mla_sources",
      "response_id",
      "citation_order",
      response.id,
    ),
    identifiers: getLinkedIdentifiers(
      "response_identifiers",
      "response_id",
      "citation_order",
      response.id,
    ),
    links_evidence: getLinked(
      "response_links_evidence",
      "source_response_id",
      "sort_order",
      response.id,
    ),
    links_context: getLinked(
      "response_links_context",
      "source_response_id",
      "sort_order",
      response.id,
    ),
  };
}

/**
 * Insert a new response. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Must be linked to a challenge (via challenge_id).
 * Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(db, "responses", row.slug);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO responses (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Composite create — inserts the base response row and all related child/junction
 * rows inside a single transaction so a partial failure never leaves orphaned
 * related data (SR-3, JS-2: atomicity).
 *
 * Accepts the same base fields as create() plus optional arrays:
 *   breakouts: [{ title, content }]
 *   mla_source_ids: [id, ...]
 *   identifier_ids: [id, ...]
 *   link_evidence_ids: [id, ...]
 *   link_context_ids: [id, ...]
 */
function createComposite(data) {
  const writeRelated = db.transaction((data) => {
    // Extract related arrays before pickWritable strips them.
    const breakouts = data.breakouts;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const response = create(data);
    const responseId = response.id;

    replaceChildren(
      "response_breakouts",
      "response_id",
      responseId,
      breakouts,
      ["title", "content"],
    );
    replaceLinks(
      "response_mla_sources",
      "response_id",
      "mla_source_id",
      "citation_order",
      responseId,
      mlaSourceIds,
    );
    replaceLinks(
      "response_identifiers",
      "response_id",
      "identifier_id",
      "citation_order",
      responseId,
      identifierIds,
    );
    replaceLinks(
      "response_links_evidence",
      "source_response_id",
      "target_evidence_id",
      "sort_order",
      responseId,
      linkEvidenceIds,
    );
    replaceLinks(
      "response_links_context",
      "source_response_id",
      "target_context_essay_id",
      "sort_order",
      responseId,
      linkContextIds,
    );

    return getAdminById(responseId);
  });

  return writeRelated(data);
}

/**
 * Update an existing response. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(db, "responses", row.slug, id);
  }

  if (!runUpdate(db, "responses", row, id)) return getById(id);
  return getById(id);
}

/**
 * Composite update — updates the base row and atomically replaces all related
 * child/junction sets inside a single transaction. Accepts the same optional
 * arrays as createComposite.
 *
 * Why transaction: ensures we never end up with half-updated relations if
 * one of the replacements fails.
 */
function updateComposite(id, data) {
  const existing = getById(id);
  if (!existing) return undefined;

  const writeRelated = db.transaction((data) => {
    // Extract related arrays before pickWritable strips them.
    const breakouts = data.breakouts;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const response = update(id, data);
    if (!response) return undefined;

    replaceChildren("response_breakouts", "response_id", id, breakouts, [
      "title",
      "content",
    ]);
    replaceLinks(
      "response_mla_sources",
      "response_id",
      "mla_source_id",
      "citation_order",
      id,
      mlaSourceIds,
    );
    replaceLinks(
      "response_identifiers",
      "response_id",
      "identifier_id",
      "citation_order",
      id,
      identifierIds,
    );
    replaceLinks(
      "response_links_evidence",
      "source_response_id",
      "target_evidence_id",
      "sort_order",
      id,
      linkEvidenceIds,
    );
    replaceLinks(
      "response_links_context",
      "source_response_id",
      "target_context_essay_id",
      "sort_order",
      id,
      linkContextIds,
    );

    return getAdminById(id);
  });

  return writeRelated(data);
}

/**
 * Delete a response by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare("DELETE FROM responses WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  getAllPublished,
  getByChallenge,
  getBySlug,
  getById,
  getDetailBySlug,
  getAdminById,
  create,
  createComposite,
  update,
  updateComposite,
  remove,
};
