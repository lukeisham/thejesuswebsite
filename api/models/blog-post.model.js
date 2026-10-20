// Blog post data access — all SQL for the `blog_posts` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.
// Called by routes/blog-posts.js and routes/publish.js (the MODELS map). The
// FTS triggers, static page generation and sitemap that follow a save are in
// setup/ARCHITECTURE/publishing-pipeline.md.

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
  "blog_title",
  "blog_date",
  "blog_content",
  "blog_thumbnail",
  "published_draft",
  "metadata_keywords",
];

// SQL-9: named columns instead of SELECT *. Lists every column of the table
// (schema.sql) so response shapes stay identical for the admin and public
// readers; hero_image, hero_image_alt and landing_page_display are not
// writable but existing rows still carry them.
const ALL_COLUMNS = [
  "id",
  ...WRITABLE_COLUMNS,
  "hero_image",
  "hero_image_alt",
  "landing_page_display",
  "created_at",
  "updated_at",
].join(", ");

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
 * Every blog post — published and draft alike — raw DB column names, for the
 * admin list view. Requires auth at the route level; never exposed on the
 * public list endpoint.
 *
 * Mirrors historiography.model.js:getAllAdmin().
 *
 * @returns {object[]}
 */
function getAllAdmin() {
  return cachedStatement(
    "selectAllAdmin",
    `SELECT ${ALL_COLUMNS} FROM blog_posts ORDER BY created_at DESC`,
  ).all();
}

/**
 * Published blog posts for the public site, newest first.
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
  const itemsSql = `SELECT ${ALL_COLUMNS} FROM blog_posts WHERE published_draft = 1 ORDER BY created_at DESC`;
  const countSql =
    "SELECT COUNT(*) AS total FROM blog_posts WHERE published_draft = 1";
  return paginate(db, itemsSql, countSql, [], { page, limit });
}

/**
 * Single published blog post by slug, or undefined if not found.
 *
 * @param {string} slug
 * @returns {object|undefined}
 */
function getBySlug(slug) {
  return cachedStatement(
    "selectPublishedBySlug",
    `SELECT ${ALL_COLUMNS} FROM blog_posts WHERE slug = ? AND published_draft = 1`,
  ).get(slug);
}

/**
 * Single blog post by id regardless of publish state — for admin.
 *
 * @param {number} id
 * @returns {object|undefined}
 */
function getById(id) {
  return cachedStatement(
    "selectById",
    `SELECT ${ALL_COLUMNS} FROM blog_posts WHERE id = ?`,
  ).get(id);
}

/**
 * Insert a new blog post. `data.slug` is treated as a desired base slug and
 * de-duplicated automatically. Returns the created row.
 *
 * @param {object} data
 * @returns {object|undefined}
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);
  row.slug = generateUniqueSlug(db, "blog_posts", row.slug);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO blog_posts (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing blog post. Only writable fields present in `data` are changed.
 * If the slug changes it is re-de-duplicated. Returns the updated row,
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
    row.slug = generateUniqueSlug(db, "blog_posts", row.slug, id);
  }

  runUpdate(db, "blog_posts", row, id);
  return getById(id);
}

/**
 * Delete a blog post by id. Returns true if a row was removed.
 *
 * @param {number} id
 * @returns {boolean}
 */
function remove(id) {
  const result = cachedStatement(
    "deleteById",
    "DELETE FROM blog_posts WHERE id = ?",
  ).run(id);
  return result.changes > 0;
}

/**
 * Full detail for public consumption — the base blog post row plus all related
 * breakouts, pictures, sources, identifiers, and internal links.
 * Filters to published_draft = 1 at the base level.
 *
 * @param {string} slug
 * @returns {object|undefined}
 */
function getDetailBySlug(slug) {
  const post = getBySlug(slug);
  if (!post) return undefined;
  return assembleDetail(post);
}

/**
 * Full admin detail — the base row regardless of publish state plus all relations.
 * This lets the admin edit form load drafts with their existing breakouts,
 * pictures, sources, identifiers, and links exactly as they were last saved.
 *
 * @param {number} id
 * @returns {object|undefined}
 */
function getAdminById(id) {
  const post = getById(id);
  if (!post) return undefined;
  return assembleDetail(post);
}

/**
 * Assemble a detail object from a base blog post row by attaching all related
 * child and junction data. This is the shared assembly logic — both public and
 * admin reads route through here so the shape is always consistent.
 */
function assembleDetail(post) {
  return {
    ...post,
    breakouts: getChildren("blog_breakouts", "blog_post_id", post.id),
    mla_sources: getLinkedMlaSources(
      "blog_post_mla_sources",
      "blog_post_id",
      "citation_order",
      post.id,
    ),
    identifiers: getLinkedIdentifiers(
      "blog_post_identifiers",
      "blog_post_id",
      "citation_order",
      post.id,
    ),
    links_evidence: getLinked(
      "blog_post_links_evidence",
      "source_blog_post_id",
      "sort_order",
      post.id,
    ),
    links_context: getLinked(
      "blog_post_links_context",
      "source_blog_post_id",
      "sort_order",
      post.id,
    ),
  };
}

/**
 * Composite create — inserts the base blog post row and all related child/junction
 * rows inside a single transaction so a partial failure never leaves orphaned
 * related data (JS-2: atomicity).
 *
 * Accepts the same base fields as create() plus optional arrays:
 *   breakouts: [{ title, content }]
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

    const post = create(data);
    const postId = post.id;

    replaceChildren("blog_breakouts", "blog_post_id", postId, breakouts, [
      "title",
      "content",
    ]);
    replaceLinks(
      "blog_post_mla_sources",
      "blog_post_id",
      "mla_source_id",
      "citation_order",
      postId,
      mlaSourceIds,
    );
    replaceLinks(
      "blog_post_identifiers",
      "blog_post_id",
      "identifier_id",
      "citation_order",
      postId,
      identifierIds,
    );
    replaceLinks(
      "blog_post_links_evidence",
      "source_blog_post_id",
      "target_evidence_id",
      "sort_order",
      postId,
      linkEvidenceIds,
    );
    replaceLinks(
      "blog_post_links_context",
      "source_blog_post_id",
      "target_context_essay_id",
      "sort_order",
      postId,
      linkContextIds,
    );

    return getAdminById(postId);
  });

  return writeRelated(data);
}

/**
 * Composite update — updates the base row and atomically replaces all related
 * child/junction sets inside a single transaction. Accepts the same optional
 * arrays as createComposite.
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

    const post = update(id, data);
    if (!post) return undefined;

    replaceChildren("blog_breakouts", "blog_post_id", id, breakouts, [
      "title",
      "content",
    ]);
    replaceLinks(
      "blog_post_mla_sources",
      "blog_post_id",
      "mla_source_id",
      "citation_order",
      id,
      mlaSourceIds,
    );
    replaceLinks(
      "blog_post_identifiers",
      "blog_post_id",
      "identifier_id",
      "citation_order",
      id,
      identifierIds,
    );
    replaceLinks(
      "blog_post_links_evidence",
      "source_blog_post_id",
      "target_evidence_id",
      "sort_order",
      id,
      linkEvidenceIds,
    );
    replaceLinks(
      "blog_post_links_context",
      "source_blog_post_id",
      "target_context_essay_id",
      "sort_order",
      id,
      linkContextIds,
    );

    return getAdminById(id);
  });

  return writeRelated(data);
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
