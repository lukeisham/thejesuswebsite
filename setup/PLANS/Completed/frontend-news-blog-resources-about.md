# Plan: Frontend News, Blog, Resources, and About Pages

**Module(s):** Frontend
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal

Build the News & Blog landing page, individual blog post and news article pages, all resource list pages, the About page, and the 404 page — completing the full public-facing frontend (excluding maps, timeline, and arbor).

## Coding rules to keep in mind

- **HTML-1** — Blog posts use `<article>` as root; news article and about pages use `<main>`; resources use `<main>` with `<ol>` for ordered lists.
- **HTML-2** — Hero images on blog posts carry alt text; decorative images use `alt=""`.
- **HTML-3** — One visually-hidden `<h1>` per page; visible content begins at `<h2>`; blog section headings are `h2`/`h3` (not numbered — distinct from journal format).
- **HTML-4** — Page-specific CSS in `<head>`; scripts deferred at bottom.
- **JS-5** — All fetches through `api.js`; skeleton screens shown while data loads; toast on failure.
- **JS-6** — News & Blog landing toggle chips use event delegation; infinite scroll uses `IntersectionObserver` via `lazy-load.js`.
- **CSS-1** — `news-and-blog.js` imports into `news-and-blog.css` scope; blog post logic imports into `blog.css` scope; no mixing across page files.
- **CSS-2** — Blog pull-quote colour (`--accent`) and resources ordinal colour (`--text-muted`) must reference tokens.
- **CSS-3** — Mobile breakpoints for resource category-nav wrapping and blog hero image height are inside the respective page CSS files (already exist).

## Tasks

### HTML — News & Blog

- [x] **Create News & Blog landing HTML** — Toggle chips ("All", "Blog", "News") above a mixed card list; hero-promotion slot at top; infinite scroll sentinel; imports `news-and-blog.css`. File: `frontend/news-and-blog/index.html`
- [x] **Create Blog list HTML** — Card list of blog posts; infinite scroll sentinel; imports `blog.css`. File: `frontend/news-and-blog/blog/index.html`
- [x] **Create Blog post detail shell HTML** — `<article>` root; left-aligned header with category badge, `h1` title, byline row, hero image region; reading column (720 px); tags row at bottom; imports `blog.css`. File: `frontend/news-and-blog/blog/[slug].html`
- [x] **Create News list HTML** — Card list of news article entries; infinite scroll sentinel; imports `news.css`. File: `frontend/news-and-blog/news/index.html`
- [x] **Create News article detail shell HTML** — `<main>`; back link above header; title `h1`, publisher/author/date row; external-link breakout block; summary; keywords badge row; imports `news.css`. File: `frontend/news-and-blog/news/[slug].html`

### HTML — Resources

- [x] **Create Resources index HTML** — Landing page listing all resource categories as horizontal ghost-chip nav + brief intro; links to each `[list-key].html` variant; imports `resources.css`. File: `frontend/resources/index.html`
- [x] **Create Resources list template HTML** — Single JS-routed page; reads `list_key` from URL param; renders category nav chips, page `h1`, description, and ordered list of items; imports `resources.css`. File: `frontend/resources/list.html`

### HTML — About and 404

- [x] **Create About page HTML** — Single-column `800 px` max-width; centred `h1`; portrait image placeholder; prose sections; contact row of ghost buttons; donation portal `<div id="donation-portal">` slot; imports `about.css`. File: `frontend/about.html`
- [x] **Create 404 page HTML** — Friendly not-found message; link back to home and evidence list; minimal layout; imports base CSS only. File: `frontend/404.html`

### JS — News & Blog

- [x] **Create news-and-blog JS module** — Fetch mixed blog posts and news articles from their respective `api.js` endpoints; merge and sort by date; render cards with type badge; implement "All", "Blog", "News" toggle chips with event delegation; hero-promotion card at top for items with `landing_page_display = 1`; infinite scroll. File: `frontend/assets/js/news-and-blog.js`
- [x] **Create blog-list JS module** — Fetch paginated blog posts; render cards (type badge, title, byline, excerpt); infinite scroll. File: `frontend/assets/js/blog-list.js`
- [x] **Create blog-detail JS module** — Fetch blog post by slug; render header (category badge, h1, byline row, hero image); render body via `templates.js`; render pull quotes and figures; render tags badge row at bottom; call `setSEO()` with `schema.org/BlogPosting` JSON-LD; empty state: "This post is coming soon." File: `frontend/assets/js/blog-detail.js`
- [x] **Create news-list JS module** — Fetch paginated news articles; render cards; infinite scroll. File: `frontend/assets/js/news-list.js`
- [x] **Create news-detail JS module** — Fetch news article by slug; render back link, title, publisher/author/date, external-link breakout, summary, keywords badges; call `setSEO()`; no footnotes or bibliography. File: `frontend/assets/js/news-detail.js`

### JS — Resources

- [x] **Create resources JS module** — Read `list_key` param from URL via `router.js`; fetch resources for that key from `api.js`; render category nav chips (one per `list_key` value from the schema's 15 allowed keys) with active state for current key; render ordered list items with ordinal number, title (linked if URL present with Feather `external-link` icon), and description (max 3 lines); infinite scroll. File: `frontend/assets/js/resources.js`

### JS — Donation and About

- [x] **Create donation JS module** — Handle amount selection and form submission for the donation portal widget inside `<div id="donation-portal">`; no third-party scripts loaded until user interacts with the portal. File: `frontend/assets/js/donation.js`

## Files touched

- `frontend/news-and-blog/index.html` — created
- `frontend/news-and-blog/blog/index.html` — created
- `frontend/news-and-blog/blog/[slug].html` — created
- `frontend/news-and-blog/news/index.html` — created
- `frontend/news-and-blog/news/[slug].html` — created
- `frontend/resources/index.html` — created
- `frontend/resources/list.html` — created
- `frontend/about.html` — created
- `frontend/404.html` — created
- `frontend/assets/js/news-and-blog.js` — created
- `frontend/assets/js/blog-list.js` — created
- `frontend/assets/js/blog-detail.js` — created
- `frontend/assets/js/news-list.js` — created
- `frontend/assets/js/news-detail.js` — created
- `frontend/assets/js/resources.js` — created
- `frontend/assets/js/donation.js` — created

## Notes

- **Dependency**: `frontend-js-foundation` plan must be complete; `frontend-home-and-evidence` plan's `utils/figures.js` must exist for `blog-detail.js` to call `numberFigures()`.
- Resources: the Website_guide shows `list-1.html`, `list-2.html`, `list-3.html` as placeholder names. This plan upgrades that to a single `list.html` driven by a `?key=` URL param, covering all 15 `list_key` values from the schema. The sitemap must be updated accordingly.
- Blog posts do not use footnotes or a bibliography section — any sources are in a simple "Further Reading" `h3` + `<ul>` block rendered by `blog-detail.js` if sources are linked (JS-3).
- `donation.js` is a stub until the donation portal widget is provided; it must not load any third-party script eagerly (SR-3).
- The 404 page must be registered with the server so the web server returns it on any unmatched route.
- No automated tests: all files are in `frontend/`. Manual checklist covers this plan.
- `news-and-blog.js` fetches from two endpoints and merges results in the client — this means two parallel API calls via `Promise.all()` inside `api.js`, not two sequential fetches.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
