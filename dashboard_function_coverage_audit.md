---
name: dashboard_function_coverage_audit.md
version: 1.0.0
module: 7.1 — Admin Portal (Dashboard App)
status: draft
created: 2025-01-15
---

# Plan: Dashboard Function & Appearance Coverage Audit

## Purpose

> Align the Admin Portal (`admin.html`, `dashboard_app.js`, and all `edit_modules/*.js` files) with the specifications in `guide_dashboard_appearance.md`, `guide_function.md`, and `guide_style.md`. Fix routing mismatches (missing `text-news` branch, incorrectly merged `ranks-weights`/`text-blog` routes), add missing script loads, remove or wire orphan modules, eliminate pervasive inline styles and undefined Tailwind-style class names, and replace hardcoded mock data with API-backed rendering. No new features — only conformance, correctness, and cleanup.

---

## Tasks

### GROUP A — Easy Fixes: Script Loading, Sidebar Links & Orphan Cleanup

These are simple, isolated changes with no cascading dependencies. They can be done in any order.

#### A1 — Load `edit_diagram.js` and `edit_mla_sources.js` in `admin.html`

- **File(s):** `admin/frontend/admin.html`
- **Action:** Add `<script src="edit_modules/edit_diagram.js">` and `<script src="edit_modules/edit_mla_sources.js">` script tags. Place them in alphabetical order among the existing edit-module script tags (after `edit_lists.js`, before `edit_insert_response_academic.js`).
- **Vibe Rule(s):** No inline scripts · Semantic HTML5
- **Check:** The `config-diagrams` router branch in `dashboard_app.js` calls `window.renderEditDiagram("admin-canvas")` — this will now resolve instead of throwing.

- [x] Task complete

#### A2 — Wire `edit_mla_sources.js` into the router (add `text-mla` branch) OR document as intentionally orphaned

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a new `if (moduleName === "text-mla" && typeof window.renderEditMlaSources === "function")` branch that calls `window.renderEditMlaSources("admin-canvas")`. Also add a sidebar link under "Text Content": `<li><a href="#" data-module="text-mla">MLA Sources</a></li>`.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+
- **Check:** Clicking "MLA Sources" in the sidebar loads the MLA sources editor into the canvas.

- [x] Task complete

#### A3 — Remove orphan `edit_rank.js` script tag from `admin.html` (no route calls it)

- **File(s):** `admin/frontend/admin.html`
- **Action:** Delete the `<script src="edit_modules/edit_rank.js">` line. The file remains on disk for potential future use; it is simply not loaded at page load.
- **Vibe Rule(s):** Clean skeletons · No dead weight
- **Check:** Confirm no remaining references to `renderEditRank` in `dashboard_app.js` (there should be none).

- [x] Task complete

#### A4 — Split sidebar link: `ranks-weights` → `ranks-wikipedia` + `ranks-challenges`

- **File(s):** `admin/frontend/dashboard_app.js` (the `renderDashboardShell` function's HTML template)
- **Action:** In the sidebar HTML under "Lists & Ranks", replace the single `<li><a href="#" data-module="ranks-weights">Edit Weights</a></li>` with two links:
  ```html
  <li><a href="#" data-module="ranks-wikipedia">Wikipedia Weights</a></li>
  <li><a href="#" data-module="ranks-challenges">Challenge Weights</a></li>
  ```
- **Vibe Rule(s):** Semantic hooks · Predictable `data-module` attributes
- **Check:** Sidebar now shows two separate links instead of one combined "Edit Weights".

- [x] Task complete

#### A5 — Add sidebar link for News (`text-news`) under Text Content

- **File(s):** `admin/frontend/dashboard_app.js` (the `renderDashboardShell` function's HTML template)
- **Action:** In the sidebar HTML under "Text Content", add before "Blog Posts":
  ```html
  <li><a href="#" data-module="text-news">News</a></li>
  ```
- **Vibe Rule(s):** Semantic hooks · Predictable `data-module` attributes
- **Check:** Sidebar now shows "News" link.

- [x] Task complete

---

### GROUP B — Complex Change: Restructure Router Branches

This is the most impactful change. It reworks the routing logic in `dashboard_app.js` and must be verified carefully.

#### B1 — Delete the combined `ranks-weights` router branch

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Remove the entire `if (moduleName === "ranks-weights") { ... }` block (the 3-tab container with Wikipedia/Academic/Popular tabs). This block currently handles the combined weights view.
- **Vibe Rule(s):** Single responsibility · Clean code
- **Check:** Confirmed the block no longer exists in `dashboard_app.js`.

- [x] Task complete

#### B2 — Create `ranks-wikipedia` router branch (single-pane direct call)

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a new branch:
  ```js
  if (moduleName === "ranks-wikipedia" && typeof window.renderEditWikiWeights === "function") {
    window.renderEditWikiWeights("admin-canvas");
    return;
  }
  ```
  This matches the guide_function.md §7.1.1 spec: direct single-pane, no tabs.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+
- **Check:** Clicking "Wikipedia Weights" in the sidebar loads `renderEditWikiWeights` into the canvas directly (no tab container).

- [x] Task complete

#### B3 — Create `ranks-challenges` router branch (2-tab container)

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a new branch matching the guide_function.md §7.1.1 `ranks-challenges` spec:
  - Injects a tabbed `admin-card` container with **Academic Challenges** (default active) and **Popular Challenges** tabs
  - Calls `window.renderEditAcademicWeights("tab-content-ranks-challenges-academic")` immediately
  - Lazy-loads `window.renderEditPopularWeights("tab-content-ranks-challenges-popular")` on first Popular tab click
  - Tab switching uses event delegation — no inline `onclick` handlers
  - Pane visibility toggled via `.is-hidden` CSS class
  - **NO inline `style="..."` attributes on any element** — use CSS classes only
- **Vibe Rule(s):** Semantic HTML · No inline styles · CSS classes for all styling
- **Check:** Clicking "Challenge Weights" shows the 2-tab container. Both tabs load the correct editor function. No inline styles present in the injected HTML.

- [x] Task complete

#### B4 — Create `text-news` router branch (2-tab container)

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Add a new branch matching the guide_function.md §7.1.1 `text-news` spec:
  - Injects a tabbed `admin-card` container with **News Snippet** (default active) and **News Sources** tabs
  - Calls `window.renderEditNewsSnippet("tab-content-news-snippet")` immediately
  - Lazy-loads `window.renderEditNewsSources("tab-content-news-sources")` on first News Sources tab click
  - Tab switching uses event delegation — no inline `onclick` handlers
  - Pane visibility toggled via `.is-hidden` CSS class
  - **NO inline `style="..."` attributes** — use CSS classes only
- **Vibe Rule(s):** Semantic HTML · No inline styles · CSS classes for all styling
- **Check:** Clicking "News" in the sidebar shows the 2-tab container. News Snippet tab loads first; News Sources tab lazy-loads on click.

- [x] Task complete

#### B5 — Fix `text-blog` router branch: remove News tabs, make direct single-pane

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Replace the existing `text-blog` 3-tab container block with a single direct call:
  ```js
  if (moduleName === "text-blog" && typeof window.renderEditBlogpost === "function") {
    window.renderEditBlogpost("admin-canvas");
    return;
  }
  ```
  This matches the guide_function.md §7.1.1 spec: "Direct single-pane call to `window.renderEditBlogpost("admin-canvas")`; Protected by a `typeof` guard."
- **Vibe Rule(s):** Single responsibility · Vanilla ES6+
- **Check:** Clicking "Blog Posts" in the sidebar loads `renderEditBlogpost` directly into the canvas (no tab container).

- [x] Task complete

#### B6 — Add `typeof` guard to `config-news` branch

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Wrap the existing `config-news` branch content in a `typeof` guard:
  ```js
  if (moduleName === "config-news") {
    if (typeof window.renderEditNewsSources === "function") {
      window.renderEditNewsSources("admin-canvas");
    }
    return;
  }
  ```
  This matches the guide_function.md §7.1.1 spec for `config-news`.
- **Vibe Rule(s):** Defensive programming · Vanilla ES6+
- **Check:** `config-news` route still works and is now protected by a `typeof` guard.

- [x] Task complete

#### B7 — Router restructure verification check

- **File(s):** `admin/frontend/dashboard_app.js`
- **Action:** Read the complete `loadModule` function and verify every route matches the guide_function.md §7.1.1 spec. Create a checklist in comments at the top of the router section mapping each `moduleName` to its expected behavior (direct call vs tab container, which tabs, lazy-load targets).
- **Vibe Rule(s):** User comments · Self-documenting code
- **Check list:**
  - [x] `records-new` → direct `renderEditRecord(canvas, null)` — correct
  - [x] `records-edit` → inline list + pagination + search — correct
  - [x] `ranks-wikipedia` → direct `renderEditWikiWeights(canvas)` — verified
  - [x] `ranks-challenges` → 2-tab (Academic default / Popular lazy) — verified
  - [x] `lists-resources` → dropdown + load → `renderEditLists(canvas, name)` — correct
  - [ ] `ranks-responses` → 2-tab (Academic default / Popular lazy) — **requires GROUP C inline style removal**
  - [x] `records-bulk` → direct `renderBulkUpload(canvas)` — correct
  - [ ] `text-essays` → 2-tab (Context Essay default / Historiography lazy) — **requires GROUP C inline style removal**
  - [x] `text-responses` → direct `renderEditResponse(canvas)` — correct
  - [x] `text-news` → 2-tab (News Snippet default / News Sources lazy) — verified
  - [x] `text-blog` → direct `renderEditBlogpost(canvas)` — verified
  - [x] `text-mla` → direct `renderEditMlaSources(canvas)` — verified
  - [x] `config-diagrams` → direct `renderEditDiagram(canvas)` — verified
  - [x] `config-news` → direct `renderEditNewsSources(canvas)` — typeof guard verified
  - [x] No `ranks-weights` branch remains — confirmed deleted
  - [x] Fallback placeholder still present for unknown module names — correct

- [x] Task complete

---

### GROUP C — Moderate Fix: Replace Inline Styles with CSS Classes Across Router

#### C1 — Remove all inline styles from `ranks-responses` tab container

- **File(s):** `admin/frontend/dashboard_app.js` (the `ranks-responses` branch)
- **Action:** Replace every `style="..."` attribute in the injected tab-bar HTML with CSS classes. The tab bar should use semantic class names like `.admin-tab-bar`, `.admin-tab-btn`, `.admin-tab-btn.is-active`. The CSS for these classes should already exist in `dashboard_admin.css` (add them if not). Panes use `.is-hidden` for visibility.
- **Vibe Rule(s):** No inline styles · CSS variables for everything
- **Check:** Zero `style="..."` attributes remain in the `ranks-responses` injected HTML.

- [x] Task complete

#### C2 — Remove all inline styles from `text-essays` tab container

- **File(s):** `admin/frontend/dashboard_app.js` (the `text-essays` branch)
- **Action:** Same as C1 — replace all `style="..."` attributes in the essays tab-bar HTML with CSS classes.
- **Vibe Rule(s):** No inline styles · CSS variables for everything
- **Check:** Zero `style="..."` attributes remain in the `text-essays` injected HTML.

- [x] Task complete

#### C3 — Remove all inline styles from the fallback placeholder

- **File(s):** `admin/frontend/dashboard_app.js` (the fallback `canvas.innerHTML` at the bottom of `loadModule`)
- **Action:** Replace all `style="..."` attributes with CSS classes. The fallback split-pane should use `.admin-editor-split`, `.admin-editor-pane`, `.admin-preview-pane`, `.admin-action-bar` classes that already exist in `dashboard_admin.css`. Remove any inline styling on inputs, labels, and textareas.
- **Vibe Rule(s):** No inline styles · CSS variables for everything
- **Check:** Zero `style="..."` attributes remain in the fallback HTML.

- [x] Task complete

#### C4 — Add missing tab-bar CSS classes to `dashboard_admin.css`

- **File(s):** `css/design_layouts/views/dashboard_admin.css`
- **Action:** Add CSS classes for the tab-bar pattern used across multiple routers, if they don't already exist. These should be:
  ```css
  .admin-tab-bar {
      display: flex;
      border-bottom: 2px solid var(--color-border);
      background-color: var(--color-bg-secondary);
  }
  .admin-tab-btn {
      flex: 1;
      padding: var(--space-3) var(--space-4);
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--color-text-muted);
      border-bottom: 2px solid transparent;
      transition: all var(--transition-fast);
  }
  .admin-tab-btn.is-active {
      color: var(--color-text);
      font-weight: var(--weight-bold);
      border-bottom-color: var(--color-accent-primary);
  }
  .admin-tab-btn:hover {
      color: var(--color-text);
      background-color: var(--color-bg-tertiary);
  }
  .admin-tab-content {
      padding: var(--space-6);
  }
  ```
- **Vibe Rule(s):** Variables everything · CSS Grid/Flexbox for layout
- **Check:** All tab containers in the app now use these shared CSS classes instead of inline styles.

- [x] Task complete

---

### GROUP D — Moderate Fix: Replace Inline Styles & Mock Data in Editor Files

#### D1 — Fix `edit_wiki_weights.js`: replace inline styles + add API fetch

- **File(s):** `admin/frontend/edit_modules/edit_wiki_weights.js`
- **Action:**
  1. Replace all `style="..."` attributes with CSS classes. Use the existing `.admin-card`, `.action-bar-header`, `.field-row`, `.field-input`, `.field-label`, `.quick-action-btn`, `.admin-records-table`, `.admin-search-input` classes already defined in `dashboard_admin.css`. If a needed class doesn't exist, add a targeted one.
  2. Replace hardcoded mock table rows with an API fetch: `GET /api/admin/records` filtered for `wikipedia_title IS NOT NULL`. Map returned rows into the table with editable weight/rank fields.
  3. Wire the "Save All Multipliers" button to PUT changed rows back to the API.
- **Vibe Rule(s):** No inline styles · 1 function per file · Vanilla ES6+ · API-connected
- **Check:** Editor loads real data from the API, renders with CSS classes only (no inline styles), and saves work.

- [x] Task complete

#### D2 — Fix `edit_academic_weights.js`: replace inline styles + add API fetch

- **File(s):** `admin/frontend/edit_modules/edit_academic_weights.js`
- **Action:** Same pattern as D1 — replace inline styles with CSS classes, replace hardcoded mock rows with API fetch (`GET /api/admin/records` filtered for `academic_challenge_title IS NOT NULL`), wire save.
- **Vibe Rule(s):** No inline styles · 1 function per file · Vanilla ES6+
- **Check:** Editor loads real data from the API, renders with CSS classes only, and saves work.

- [x] Task complete

#### D3 — Fix `edit_popular_weights.js`: replace inline styles + add API fetch

- **File(s):** `admin/frontend/edit_modules/edit_popular_weights.js`
- **Action:** Same pattern as D1 — replace inline styles with CSS classes, replace hardcoded mock rows with API fetch (`GET /api/admin/records` filtered for `popular_challenge_title IS NOT NULL`), wire save.
- **Vibe Rule(s):** No inline styles · 1 function per file · Vanilla ES6+
- **Check:** Editor loads real data from the API, renders with CSS classes only, and saves work.

- [x] Task complete

#### D4 — Fix `edit_blogpost.js`: replace inline styles + implement 3-column layout per guide

- **File(s):** `admin/frontend/edit_modules/edit_blogpost.js`
- **Action:**
  1. Replace all `style="..."` attributes with CSS classes.
  2. Reimplement the layout to match guide_function.md §6.3 and guide_dashboard_appearance.md §6.2 — a true 3-column dashboard layout:
     - **COL 1:** Save/Discard/Delete/New Post buttons
     - **COL 2:** Existing posts list (fetched from `GET /api/admin/blogposts`) with Edit/Delete per post
     - **COL 3:** Editor form (Publish Date, Title, Author, Markdown body)
  3. Add API integration: fetch existing posts on mount, PUT save, DELETE to clear field.
- **Vibe Rule(s):** No inline styles · 1 function per file · CSS Grid/Flexbox · API-connected
- **Check:** Blog editor renders the Providence 3-column layout with live API data and CSS classes only.

- [x] Task complete

#### D5 — Fix `edit_diagram.js`: remove inline styles from shell HTML

- **File(s):** `admin/frontend/edit_modules/edit_diagram.js`
- **Action:** Replace all `style="..."` attributes in the rendered shell HTML with CSS classes. The diagram editor already has working API integration — this task is *only* about removing inline styles. Use the same tab-bar/content classes from C4 for the header bar pattern.
- **Vibe Rule(s):** No inline styles · CSS variables for everything
- **Check:** Zero `style="..."` attributes remain in `edit_diagram.js`.

- [x] Task complete

#### D6 — Editor style cleanup verification check

- **File(s):** All files in `admin/frontend/edit_modules/`
- **Action:** Grep for `style="`, `border-radius: var(--radius-sm)`, `border-radius: var(--radius-md)`, and any `border-radius` value. Every instance must either be replaced with a CSS class or use `var(--radius-none)`. Report any remaining violations.
- **Vibe Rule(s):** Consistency checklist (guide_style.md §19)
- **Check list:**
  - [x] Zero `style="..."` attributes in any `edit_modules/*.js` file
  - [x] Every `border-radius` reference uses `var(--radius-none)` only
  - [x] All colours reference CSS variables (`var(--color-*)`), never raw hex values like `#fafafa`, `#eee`, `#ccc`, `#d32f2f`

- [x] Task complete

---

### GROUP E — Fix: Replace Undefined Tailwind-like Class Names in Editor Files

#### E1 — Fix `edit_insert_response_academic.js`: replace undefined classes with real CSS classes

- **File(s):** `admin/frontend/edit_modules/edit_insert_response_academic.js`
- **Action:** Replace all Tailwind-style class names (`flex`, `justify-between`, `align-center`, `border-b`, `pb-2`, `mb-4`, `font-bold`, `text-sm`, `block`, `w-full`, `p-2`, `border`, `radius-sm`, `form-input`, `form-group`, `btn`, `btn-primary`) with the project's existing CSS classes (`.admin-card`, `.field-row`, `.field-label`, `.field-input`, `.quick-action-btn`, etc.). Where no exact match exists, add a minimal CSS class to `dashboard_admin.css`.
- **Vibe Rule(s):** No third-party utility frameworks · CSS variables for everything
- **Check:** The insert response editor renders correctly with only project-defined CSS classes.

- [x] Task complete

#### E2 — Fix `edit_insert_response_popular.js`: same pattern as E1

- **File(s):** `admin/frontend/edit_modules/edit_insert_response_popular.js`
- **Action:** Same as E1 — replace all undefined Tailwind-style class names with project CSS classes. Also match the wireframe in guide_dashboard_appearance.md §4.3 (browsable challenge list with [+ Add Response] [Remove] [Edit] per row).
- **Vibe Rule(s):** No third-party utility frameworks · CSS variables for everything
- **Check:** The popular insert response editor renders correctly with project CSS classes.

- [x] Task complete

#### E3 — Fix `edit_news_snippet.js`: replace undefined class names with real CSS classes

- **File(s):** `admin/frontend/edit_modules/edit_news_snippet.js`
- **Action:** Replace all Tailwind-style class names with project CSS classes. Match the wireframe in guide_dashboard_appearance.md §6.1 (Publish Date, Headline, Snippet body, External link form).
- **Vibe Rule(s):** No third-party utility frameworks · CSS variables for everything
- **Check:** News snippet editor renders correctly with project CSS classes.

- [x] Task complete

#### E4 — Fix `edit_news_sources.js`: replace undefined class names + add API fetch

- **File(s):** `admin/frontend/edit_modules/edit_news_sources.js`
- **Action:**
  1. Replace all Tailwind-style class names with project CSS classes.
  2. Replace hardcoded "Biblical Archaeology Society" table row with API fetch (GET appropriate endpoint for news_sources).
  3. Add Label + URL pair input form matching guide_dashboard_appearance.md §6.1 News Sources tab.
- **Vibe Rule(s):** No third-party utility frameworks · CSS variables for everything · API-connected
- **Check:** News sources editor loads real data, renders with project CSS classes, and allows adding/removing sources.

- [x] Task complete

#### E5 — Fix `edit_mla_sources.js`: replace undefined class names + add API fetch

- **File(s):** `admin/frontend/edit_modules/edit_mla_sources.js`
- **Action:**
  1. Replace all Tailwind-style class names with project CSS classes.
  2. Replace hardcoded "Ehrman, Bart D." row with API fetch.
  3. Match the wireframe from guide_dashboard_appearance.md §5.1 (bibliography grid with 6 MLA sub-keys: mla_book, mla_book_inline, mla_article, mla_article_inline, mla_website, mla_website_inline).
- **Vibe Rule(s):** No third-party utility frameworks · CSS variables for everything · API-connected
- **Check:** MLA sources editor loads real data and renders with project CSS classes.

- [x] Task complete

#### E6 — Fix `edit_rank.js`: replace inline styles with CSS classes

- **File(s):** `admin/frontend/edit_modules/edit_rank.js`
- **Action:** Replace all `style="..."` attributes with CSS classes. (The file remains on disk but is no longer loaded in admin.html per A3 — still clean it up for potential future use.)
- **Vibe Rule(s):** No inline styles · CSS variables for everything
- **Check:** Zero inline styles remain in `edit_rank.js`.

- [x] Task complete

---

### GROUP F — Design System: Dashboard Accent Colour & Consistency

#### F1 — Verify `--color-dash-accent` is used correctly in dashboard_admin.css

- **File(s):** `css/design_layouts/views/dashboard_admin.css`
- **Action:** Audit the CSS file for any hardcoded gold/yellow/amber colour values. Replace with `var(--color-dash-accent)`. The header background should remain `var(--color-text-primary)` (Ink) with text in `var(--color-bg-primary)` (Paper) — this is correct per guide_style.md §18.4. Check that active tab borders use `var(--color-accent-primary)` (Oxblood) not `var(--color-dash-accent)` (Gold) — the guide specifies Oxblood for accents and Gold only for dashboard focus elements.
- **Vibe Rule(s):** Variables everything · Consistency checklist
- **Check:** All colour values in `dashboard_admin.css` reference CSS variables. No hardcoded hex colours for gold, oxblood, or accent tones.

- [x] Task complete

#### F2 — Apply `--radius-none` consistency check across all dashboard CSS

- **File(s):** `css/design_layouts/views/dashboard_admin.css` + all editor files
- **Action:** Grep for any `border-radius` usage. Replace any non-zero radius with `var(--radius-none)`. The guide_style.md §13 mandates: "Corner Radius: Globally 0px — Enforced via `--radius-none`."
- **Vibe Rule(s):** Consistency checklist (guide_style.md §19, item 1)
- **Check:** Every `border-radius` in dashboard CSS and editor files uses `var(--radius-none)` — no `px` or `%` radius values.

- [x] Task complete

#### F3 — Fix `#sidebar-return-link` to use `margin-top: auto` pattern (already correct in CSS)

- **File(s):** `css/design_layouts/views/dashboard_admin.css`
- **Action:** **Verification only** — the CSS at lines 117-131 already correctly uses `margin-top: auto` on a flex-column sidebar, matching guide_style.md §18.4 spec. Confirm the sidebar container (`.admin-sidebar`) also has `display: flex; flex-direction: column;` (lines 60-68) — confirmed. No changes needed.
- **Vibe Rule(s):** N/A — verification only
- **Check:** The sidebar return-link pattern is already implemented correctly.

- [x] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS
- [ ] admin.html: No inline styles in script tags — all style moves to CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)
- [ ] All tab-bar patterns use shared CSS classes (`.admin-tab-bar`, `.admin-tab-btn`)
- [ ] Every `border-radius` uses `var(--radius-none)` — zero rounding

### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern
- [ ] No inline styles in template literals — all styling via CSS classes

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline
- [ ] *No Python files modified in this plan — check still completed*

### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic
- [ ] *No SQL files modified in this plan — check still completed*

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified
- [ ] All `data-module` attributes in sidebar links match actual router branches
- [ ] All editor functions referenced in router are loaded in `admin.html`
- [ ] No orphan script tags remain in `admin.html`

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

### Touched Files — Sitemap Verification

All 14 files touched by this plan already exist in `documentation/detailed_module_sitemap.md`. No new files were created and no files were deleted. Below is the grouped summary; run full verification checks in the next section.

**Module 7.1 — Admin Portal (5 files):**
- `admin/frontend/admin.html` — script tag additions/removals only
- `admin/frontend/dashboard_app.js` — router logic restructured
- `css/design_layouts/views/dashboard_admin.css` — CSS classes added

**Module 4.0 — Ranked Lists (4 files):**
- `edit_wiki_weights.js` (4.1) — inline styles → CSS classes + API fetch
- `edit_academic_weights.js` (4.2) — inline styles → CSS classes + API fetch
- `edit_popular_weights.js` (4.2) — inline styles → CSS classes + API fetch
- `edit_rank.js` (4.0) — orphaned: unloaded from admin.html, file remains on disk

**Module 5.0 — Essays & Responses (1 file):**
- `edit_mla_sources.js` (5.1) — now loaded + wired to new `text-mla` route

**Module 6.0 — News & Blog (3 files):**
- `edit_blogpost.js` (6.2) — 3-column layout + API integration
- `edit_news_snippet.js` (6.1) — undefined classes → CSS classes
- `edit_news_sources.js` (6.1) — undefined classes → CSS classes + API fetch

**Module 3.0 — Visualizations (1 file):**
- `edit_diagram.js` (3.1) — inline styles removed; now actually loaded in admin.html

### Sitemap Integrity Checks
- [ ] Verify all 14 files above are listed under their correct module in `detailed_module_sitemap.md`
- [ ] Confirm no sitemap entries were broken or made stale by in-place edits
- [ ] Run `/sync_sitemap` if any structural changes were made to propagate to `site_map.md`
- [ ] Check `detailed_module_sitemap.md` version number — increment if this plan changes structure
- [ ] **Key fact: No new files created** — all changes are in-place edits to existing files
- [ ] **Key fact: No files removed** — `edit_rank.js` remains on disk, just unloaded from admin.html

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted.

### Intra-Module Check — Module 7.1: Admin Portal

Verify that none of the other files in Module 7.1 are affected by this plan's changes.

- [ ] `admin/frontend/admin_login.js` — login logic unchanged; no impact
- [ ] `admin/frontend/load_middleware.js` — middleware logic unchanged; no impact
- [ ] `admin/frontend/logout_middleware.js` — logout logic unchanged; no impact
- [ ] `admin/backend/admin_api.py` — API endpoints unchanged (frontend-only wiring changes); no impact
- [ ] `admin/backend/auth_utils.py` — auth utilities unchanged; no impact
- [ ] `css/elements/markdown_editor.css` — markdown editor styles unchanged; no impact
- [ ] `css/design_layouts/views/login_view.css` — login view styles unchanged; no impact
- [ ] **Result: Zero intra-module spill-over** — all changes are confined to `admin.html`, `dashboard_app.js`, and `dashboard_admin.css`

### Cross-Module Check

Verify that modules outside 7.1 are not adversely affected by the router and script-loading changes.

- [ ] **Module 2.0 — Records:** No impact (`edit_record.js`, `edit_lists.js` unchanged)
- [ ] **Module 3.0 — Visualizations:** Affected — `edit_diagram.js` now actually loaded in admin.html (was missing). Functional fix only; no API contract change.
- [ ] **Module 4.0 — Ranked Lists:** Affected — router split `ranks-weights` → `ranks-wikipedia` + `ranks-challenges`. Changes how weight editors are loaded, but no data schema changes.
- [ ] **Module 5.0 — Essays & Responses:** Affected — `edit_mla_sources.js` now loaded and wired to new `text-mla` route. No API contract change.
- [ ] **Module 6.0 — News & Blog:** Affected — new `text-news` router branch created; `text-blog` simplified to direct single-pane call. No data schema changes.
- [ ] **Module 8.0 — Setup & Testing:** No impact (no test files or build scripts modified)

### Module Impact Summary
- [x] Intra-module check: **All clear** — no spill-over to other Module 7.1 files
- [x] Cross-module check: **4 modules flagged** (3.0, 4.0, 5.0, 6.0) — all are loading/interface changes only; no API contracts or data schemas were modified
- [x] **No rollback plan needed** — changes are forwards-compatible and in-place

---
