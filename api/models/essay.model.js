// Essay data access — all SQL for the `context_essays` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const {
  pickWritable,
  generateUniqueSlug,
  runUpdate,
  paginate,
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
  "abstract",
];

// SQL-9: named columns instead of SELECT * — the full WRITABLE_COLUMNS set
// plus id and the timestamps.
const ALL_COLUMNS = ["id", ...WRITABLE_COLUMNS, "created_at", "updated_at"].join(
  ", ",
);

// SQL-1: fixed-SQL statements compile once, on first use. Lazy rather than at
// require time because route and guard tests load this module against a
// partial in-memory schema, where an eager prepare() would throw.
const statements = new Map();

function cachedStatement(name, sql) {
  let stmt = statements.get(name);
  if (!stmt) {
    stmt = db.prepare(sql);
    statements.set(name, stmt);
  }
  return stmt;
}

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
 * All essays, drafts and published, newest first, for the admin list.
 *
 * @returns {object[]}
 */
function getAllAdmin() {
  return cachedStatement(
    "selectAllAdmin",
    `SELECT ${ALL_COLUMNS} FROM context_essays ORDER BY created_at DESC`,
  ).all();
}

/**
 * Published essays for the public site, newest first.
 *
 * When `page` and `limit` are provided, returns a paginated response:
 *   { items: [...], total: N, page: N, limit: N, totalPages: N }
 * When they are absent, returns a flat array (backward compatible).
 *
 * @param {{page?: number, limit?: number}} [filters] Optional page and limit.
 * @returns {object[]|{items: object[], total: number, page: number, limit: number, totalPages: number}}
 */
function getAllPublished(filters = {}) {
  const { page, limit } = filters;
  const itemsSql = `SELECT ${ALL_COLUMNS} FROM context_essays WHERE published_draft = 1 ORDER BY created_at DESC`;
  const countSql = `SELECT COUNT(*) AS total FROM context_essays WHERE published_draft = 1`;
  const result = paginate(db, itemsSql, countSql, [], { page, limit });

  if (Array.isArray(result)) return result.map(normalizeForPublic);
  return { ...result, items: result.items.map(normalizeForPublic) };
}

/**
 * Single published essay by its public slug, or undefined if not found.
 *
 * @param {string} slug
 * @returns {object|undefined}
 */
function getBySlug(slug) {
  return cachedStatement(
    "selectPublishedBySlug",
    `SELECT ${ALL_COLUMNS} FROM context_essays WHERE slug = ? AND published_draft = 1`,
  ).get(slug);
}

/**
 * Single essay by id regardless of publish state — for the admin panel.
 *
 * @param {number} id
 * @returns {object|undefined}
 */
function getById(id) {
  return cachedStatement(
    "selectById",
    `SELECT ${ALL_COLUMNS} FROM context_essays WHERE id = ?`,
  ).get(id);
}

/**
 * Full detail for public consumption — the base essay row plus all related
 * breakouts, footnotes, sources, identifiers, and internal links (evidence + context).
 * Filters to published_draft = 1 at the base level.
 *
 * Why composite: the public essay detail page needs to display breakouts,
 * footnotes, bibliography citations, identifiers, and internal links. Assembling
 * this in one function avoids N+1 query storms on the frontend.
 *
 * @param {string} slug
 * @returns {object|undefined}
 */
function getDetailBySlug(slug) {
  const essay = getBySlug(slug);
  if (!essay) return undefined;
  return normalizeForPublic(assembleDetail(essay));
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 * This lets the admin edit form load drafts with their existing breakouts, pictures,
 * sources, identifiers, and links exactly as they were last saved.
 *
 * Why separate: the public slug-based read must never leak drafts. The admin
 * id-based read intentionally skips the publish filter so drafts are editable.
 *
 * @param {number} id
 * @returns {object|undefined}
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
    footnotes: getChildren("essay_footnotes", "context_essay_id", essay.id),
    breakouts: getChildren("essay_breakouts", "context_essay_id", essay.id),
    mla_sources: getLinkedMlaSources(
      "context_essay_mla_sources",
      "context_essay_id",
      "citation_order",
      essay.id,
    ),
    identifiers: getLinkedIdentifiers(
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
 *
 * @param {object} data
 * @returns {object|undefined}
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
 *
 * @param {number} id
 * @param {object} data
 * @returns {object|undefined}
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
 *   footnotes: [{ content }]  (replaced only when the key is present)
 *   mla_source_ids: [id, ...]
 *   identifier_ids: [id, ...]
 *   link_evidence_ids: [id, ...]
 *   link_context_ids: [id, ...]
 *
 * @param {object} data
 * @returns {object|undefined}
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

    // Footnotes are replaced only when the key is present (the admin editors
    // always send it), so a save from another client
    // cannot wipe them. See setup/ARCHITECTURE/journal-article-fields.md.
    if (data.footnotes !== undefined) {
      replaceChildren("essay_footnotes", "context_essay_id", essayId, data.footnotes, [
        "content",
      ]);
    }
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
 *
 * @param {number} id
 * @param {object} data
 * @returns {object|undefined}
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

    // Footnotes are replaced only when the key is present (the admin editors
    // always send it), so a save from another client
    // cannot wipe them. See setup/ARCHITECTURE/journal-article-fields.md.
    if (data.footnotes !== undefined) {
      replaceChildren("essay_footnotes", "context_essay_id", id, data.footnotes, [
        "content",
      ]);
    }
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
 *
 * @param {number} id
 * @returns {boolean}
 */
function remove(id) {
  const result = cachedStatement(
    "deleteById",
    "DELETE FROM context_essays WHERE id = ?",
  ).run(id);
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
