---
name: fix_challenge_toggle
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-09
---

# Plan: fix_challenge_toggle

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan fixes a critical bug in the 4.0 Ranked Lists Challenge module where the "Academic / Popular" toggle button fails to work correctly initially because its event listener binding is blocked by the asynchronous `displayChallengeList` fetches. It solves this by moving the event wiring to be synchronous right after DOM injection. Additionally, it fulfills a user request to make the sidebar heading dynamic, updating it to read "ACADEMIC WEIGHTING AND SEARCH TERMS" or "POPULAR WEIGHTING AND SEARCH TERMS" when the toggle is clicked, providing better visual feedback about which list's properties are currently being edited.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Add ID hook to sidebar heading

- **File(s):** `admin/frontend/dashboard_challenge.html`
- **Action:** Add the ID `challenge-sidebar-heading` to the `<h2 class="challenge-sidebar__heading">` element so it can be targeted by JavaScript.
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id` hooks for JS

- [x] Task complete

---

### T2 — Fix toggle wiring and update heading logic

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge.js`
- **Action:** Move the `_wireToggleButtons();` call above the `await Promise.all(...)` block so buttons are active immediately, and update the toggle event listeners to change the `challenge-sidebar-heading` text to "ACADEMIC WEIGHTING AND SEARCH TERMS" or "POPULAR WEIGHTING AND SEARCH TERMS".
- **Vibe Rule(s):** 1 function per JS file · ES6+

- [x] Task complete

---

## Final Tasks

### T3 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file (or tightly-related group for a single widget/component)
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T4 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [x] **Achievement**: The toggle button works reliably, irrespective of how long the records API takes to respond.
- [x] **Achievement**: The sidebar heading updates dynamically to reflect the current editing mode.
- [x] **Symmetry**: Identical code verification — all duplicated logic, row-building, and event handlers are functionally identical across modes (no drift).
- [x] **Necessity**: The underlying reason/need for this plan has been resolved
- [x] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T5 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No |  |
| `documentation/simple_module_sitemap.md` | No |  |
| `documentation/site_map.md` | No |  |
| `documentation/data_schema.md` | No |  |
| `documentation/vibe_coding_rules.md` | No |  |
| `documentation/style_mockup.html` | No |  |
| `documentation/git_vps.md` | No |  |
| `documentation/guides/guide_appearance.md` | No |  |
| `documentation/guides/guide_dashboard_appearance.md` | No |  |
| `documentation/guides/guide_function.md` | No |  |
| `documentation/guides/guide_security.md` | No |  |
| `documentation/guides/guide_style.md` | No |  |
| `documentation/guides/guide_maps.md` | No |  |
| `documentation/guides/guide_timeline.md` | No |  |
| `documentation/guides/guide_donations.md` | No |  |
| `documentation/guides/guide_welcoming_robots.md` | No |  |

- [x] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [x] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [x] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [x] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [x] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [x] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
