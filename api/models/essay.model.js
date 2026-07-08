// Essay data access — all SQL for the `context_essays` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const {
  pickWritable,
  generateUniqueSlug,
  runUpdate,
} = require("./model-helpers");
const { getChildren, replaceChildren } = require("./relations/child-rows");
const { getLinked, replaceLinks } = require("./relations/junctions");

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  "slug",
  "essay_title",
  "essay_content",
  "essay_author",
  "essay_date",
  "essay_publisher",
  "essay_headings",
  "published_draft",
  "metadata_keywords",
  "two_column",
  "doi",
  "author_bio",
];

/**
 * Published essays for the public site, newest first.
 */
function getAllPublished() {
  return db
    .prepare(
      "SELECT * FROM context_essays WHERE published_draft = 1 ORDER BY created_at DESC",
    )
    .all();
}

/**
 * Single published essay by its public slug, or undefined if not found.
 */
function getBySlug(slug) {
  return db
    .prepare(
      "SELECT * FROM context_essays WHERE slug = ? AND published_draft = 1",
    )
    .get(slug);
}

/**
 * Single essay by id regardless of publish state — for the admin panel.
 */
function getById(id) {
  return db.prepare("SELECT * FROM context_essays WHERE id = ?").get(id);
}

/**
 * Full detail for public consumption — the base essay row plus all related
 * breakouts, pictures, sources, identifiers, and internal links (evidence + context).
 * Filters to published_draft = 1 at the base level.
 *
 * Why composite: the public essay detail page needs to display breakouts,
 * pictures, bibliography citations, identifiers, and internal links. Assembling
 * this in one function avoids N+1 query storms on the frontend.
 */
function getDetailBySlug(slug) {
  const essay = getBySlug(slug);
  if (!essay) return undefined;
  return assembleDetail(essay);
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 * This lets the admin edit form load drafts with their existing breakouts, pictures,
 * sources, identifiers, and links exactly as they were last saved.
 *
 * Why separate: the public slug-based read must never leak drafts. The admin
 * id-based read intentionally skips the publish filter so drafts are editable.
 */
function getAdminById(id) {
  const essay = getById(id);
  if (!essay) return undefined;
  return assembleDetail(essay);
}

/**
 * Assemble a detail object from a base essay row by attaching all related
 * child and junction data. This is the shared assembly logic — both public and
 * admin reads route through here so the shape is always consistent.
 *
 * Why prepared statements: each child query is a prepared statement, avoiding
 * query-plan recompilation on every request.
 */
function assembleDetail(essay) {
  return {
    ...essay,
    breakouts: getChildren("essay_breakouts", "context_essay_id", essay.id),
    mla_sources: getLinked(
      "context_essay_mla_sources",
      "context_essay_id",
      "citation_order",
      essay.id,
    ),
    identifiers: getLinked(
      "context_essay_identifiers",
      "context_essay_id",
      "citation_order",
      essay.id,
    ),
    links_evidence: getLinked(
      "context_essay_links_evidence",
      "source_context_essay_id",
      "sort_order",
      essay.id,
    ),
    links_context: getLinked(
      "context_essay_links_context",
      "source_context_essay_id",
      "sort_order",
      essay.id,
    ),
  };
}

/**
 * Insert a new essay row. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(db, "context_essays", row.slug);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO context_essays (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing essay row. Only writable fields present in `data` are
 * changed. If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(db, "context_essays", row.slug, id);
  }

  runUpdate(db, "context_essays", row, id);
  return getById(id);
}

/**
 * Composite create — inserts the base essay row and all related child/junction
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

    const essay = create(data);
    const essayId = essay.id;

    replaceChildren("essay_breakouts", "context_essay_id", essayId, breakouts, [
      "title",
      "content",
    ]);
    replaceLinks(
      "context_essay_mla_sources",
      "context_essay_id",
      "mla_source_id",
      "citation_order",
      essayId,
      mlaSourceIds,
    );
    replaceLinks(
      "context_essay_identifiers",
      "context_essay_id",
      "identifier_id",
      "citation_order",
      essayId,
      identifierIds,
    );
    replaceLinks(
      "context_essay_links_evidence",
      "source_context_essay_id",
      "target_evidence_id",
      "sort_order",
      essayId,
      linkEvidenceIds,
    );
    replaceLinks(
      "context_essay_links_context",
      "source_context_essay_id",
      "target_context_essay_id",
      "sort_order",
      essayId,
      linkContextIds,
    );

    return getAdminById(essayId);
  });

  return writeRelated(data);
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

    const essay = update(id, data);
    if (!essay) return undefined;

    replaceChildren("essay_breakouts", "context_essay_id", id, breakouts, [
      "title",
      "content",
    ]);
    replaceLinks(
      "context_essay_mla_sources",
      "context_essay_id",
      "mla_source_id",
      "citation_order",
      id,
      mlaSourceIds,
    );
    replaceLinks(
      "context_essay_identifiers",
      "context_essay_id",
      "identifier_id",
      "citation_order",
      id,
      identifierIds,
    );
    replaceLinks(
      "context_essay_links_evidence",
      "source_context_essay_id",
      "target_evidence_id",
      "sort_order",
      id,
      linkEvidenceIds,
    );
    replaceLinks(
      "context_essay_links_context",
      "source_context_essay_id",
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
 * Delete by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare("DELETE FROM context_essays WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  getAllPublished,
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
