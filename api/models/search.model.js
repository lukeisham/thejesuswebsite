// Search data access — full-text queries over the FTS5 virtual tables.
// schema.sql defines one FTS index per searchable entity; this file turns a raw
// user query into ranked, published results joined back to their source rows.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");

// Which entities are searchable and how to join an FTS hit back to a public row.
// `fts` is the virtual table; `table` the content table it mirrors.
const SEARCHABLE = {
  evidence: { fts: "evidence_fts", table: "evidence", titleColumn: "title" },
  responses: {
    fts: "responses_fts",
    table: "responses",
    titleColumn: "response_title",
  },
  essays: {
    fts: "context_essays_fts",
    table: "context_essays",
    titleColumn: "essay_title",
  },
  blog: {
    fts: "blog_posts_fts",
    table: "blog_posts",
    titleColumn: "blog_title",
  },
  news: {
    fts: "news_articles_fts",
    table: "news_articles",
    titleColumn: "news_article_title",
  },
  "bible-verses": {
    fts: "resources_fts",
    table: "resources",
    titleColumn: "resource_title",
    slugColumn: "list_key",
    extraWhere: "source.list_key = 'ot-verses'",
  },
};

/**
 * FTS5 treats bare punctuation as query operators, so unsanitised input can throw
 * a syntax error. Wrapping each term in double quotes makes it a literal phrase
 * and neutralises that risk (JS-2: never let user input break the query).
 */
function toMatchExpression(rawQuery) {
  return String(rawQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, "")}"`)
    .join(" ");
}

/** Search one entity type. Returns published rows with a highlighted snippet. */
function searchOne(type, rawQuery, limit = 25) {
  if (!Object.hasOwn(SEARCHABLE, type)) return [];
  const config = SEARCHABLE[type];

  const match = toMatchExpression(rawQuery);
  if (!match) return [];

  const slugColumn = config.slugColumn || "slug";
  const extraWhere = config.extraWhere ? `AND ${config.extraWhere}` : "";

  const sql = `
        SELECT source.id, source.${slugColumn} AS slug, source.${config.titleColumn} AS title, '${type}' AS result_type,
               snippet(${config.fts}, -1, '<mark>', '</mark>', '…', 12) AS snippet
        FROM ${config.fts}
        JOIN ${config.table} AS source ON source.id = ${config.fts}.rowid
        WHERE ${config.fts} MATCH ?
          AND source.published_draft = 1
          ${extraWhere}
        ORDER BY rank
        LIMIT ?
    `;
  return db.prepare(sql).all(match, limit);
}

/**
 * Search every entity type and merge the results. When `type` is supplied and
 * valid, only that entity is searched.
 */
function search(rawQuery, type = null, limit = 25) {
  if (type) return searchOne(type, rawQuery, limit);
  return Object.keys(SEARCHABLE).flatMap((entity) =>
    searchOne(entity, rawQuery, limit),
  );
}

module.exports = { search, searchOne, SEARCHABLE };
