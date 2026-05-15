---
name: fix_challenge_module_audit_bugs
version: 1.0.0
module: 4.0 — Ranked Lists
status: complete
created: 2026-05-15
---

# Plan: fix_challenge_module_audit_bugs

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Fix seven bugs discovered during a symmetry audit of the Academic and Popular challenge modules. The most critical bug (#1) makes Calculate, Publish, and SetAllRecordsToDraft completely non-functional because `challenge_list_display.js` stores fetched data into mode-specific state slots but `challenge_ranking_calculator.js` reads from an empty generic `challenges` array. Additional fixes address backend pipeline type-filter omissions (#2), inconsistent record addressing between slug and id (#3, #4), unscoped responses on the frontend (#5), a global `scheduleAutoSave` clobber (#6), and a cosmetic label asymmetry (#7). All seven bugs affect both Academic and Popular modules identically — fixes are applied symmetrically to both.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix challenges array never populated (BUG 1 — HIGH)

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
- **Action:** After storing challenges in the mode-specific slot (`academicChallenges` / `popularChallenges`) on lines 84-88, also write to `window._challengeModuleState.challenges = challenges;` so that `challenge_ranking_calculator.js`, `publishChallengeRankings()`, and `_setAllRecordsToDraft()` can access the data. Insert the new line immediately after the mode-specific assignment block (after line 88).
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [x] Task complete

---

### T2 — Add type filter to academic pipeline (BUG 2 — MEDIUM)

- **File(s):** `backend/pipelines/pipeline_academic_challenges.py`
- **Action:** Change the SQL query on line 68 from `WHERE slug IS NOT NULL` to `WHERE slug IS NOT NULL AND type = 'challenge_academic'` so the pipeline only processes academic challenge records instead of every record in the database.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · snake_case fields

- [x] Task complete

---

### T3 — Add type filter to popular pipeline (BUG 2 — MEDIUM)

- **File(s):** `backend/pipelines/pipeline_popular_challenges.py`
- **Action:** Change the SQL query on line 69 from `WHERE slug IS NOT NULL` to `WHERE slug IS NOT NULL AND type = 'challenge_popular'` so the pipeline only processes popular challenge records instead of every record in the database.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · snake_case fields

- [x] Task complete

---

### T4 — Standardize record addressing to use slug consistently (BUG 3 + BUG 4 — MEDIUM/LOW)

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`, `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`
- **Action:** In `_saveAcademicChallengeRecord()` (line 218 of academic) and `_savePopularChallengeRecord()` (line 218 of popular), change the fetch URL from `"/api/admin/records/" + state.activeRecordId` to `"/api/admin/records/" + encodeURIComponent(state.activeRecordSlug)` to match the slug-based addressing used by `challenge_weighting_handler.js`'s `_autoSaveWeights()` and `_autoSaveSearchTerms()`. Also update the early return guard from `if (!state.activeRecordId) return;` to `if (!state.activeRecordSlug) return;` in both functions.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [x] Task complete

---

### T5 — Scope frontend responses to parent challenge type (BUG 5 — LOW)

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_academic_challenges_with_response.js`, `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js`
- **Action:** In both files, after building the `responsesByChallengeId` index (around line 66-74), add a filter that only keeps responses whose `challenge_id` matches an `id` present in the current challenge `groups` object. This ensures a response linked to a popular challenge cannot appear under an academic challenge (and vice versa). Specifically, after the `for (var j ...)` loop that builds `responsesByChallengeId`, add a cleanup pass that deletes any key from `responsesByChallengeId` whose key is not a key in `groups`.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [x] Task complete

---

### T6 — Namespace scheduleAutoSave to avoid global clobber (BUG 6 — LOW)

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`, `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`
- **Action:** In `challenge_weighting_handler.js`, rename the globally exposed function from `window.scheduleAutoSave` to `window.scheduleChallengeWeightingAutoSave` (both the function definition on line 498 and the global exposure on line 519). In `challenge_response_status_handler.js`, rename from `window.scheduleAutoSave` to `window.scheduleChallengeResponseAutoSave` (both the function definition on line 455 and the global exposure on line 500). Then update any callers — check `js/7.0_system/dashboard/field_persistence.js` or other orchestrators that call `window.scheduleAutoSave` to use the correct namespaced version for the active module.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [x] Task complete

---

### T7 — Fix button text asymmetry (BUG 7 — COSMETIC)

- **File(s):** `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js`
- **Action:** On line 199, change the button text from `"Read Full Response →"` to `"Read Full Popular Response →"` to match the academic version's `"Read Full Academic Response →"` pattern.
- **Vibe Rule(s):** 1 function per JS file · ES6+ · 3-line header comment

- [x] Task complete

---

## Final Tasks

### T8 — Vibe-Coding Audit

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

### T9 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Calculate, Publish, and SetAllRecordsToDraft buttons now operate on the correct data source
- [ ] **Achievement**: Backend pipelines only process records of their intended challenge type
- [ ] **Achievement**: Record save operations use consistent addressing (slug-based) across all paths
- [ ] **Achievement**: Frontend response sub-cards are scoped to their parent challenge type
- [ ] **Achievement**: No global function name collisions between weighting and response auto-save
- [ ] **Achievement**: Button text is symmetric between Academic and Popular frontend views
- [ ] **Symmetry**: Identical code verification — all fixes applied to both Academic and Popular modules are functionally identical across modes (no drift)
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in Tasks were created or modified

---

### T10 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added or moved; all changes are edits to existing files already listed in the sitemap |
| `documentation/simple_module_sitemap.md` | No | Module scope unchanged |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No database schema changes |
| `documentation/vibe_coding_rules.md` | No | No shared-tool ownership changes; the renamed functions are module-internal |
| `documentation/style_mockup.html` | No | No visual layout changes |
| `documentation/git_vps.md` | No | No deployment or Git changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing UI layout changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard layout or component structure changes |
| `documentation/guides/guide_function.md` | Yes | Update the Challenge module data-flow description under §4.0 to note that `challenge_list_display.js` now populates both the mode-specific state slot AND the generic `challenges` array, and that backend pipelines now include a `type` filter. Also note the `scheduleAutoSave` → `scheduleChallengeWeightingAutoSave` / `scheduleChallengeResponseAutoSave` rename. |
| `documentation/guides/guide_security.md` | No | No auth or security changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation flow changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or accessibility changes |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
