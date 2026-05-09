---
name: standardize_dashboard_buttons
version: 1.0.0
module: 7.0 — System (Cross-Cutting)
status: draft
created: 2026-05-09
---

# Plan: standardize_dashboard_buttons

## Purpose

> Standardize button nomenclature, function-bar layout, and gather-trigger behaviour across all eight dashboard modules (Records Single, Wikipedia, Challenge Academic, Challenge Popular, News Sources, Blog Posts, Essay/Historiography, Arbor). Every dashboard that edits a record or record-like entity receives a canonical three-button function bar — **Save Draft**, **Publish**, **Delete** — with identical semantic meaning. Dashboards backed by external-crawl pipelines (Wikipedia, Challenge Academic, Challenge Popular, News Sources) additionally receive a **Gather** button that invokes the respective search/crawler script, auto-saves returned results as draft, and returns a null/no-op signal when zero new items are discovered. (Note that new items are added to the existing list.) Wikipedia and Challenge Academic, Challenge Popular additionally receive a **Calculate** button that invokes the respective ranking script, which ranks the relevant list according to the saved weights auto-saves returned results as draft. (Note that new items are added to the existing list.)All form-field changes persist client-side (linked to the admin session cookie) until explicit save (as either draft or publish) or logout. This plan eliminates the current nomenclature drift (e.g. "Refresh" meaning different things in different modules; "Save" vs "Save Draft"; "Crawl" / "Agent Search" / "Recalculate All" for the same gather concept), delivers a predictable, unified admin experience, and ensures every content type — records, essays, blog posts, news sources, search terms, weights, Wikipedia entries, challenge entries, and arbor nodes — honours the same draft/publish lifecycle.

If there is a conflict between draft and published data, or a mixed list that is sorted, add a function to 'default to draft', including previously published information. 

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.
> 4. **Log cross-cutting issues:** Any conflict, gap, missing dependency, or implementation issue discovered during execution that affects other plans MUST be appended to the Issue Table in `plan_issues.md` before marking the task complete. Check `plan_issues.md` for open issues before starting each task.

---

### T1 — Standardize function-bar button labels in all 8 dashboard HTML templates

- **File(s):**
  `admin/frontend/dashboard_wikipedia.html`,
  `admin/frontend/dashboard_challenge_academic.html`,
  `admin/frontend/dashboard_challenge_popular.html`,
  `admin/frontend/dashboard_news_sources.html`,
  `admin/frontend/dashboard_blog_posts.html`,
  `admin/frontend/dashboard_arbor.html`
- **Action:** Rename every non-standard function-bar button label to match the canonical set: **Save Draft** (for any explicit save-to-draft action, replacing "Refresh" and "Save"), **Publish** (keep existing), **Delete** (keep existing), **Gather** (for "Recalculate All" / "Agent Search" / "Crawl"), and **Calculate** (for Wikipedia and both Challenge dashboards only — replaces the re-ranking half of the old "Refresh" button). Update button `id` attributes to a consistent naming convention (`btn-save-draft`, `btn-publish`, `btn-delete`, `btn-gather`, `btn-calculate`). Update `title` attributes and `aria-label` strings to match. In the Wikipedia function bar, split the old single "Refresh" into two adjacent buttons: **Save Draft** (saves sidebar state) and **Calculate** (re-ranks the list). Same split for both Challenge dashboards. In the Challenge sidebar, rename the "Publish" (add-weight) button to "Save Draft". Do NOT modify `dashboard_records_single.html` or `dashboard_essay_historiography.html` — they already conform.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [ ] Task complete

---

### T2 — Update orchestrator JS files to wire the standardized button IDs, split Refresh into Save Draft + Calculate, and implement "default to draft on Calculate"

- **File(s):**
  `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`,
  `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`,
  `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`,
  `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js`,
  `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js`,
  `js/6.0_news_blog/dashboard/dashboard_news_sources.js`,
  `js/6.0_news_blog/dashboard/dashboard_blog_posts.js`,
  `js/3.0_visualizations/dashboard/dashboard_arbor.js`,
  `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`,
  `js/4.0_ranked_lists/dashboard/challenge_list_display.js`,
  `js/4.0_ranked_lists/dashboard/insert_challenge_response.js`,
  `js/4.0_ranked_lists/dashboard/academic_challenge_search_terms.js`,
  `js/4.0_ranked_lists/dashboard/academic_challenge_ranking_weights.js`,
  `js/4.0_ranked_lists/dashboard/popular_challenge_search_terms.js`,
  `js/4.0_ranked_lists/dashboard/popular_challenge_ranking_weights.js`
- **Action:** In each orchestrator's `_wireActionButtons()` (or equivalent), update the `document.getElementById` calls to match the renamed button IDs from T1. Update the disabled-state `textContent` fallbacks to read "Saving…" / "Publishing…" / "Deleting…" / "Gathering…" / "Calculating…" consistently. For Wikipedia and both Challenge dashboards, split the old single "Refresh" click handler into two separate handlers: **Save Draft** — collects the current sidebar state (weights, search terms, slug, snippet, metadata) and PUTs it with `status: 'draft'` WITHOUT triggering a re-rank; **Calculate** — re-ranks the list using the already-saved weights (calls the existing `refreshWikipediaRankings()` / `refreshChallengeRankings()` logic), then sets ALL affected records in the list to `status: 'draft'` (the "default to draft" rule — even previously published records revert to draft after a re-rank, so nothing goes live by accident). The Publish button must be explicitly clicked to set `status: 'published'`. For the Arbor dashboard, add a new "Save Draft" button handler that calls the existing auto-save pipeline (batch PUT draft status on all `__changedNodes` without publishing). Ensure every orchestrator's click handler references match the new button IDs. **Also resolve Issue #2 from `plan_issues.md`:** In the sub-module JS files that still reference `dashboard_challenge.js` in their trigger header comments, update the trigger line to reference the correct orchestrator file (`dashboard_challenge_academic.js` or `dashboard_challenge_popular.js`).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+

- [ ] Task complete

---

### T3 — Standardize status-handler JS: rename "Save" → "Save Draft" in blog post handler, add Save Draft to Arbor

- **File(s):**
  `js/6.0_news_blog/dashboard/blog_post_status_handler.js`,
  `js/3.0_visualizations/dashboard/update_node_parent.js`
- **Action:** In `blog_post_status_handler.js` rename the `_handleSave` function to `_handleSaveDraft`, update its `textContent` reset values from "Save" to "Save Draft", and update all internal references. In `update_node_parent.js` (or `dashboard_arbor.js`), expose a new `window.saveArborDraft` function that batches all pending `__changedNodes` as a PUT with `status: 'draft'` on each affected record (not just `parent_id`), so the explicit "Save Draft" button in Arbor commits node changes as draft without publishing.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement field-change auto-save (debounced draft PUT) on all dashboards that lack it

- **File(s):**
  `js/5.0_essays_responses/dashboard/document_status_handler.js`,
  `js/6.0_news_blog/dashboard/blog_post_status_handler.js`,
  `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`,
  `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`,
  `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Add a `scheduleAutoSave()` function (1500 ms debounce) to each status-handler or sidebar-handler JS file that currently lacks it. Wire it to `input` and `change` events on all editable fields. The auto-save collects the current form/sidebar state and PUTs it with `status: 'draft'` (so field changes are never lost on accidental navigation or refresh). This mirrors the pattern already implemented in `record_status_handler.js` (§2.0). For Essay/Historiography and Blog Posts, integrate with the existing `isDirty` flag — auto-save clears the dirty flag on success.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · Stateless/repeatable

- [ ] Task complete

---

### T5 — Create shared "Gather" button logic and wire it into Wikipedia, Challenge Academic, Challenge Popular, and News Sources

- **File(s):**
  NEW: `js/7.0_system/dashboard/gather_trigger.js` (shared tool),
  `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`,
  `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`,
  `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`,
  `js/6.0_news_blog/dashboard/dashboard_news_sources.js`
- **Action:** Create a shared `gather_trigger.js` tool in `js/7.0_system/dashboard/` (owned by this plan) that exposes `window.triggerGather(pipelineName, recordSlug)` — a single function that POSTs to the appropriate backend endpoint (`/api/admin/agent/run` for Wikipedia/Challenge pipelines, `/api/admin/news/crawl` for News), polls for completion, surfaces the count of new articles found (or "No new results" if zero), and auto-refreshes the list. Update each of the four orchestrators to call `window.triggerGather()` from their "Gather" button handlers instead of calling the pipeline-specific functions directly. The existing `triggerAgentSearch`, `_recalculateAllRecords`, and `triggerCrawl` functions become internal delegates called by the shared gather tool. Register `gather_trigger.js` via a `<script>` tag in `admin/frontend/dashboard.html`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Shared-tool ownership: §7 table update required

- [ ] Task complete

---

### T6 — Implement deduplication logic in gather pipelines so only genuinely new results are added

- **File(s):**
  `backend/pipelines/pipeline_wikipedia.py`,
  `backend/pipelines/pipeline_academic_challenges.py`,
  `backend/pipelines/pipeline_popular_challenges.py`,
  `backend/pipelines/pipeline_news.py`,
  `admin/backend/routes/agents.py`
- **Action:** In each pipeline script, add a pre-insert check: for every candidate article/item discovered, query the `records` table for an existing row with the same URL/slug/title (whichever is the natural dedup key for that data source). Skip already-present items. Count `new_items_added`. Return a structured result (`{ "new_items": N, "total_candidates": M, "status": "completed" }`). Update the agent route (`agents.py`) to surface `articles_found` as `new_items_added` (not total crawled). Update the news crawl route to return `new_items` count. The JS `gather_trigger.js` reads this count and displays either "Gathered N new items" or "No new results — everything is already in the database."
- **Vibe Rule(s):** Readability first · Stateless/repeatable · Document API quirks

- [ ] Task complete

---

### T7 — Add null-result handling: Gather returns clean "no new results" signal when nothing is new

- **File(s):**
  `js/7.0_system/dashboard/gather_trigger.js` (the shared tool from T5),
  `admin/backend/routes/agents.py`,
  `admin/backend/routes/news.py`
- **Action:** In `gather_trigger.js`, after polling completes, inspect the `articles_found` (now `new_items_added` from T6) count from the agent log or the news crawl response. If the count is 0, display "No new results — everything is already in the database." via `window.surfaceError()` and do NOT trigger a list refresh (no-op). In the backend routes, ensure the response payload includes an explicit `new_items: 0` field so the frontend can distinguish "zero results" from "error." Add an `agent_run_log` column check: if `articles_found` is 0 after completion, the JS should surface the quiet "No new results" message rather than a celebratory count message.
- **Vibe Rule(s):** Vanilla ES6+ · Readability first · Stateless/repeatable

- [ ] Task complete

---

### T8 — Explain draft/publish semantics for Nodes (Arbor) and ensure consistent behaviour

- **File(s):**
  `js/3.0_visualizations/dashboard/dashboard_arbor.js`,
  `js/3.0_visualizations/dashboard/update_node_parent.js`,
  `admin/backend/routes/diagram.py`
- **Action:** Nodes in the Arbor diagram are standard `records` rows linked by `parent_id`. They already auto-save on drag-and-drop as draft (via `update_node_parent.js` → `PUT /api/admin/diagram/tree`). The Arbor "Publish" button already commits `__changedNodes` to live. With the new "Save Draft" button (added in T2/T3), the Arbor lifecycle is now: **Save Draft** — persists all pending parent_id changes with `status: 'draft'` on each affected record; **Publish** — commits all pending parent_id changes and sets each affected record's `status` to `'published'`; **Delete** — not applicable (node deletion from the tree is handled by removing `parent_id`). The diagram route (`diagram.py`) already handles batch parent_id updates. Update `_handlePublish` in `dashboard_arbor.js` to also set `status: 'published'` on each affected record (currently it only updates `parent_id`). Document in the function bar that "Save Draft" preserves structural changes without exposing them on the frontend, while "Publish" makes the tree structure live.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T9 — Wire session-linked field persistence cookie (client-side draft cache)

- **File(s):**
  NEW: `js/7.0_system/dashboard/field_persistence.js` (shared tool),
  `js/2.0_records/dashboard/record_status_handler.js`,
  `js/5.0_essays_responses/dashboard/document_status_handler.js`,
  `js/6.0_news_blog/dashboard/blog_post_status_handler.js`
- **Action:** Create a shared `field_persistence.js` tool in `js/7.0_system/dashboard/` that reads the existing admin JWT session cookie (`admin_session`) and uses it as a namespace key in `sessionStorage`. Expose `window.stashFieldState(moduleName, fieldData)` — serializes current form state to `sessionStorage[admin_session + '/' + moduleName]` on every auto-save or explicit save. Expose `window.restoreFieldState(moduleName)` — called on module load; if a stashed state exists and the JWT session is still valid, repopulate the fields. Clear stashed state on explicit "Publish" success and on logout (hook into the existing logout flow in `dashboard_universal_header.js`). Register `field_persistence.js` via a `<script>` tag in `admin/frontend/dashboard.html`. This ensures any unsaved field change survives a page navigation or accidental refresh until the admin session expires or the user logs out.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+ · Shared-tool ownership: §7 table update required

- [ ] Task complete

---

### T10 — Replace all references to `documentation/dashboard_refractor.md` with the correct documentation files

- **File(s):**
  `.agent/skills/generate_plan/SKILL.md`
- **Action:** The SKILL.md §4 Terminal States instructs the agent to "automatically trigger and execute the `documentation/dashboard_refractor.md` skill" after generating a plan, but that file does not exist in the repository (see Issue #4 in `plan_issues.md`). Replace this reference with an instruction to cross-reference `documentation/detailed_module_sitemap.md` and `documentation/vibe_coding_rules.md` instead, which together serve the same inventory-and-rules purpose that `dashboard_refractor.md` was intended to fill. Update the Terminal States section to remove the dangling reference entirely and, if appropriate, fold the cross-reference instruction into the §3 Execution Logic steps.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

---

### T11 — Run `/sync_sitemap` to register all new and renamed files

- **File(s):**
  `documentation/site_map.md`,
  `documentation/detailed_module_sitemap.md`,
  `documentation/simple_module_sitemap.md`
- **Action:** Execute the `/sync_sitemap` trigger to automatically scan the repository and update all three site-map documents with the two new files created by this plan (`js/7.0_system/dashboard/gather_trigger.js`, `js/7.0_system/dashboard/field_persistence.js`) and any renamed button-ID anchors. Verify that the sync correctly placed the new files under §7.0 System Module and that no stale paths remain.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] Task complete

---

## Final Tasks

### T12 — Vibe-Coding Audit

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

### T13 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement — Nomenclature Standardized**: Every dashboard function bar uses only the canonical button labels: Save Draft, Publish, Delete, and (where applicable) Gather and Calculate. No "Refresh", "Save", "Crawl", "Agent Search", or "Recalculate All" remain.
- [ ] **Achievement — Functionality Unified**: All eight dashboards honour the same draft/publish lifecycle. Save Draft persists data with `status: 'draft'`; Publish sets `status: 'published'` and exposes to the frontend. Field changes auto-save as draft and persist in `sessionStorage` until logout.
- [ ] **Achievement — Calculate Button Delivered**: Wikipedia, Challenge Academic, and Challenge Popular each have a "Calculate" button that re-ranks the list using saved weights, then sets ALL affected records to `status: 'draft'` (the "default to draft" rule) — even previously published records revert to draft, so nothing goes live without an explicit Publish.
- [ ] **Achievement — Gather Button Delivered**: Wikipedia, Challenge Academic, Challenge Popular, and News Sources each have a "Gather" button that invokes their respective pipeline/crawler, auto-saves new results as draft, and surfaces a clean "No new results" message when nothing is new.
- [ ] **Symmetry**: Identical code verification — the four Gather-enabled dashboards (Wikipedia, Challenge Academic, Challenge Popular, News Sources) use the same shared `gather_trigger.js` with identical button wiring patterns. The three Calculate-enabled dashboards (Wikipedia, Challenge Academic, Challenge Popular) use the same Calculate → re-rank → default-to-draft logic. The full set of dashboards all follow the canonical Save Draft / Publish / Delete foundation with Gather and Calculate added only where applicable.
- [ ] **Necessity**: The underlying reason — nomenclature drift and inconsistent draft/publish behaviour across modules — has been resolved. Every dashboard now presents a predictable, unified admin experience.
- [ ] **Targeted Impact**: All eight dashboard modules plus the backend pipeline scripts have been updated as intended. No frontend public-facing pages were modified.
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified.

---

### T14 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
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
| `documentation/detailed_module_sitemap.md` | Yes | Add new files under §7.0 System Module dashboard JS: `js/7.0_system/dashboard/gather_trigger.js` (shared tool — Gather button trigger with polling and dedup), `js/7.0_system/dashboard/field_persistence.js` (shared tool — sessionStorage-based field persistence). Update file-tree diagrams for §7.0. Update button-ID references in the HTML file-tree entries for §2.0, §3.0, §4.0, §5.0, §6.0 where function-bar button IDs changed. |
| `documentation/simple_module_sitemap.md` | Yes | Reflect that §7.0 System now owns two new shared dashboard tools consumed by modules 2.0–6.0. |
| `documentation/site_map.md` | Yes | Add `js/7.0_system/dashboard/gather_trigger.js` and `js/7.0_system/dashboard/field_persistence.js` to the master file tree. Bump version. |
| `documentation/data_schema.md` | No | No new tables or columns introduced. The `agent_run_log.articles_found` column semantics change from "total crawled" to "new items added" but the schema is unchanged. |
| `documentation/vibe_coding_rules.md` | Yes | Update §7 Shared-Tool Ownership table: add `gather_trigger.js` and `field_persistence.js` — both owned by `plan_standardize_dashboard_buttons` in `js/7.0_system/dashboard/`. List consumer plans: all dashboard modules that use Gather (Wikipedia, Challenge Academic, Challenge Popular, News Sources) consume `gather_trigger.js`; all dashboard modules consume `field_persistence.js`. |
| `documentation/style_mockup.html` | No | No new page layouts introduced — only button labels and JS logic changed. |
| `documentation/git_vps.md` | No | No deployment, branching, or VPS config changes. |
| `documentation/guides/guide_appearance.md` | No | No public-facing pages or components changed. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII layout diagrams for all eight dashboard function bars to reflect the standardized button layout: 3-button (Save Draft / Publish / Delete) for Records Single, Blog Posts, Essay/Historiography, Arbor; 4-button (+ Gather) for News Sources; 5-button (+ Gather + Calculate) for Wikipedia, Challenge Academic, Challenge Popular. Add a canonical function-bar ASCII diagram for each variant with BEM class annotations. Update the Shared Tool Ownership Reference table if present. |
| `documentation/guides/guide_function.md` | Yes | Add an ASCII logic-flow diagram for the Calculate pipeline: button click → read saved weights → re-rank list → batch PUT all ranks → set all affected records to `status: 'draft'` (default to draft). Add an ASCII logic-flow diagram for the Gather pipeline: button click → `gather_trigger.js` → POST to agent/news endpoint → poll → dedup check in backend pipeline → return new_items count → surface message → auto-refresh list (or no-op if zero). Add a logic-flow diagram for field persistence: field change → debounce → auto-save draft PUT → stash to sessionStorage → on module load → check JWT → restore from sessionStorage → clear on Publish or logout. |
| `documentation/guides/guide_security.md` | Yes | Note that `field_persistence.js` uses the existing `admin_session` JWT cookie as a namespace key in `sessionStorage` — no new auth surface. Document that stashed field state is cleared on logout and on explicit Publish. |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens introduced. The existing `.btn--draft`, `.btn--publish`, `.btn--delete`, `.btn--accent` (for Gather) BEM classes remain. |
| `documentation/guides/guide_maps.md` | No | No map-related changes. |
| `documentation/guides/guide_timeline.md` | No | No timeline changes. |
| `documentation/guides/guide_donations.md` | No | No donation-flow changes. |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, or robots.txt changes. |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` layout diagrams reflect the standardized 3/4/5-button function-bar variants; `guide_function.md` logic-flow diagrams document the Calculate pipeline, Gather pipeline, and field-persistence flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan (N/A — none introduced)
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated with `gather_trigger.js` and `field_persistence.js` ownership and consumer lists
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
