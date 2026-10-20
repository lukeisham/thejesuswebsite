// Response data access — all SQL for the `responses` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const {
  pickWritable,
  generateUniqueSlug,
  runUpdate,
  paginate,
  cachedStatement,
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
  "abstract",
  "strength",
];

// SQL-9: named columns instead of SELECT * — the full WRITABLE_COLUMNS set
// plus id and the timestamps, which is every column of the table.
const ALL_COLUMN_NAMES = ["id", ...WRITABLE_COLUMNS, "created_at", "updated_at"];
const ALL_COLUMNS = ALL_COLUMN_NAMES.join(", ");

// The same list qualified with the `r` alias that getDetailBySlug() joins on.
const ALL_COLUMNS_ALIASED = ALL_COLUMN_NAMES.map((name) => `r.${name}`).join(", ");

/**
 * Published responses for the public site, optionally narrowed to one challenge.
 * Only the whitelisted `challenge_id` filter is honoured (JS-2: no stray query
 * key can reach the SQL).
 */
function getAllPublished(filters = {}) {
  const { page, limit, ...filterKeys } = filters;
  const conditions = ["published_draft = 1"];
  const params = [];

  if (filterKeys.challenge_id) {
    conditions.push("challenge_id = ?");
    params.push(filterKeys.challenge_id);
  }

  const whereClause = conditions.join(" AND ");
  const itemsSql = `SELECT ${ALL_COLUMNS} FROM responses WHERE ${whereClause} ORDER BY created_at ASC`;
  const countSql = `SELECT COUNT(*) AS total FROM responses WHERE ${whereClause}`;

  return paginate(db, itemsSql, countSql, params, { page, limit });
}

/**
 * Published responses for a specific challenge.
 * Returns responses ordered by creation (oldest first, typically).
 */
function getByChallenge(challengeId) {
  return cachedStatement(
    db,
    `SELECT ${ALL_COLUMNS} FROM responses WHERE challenge_id = ? AND published_draft = 1 ORDER BY created_at ASC`,
  ).all(challengeId);
}

/**
 * Single published response by its public slug, or undefined if not found.
 */
function getBySlug(slug) {
  return cachedStatement(
    db,
    `SELECT ${ALL_COLUMNS} FROM responses WHERE slug = ? AND published_draft = 1`,
  ).get(slug);
}

/**
 * Single response by id regardless of publish state — for admin.
 */
function getById(id) {
  return db
    .prepare(`SELECT ${ALL_COLUMNS} FROM responses WHERE id = ?`)
    .get(id);
}

/**
 * Add the names frontend/assets/js/response-detail.js reads (title, author,
 * body, keywords, bibliography) next to the raw column names. The raw names
 * stay because the admin and existing callers read them. Used only by the
 * public detail read; the admin read keeps raw names.
 */
function addPublicNames(detail) {
  return {
    ...detail,
    title: detail.response_title,
    author: detail.response_author,
    body: detail.response_content,
    keywords: detail.metadata_keywords
      ? detail.metadata_keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [],
    bibliography: detail.mla_sources,
  };
}

/**
 * Full detail for public consumption — the base response row plus all related
 * breakouts, pictures, mla_sources, identifiers, and internal links
 * (evidence + context). Filters to published_draft = 1 at the base level.
 *
 * Why composite: the public response detail page needs to display breakouts,
 * pictures, bibliography citations, identifiers, and internal links. Assembling
 * this in one function avoids N+1 query storms on the frontend.
 *
 * The challenge join supplies challenge_title, challenge_slug and
 * challenge_type, which renderChallengeReference() in
 * frontend/assets/js/response-detail.js reads. challenge_type is the
 * `academic_popular` value ('academic' or 'popular'); that function builds the
 * link from it, so renaming a value breaks the link. The join admits only
 * published challenges, so a draft challenge yields null fields and no link.
 */
function getDetailBySlug(slug) {
  const response = cachedStatement(
    db,
    `SELECT ${ALL_COLUMNS_ALIASED}, c.challenge_title, c.slug AS challenge_slug,
            c.academic_popular AS challenge_type
     FROM responses r
     LEFT JOIN challenges c ON c.id = r.challenge_id AND c.published_draft = 1
     WHERE r.slug = ? AND r.published_draft = 1`,
  ).get(slug);
  if (!response) return undefined;
  return addPublicNames(assembleDetail(response));
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
    footnotes: getChildren("response_footnotes", "response_id", response.id),
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
 *   footnotes: [{ content }]  (replaced only when the key is present)
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

    // Footnotes are replaced only when the key is present (the admin editors
    // always send it), so a save from another client
    // cannot wipe them. See setup/ARCHITECTURE/journal-article-fields.md.
    if (data.footnotes !== undefined) {
      replaceChildren("response_footnotes", "response_id", responseId, data.footnotes, [
        "content",
      ]);
    }
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

    // Each child and link set is rewritten only when its key is present:
    // omitted keeps the rows, [] clears them. replaceChildren/replaceLinks
    // delete before they insert, so rewriting on omission would wipe the set.
    // See setup/ARCHITECTURE/journal-article-fields.md.
    if (breakouts !== undefined) {
      replaceChildren("response_breakouts", "response_id", id, breakouts, [
        "title",
        "content",
      ]);
    }

    if (data.footnotes !== undefined) {
      replaceChildren("response_footnotes", "response_id", id, data.footnotes, [
        "content",
      ]);
    }
    if (mlaSourceIds !== undefined) {
      replaceLinks(
        "response_mla_sources",
        "response_id",
        "mla_source_id",
        "citation_order",
        id,
        mlaSourceIds,
      );
    }
    if (identifierIds !== undefined) {
      replaceLinks(
        "response_identifiers",
        "response_id",
        "identifier_id",
        "citation_order",
        id,
        identifierIds,
      );
    }
    if (linkEvidenceIds !== undefined) {
      replaceLinks(
        "response_links_evidence",
        "source_response_id",
        "target_evidence_id",
        "sort_order",
        id,
        linkEvidenceIds,
      );
    }
    if (linkContextIds !== undefined) {
      replaceLinks(
        "response_links_context",
        "source_response_id",
        "target_context_essay_id",
        "sort_order",
        id,
        linkContextIds,
      );
    }

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
