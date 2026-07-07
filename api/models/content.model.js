// All-content data access — surfaces every row across every content entity
// (published and draft) for the admin dashboard content viewer. Read-only:
// editing and publishing happen through each entity's own model.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');

// Every content entity the viewer should list. `type` matches the URL slug used
// by the matching route and by /publish.
//
// Deliberately separate from drafts.model.js's DRAFTABLE:
//   - Excludes wikipedia and news-articles entirely (deliberate exclusion).
//   - Splits challenges into popular-challenges/academic-challenges via
//     the academic_popular column (DRAFTABLE's single `challenges` entry
//     doesn't express a per-row WHERE).
//   - Includes resources (which DRAFTABLE omits) with a `list_key` in output.
const CONTENT_ENTITIES = [
    { type: 'evidence',            table: 'evidence',       title: 'title',               hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'essays',              table: 'context_essays', title: 'essay_title',         hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'responses',           table: 'responses',      title: 'response_title',      hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'historiography',      table: 'historiography', title: 'essay_title',         hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'blog-posts',          table: 'blog_posts',     title: 'blog_title',          hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'collections',         table: 'collections',    title: 'title',               hasSlug: true,  hasUpdated: true,  hasListKey: false },
    { type: 'resources',           table: 'resources',      title: 'resource_title',      hasSlug: false, hasUpdated: false, hasListKey: true  },
    { type: 'popular-challenges',  table: 'challenges',     title: 'challenge_title',     hasSlug: true,  hasUpdated: false, hasListKey: false, filter: "academic_popular = 'popular'" },
    { type: 'academic-challenges', table: 'challenges',     title: 'challenge_title',     hasSlug: true,  hasUpdated: false, hasListKey: false, filter: "academic_popular = 'academic'" },
];

/** All rows for one entity, normalised to a common shape for the dashboard viewer. */
function getContentFor(entity) {
    const slug = entity.hasSlug ? 'slug' : 'NULL AS slug';
    const updated = entity.hasUpdated ? 'updated_at' : 'NULL AS updated_at';
    const listKey = entity.hasListKey ? 'list_key' : 'NULL AS list_key';

    const where = entity.filter ? `WHERE ${entity.filter}` : '';
    const sql = `
        SELECT id, ${slug}, ${entity.title} AS title, '${entity.type}' AS type,
               published_draft, ${updated}, ${listKey}
        FROM ${entity.table}
        ${where}
    `;
    return db.prepare(sql).all();
}

/**
 * Every content record across every entity, most-recently-updated first.
 * Includes both published and draft rows (no published_draft filter).
 */
function getAllContent() {
    return CONTENT_ENTITIES
        .flatMap(getContentFor)
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

module.exports = { getAllContent, CONTENT_ENTITIES };
