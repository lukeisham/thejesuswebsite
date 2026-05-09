---
name: split_challenge_academic_popular
version: 1.1.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-09
---

# Plan: split_challenge_academic_popular

## Purpose

> The current `dashboard_challenge.html` uses a single Academic/Popular toggle to switch between two list modes inside one page. This architecture has proven fragile — the toggle is a persistent source of bugs stemming from shared mutable state, missing getters, orphaned CSS classes, cross-module CSS dependencies, and asymmetric overview refresh logic. This plan replaces the single toggle-driven page with two independent dashboard pages — `dashboard_challenge_academic.html` and `dashboard_challenge_popular.html` — each with its own dashboard card in the module navigation grid. The old toggle-based page (`dashboard_challenge.html`) and its orchestrator (`dashboard_challenge.js`) are deleted, and all references to them are removed from the codebase. Both new pages share the existing JS sub-modules (`challenge_list_display.js`, `challenge_weighting_handler.js`, `challenge_ranking_calculator.js`, `insert_challenge_response.js`) and backend Python pipelines (`pipeline_academic_challenges.py`, `pipeline_popular_challenges.py`). Both interact with the existing Challenge Response editor (`dashboard_challenge_response.js`). Each new page links to its corresponding public-facing frontend page (`frontend/pages/debate/academic_challenge.html` or `frontend/pages/debate/popular_challenge.html`) — which already exist as separate pages. This split eliminates the toggle entirely, removes all per-mode state-switching logic, and makes each page independently debuggable. No changes to any frontend (public-facing) files are required.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Academic Challenge dashboard HTML template

- **File(s):** `admin/frontend/dashboard_challenge_academic.html`
- **Action:** Create a stripped-down HTML template derived from `dashboard_challenge.html` that contains only the Academic list region, weighting sidebar, and function bar — no toggle buttons, no Popular list region, no dual-region `aria-hidden` attributes, no `--active` classes. The "View Public Page →" link must point to `/frontend/pages/debate/academic_challenge.html`. Sidebar heading must read "ACADEMIC WEIGHTING AND SEARCH TERMS". Search terms label must read "Academic".
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [ ] Task complete

---

### T2 — Create Popular Challenge dashboard HTML template

- **File(s):** `admin/frontend/dashboard_challenge_popular.html`
- **Action:** Create the mirror template for Popular challenges — same structure as T1 but with "Popular" labels in all headings, hints, and the public-page link (`/frontend/pages/debate/popular_challenge.html`). Use Popular-specific default weighting criteria names (Popularity, Virality, Search Volume) in any static placeholder text.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS · **Symmetry:** HTML structure must be identical to T1 — only label strings and the link `href` differ

- [ ] Task complete

---

### T3 — Create Academic Challenge dashboard JS orchestrator

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`
- **Action:** Create a simplified orchestrator (`renderChallengeAcademic`) that hardcodes `mode: "academic"`, defines a flat `_challengeModuleState` with no toggle logic (no `_saveCurrentModeState`, `_restoreModeState`, `_wireToggleButtons`, `_showListRegion`, `_hideListRegion`, no Popular cache slots, no per-mode getters/setters), fetches and injects the Academic HTML template via `_setColumn`, initialises `initChallengeWeighting()`, calls `_refreshOverviews("academic")`, wires action buttons (Refresh, Publish, Agent Search, Insert Response), loads the academic challenge list via `displayChallengeList("academic")`, and initialises shared tools (metadata widget, insert response dialog). Must expose `window.renderChallengeAcademic`.
- **Vibe Rule(s):** 1 function/file pattern · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T4 — Create Popular Challenge dashboard JS orchestrator

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`
- **Action:** Create the mirror orchestrator (`renderChallengePopular`) with `mode: "popular"`. Must be functionally identical to T3 except for: the mode string `"popular"`, the HTML template URL `"/admin/frontend/dashboard_challenge_popular.html"`, and the default weighting criteria seed (`DEFAULT_WEIGHTS.popular`). Must expose `window.renderChallengePopular`.
- **Vibe Rule(s):** 1 function/file pattern · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection · **Symmetry:** verify that a diff between T3 and T4 shows ONLY mode string, template URL, and default weights differ — no feature or code path exists in one but not the other

- [ ] Task complete

---

### T5 — Register two new module routes and remove legacy route in dashboard_app.js

- **File(s):** `js/7.0_system/dashboard/dashboard_app.js`
- **Action:** Add two entries to `MODULE_RENDERERS` (`"challenge-academic": "renderChallengeAcademic"`, `"challenge-popular": "renderChallengePopular"`) and two entries to `MODULE_LABELS` (`"challenge-academic": "Academic Challenges"`, `"challenge-popular": "Popular Challenges"`). Remove the legacy `"challenge": "renderChallenge"` entry from both `MODULE_RENDERERS` and `MODULE_LABELS` — it is no longer needed.
- **Vibe Rule(s):** Vanilla ES6+ · Explicit readable logic

- [ ] Task complete

---

### T6 — Replace single Challenge card with two cards in display_dashboard_cards.js

- **File(s):** `js/7.0_system/dashboard/display_dashboard_cards.js`
- **Action:** In the `MODULE_CARDS` array, replace the single `{ id: "challenge", icon: "⚡", title: "Challenges", desc: "Create and manage historical Jesus challenge questions." }` entry with two entries:
  - `{ id: "challenge-academic", icon: "🎓", title: "Academic Challenges", desc: "Rank and manage academic historical debate challenges." }`
  - `{ id: "challenge-popular", icon: "🔥", title: "Popular Challenges", desc: "Rank and manage popular public query challenges." }`
  Update the file header comment from "10 module navigation cards" to "11 module navigation cards". The `index === MODULE_CARDS.length - 1` centering logic automatically applies to the last card (System) — verify no change needed.
- **Vibe Rule(s):** Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T7 — Replace old script tags with new orchestrator scripts in dashboard.html

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** In the Challenge Module (4.0) `<script>` block, replace the `<script src=".../dashboard_challenge.js">` tag with two new tags loading `dashboard_challenge_academic.js` and `dashboard_challenge_popular.js`. The per-mode overview scripts (`academic_challenge_search_terms.js`, `popular_challenge_search_terms.js`, `academic_challenge_ranking_weights.js`, `popular_challenge_ranking_weights.js`) remain loaded — they are referenced by `window.*` calls from the shared sub-modules. The shared sub-module scripts (`challenge_list_display.js`, `challenge_weighting_handler.js`, `challenge_ranking_calculator.js`, `insert_challenge_response.js`, `dashboard_challenge_response.js`) remain loaded. Load order: shared sub-modules first, then `dashboard_challenge_academic.js`, then `dashboard_challenge_popular.js`.
- **Vibe Rule(s):** No inline scripts · Scripts loaded in dependency order

- [ ] Task complete

---

### T8 — Delete legacy toggle-based page and orchestrator

- **File(s):** `admin/frontend/dashboard_challenge.html`, `js/4.0_ranked_lists/dashboard/dashboard_challenge.js`
- **Action:** Delete both files from the codebase. All functionality has been migrated to the split pages (T1–T4) and all references have been removed (T5–T7). Use `delete_path` to remove each file.
- **Vibe Rule(s):** Source-of-Truth Discipline — verify no other file references these deleted paths before removal

- [ ] Task complete

---

### T9 — Verify frontend interaction

- **File(s):** `frontend/pages/debate/academic_challenge.html`, `frontend/pages/debate/popular_challenge.html`, `js/4.0_ranked_lists/frontend/list_view_academic_challenges_with_response.js`, `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js`
- **Action:** Verify that the two new dashboard pages correctly interact with the existing public-facing frontend. Specifically: (a) the "View Public Page →" link in `dashboard_challenge_academic.html` points to `/frontend/pages/debate/academic_challenge.html` and the link in `dashboard_challenge_popular.html` points to `/frontend/pages/debate/popular_challenge.html`; (b) the `challenge_list_display.js` row builder already constructs correct frontend URLs based on the `mode` parameter (`academic_challenge.html?id=...` vs `popular_challenge.html?id=...`); (c) the `publishChallengeRankings()` function in `challenge_ranking_calculator.js` already writes to the correct resource list (`academic_challenges` vs `popular_challenges`) based on `mode`. No frontend files need modification — the public-facing pages, their JS display files, and the backend pipelines are already correctly separated by mode.
- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference `detailed_module_sitemap.md`

- [ ] Task complete

---

### T10 — Sync sitemap

- **File(s):** `sitemap.xml`
- **Action:** Run the `/sync_sitemap` process to regenerate `sitemap.xml`. The two new dashboard HTML pages are admin pages with `noindex, nofollow` and do not need public sitemap entries — but verify no indirect references to the deleted `dashboard_challenge.html` remain. Confirm the public-facing challenge pages (`frontend/pages/debate/academic_challenge.html`, `frontend/pages/debate/popular_challenge.html`) are correctly listed.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] Task complete

---

### T11 — Update ASCII diagrams in documentation guides

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`, `documentation/guides/guide_function.md`
- **Action:** Update all ASCII box-drawing diagrams affected by this plan. In `guide_dashboard_appearance.md`: replace the single toggle-driven Challenge Dashboard layout diagram with two independent full-width layout diagrams — one for Academic Challenges and one for Popular Challenges — each showing the function bar (no toggle group), weighting sidebar, and single list region. In `guide_function.md`: add an ASCII logic-flow diagram for the simplified single-mode orchestrator lifecycle showing `loadModule` → `renderChallengeAcademic` → `fetch HTML template` → `_setColumn` → `initChallengeWeighting` → `displayChallengeList` → `wire action buttons` → `init shared tools`. Add a note that the Popular flow is identical except for the mode string and template URL. Remove any ASCII diagrams referencing the deleted `dashboard_challenge.js` toggle lifecycle functions (`_wireToggleButtons`, `_saveCurrentModeState`, `_restoreModeState`).
- **Vibe Rule(s):** ASCII box-drawing characters only · Section headings and subheadings as comments · Cross-reference `detailed_module_sitemap.md`

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

- [ ] **Achievement**: Two independent dashboard pages exist — `dashboard_challenge_academic.html` and `dashboard_challenge_popular.html` — each with its own dashboard card, eliminating the toggle
- [ ] **Achievement**: The old toggle-based `dashboard_challenge.html` and `dashboard_challenge.js` are deleted; all references to them are removed from `dashboard_app.js`, `display_dashboard_cards.js`, and `dashboard.html`
- [ ] **Achievement**: Both new pages share the existing JS sub-modules and backend Python pipelines without modification — `challenge_list_display.js`, `challenge_weighting_handler.js`, `challenge_ranking_calculator.js`, `insert_challenge_response.js`, `pipeline_academic_challenges.py`, `pipeline_popular_challenges.py`
- [ ] **Achievement**: Both new pages interact with the existing Challenge Response editor via the unchanged `insert_challenge_response.js` → `window.loadModule("challenge-response")` flow
- [ ] **Achievement**: Both new pages correctly link to their corresponding public-facing frontend pages (`frontend/pages/debate/academic_challenge.html` and `frontend/pages/debate/popular_challenge.html`) — which already exist as separate pages and require no changes
- [ ] **Symmetry**: `dashboard_challenge_academic.js` and `dashboard_challenge_popular.js` are functionally identical — code diff between the two files reveals only the mode string, HTML template URL, and default weighting criteria differ. No feature or code path exists in one but not the other.
- [ ] **Symmetry**: `dashboard_challenge_academic.html` and `dashboard_challenge_popular.html` are structurally identical — only label strings and the public-page link `href` differ.
- [ ] **Necessity**: The toggle-based architecture, which was the root cause of multiple persistent bugs (missing `challenges` getter, orphaned CSS classes, cross-module CSS dependency, asymmetric overview refresh), has been fully removed from the codebase
- [ ] **Targeted Impact**: The Challenge dashboard workflow (Module 4.0) has been updated — users now click either "Academic Challenges" or "Popular Challenges" from the dashboard card grid instead of toggling within a single page
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created, modified, or deleted. The backend pipelines, shared sub-modules, Challenge Response module, Wikipedia module, and all frontend (public-facing) files are untouched.

---

### T14 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Site maps** (`detailed_module_sitemap.md`, `simple_module_sitemap.md`, `site_map.md`): Add every new file with its exact path and a brief description comment. Remove every deleted file. Update file-tree diagrams. Bump the `version` in frontmatter.
  - **ASCII layout diagrams** (`guide_dashboard_appearance.md`): Add or update ASCII box-drawing diagrams to reflect the two new single-mode pages replacing the toggle-driven layout.
  - **Logic-flow diagrams** (`guide_function.md`): Add or update ASCII pipeline/flow diagrams for the simplified single-mode orchestrator lifecycle.
  - **Style guide** (`guide_style.md`): Add any new BEM namespace or CSS pattern as a canonical example.
  - **Shared-tool ownership** (`vibe_coding_rules.md`): Update §7 table if a new shared tool was created or an existing tool's ownership or consumer list changed.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add four new files under Module 4.0 Dashboard HTML (`dashboard_challenge_academic.html` — "Academic-only challenge list management container", `dashboard_challenge_popular.html` — "Popular-only challenge list management container") and Dashboard JS (`dashboard_challenge_academic.js` — "Academic module orchestration & initialization", `dashboard_challenge_popular.js` — "Popular module orchestration & initialization"); remove `dashboard_challenge.html` and `dashboard_challenge.js` from the file tree; update the Dashboard HTML tree comment from "Challenge list management container (Academic/Popular toggle)" to reflect the two new separate containers; bump version to 2.4.0 |
| `documentation/simple_module_sitemap.md` | Yes | Reflect that the Challenge dashboard now exposes two separate entry points (Academic Challenges, Popular Challenges) instead of one toggle-driven page; remove reference to the deleted `dashboard_challenge.html`; bump version |
| `documentation/site_map.md` | Yes | Add four new file paths to master file tree; remove `dashboard_challenge.html` and `dashboard_challenge.js` from master file tree; update the dashboard HTML section comment to list the two new pages; bump version |
| `documentation/data_schema.md` | No | No database schema changes — columns `academic_challenge_*` and `popular_challenge_*` are unchanged |
| `documentation/vibe_coding_rules.md` | No | No new shared tools created; existing shared-tool ownership table in §7 is unchanged |
| `documentation/style_mockup.html` | No | No new page layouts — the split pages use the same Providence canvas layout as the deleted page |
| `documentation/git_vps.md` | No | No deployment, branching, or VPS configuration changes |
| `documentation/guides/guide_appearance.md` | No | No new public-facing pages or UI components — the split affects only the admin dashboard, not the public site. The public-facing `academic_challenge.html` and `popular_challenge.html` already exist as separate pages and are unchanged. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update the Challenge Dashboard (4.0) subsection: replace the single toggle-driven layout ASCII diagram with two independent full-width layout diagrams (one for Academic Challenges, one for Popular Challenges); update the Shared Tool Ownership Reference table to replace the `dashboard_challenge.js` row with two rows for `dashboard_challenge_academic.js` and `dashboard_challenge_popular.js`; bump version |
| `documentation/guides/guide_function.md` | Yes | Add ASCII logic-flow diagram for the simplified single-mode orchestrator lifecycle (no toggle, no state switching, no `_saveCurrentModeState` / `_restoreModeState`); add note that the Academic and Popular flows are identical except for the hardcoded mode parameter; document that `challenge_list_display.js` is called with a hardcoded mode string rather than a dynamic value read from a mutable toggle state; remove any reference to the deleted `dashboard_challenge.js`; bump version |
| `documentation/guides/guide_security.md` | No | No auth, session, rate-limiting, or input validation changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens — the split pages reuse existing `dashboard_challenge.css` classes, which already has the toggle button styles from the earlier fix |
| `documentation/guides/guide_maps.md` | No | No map-related changes |
| `documentation/guides/guide_timeline.md` | No | No timeline-related changes |
| `documentation/guides/guide_donations.md` | No | No donation or support integration changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, robots.txt, or AI-accessibility changes — admin dashboard is `noindex, nofollow` |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect the 4 new files and 2 deletions; `simple_module_sitemap.md` updated; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** `guide_dashboard_appearance.md` layout diagrams reflect the two new single-mode pages replacing the toggle layout; `guide_function.md` logic-flow diagrams document the simplified orchestrator lifecycle
- [ ] **Style guide updated:** `guide_style.md` (N/A — no new CSS patterns)
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table (N/A — no new shared tools)
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to the deleted `dashboard_challenge.html` or `dashboard_challenge.js`

---

### T15 — Push to GitHub

- **File(s):** All files created, modified, or deleted in this plan
- **Action:** Commit all changes to the `main` branch with a descriptive commit message summarising the plan: `split_challenge_academic_popular: replace toggle-driven Challenge dashboard with two independent Academic/Popular pages`. Include the four new files, three edited files, and two deleted files in the commit. Push to the remote `main` branch. Verify the push succeeds with no merge conflicts.
- **Vibe Rule(s):** Never create branches — commit directly to `main` · Git Rules from `CLAUDE.md`

- [ ] Task complete
