// Drafts data access — surfaces unpublished rows (published_draft = 0) across the
// content entities so the admin dashboard can list everything awaiting review in
// one place. Read-only here: editing and publishing happen through each entity's
// own model. No HTTP concerns in this file: no req, no res, no status codes.

const db = require('../config');

// Each draftable entity, the column holding its title, and whether it carries
// slug / updated_at columns (some tables omit them). `type` matches the URL slug
// used by the matching route and by /publish.
const DRAFTABLE = [
    { type: 'evidence', table: 'evidence', title: 'title', hasSlug: true, hasUpdated: true },
    { type: 'essays', table: 'context_essays', title: 'essay_title', hasSlug: true, hasUpdated: true },
    { type: 'responses', table: 'responses', title: 'response_title', hasSlug: true, hasUpdated: true },
    { type: 'historiography', table: 'historiography', title: 'essay_title', hasSlug: true, hasUpdated: true },
    { type: 'blog-posts', table: 'blog_posts', title: 'blog_title', hasSlug: true, hasUpdated: true },
    { type: 'news-articles', table: 'news_articles', title: 'news_article_title', hasSlug: true, hasUpdated: false },
    { type: 'wikipedia', table: 'wikipedia_articles', title: 'wikipedia_article_title', hasSlug: true, hasUpdated: false },
    { type: 'challenges', table: 'challenges', title: 'challenge_title', hasSlug: true, hasUpdated: false },
    { type: 'collections', table: 'collections', title: 'title', hasSlug: true, hasUpdated: true },
];

/** Draft rows for one entity, normalised to a common shape for the dashboard. */
function getDraftsFor(entity) {
    const slug = entity.hasSlug ? 'slug' : 'NULL AS slug';
    const updated = entity.hasUpdated ? 'updated_at' : 'NULL AS updated_at';
    const sql = `
        SELECT id, ${slug}, ${entity.title} AS title, '${entity.type}' AS type, ${updated}
        FROM ${entity.table}
        WHERE published_draft = 0
    `;
    return db.prepare(sql).all();
}

/** Every draft across every entity, most-recently-edited first where a date exists. */
function getAllDrafts() {
    return DRAFTABLE
        .flatMap(getDraftsFor)
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

/** Count of pending drafts per entity type — for dashboard badges. */
function getDraftCounts() {
    return DRAFTABLE.map((entity) => ({
        type: entity.type,
        count: db.prepare(`SELECT COUNT(*) AS count FROM ${entity.table} WHERE published_draft = 0`).get().count,
    }));
}

module.exports = { getAllDrafts, getDraftCounts, DRAFTABLE };
