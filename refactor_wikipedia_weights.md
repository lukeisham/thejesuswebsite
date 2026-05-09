---
name: refactor_wikipedia_weights
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-09
---

# Plan: refactor_wikipedia_weights

## Purpose

> **Refactor the Wikipedia module to support multiple dynamic weight multipliers and dedicated search term management, matching the functional depth of the Challenge module.**

Currently, the Wikipedia module uses a single, fixed weight multiplier and stores search terms in a shared sidebar handler. This plan refactors that logic into two new, dedicated JS scripts (`wikipedia_weights.js` and `wikipedia_search_terms.js`), updates the `dashboard_wikipedia.html` UI to include buttons for adding/removing weights, and modifies the ranking calculator to iterate over multiple weight criteria. This ensures that search terms define the scope of article discovery while multiple weights refine the final ranking score, providing more granular control over evidence prioritization.

---

## Tasks

> Each task is a focused, bite-sized unit of work.

### T1 — Update Wikipedia Dashboard HTML

- **File(s):** `admin/frontend/dashboard_wikipedia.html`
- **Action:** Add a "New Weight" form (name/value inputs + "Add" button) and update the weighting list container to support dynamic item rendering with remove buttons.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · Descriptive `id` hooks for JS

- [ ] Task complete

---

### T2 — Implement Wikipedia Weights JS

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_weights.js`
- **Action:** Create a new script to handle the weighting criteria lifecycle: rendering the list, adding new weights, removing existing weights, and auto-saving the weight object (JSON) to the database.
- **Vibe Rule(s):** 1 function per JS file (init/render/save group) · ES6+ · Header comment (trigger/main/output)

- [ ] Task complete

---

### T3 — Implement Wikipedia Search Terms JS

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_search_terms.js`
- **Action:** Create a new script to manage the search terms textarea and read-only overview list, including the auto-save logic that persists the terms as a JSON array.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · Header comment (trigger/main/output)

- [x] Task complete

---

### T4 — Refactor Wikipedia Sidebar Handler

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** Refactor `initWikipediaSidebar` and `populateWikipediaSidebar` to delegate weight and search term logic to the newly created scripts, removing the legacy single-weight rendering code.
- **Vibe Rule(s):** Component injection pattern · 1 function per JS file (module orchestration) · ES6+

- [x] Task complete

---

### T5 — Update Wikipedia Ranking Calculator

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js`
- **Action:** Update the ranking logic to parse the `wikipedia_weight` JSON object and apply the product (or sum) of all active multipliers to the base `wikipedia_rank` score.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · Explicit logic

- [x] Task complete

---

### T6 — Update Wikipedia Pipeline Documentation

- **File(s):** `backend/pipelines/pipeline_wikipedia.py`
- **Action:** Update the file header and internal comments to clarify that `wikipedia_search_term` defines the discovery scope while the new multiple weights in `wikipedia_weight` are applied during the ranking phase.
- **Vibe Rule(s):** Explicit readable logic · Document API quirks

- [x] Task complete

---

## Final Tasks

### T7 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

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

### T8 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Wikipedia module now supports adding, modifying, and removing multiple weight multipliers.
- [ ] **Achievement**: Dedicated `wikipedia_weights.js` and `wikipedia_search_terms.js` scripts manage feature-specific logic.
- [ ] **Necessity**: The functional parity between Wikipedia and Challenge ranking is established.
- [ ] **Targeted Impact**: The Wikipedia admin dashboard (Module 4.0) UI and ranking logic are updated.
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified.

---

### T9 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`): Add or update ASCII box-drawing diagrams to reflect the new Wikipedia weight editor and search term sections.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for any new data flow, JS lifecycle, or Python script introduced by this plan.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example in its own subsection, with a table of classes and their CSS variable references.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add `wikipedia_weights.js` and `wikipedia_search_terms.js` entries; update Module 4.0 file tree. |
| `documentation/simple_module_sitemap.md` | Yes | Update Wikipedia module description to reflect dynamic weighting. |
| `documentation/site_map.md` | Yes | Add new JS files to master list; bump version. |
| `documentation/data_schema.md` | No | Field names remain same; only content (JSON) structure changes. |
| `documentation/vibe_coding_rules.md` | No | No rule changes required. |
| `documentation/style_mockup.html` | No | No macro layout change. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | No public-facing UI changes. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update Wikipedia sidebar ASCII diagram to show "New Weight" form. |
| `documentation/guides/guide_function.md` | Yes | Update Wikipedia ranking flow diagram to include multi-weight iteration. |
| `documentation/guides/guide_security.md` | No | No auth/security changes. |
| `documentation/guides/guide_style.md` | Yes | Add BEM namespace table for `.wikipedia-weight-item`. |
| `documentation/guides/guide_maps.md` | No | Unrelated. |
| `documentation/guides/guide_timeline.md` | No | Unrelated. |
| `documentation/guides/guide_donations.md` | No | Unrelated. |
| `documentation/guides/guide_welcoming_robots.md` | No | Unrelated. |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
