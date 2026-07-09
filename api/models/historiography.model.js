// Historiography data access — all SQL for the `historiography` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const { getChildren, replaceChildren } = require("./relations/child-rows");
const {
  getLinked,
  getLinkedMlaSources,
  getLinkedIdentifiers,
  replaceLinks,
} = require("./relations/junctions");
const {
  pickWritable,
  generateUniqueSlug,
  runUpdate,
} = require("./model-helpers");

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
  "historiography_period",
  "period_sort_order",
];

/**
 * Map DB-native column names to the names the frontend JS expects. Admin
 * reads (getAdminById) skip this so admin forms keep using the raw DB names.
 */
function normalizeForPublic(item) {
  const {
    essay_title,
    essay_author,
    essay_content,
    metadata_keywords,
    mla_sources,
    ...rest
  } = item;
  return {
    ...rest,
    title: essay_title,
    author: essay_author,
    body: essay_content,
    keywords: metadata_keywords
      ? metadata_keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [],
    mla_sources,
    ...(mla_sources !== undefined ? { bibliography: mla_sources } : {}),
  };
}

/**
 * Published historiography essays for the public site, grouped by period
 * (period_sort_order ascending), newest first within a period.
 */
function getAllPublished() {
  return db
    .prepare(
      "SELECT * FROM historiography WHERE published_draft = 1 ORDER BY period_sort_order ASC, created_at DESC",
    )
    .all()
    .map(normalizeForPublic);
}

/**
 * Single published historiography essay by its public slug, or undefined if not found.
 */
function getBySlug(slug) {
  return db
    .prepare(
      "SELECT * FROM historiography WHERE slug = ? AND published_draft = 1",
    )
    .get(slug);
}

/**
 * Single historiography essay by id regardless of publish state — for admin.
 */
function getById(id) {
  return db.prepare("SELECT * FROM historiography WHERE id = ?").get(id);
}

/**
 * Every historiography essay — published and draft alike — raw DB column
 * names, for the admin list view. Requires auth at the route level; never
 * exposed on the public list endpoint.
 */
function getAllAdmin() {
  return db
    .prepare(
      "SELECT * FROM historiography ORDER BY period_sort_order ASC, created_at DESC",
    )
    .all();
}

/**
 * Full detail for public consumption — the base historiography row plus all related
 * breakouts, pictures, sources, identifiers, and internal links.
 * Filters to published_draft = 1 at the base level.
 */
function getDetailBySlug(slug) {
  const item = getBySlug(slug);
  if (!item) return undefined;
  return normalizeForPublic(assembleDetail(item));
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 */
function getAdminById(id) {
  const item = getById(id);
  if (!item) return undefined;
  return assembleDetail(item);
}

/**
 * Assemble a detail object from a base historiography row by attaching all related
 * child and junction data.
 */
function assembleDetail(item) {
  return {
    ...item,
    breakouts: getChildren(
      "historiography_breakouts",
      "historiography_id",
      item.id,
    ),
    mla_sources: getLinkedMlaSources(
      "historiography_mla_sources",
      "historiography_id",
      "citation_order",
      item.id,
    ),
    identifiers: getLinkedIdentifiers(
      "historiography_identifiers",
      "historiography_id",
      "citation_order",
      item.id,
    ),
    links_evidence: getLinked(
      "historiography_links_evidence",
      "source_historiography_id",
      "sort_order",
      item.id,
    ),
    links_context: getLinked(
      "historiography_links_context",
      "source_historiography_id",
      "sort_order",
      item.id,
    ),
  };
}

/**
 * Insert a new historiography essay. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(db, "historiography", row.slug);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO historiography (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Composite create — inserts the base historiography row and all related child/junction
 * rows inside a single transaction.
 */
function createComposite(data) {
  const writeRelated = db.transaction((data) => {
    const breakouts = data.breakouts;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const item = create(data);
    const itemId = item.id;

    replaceChildren(
      "historiography_breakouts",
      "historiography_id",
      itemId,
      breakouts,
      ["title", "content"],
    );
    replaceLinks(
      "historiography_mla_sources",
      "historiography_id",
      "mla_source_id",
      "citation_order",
      itemId,
      mlaSourceIds,
    );
    replaceLinks(
      "historiography_identifiers",
      "historiography_id",
      "identifier_id",
      "citation_order",
      itemId,
      identifierIds,
    );
    replaceLinks(
      "historiography_links_evidence",
      "source_historiography_id",
      "target_evidence_id",
      "sort_order",
      itemId,
      linkEvidenceIds,
    );
    replaceLinks(
      "historiography_links_context",
      "source_historiography_id",
      "target_context_essay_id",
      "sort_order",
      itemId,
      linkContextIds,
    );

    return getAdminById(itemId);
  });

  return writeRelated(data);
}

/**
 * Update an existing historiography essay. Only writable fields present in `data` are
 * changed. If the slug changes it is re-de-duplicated. Returns the updated row,
 * or undefined if no row has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  if (row.slug !== undefined) {
    row.slug = generateUniqueSlug(db, "historiography", row.slug, id);
  }

  runUpdate(db, "historiography", row, id);
  return getById(id);
}

/**
 * Composite update — updates the base row and atomically replaces all related
 * child/junction sets inside a single transaction.
 */
function updateComposite(id, data) {
  const existing = getById(id);
  if (!existing) return undefined;

  const writeRelated = db.transaction((data) => {
    const breakouts = data.breakouts;
    const mlaSourceIds = data.mla_source_ids;
    const identifierIds = data.identifier_ids;
    const linkEvidenceIds = data.link_evidence_ids;
    const linkContextIds = data.link_context_ids;

    const item = update(id, data);
    if (!item) return undefined;

    replaceChildren(
      "historiography_breakouts",
      "historiography_id",
      id,
      breakouts,
      ["title", "content"],
    );
    replaceLinks(
      "historiography_mla_sources",
      "historiography_id",
      "mla_source_id",
      "citation_order",
      id,
      mlaSourceIds,
    );
    replaceLinks(
      "historiography_identifiers",
      "historiography_id",
      "identifier_id",
      "citation_order",
      id,
      identifierIds,
    );
    replaceLinks(
      "historiography_links_evidence",
      "source_historiography_id",
      "target_evidence_id",
      "sort_order",
      id,
      linkEvidenceIds,
    );
    replaceLinks(
      "historiography_links_context",
      "source_historiography_id",
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
 * Delete a historiography essay by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare("DELETE FROM historiography WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = {
  getAllPublished,
  getAllAdmin,
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
