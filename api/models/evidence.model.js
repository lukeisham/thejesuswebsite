// Evidence data access — all SQL for the `evidence` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { getChildren, replaceChildren } = require("./relations/child-rows");
const { getLinked, replaceLinks } = require("./relations/junctions");
const { pickWritable, generateUniqueSlug, runUpdate } = require("./model-helpers");

// Columns the admin is allowed to write. Listed explicitly so a stray field in
// the request body can never reach the database (JS-2: predictable, no surprises).
const WRITABLE_COLUMNS = [
  "title",
  "slug",
  "description",
  "primary_verse",
  "secondary_verse",
  "gospel_category",
  "timeline_era",
  "timeline_period",
  "map_location",
  "map_x",
  "map_y",
  "metadata_keywords",
  "published_draft",
  "version_update",
];

const VALID_FILTERS = [
  "gospel_category",
  "timeline_era",
  "timeline_period",
  "map_location",
];



/**
 * Published evidence for the public site, newest first.
 * Accepts an optional filter object; only whitelisted keys are applied.
 */
function getAllPublished(filters = {}) {
  const conditions = ["published_draft = 1"];
  const params = [];

  for (const key of VALID_FILTERS) {
    if (filters[key]) {
      conditions.push(`${key} = ?`);
      params.push(filters[key]);
    }
  }

  const sql = `
        SELECT * FROM evidence
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at DESC
    `;
  return db.prepare(sql).all(...params);
}

/** Single published item by its public slug, or undefined if not found. */
function getBySlug(slug) {
  return db
    .prepare("SELECT * FROM evidence WHERE slug = ? AND published_draft = 1")
    .get(slug);
}

/** Single item by id regardless of publish state — for the admin panel. */
function getById(id) {
  return db.prepare("SELECT * FROM evidence WHERE id = ?").get(id);
}

/**
 * Full detail for public consumption — the base evidence row plus all related
 * pictures, sources, identifiers, and internal links (evidence + context).
 * Filters to published_draft = 1 at the base level.
 *
 * Why composite: the public evidence detail page needs to display pictures,
 * bibliography citations, identifiers, and internal links. Assembling this in
 * one function avoids N+1 query storms on the frontend.
 */
function getDetailBySlug(slug) {
  const evidence = getBySlug(slug);
  if (!evidence) return undefined;
  return assembleDetail(evidence);
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 * This lets the admin edit form load drafts with their existing pictures, sources,
 * identifiers, and links exactly as they were last saved.
 *
 * Why separate: the public slug-based read must never leak drafts. The admin
 * id-based read intentionally skips the publish filter so drafts are editable.
 */
function getAdminById(id) {
  const evidence = getById(id);
  if (!evidence) return undefined;
  return assembleDetail(evidence);
}

/**
 * Assemble a detail object from a base evidence row by attaching all related
 * child and junction data. This is the shared assembly logic — both public and
 * admin reads route through here so the shape is always consistent.
 *
 * Why prepared statements: each child query is a prepared statement, avoiding
 * query-plan recompilation on every request.
 */
function assembleDetail(evidence) {
  return {
    ...evidence,
    pictures: getChildren("evidence_pictures", "evidence_id", evidence.id),
    mla_sources: getLinked(
      "evidence_mla_sources",
      "evidence_id",
      "citation_order",
      evidence.id,
    ),
    identifiers: getLinked(
      "evidence_identifiers",
      "evidence_id",
      "citation_order",
      evidence.id,
    ),
    links_evidence: getLinked(
      "evidence_links_evidence",
      "source_evidence_id",
      "sort_order",
      evidence.id,
    ),
    links_context: getLinked(
      "evidence_links_context",
      "source_evidence_id",
      "sort_order",
      evidence.id,
    ),
  };
}

/**
 * Insert a new evidence row. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(db, "evidence", row.slug);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO evidence (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Composite create — inserts the base evidence row and all related child/junction
 * rows inside a single transaction so a partial failure never leaves orphaned
 * related data (SR-3, JS-2: atomicity).
 *
 * Accepts the same base fields as create() plus optional arrays:
 *   pictures: [{ image_path, caption }]
 *   mla_source_ids: [id, ...]
 *   identifier_ids: [id, ...]
 *   link_evidence_ids: [id, ...]
 *   link_context_ids: [id, ...]
 */
function createComposite(data) {
  const writeRelated = db.transaction((data) => {
    // Extract related arrays before pickWritable strips them.
    const pictures = data.pictures;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const evidence = create(data);
    const evidenceId = evidence.id;

    replaceChildren("evidence_pictures", "evidence_id", evidenceId, pictures, [
      "image_path",
      "caption",
    ]);
    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      evidenceId,
      mlaSourceIds,
    );
    replaceLinks(
      "evidence_identifiers",
      "evidence_id",
      "identifier_id",
      "citation_order",
      evidenceId,
      identifierIds,
    );
    replaceLinks(
      "evidence_links_evidence",
      "source_evidence_id",
      "target_evidence_id",
      "sort_order",
      evidenceId,
      linkEvidenceIds,
    );
    replaceLinks(
      "evidence_links_context",
      "source_evidence_id",
      "target_context_essay_id",
      "sort_order",
      evidenceId,
      linkContextIds,
    );

    return getAdminById(evidenceId);
  });

  return writeRelated(data);
}

/**
 * Update an existing evidence row. Only writable fields present in `data` are
 * changed. If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(db, "evidence", row.slug, id);
  }

  runUpdate(db, "evidence", row, id);
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
    const pictures = data.pictures;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const evidence = update(id, data);
    if (!evidence) return undefined;

    replaceChildren("evidence_pictures", "evidence_id", id, pictures, [
      "image_path",
      "caption",
    ]);
    replaceLinks(
      "evidence_mla_sources",
      "evidence_id",
      "mla_source_id",
      "citation_order",
      id,
      mlaSourceIds,
    );
    replaceLinks(
      "evidence_identifiers",
      "evidence_id",
      "identifier_id",
      "citation_order",
      id,
      identifierIds,
    );
    replaceLinks(
      "evidence_links_evidence",
      "source_evidence_id",
      "target_evidence_id",
      "sort_order",
      id,
      linkEvidenceIds,
    );
    replaceLinks(
      "evidence_links_context",
      "source_evidence_id",
      "target_context_essay_id",
      "sort_order",
      id,
      linkContextIds,
    );

    return getAdminById(id);
  });

  return writeRelated(data);
}

/** Delete by id. Returns true if a row was removed. */
function remove(id) {
  const result = db.prepare("DELETE FROM evidence WHERE id = ?").run(id);
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
