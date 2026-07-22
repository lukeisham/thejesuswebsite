// Search data access — full-text queries over the FTS5 virtual tables.
// schema.sql defines one FTS index per searchable entity; this file turns a raw
// user query into ranked, published results joined back to their source rows.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");

// Which entities are searchable and how to join an FTS hit back to a public row.
// `fts` is the virtual table; `table` the content table it mirrors.
const SEARCHABLE = {
  evidence: {
    fts: "evidence_fts",
    table: "evidence",
    titleColumn: "title",
    thumbnailColumn: "thumbnail_path",
  },
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
 * Build a safe FTS5 MATCH expression from raw user input.
 *
 * FTS5 treats bare punctuation and words like AND/OR/NOT/* as query operators,
 * so unsanitised input can throw a syntax error (JS-2: never let user input
 * break the query). All output tokens are wrapped in double quotes to neutralise
 * that risk.
 *
 * Parsing rules:
 * - "double-quoted phrases" become exact FTS5 phrase tokens (adjacency and
 *   order enforced) — e.g. `"jesus christ"`.
 * - Unquoted whitespace-separated words become quoted prefix tokens so
 *   partial words match — e.g. `"resur"*`.
 * - Interior double quotes are stripped from all token content.
 * - An unbalanced trailing quote is treated as if closed at end of input.
 * - Returns an object `{ match, ftsTokens }`; `match` is `""` when the query
 *   reduces to nothing.
 */
function toMatchExpression(rawQuery) {
  const input = String(rawQuery).trim();
  if (!input) return { match: "", ftsTokens: [] };

  // Unbalanced trailing quote — treat as if closed at end of input.
  const quoteCount = (input.match(/(?<!\\)"/g) || []).length;
  const adjusted = quoteCount % 2 !== 0 ? input + '"' : input;

  const tokens = [];
  // Extract quoted phrases first, then bare words — order matters (plan note).
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(adjusted)) !== null) {
    if (m[1] !== undefined) {
      // Quoted phrase — strip interior quotes, keep as exact phrase.
      const phrase = m[1].replace(/"/g, "").trim();
      if (phrase) tokens.push({ type: "phrase", text: phrase });
    } else if (m[2] !== undefined) {
      // Bare word — strip interior quotes, keep as prefix match.
      const word = m[2].replace(/"/g, "").trim();
      if (word) tokens.push({ type: "word", text: word });
    }
  }

  if (tokens.length === 0) return { match: "", ftsTokens: [] };

  const ftsTokens = tokens.map(
    (t) =>
      t.type === "phrase"
        ? `"${t.text}"` // exact phrase: adjacency + order enforced
        : `"${t.text}"*`, // prefix match: partial words match
  );

  return { match: ftsTokens.join(" "), ftsTokens };
}

/** Search one entity type. Returns published rows with a highlighted snippet. */
function searchOne(type, rawQuery, limit = 25) {
  if (!Object.hasOwn(SEARCHABLE, type)) return [];
  const config = SEARCHABLE[type];

  const { match, ftsTokens } = toMatchExpression(rawQuery);
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

  const stmt = db.prepare(sql);
  let results = stmt.all(match, limit);

  // OR fallback: when strict (AND) returns nothing and the query has 2+ tokens,
  // re-run with OR so near-miss queries surface partial matches instead of
  // "no results". Quoted phrase tokens stay intact — exact phrases stay exact.
  if (results.length === 0 && ftsTokens.length >= 2) {
    results = stmt.all(ftsTokens.join(" OR "), limit);
  }

  return results;
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
