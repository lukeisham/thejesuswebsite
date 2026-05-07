---
name: shared_metadata_widget
version: 1.2.0
module: 2.0 — Records (cross-cutting: 4.0 Ranked Lists, 5.0 Essays & Responses, 6.0 News & Blog)
status: draft
created: 2026-05-06
---

# Plan: shared_metadata_widget

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Create a unified, reusable slug/snippet/metadata widget that renders at the bottom of the sidebar across five dashboard editor modules (News Sources, Blog Posts, Challenge/Challenge Response, Context Essay, and Historiography Essay). For the Records module, the widget renders at the base of the main work area instead of the sidebar. The widget uses two new shared files (one CSS, one JS) to provide AI-powered auto-generation: three individual buttons (slug, snippet, metadata) and one prominent "Generate All" button that fires all three Python pipelines in parallel, fills every field, and auto-saves the record as draft — unless the record is already published, in which case it fills the fields without changing status. Each pipeline calls DeepSeek via `agent_client.py`: `slug_generator.py` produces a one-to-two-word URL phrase, `snippet_generator.py` produces a 2–3 sentence scholarly prose summary, and `metadata_generator.py` produces 5–10 SEO keywords plus a ≤160-character meta-description. Every generated field remains user-editable. The widget is selection-driven: clicking a sidebar list item (news source, blog post, essay, or response) applies CSS highlighting to the selected item and populates the widget's fields with that item's existing slug, snippet, and metadata — or clears to placeholder state if none have been generated yet. For the Records single-editor, which has no sidebar list, the widget populates automatically when the record is loaded and operates on that single record for the duration of the editing session. This eliminates the current duplication where each dashboard module independently authors its own metadata HTML structure and styles, causing drift, inconsistency, and maintenance burden. A single shared CSS file and a single shared JS file ensure identical appearance and behaviour everywhere the widget appears.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create shared metadata-widget CSS file

- **File(s):** `css/2.0_records/dashboard/metadata_widget.css`
- **Action:** Create a new shared stylesheet scoped to the `.metadata-widget` BEM namespace, providing layout, field styling, inline-row, button, textarea, and read-only display styles for the slug/snippet/metadata widget — including a distinct "Generate All" primary button style — using only CSS variables from `typography.css`.
- **Vibe Rule(s):** Grid/Flexbox hierarchy · CSS variables only · section comments · no frameworks

- [ ] Task complete

---

### T2 — Create shared metadata-widget JS file

- **File(s):** `js/2.0_records/dashboard/metadata_widget.js`
- **Action:** Create a new shared JS module that exposes three functions on `window`. `renderMetadataWidget(containerId, options)` injects the full widget DOM: a slug input with an individual "Auto-gen Slug" button, a snippet textarea with an individual "Auto-gen Snippet" button, a metadata JSON textarea with an individual "Auto-gen Meta" button, plus a prominent "Generate All" button that fires all three pipelines in parallel, fills every field, and then — via the `options.onAutoSaveDraft(recordData)` callback supplied by the consumer orchestrator — auto-saves the record as draft, unless the record is already published (in which case it fills the fields without triggering a save). Each button POSTs to its corresponding backend admin API endpoint (`/api/admin/slug/generate`, `/api/admin/snippet/generate`, `/api/admin/metadata/generate`) which route to their dedicated Python pipeline scripts (`slug_generator.py`, `snippet_generator.py`, `metadata_generator.py`) that call DeepSeek via `agent_client.py`. The JS never calls DeepSeek directly. `populateMetadataWidget(containerId, data)` fills every field with an existing record's data (slug, snippet, metadata_json, created_at, updated_at) when a record is loaded or selected, or clears to placeholder state when `data` is `null`. `collectMetadataWidget(containerId)` gathers all current field values into a plain object for the save orchestrator.
- **Vibe Rule(s):** 1 function/file · 3-line header comment · vanilla ES6+ · component injection

- [ ] Task complete

---

### T3 — Create slug-generator Python pipeline script

- **File(s):** `backend/scripts/slug_generator.py` (new), `backend/scripts/agent_client.py` (add `generate_slug` function)
- **Action:** Create a new Python wrapper `slug_generator.py` following the pattern of `snippet_generator.py` and `metadata_generator.py` — it accepts a title string and record slug, validates the input, and delegates to a new `agent_client.generate_slug()` function. The `generate_slug` function in `agent_client.py` calls DeepSeek with a system prompt instructing it to produce a one-to-two-word URL-friendly slug phrase (lowercase, hyphenated, no stop words) from the given title. Log the run to `agent_run_log` with `pipeline = 'slug_generation'`.
- **Vibe Rule(s):** Explicit readable logic · stateless/repeatable · document API quirks

- [ ] Task complete

---

### T4 — Update Records dashboard to use the shared widget (work area placement)

- **File(s):** `admin/frontend/dashboard_records_single.html`
- **Action:** Replace the inline HTML in Section 7 ("METADATA & STATUS") with a single `<div id="metadata-widget-container"></div>` anchor, remove the now-superseded inline slug/snippet/metadata fields, and add a `<script>` tag for the new `metadata_widget.js` alongside the existing shared-tool scripts.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline styles · no inline scripts · descriptive `id` hooks

- [ ] Task complete

---

### T5 — Update Blog Posts dashboard to use the shared widget (sidebar placement)

- **File(s):** `admin/frontend/dashboard_blog_posts.html`
- **Action:** Move the metadata section from the bottom of `#blog-editor-area` into the bottom of `#blog-sidebar` (after the Drafts list group), replace its inline HTML with a `<div id="metadata-widget-container"></div>` anchor, and add a `<script>` tag for `metadata_widget.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline styles · no inline scripts · descriptive `id` hooks

- [ ] Task complete

---

### T6 — Update Essay & Historiography dashboard to use the shared widget (sidebar placement)

- **File(s):** `admin/frontend/dashboard_essay_historiography.html`
- **Action:** Move the metadata section from the bottom of `#essay-editor-area` into the bottom of `#essay-sidebar` (after the Drafts list group), replace its inline HTML with a `<div id="metadata-widget-container"></div>` anchor, and add a `<script>` tag for `metadata_widget.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline styles · no inline scripts · descriptive `id` hooks

- [ ] Task complete

---

### T7 — Update News Sources dashboard to use the shared widget (sidebar placement)

- **File(s):** `admin/frontend/dashboard_news_sources.html`
- **Action:** Replace both inline metadata sections ("Section 3: Metadata (Snippet / Slug / Meta)" and "Section 4: Metadata Footer") in `#news-sources-sidebar` with a single `<div id="metadata-widget-container"></div>` anchor placed as the last sidebar section, and add a `<script>` tag for `metadata_widget.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline styles · no inline scripts · descriptive `id` hooks

- [ ] Task complete

---

### T8 — Update Challenge dashboard to add the shared widget (sidebar placement)

- **File(s):** `admin/frontend/dashboard_challenge.html`
- **Action:** Add a `<div id="metadata-widget-container"></div>` anchor at the bottom of `#challenge-sidebar` (after the search terms editor section) and include a `<script>` tag for `metadata_widget.js`, so that challenge responses created via the "Insert Response" dialog can also access the slug/snippet/metadata widget when a response record is selected.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline styles · no inline scripts · descriptive `id` hooks

- [ ] Task complete

---

### T9 — Wire orchestrator JS files to populate the widget on record selection/load

- **File(s):** `js/2.0_records/dashboard/display_single_record_data.js`, `js/6.0_news_blog/dashboard/display_blog_posts_data.js`, `js/5.0_essays_responses/dashboard/essay_historiography_data_display.js`, `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`, `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
- **Action:** In each consumer orchestrator, add a call to `window.populateMetadataWidget('metadata-widget-container', recordData)` at the point where record data is loaded — for the sidebar-based dashboards (Blog Posts, Essay/Historiography, News Sources, Challenge) this is the sidebar-item click handler; for the Records single-editor this is the initial record-fetch callback. Pass the full record object so the widget fills slug, snippet, metadata_json, created_at, and updated_at. When the selection is cleared or a "New" button is pressed, call `populateMetadataWidget('metadata-widget-container', null)` to reset the widget to placeholder state. Additionally, pass an `onAutoSaveDraft` callback to `renderMetadataWidget` so the "Generate All" button can trigger a module-appropriate draft save.
- **Vibe Rule(s):** 1 function/file (no new functions — one-line calls added to existing data-load points) · vanilla ES6+ · component injection

- [ ] Task complete

---

### T10 — Clean up superseded metadata styles in News Sources CSS

- **File(s):** `css/6.0_news_blog/dashboard/news_sources_dashboard.css`
- **Action:** Remove the `.news-sources-metadata-editor__*` rule block (field, label, textarea, input, inline, hint selectors) that has been superseded by the shared `metadata_widget.css`, and verify no other elements in the page reference those classes.
- **Vibe Rule(s):** CSS variables · section comments · no frameworks

- [ ] Task complete

---

## Final Tasks

### T11 — Vibe-Coding Audit

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
- [ ] One function per file (`metadata_widget.js` exposes one primary render function)
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] N/A — no database files created or modified in this plan

---

### T12 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: A single shared `metadata_widget.css` and `metadata_widget.js` exist and are the canonical source for slug/snippet/metadata UI across all dashboard modules
- [ ] **Achievement**: The widget appears at the bottom of the sidebar for News Sources, Blog Posts, Challenge, Context Essay, and Historiography Essay dashboards
- [ ] **Achievement**: The widget appears at the base of the work area (not the sidebar) for the Records dashboard
- [ ] **Achievement**: All four buttons work: three individual auto-gen buttons (slug, snippet, metadata) target their dedicated Python pipeline; the "Generate All" button fires all three pipelines in parallel, fills every field, and auto-saves as draft (unless the record is already published)
- [ ] **Achievement**: Clicking a sidebar list item (or loading a record in the Records single-editor) applies CSS highlighting to the selected item and calls `populateMetadataWidget()` to fill the widget with that item's existing slug, snippet, and metadata — or clears to placeholder state when no item is selected
- [ ] **Symmetry**: All six consumer dashboards render the widget using the identical `window.renderMetadataWidget()` call with only the `containerId` and `onAutoSaveDraft` callback differing; all six orchestrators call the identical `window.populateMetadataWidget()` with the same data shape — no module-specific forks exist
- [ ] **Necessity**: The previous duplication of metadata HTML and styles across dashboards has been eliminated; there is now one source of truth
- [ ] **Targeted Impact**: Only the six dashboards and their orchestrator JS files listed in the purpose have been touched; no frontend pages or unrelated modules were modified
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified



---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add `metadata_widget.css` and `metadata_widget.js` under 2.0 Dashboard files (shared tools); add `slug_generator.py` under 2.0 Supporting Files; note `dashboard_challenge.html` now includes the widget anchor |
| `documentation/simple_module_sitemap.md` | No | High-level module structure unchanged — new files are within existing module 2.0 |
| `documentation/site_map.md` | Yes | Three new files added (`metadata_widget.css`, `metadata_widget.js`, `slug_generator.py`) — run `/sync_sitemap` to regenerate |
| `documentation/data_schema.md` | No | No new database tables or columns — `slug_generator.py` logs to the existing `agent_run_log` table with `pipeline = 'slug_generation'` |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 "Cross-Plan Shared-Tool Ownership" table: add `metadata_widget.js` and `metadata_widget.css` as owned by `plan_dashboard_records_single` (2.0 Records), superseding the consumer-facing role of `metadata_handler.js` and partially absorbing `snippet_generator.js` |
| `documentation/style_mockup.html` | No | No new page layout introduced — the widget is an embedded component within existing dashboard layouts |
| `documentation/git_vps.md` | No | No deployment, branching, or VPS configuration changes |
| `documentation/guides/guide_appearance.md` | No | No new public-facing page or component — dashboard-internal widget only |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Add ASCII diagram showing the metadata widget's placement at the bottom of the sidebar column for split-pane dashboards and at the base of the work area for the Records single-editor |
| `documentation/guides/guide_function.md` | Yes | Document the full widget lifecycle: `renderMetadataWidget()` injection with `onAutoSaveDraft` callback, `populateMetadataWidget()` selection-driven field population (including null-to-clear), and `collectMetadataWidget()` data collection — plus the orchestrator wiring pattern used by all six consumer dashboards. Also document the three Python pipeline scripts and their distinct generation responsibilities |
| `documentation/guides/guide_security.md` | No | No auth, session, rate-limiting, or input validation changes — widget reuses existing API endpoints |
| `documentation/guides/guide_style.md` | Yes | Add the `.metadata-widget` BEM namespace and its CSS variable-only styling pattern as a canonical example of shared-component styling |
| `documentation/guides/guide_maps.md` | No | No map-related changes |
| `documentation/guides/guide_timeline.md` | No | No timeline-related changes |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, or AI-accessibility changes to public-facing pages |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
