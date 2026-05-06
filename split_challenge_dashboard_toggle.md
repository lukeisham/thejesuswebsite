---
name: split_challenge_dashboard_toggle
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-06
---

# Plan: split_challenge_dashboard_toggle

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan splits the current single shared challenge list container in the admin dashboard (`dashboard_challenge.html`) into two explicitly separate, independent ranked-list containers — one for Academic Challenges and one for Popular Challenges — each backed by its own set of data schema columns (`academic_challenge_*` and `popular_challenge_*`). The existing Academic/Popular toggle is upgraded from re-rendering a single container to cleanly showing/hiding the two pre-loaded containers, so both lists retain their selection state, scroll position, and weighting context independently. The weighting sidebar (ranking criteria list and search terms textarea) is also split — each mode stores and restores its own weighting criteria and search terms in memory, so toggling between Academic and Popular no longer wipes the sidebar. Each challenge row gains a direct link to its respective public frontend page (`academic_challenge.html` or `popular_challenge.html`). No changes are made to the public frontend UI.

**Critical constraint — code symmetry:** The Academic and Popular lists must be functionally identical. The only difference between them is which set of data schema columns they read from and write to (`academic_challenge_*` vs `popular_challenge_*`). All rendering logic, row-building, event handlers, CSS classes, aria attributes, loading/empty/error states, and DOM structure must be exactly the same for both lists. No feature or code path may exist in one list but not the other. Every task below must be executed with this symmetry constraint in mind.

---

## API Endpoints & Frontend Linking

> All API endpoints consumed by the dashboard challenge module. No endpoint changes are required — the plan is purely client-side.

### API Endpoints (read-only, no changes needed)

| Endpoint | Method | Used by | Purpose |
|----------|--------|---------|---------|
| `/api/admin/records` | GET | `challenge_list_display.js` | Fetch all records; filtered client-side by `academic_challenge_title` or `popular_challenge_title` column. With dual-list, both Academic and Popular lists call this same endpoint (in parallel on init). No server-side change needed — filtering remains client-side. |
| `/api/admin/records/{slug}` | PUT | `challenge_weighting_handler.js` | Save per-record weighting criteria and search terms to the mode-specific DB columns (`academic_challenge_weight`, `popular_challenge_weight`, `academic_challenge_search_term`, `popular_challenge_search_term`). The column key is selected dynamically by mode — this already works and needs no change. |
| `/api/admin/records/batch` | PUT | `challenge_ranking_calculator.js` | Atomic batch rank update. Each payload entry targets the mode-specific rank column (`academic_challenge_rank` or `popular_challenge_rank`). Already mode-aware — no change needed. |
| `/api/admin/agent/run` | POST | `challenge_ranking_calculator.js` | Trigger DeepSeek agent pipeline. Pipeline name is `"academic_challenges"` or `"popular_challenges"` based on active mode — already dynamic. No change needed. |
| `/api/admin/agent/logs` | GET | `challenge_ranking_calculator.js` | Poll agent run status filtered by pipeline name. Already mode-aware. No change needed. |
| `/api/admin/lists/{list_name}` | PUT | `challenge_ranking_calculator.js` | Publish ranked order. List name is `"academic_challenges"` or `"popular_challenges"` based on active mode — already dynamic. No change needed. |

### Frontend Link Pattern

Each challenge row in the dashboard will include an anchor linking to its public frontend page:

| Mode | Link Target | Example |
|------|------------|---------|
| Academic | `/frontend/pages/debate/academic_challenge.html?id={slug}` | `/frontend/pages/debate/academic_challenge.html?id=jesus-historicity-debate` |
| Popular | `/frontend/pages/debate/popular_challenge.html?id={slug}` | `/frontend/pages/debate/popular_challenge.html?id=did-jesus-exist` |

The `slug` comes from the record's `slug` column. The frontend pages already accept `?id=` query parameters — this is the existing URL scheme used by `list_view_academic_challenges.js` and `list_view_popular_challenges.js` for their mock-data links. No frontend page changes are needed.

### Data Columns Reference (from `documentation/data_schema.md`)

Each mode reads from and writes to its own dedicated column group in the `records` table:

| Purpose | Academic Column | Popular Column |
|---------|----------------|----------------|
| Title | `academic_challenge_title` | `popular_challenge_title` |
| Rank | `academic_challenge_rank` | `popular_challenge_rank` |
| Weight | `academic_challenge_weight` | `popular_challenge_weight` |
| Search Terms | `academic_challenge_search_term` | `popular_challenge_search_term` |
| Link | `academic_challenge_link` | `popular_challenge_link` |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Split `dashboard_challenge.html` into dual-list containers

- **File(s):** `admin/frontend/dashboard_challenge.html`
- **Action:** Replace the single `#challenge-ranked-list` ordered list with two independent ordered lists — `#academic-challenge-ranked-list` and `#popular-challenge-ranked-list` — each wrapped in its own section with a descriptive `id`, a header linking to its frontend page, and `aria-hidden` toggling. Keep the existing function bar toggle (Academic | Popular), weighting sidebar, and insert response dialog intact. Add loading, empty, and error state containers per list.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id` hooks for JS, modular `class` names for CSS

- [ ] Task complete

---

### T2 — Update `dashboard_challenge.css` for dual-list toggle layout

- **File(s):** `css/4.0_ranked_lists/dashboard/dashboard_challenge.css`
- **Action:** Add styles for the new dual-list regions: each list section gets a `.challenge-list-region` class controlling visibility (driven by `[aria-hidden]`), a `.challenge-list-region__header` with a frontend-link anchor, and a `.challenge-list-region--active` modifier for the visible list. Ensure the existing `.challenge-row`, `.challenge-sidebar`, and `.challenge-editor-layout` styles still apply correctly to both lists. No framework classes — pure CSS Grid/Flexbox.
- **Vibe Rule(s):** CSS Grid for macro layout; Flexbox for micro alignment · All colours, fonts, spacing reference CSS variables from `typography_colors.css` · Section headings and subheadings present as comments · No third-party utility frameworks

- [ ] Task complete

---

### T3 — Refactor `dashboard_challenge.js` for dual independent list states

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge.js`
- **Action:** Update `renderChallenge()` to initialise both academic and popular lists on load (call `displayChallengeList('academic')` and `displayChallengeList('popular')` in parallel). Replace the toggle logic in `_wireToggleButtons()` so it swaps `aria-hidden` on the two list regions instead of re-fetching data — each list retains its scroll position, selected row, and weighting state. Add `window._challengeModuleState` extensions to track `activeRecordId` and `activeRecordSlug` independently per mode (e.g., `academicActiveRecordId` / `popularActiveRecordId`). Wire each list region header's frontend link to open the correct public page.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ only · Component injection where applicable

- [ ] Task complete

---

### T4 — Update `challenge_list_display.js` to render per-mode with frontend links

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
- **Action:** Update `displayChallengeList(mode)` to target the mode-specific container (`#academic-challenge-ranked-list` or `#popular-challenge-ranked-list`) instead of the old single `#challenge-ranked-list`. In `_buildChallengeRow()`, add a frontend-page link anchor to each challenge row header that points to the correct public page (`/frontend/pages/debate/academic_challenge.html?id=...` or `/frontend/pages/debate/popular_challenge.html?id=...`) using the record's slug. Ensure the row click-to-select and expand/collapse logic still works per-list.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ only

- [ ] Task complete

---

### T5 — Split `challenge_weighting_handler.js` to maintain independent weighting + search terms per mode

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
- **Action:** Replace the current `reloadChallengeWeighting(mode)` reset-on-toggle behaviour with dual-state storage. Store weighting criteria and search terms textarea value independently per mode in `window._challengeModuleState` (e.g., `academicWeightingCriteria`, `popularWeightingCriteria`, `academicSearchTerms`, `popularSearchTerms`). On toggle, save the outgoing mode's current sidebar state to its per-mode slot, then restore the incoming mode's state from its per-mode slot (or load defaults if no saved state exists). The `loadChallengeSearchTerms(challenge)` function continues to populate the sidebar from a selected record's DB columns; toggling now preserves unsaved in-memory edits instead of discarding them. Update the search terms hint label to reflect the active mode.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ only

- [ ] Task complete

---

## Final Tasks

### T6 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] N/A — no Python files touched in this plan

#### SQL / Database
- [ ] N/A — no schema changes in this plan; existing `academic_challenge_*` and `popular_challenge_*` columns used as-is

---

### T7 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The single shared list container has been split into two explicit, independent Academic and Popular list containers
- [ ] **Symmetry**: Identical code verification — all rendering logic, row-building, event handlers, and DOM structures are functionally identical between Academic and Popular modes (no drift)
- [ ] **Achievement**: The weighting sidebar (criteria + search terms) now stores and restores per-mode state instead of resetting on every toggle
- [ ] **Necessity**: The toggle now shows/hides pre-loaded lists instead of re-rendering, preserving selection, scroll position, weighting criteria, and search terms independently per mode
- [ ] **Targeted Impact**: Only the admin dashboard challenge module (HTML, CSS, JS in `4.0_ranked_lists/dashboard/`) has been modified; public frontend pages are untouched
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified



---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Update `dashboard_challenge.html` description to reflect dual-list containers; verify all JS file descriptions in 4.0 dashboard remain accurate |
| `documentation/simple_module_sitemap.md` | No | High-level structure unchanged — 4.2 Ranked Challenge Views still same scope |
| `documentation/site_map.md` | Yes | Run `/sync_sitemap` to regenerate after HTML/JS structural changes in `admin/frontend/` and `js/4.0_ranked_lists/dashboard/` |
| `documentation/data_schema.md` | No | No new tables, columns, or relationships introduced; existing `academic_challenge_*` and `popular_challenge_*` columns used as documented |
| `documentation/vibe_coding_rules.md` | No | No rules were ambiguous during this plan — all file-type rules applied cleanly |
| `documentation/style_mockup.html` | No | No new page layout or visual component introduced; dashboard challenge UI pattern already represented |
| `documentation/git_vps.md` | No | No deployment, branching, or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No new public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update dashboard challenge section to document the dual-list container structure, the new `.challenge-list-region` class, the per-row frontend link pattern, and the per-mode weighting/search-terms state storage |
| `documentation/guides/guide_function.md` | Yes | Document the updated toggle logic (show/hide dual containers vs. re-render), the dual independent state management per mode, and the new save/restore pattern for weighting criteria and search terms on mode switch |
| `documentation/guides/guide_security.md` | No | No auth, session, rate-limiting, or input validation changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens introduced beyond existing conventions |
| `documentation/guides/guide_maps.md` | No | No map display or data logic changed |
| `documentation/guides/guide_timeline.md` | No | No timeline display or data logic changed |
| `documentation/guides/guide_donations.md` | No | No external support integrations or donation flows changed |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, robots.txt, or AI-accessibility changes (dashboard is admin-only) |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
