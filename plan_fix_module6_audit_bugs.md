---
name: plan_fix_module6_audit_bugs
version: 1.0.0
module: 6.0 — News & Blog
status: draft
created: 2026-05-16
---

# Plan: plan_fix_module6_audit_bugs

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Fix all bugs and vibe-coding violations found during a comprehensive audit of Module 6 (News & Blog). The audit identified two critical XSS vulnerabilities on public-facing pages (unescaped image URLs and unsanitized markdown link conversion), an unclosed database connection in a background thread, inline styles in JS-generated HTML, a race condition in the dashboard sidebar, missing HTTP status codes, a non-functional auto-refresh after crawl, 21 hardcoded CSS font-size values, hardcoded border-radius and color values, missing ARIA live-region announcements, and a missing SQLite connection timeout. This plan hardens Module 6 for security, accessibility, and vibe-coding compliance without changing any user-facing features.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix XSS: escape image `src` URLs in list_blogpost.js

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`
- **Action:** Wrap `thumbUrl` in `escapeHtml()` at line 170–171 where it is interpolated into the `src` attribute, matching the pattern already used for `title` on line 173. The `escapeHtml` function is provided by `html_utils.js` (loaded before this script).
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T2 — Fix XSS: escape image `src` URLs in list_newsitem.js

- **File(s):** `js/6.0_news_blog/frontend/list_newsitem.js`
- **Action:** Wrap `thumbUrl` in `escapeHtml()` at line 158–159 where it is interpolated into the `src` attribute. Same pattern as T1.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T3 — Fix XSS: escape image `src` URLs in blog_snippet_display.js

- **File(s):** `js/6.0_news_blog/frontend/blog_snippet_display.js`
- **Action:** Wrap `thumbUrl` in `escapeHtml()` at line 58–59 where it is interpolated into the `src` attribute.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T4 — Fix XSS: escape image `src` URLs in news_snippet_display.js

- **File(s):** `js/6.0_news_blog/frontend/news_snippet_display.js`
- **Action:** Wrap `thumbUrl` in `escapeHtml()` at line 77–78 where it is interpolated into the `src` attribute.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T5 — Fix XSS: sanitize markdown link URLs in display_blogpost.js

- **File(s):** `js/6.0_news_blog/frontend/display_blogpost.js`
- **Action:** In `convertMarkdownToHTML()` at line 279–282, replace the regex-based `[text](url)` → `<a href="$2">` conversion with a `replace` callback that validates the URL. Reject `javascript:`, `data:`, and `vbscript:` protocols — only allow URLs starting with `http://`, `https://`, `/`, or `#`. Escape the URL with `escapeHtml()` before inserting into the `href` attribute.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T6 — Fix unclosed DB connection in news.py background thread

- **File(s):** `admin/backend/routes/news.py`
- **Action:** In `_run_wikipedia_pipeline()` (line 92–117), wrap the `conn = get_db_connection()` / `cursor.execute()` / `conn.close()` block at lines 99–103 in a `try/finally` so `conn.close()` is always called even if the query throws. Apply the same try/finally pattern to any other background thread DB access in this file.
- **Vibe Rule(s):** Readability First · Scripts stateless and safe to run repeatedly

- [ ] Task complete

---

### T7 — Remove inline styles from list_blogpost.js

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`
- **Action:** At line 179–182, the `_buildPostHtml()` function injects `style="padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);"` on each `<article>` element. Remove the inline `style` attribute and add a CSS class instead (e.g. `feed-item--separated`). The styling must be handled by the existing `blog.css` file.
- **Vibe Rule(s):** Vanilla ES6+ · No inline styles

- [ ] Task complete

---

### T8 — Add CSS class for feed-item separation in blog.css

- **File(s):** `css/6.0_news_blog/frontend/blog.css`
- **Action:** Add a `.feed-item--separated` rule (or equivalent BEM modifier) that applies `padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border); margin-bottom: var(--space-6);` — replacing the inline styles removed in T7. Use CSS variables for all values.
- **Vibe Rule(s):** CSS variables · Section headings as comments · No frameworks

- [ ] Task complete

---

### T9 — Fix race condition in dashboard_blog_posts.js new-post highlight

- **File(s):** `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`
- **Action:** At line 254–263, the code uses `setTimeout(…, 100)` to highlight a newly created sidebar item. Replace this with an `await` on the `displayBlogPostsList()` call (or its returned promise), then perform the highlight after the list render completes — eliminating the timing dependency.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T10 — Add missing status_code=202 on news crawl endpoint

- **File(s):** `admin/backend/routes/news.py`
- **Action:** At line 160, the `@router.post("/api/admin/news/crawl")` decorator is missing `status_code=202`. Add it to match the pattern used by `trigger_wikipedia_pipeline()` at line 78, since both endpoints return asynchronous "accepted" responses.
- **Vibe Rule(s):** Readability First · Explicit self-documenting code

- [ ] Task complete

---

### T11 — Fix news crawler auto-refresh in launch_news_crawler.js

- **File(s):** `js/6.0_news_blog/dashboard/launch_news_crawler.js`
- **Action:** At line 113–121, the comment says "schedules a list refresh after a short delay" but the code only surfaces a message telling the user to refresh manually. Replace the `surfaceError` call with an actual list refresh by calling `window.displayNewsSourcesList()` (if available), then optionally surface a success message.
- **Vibe Rule(s):** Vanilla ES6+ · 1 function per file

- [ ] Task complete

---

### T12 — Replace hardcoded font sizes in blog.css with CSS variables

- **File(s):** `css/6.0_news_blog/frontend/blog.css`
- **Action:** Replace all 16 hardcoded `font-size` values with the matching CSS variables from `typography.css`: `0.75rem` → `var(--text-xs)`, `0.875rem` → `var(--text-sm)`, `0.9375rem` → between sm/base (use `var(--text-sm)` or `var(--text-base)`), `1rem` → `var(--text-base)`, `1.125rem` → `var(--text-md)`, `1.25rem` → `var(--text-lg)`, `1.5rem` → `var(--text-xl)`, `1.75rem` → between xl/2xl (use `var(--text-2xl)`), `2rem` → `var(--text-2xl)`. Also replace hardcoded `border-radius: 2px` → `var(--radius-sm)` and `border-radius: 4px` → `var(--radius-base)`. Replace hardcoded `letter-spacing: 0.05em` with a CSS variable if one exists, or leave as-is if no variable is defined.
- **Vibe Rule(s):** CSS variables for all colors, fonts, spacing · Section headings as comments

- [ ] Task complete

---

### T13 — Replace hardcoded font sizes in news_blog_landing.css with CSS variables

- **File(s):** `css/6.0_news_blog/frontend/news_blog_landing.css`
- **Action:** Replace all 5 hardcoded `font-size` values with the matching CSS variables: `0.75rem` → `var(--text-xs)`, `0.8125rem` → `var(--text-sm)`, `0.875rem` → `var(--text-sm)`, `1rem` → `var(--text-base)`, `1.5rem` → `var(--text-xl)`. Replace hardcoded `border-radius: 4px` → `var(--radius-base)` (3 instances).
- **Vibe Rule(s):** CSS variables for all colors, fonts, spacing · Section headings as comments

- [ ] Task complete

---

### T14 — Replace hardcoded rgba color in news_sources_dashboard.css

- **File(s):** `css/6.0_news_blog/dashboard/news_sources_dashboard.css`
- **Action:** At line 424, replace `background-color: rgba(46, 125, 50, 0.1)` with a CSS variable. Check `typography.css` for an existing `--color-status-success-bg` or similar variable. If none exists, define one in `typography.css` as `--color-status-success-bg: rgba(46, 125, 50, 0.1)` and reference it here.
- **Vibe Rule(s):** CSS variables for all colors · Section headings as comments

- [ ] Task complete

---

### T15 — Add ARIA live-region to loading states in frontend JS files

- **File(s):** `js/6.0_news_blog/frontend/list_blogpost.js`, `js/6.0_news_blog/frontend/list_newsitem.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`, `js/6.0_news_blog/frontend/news_snippet_display.js`
- **Action:** In each file, where the "Loading…" placeholder HTML is injected into the list container (e.g. line 29 of list_blogpost.js), add `role="status"` and `aria-live="polite"` to the `<p>` element so screen readers announce the loading state.
- **Vibe Rule(s):** Vanilla ES6+ · Semantic HTML

- [ ] Task complete

---

### T16 — Add SQLite connection timeout in shared.py

- **File(s):** `admin/backend/routes/shared.py`
- **Action:** At line 49, add a `timeout=5` parameter to the `sqlite3.connect(DB_PATH)` call to prevent indefinite hangs when concurrent writers contend for the database lock.
- **Vibe Rule(s):** Readability First · Explicit self-documenting code

- [ ] Task complete

---

## Final Tasks

### T17 — Vibe-Coding Audit

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

### T18 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: All XSS vulnerabilities in public-facing frontend files are patched (escaped image URLs, sanitized markdown links)
- [ ] **Achievement**: Backend resource leak fixed (unclosed DB connection in background thread)
- [ ] **Achievement**: Inline styles removed from JS-generated HTML and replaced with CSS classes
- [ ] **Achievement**: Race condition in dashboard sidebar highlight eliminated
- [ ] **Achievement**: Missing HTTP 202 status code added to news crawl endpoint
- [ ] **Achievement**: News crawler auto-refresh implemented (no longer tells user to refresh manually)
- [ ] **Achievement**: All hardcoded CSS font-size, border-radius, and color values replaced with CSS variables
- [ ] **Achievement**: ARIA live-region announcements added to loading states for screen readers
- [ ] **Achievement**: SQLite connection timeout added to prevent indefinite hangs
- [ ] **Necessity**: The underlying audit findings have been resolved — Module 6 is secure, accessible, and vibe-compliant
- [ ] **Targeted Impact**: Only Module 6 (News & Blog) files and the shared `shared.py` have been updated
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T19 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`, `guide_appearance.md`): Add or update ASCII box-drawing diagrams to reflect new component placement, sidebar layout changes, or work-area structure.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for any new data flow, JS lifecycle, or Python script introduced by this plan.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example in its own subsection, with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added or moved — all changes are to existing files |
| `documentation/simple_module_sitemap.md` | No | Module scope unchanged |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No schema changes |
| `documentation/vibe_coding_rules.md` | No | No shared-tool ownership changes |
| `documentation/style_mockup.html` | No | No page layout changes |
| `documentation/git_vps.md` | No | No deployment changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing layout changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard layout changes |
| `documentation/guides/guide_function.md` | No | No new pipelines or data flows — only hardening existing code |
| `documentation/guides/guide_security.md` | Yes | Document the XSS fixes: (1) all public-facing frontend files now escape image `src` URLs via `escapeHtml()`, (2) markdown link converter in `display_blogpost.js` now validates URLs and rejects `javascript:`/`data:`/`vbscript:` protocols, (3) CSRF fetch interceptor added to `load_middleware.js` (from prior fix). Add under the Input Validation / XSS Prevention section. |
| `documentation/guides/guide_style.md` | Yes | Add the new `.feed-item--separated` BEM modifier class (introduced in T8) as a canonical example with its CSS variable references (`--space-6`, `--color-border`). |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or AI-accessibility changes |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan

---

### T20 — Module Guide Update

> Update the per-module guide files in `documentation/guides/` to reflect all changes made by this plan.
> This is a **mandatory task** — the module guides must stay in sync with the source code.

- **File(s):** All guide files in the relevant `documentation/guides/6.0 News & Blog/` subfolder.
- **Action:** For each guide file in the module subfolder:
  - **`guide_frontend_appearance.md`**: No layout changes — verify ASCII diagrams still match current source code after inline style removal in T7.
  - **`guide_function.md`**: No new lifecycle or flow changes — verify existing diagrams still match after the race-condition fix in T9 and auto-refresh fix in T11.
  - **`*_nomenclature.md`**: Add the new `.feed-item--separated` CSS class introduced in T8. Verify no removed terms need cleanup.
  - **Version bump**: Increment `version` in every modified guide's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [ ] All ASCII diagrams in module guides match current source code
- [ ] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [ ] Nomenclature file covers all terms used in module source files
- [ ] Version numbers bumped on all modified guide files

---

### T21 — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
