---
name: refactor_news_blog_landing_feeds
version: 1.0.0
module: 6.0 — News & Blog
status: complete
created: 2026-05-14
---

# Plan: refactor_news_blog_landing_feeds

## Purpose

> Refactor the News & Blog landing page (`news_and_blog.html`) to display 5 news snippets and 5 blog post snippets side-by-side, each with a thumbnail image when available. Update the full-scrolling news feed (`news.html`) and blog feed (`blog.html`) to include thumbnails. News items click through to their external source URL in a new tab; blog items click through to their single blog post slug page. Update the public API endpoints (`/api/public/news` and `/api/public/blogposts`) to return `picture_thumbnail` as a base64-encoded PNG string so the frontend can render `<img>` tags directly. Update affected frontend JS display files, add a dedicated landing-page CSS file, and update all relevant documentation with ASCII diagrams.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.
>
> **⚠️ Markdown Editing Reminder:** When any task requires editing `.md` files that contain ASCII box-drawing characters (`┌ ─ ┐ │ └ ┘`) or Unicode symbols (`• → · ⚠ ✗ ✓`), do NOT use `edit_file` — its fuzzy matcher cannot reliably match these characters. Instead, use a temporary Python script via `terminal`:
> ```python
> with open('path/to/file.md', 'r') as f:
>     content = f.read()
> content = content.replace('old exact text', 'new exact text')
> with open('path/to/file.md', 'w') as f:
>     f.write(content)
> ```
> For short ASCII-only changes, `edit_file` is fine. Use judgment.

### T1 — Update `/api/public/news` to return thumbnail data

- **File(s):** `serve_all.py`
- **Action:** Add `picture_name` and base64-encoded `picture_thumbnail` to the SELECT statement in the `/api/public/news` endpoint's typed query path. Decode the BLOB to a base64 string in the row-parsing loop so the frontend receives a ready-to-use `data:image/png;base64,...` string.
- **Vibe Rule(s):** Readability First · Explicit logic · Document API quirks inline

- [x] Task complete

---

### T2 — Update `/api/public/blogposts` to return thumbnail data

- **File(s):** `serve_all.py`
- **Action:** Add base64-encoded `picture_thumbnail` to the SELECT statement in the `/api/public/blogposts` endpoint's typed query path (it already includes `picture_name`). Decode the BLOB to a base64 string in the row-parsing loop so the frontend receives a ready-to-use `data:image/png;base64,...` string.
- **Vibe Rule(s):** Readability First · Explicit logic · Document API quirks inline

- [x] Task complete

---

### T3 — Refactor `news_snippet_display.js` for 5 items with thumbnails

- **File(s):** `js/6.0_news_blog/frontend/news_snippet_display.js`
- **Action:** Update the snippet builder to render exactly 5 items (hardcoded `.slice(0, 5)`). For each item, if `picture_thumbnail` is present, render an `<img>` thumbnail. Keep the existing external-link behaviour (`target="_blank"`). Ensure the JavaScript remains self-contained with the standard 3-line header comment.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T4 — Refactor `blog_snippet_display.js` for 5 items with thumbnails

- **File(s):** `js/6.0_news_blog/frontend/blog_snippet_display.js`
- **Action:** Update the snippet builder to render exactly 5 items (hardcoded `.slice(0, 5)`). For each item, if `picture_thumbnail` is present, render an `<img>` thumbnail. Keep the existing internal-link behaviour (`/blog/{slug}`). Ensure the JavaScript remains self-contained with the standard 3-line header comment.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T5 — Create side-by-side landing page CSS

- **File(s):** `css/6.0_news_blog/frontend/news_blog_landing.css`
- **Action:** Create a new CSS file for the `news_and_blog.html` side-by-side layout. Use CSS Grid for the two-column arrangement (news column | blog column). Define BEM classes under a `news-blog-landing-*` namespace. Use CSS variables from `typography.css` for all colours, fonts, and spacing. Include section headings with comment dividers.
- **Vibe Rule(s):** Grid for macro layout · CSS variables for everything · Section heading/subheading comments · No third-party frameworks

- [x] Task complete

---

### T6 — Refactor `news_and_blog.html` landing page

- **File(s):** `frontend/pages/news_and_blog.html`
- **Action:** Restructure the landing page body into a two-column CSS Grid layout: a News column (left) and a Blog column (right). Each column has a linked heading (`<h2><a href="/news">News</a></h2>` and `<h2><a href="/blog">Blog</a></h2>`) and a container (`id="latest-news-content"` and `id="latest-blog-content"`) for the snippet displays. Link the new `news_blog_landing.css` stylesheet. Keep all existing `<script>` tags. Remove the `responses.css` link (unrelated to news/blog).
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks

- [x] Task complete

---

### T7 — Refactor `list_newsitem.js` for full feed with thumbnails

- **File(s):** `js/6.0_news_blog/frontend/list_newsitem.js`
- **Action:** Update `_buildNewsHtml()` to render an `<img>` thumbnail when `item.picture_thumbnail` is present. Style the thumbnail as a small left-aligned image alongside the title/snippet. Keep the existing external-link behaviour (`target="_blank"`), "Load More" pagination, and all escape/format utilities.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T8 — Refactor `list_blogpost.js` for full feed with thumbnails

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`
- **Action:** Update the blog post row builder to render an `<img>` thumbnail when `item.picture_thumbnail` is present. Style the thumbnail as a small left-aligned image alongside the title/snippet. Keep the existing internal-link behaviour (`/blog/{slug}`), "Load More" pagination, and all escape/format utilities.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Component injection

- [x] Task complete

---

### T9 — Update `news.html` for thumbnail support

- **File(s):** `frontend/pages/news.html`
- **Action:** Add the `news_blog_landing.css` stylesheet link (shared thumbnail styles). Ensure the page structure provides a `#news-feed-content` container for `list_newsitem.js`. Remove the `responses.css` link (unrelated to news). Keep all existing script tags.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts

- [x] Task complete

---

### T10 — Update `blog.html` for thumbnail support

- **File(s):** `frontend/pages/blog.html`
- **Action:** Add the `news_blog_landing.css` stylesheet link (shared thumbnail styles). Ensure the page structure provides a `#blog-feed-content` container for `list_blogpost.js`. Keep all existing script tags.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts

- [x] Task complete

---

### T11 — Update `detailed_module_sitemap.md`

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** Add `css/6.0_news_blog/frontend/news_blog_landing.css` under the 6.0 News & Blog → Frontend CSS Files file-tree diagram with a description comment (e.g. `<-- Side-by-side landing page layout`). Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [x] Task complete

---

### T12 — Update `site_map.md`

- **File(s):** `documentation/site_map.md`
- **Action:** Add `css/6.0_news_blog/frontend/news_blog_landing.css` to the master file tree under the 6.0 News & Blog section. Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [x] Task complete

---

### T13 — Update `data_schema.md`

- **File(s):** `documentation/data_schema.md`
- **Action:** Document that `picture_thumbnail` (base64-encoded PNG) is now exposed via `/api/public/news` and `/api/public/blogposts` endpoints alongside `picture_name`. Add a note in the API exposure section for these two columns explaining that the frontend receives a ready-to-use `data:image/png;base64,...` string. Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [x] Task complete

---

### T14 — Update `high_level_schema.md`

- **File(s):** `documentation/high_level_schema.md`
- **Action:** Verify that `picture_thumbnail` is present in the visual summary table for the `news_article` and `blog_post` types. If not present, add it with a note that it is a base64-encoded PNG derivative (max 200px width). Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter

- [x] Task complete

---

### T15 — Update `guide_appearance.md` with ASCII layout diagram

- **File(s):** `documentation/guides/guide_appearance.md`
- **Action:** Add an ASCII box-drawing layout diagram for the new two-column `news_and_blog.html` landing page. The diagram should show: a full-width header row, then a two-column Grid body (News column on left with 5 snippet cards | Blog column on right with 5 snippet cards), each column topped by its linked heading (`<h2><a>`). Update any stale §5.3 references. **Use a temporary Python script via `terminal` for this edit** — do NOT use `edit_file` due to ASCII box-drawing characters. Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · ASCII diagram accuracy · Version frontmatter

- [x] Task complete

---

### T16 — Update `guide_function.md` with ASCII logic-flow diagram

- **File(s):** `documentation/guides/guide_function.md`
- **Action:** Add or update the News & Blog data-flow diagram with an ASCII logic-flow diagram showing: (1) `news_snippet_display.js` and `blog_snippet_display.js` booting in parallel on DOMContentLoaded; (2) each calling its respective public API endpoint (`/api/public/news` and `/api/public/blogposts`); (3) each endpoint now returning `picture_thumbnail` as base64; (4) each JS rendering an `<img>` thumbnail alongside the snippet when available; (5) news items linking externally (`target="_blank"`) and blog items linking internally (`/blog/{slug}`). **Use a temporary Python script via `terminal` for this edit** — do NOT use `edit_file` due to ASCII box-drawing characters. Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · ASCII diagram accuracy · Version frontmatter

- [x] Task complete

---

### T17 — Update `guide_style.md` with BEM namespace

- **File(s):** `documentation/guides/guide_style.md`
- **Action:** Add the `news-blog-landing-*` BEM namespace as a canonical example in its own subsection. Include a table of key classes (e.g. `news-blog-landing__grid`, `news-blog-landing__column`, `news-blog-landing__heading`, `news-blog-landing__snippet`, `news-blog-landing__thumbnail`) with their CSS variable references (from `typography.css`). Bump the `version` in frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · BEM naming conventions · Version frontmatter

- [x] Task complete

---

## Final Tasks

### T18 — Update user comments and dependency references across all modified files

- **File(s):** All files created or modified by T1–T17 (see §Tasks above)
- **Action:** For every file touched by this plan, verify and update: (1) the 3-line header comment (trigger/main function/output for JS; inline comment for CSS; docstring for Python); (2) the `File:` path in the banner comment to match the file's actual location on disk; (3) the `Version:` to the new bumped version; (4) any stale dependency references in trigger lines or module comments. For the new `news_blog_landing.css`, add a complete banner comment with File/Version/Purpose/Source.
- **Vibe Rule(s):** User Comments · Source-of-Truth Discipline · 3-line header comment (JS) · Section headings (CSS)

- [x] Task complete

---

### T19 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file (or tightly-related group for a single widget/component)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T20 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: `news_and_blog.html` displays 5 news + 5 blog snippets side-by-side with thumbnails, and headings link to full feeds
- [ ] **Achievement**: News feed (`news.html`) shows thumbnails and external-link behaviour works correctly
- [ ] **Achievement**: Blog feed (`blog.html`) shows thumbnails and internal slug-link behaviour works correctly
- [ ] **Achievement**: Public API endpoints (`/api/public/news`, `/api/public/blogposts`) return `picture_thumbnail` as base64-encoded PNG strings
- [ ] **Achievement**: All 7 documentation files updated: site maps, data schema, high-level schema, appearance guide (ASCII layout diagram), function guide (ASCII logic-flow diagram), style guide (BEM namespace)
- [ ] **Necessity**: The landing page and feeds now provide visual thumbnail previews for all content
- [ ] **Targeted Impact**: Only files within the 6.0 News & Blog module, `serve_all.py`, and `documentation/` were affected
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified
