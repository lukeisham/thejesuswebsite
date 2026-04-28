---
name: fix_timeline_display_module_3_2
version: 1.0.0
module: 3.0 — Visualizations Module
status: draft
created: 2026-04-28
---

# Plan: fix_timeline_display_module_3_2

## Purpose

> **Fix the public Timeline display module (`timeline_display.js`) which has several data-integrity and categorization bugs.** The module currently uses fake lane-assignment logic (`i % 5 === 0` for secular events, hardcoded string checks for prophecy), includes records with null or unrecognised `timeline` values that receive random X coordinates, and hard-codes the initial era scroll position. This plan replaces all artificial lane logic with real `gospel_category`-driven assignment, adds timeline-stage validation to skip invalid records, and derives the initial era index from actual data — without introducing any new admin views, API endpoints, or sidebar entries.

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — Fix lane categorization in `timeline_display.js`

- **File(s):** `frontend/display_other/timeline_display.js`
- **Action:** Replace the fake lane-assignment logic — `i % 5 === 0` for the secular lane, the hardcoded `r.era === 'OldTestament'` / `r.timeline.includes('Prophecy')` check for the prophecy lane, and the blanket `r.lane = 'biblical'` fallback — with real data-driven categorization derived from the `gospel_category` field. Map `event` → `biblical` lane, `person` / `theme` → `secular` lane, and detect prophecy-stage records by checking whether `r.timeline` starts with `"OldTestament"` or equals `"PreIncarnation"`. Preserve the three-lane SVG layout (prophecy top, biblical middle, secular bottom).
- **Vibe Rule(s):** 1 function/file · ES6+ · 3-line comment header · Vanilla JS

- [ ] Task complete

---

### T2 — Add timeline-stage validation in `timeline_display.js`

- **File(s):** `frontend/display_other/timeline_display.js`
- **Action:** Before inserting a record into the render pipeline, validate that its `timeline` value is present (non-null, non-empty) and exists in the `TIMELINE_STAGES` array. Skip records that fail validation with a `console.warn` message. Remove the `getXForTimelineStage` fallback that assigns a random X position (`startX + (Math.random() * 1000)`) for unknown stages — unrecognised values should cause the record to be skipped entirely so the timeline does not render phantom dots.
- **Vibe Rule(s):** 1 function/file · ES6+ · 3-line comment header · Vanilla JS

- [ ] Task complete

---

### T3 — Derive initial era index from actual data in `timeline_display.js`

- **File(s):** `frontend/display_other/timeline_display.js`
- **Action:** Replace the hardcoded `let currentEraIndex = 10` (which assumes Galilee Ministry) with a computed initial index derived from the loaded record set. Find the earliest timeline stage present in the data and set `currentEraIndex` to its position in `TIMELINE_STAGES`, or default to `0` if no records are loaded. This ensures the timeline opens at the earliest chronological record rather than a hardcoded midpoint.
- **Vibe Rule(s):** 1 function/file · ES6+ · 3-line comment header · Vanilla JS

- [ ] Task complete

---

### T4 — Clean up unused or dead code paths in `timeline_display.js`

- **File(s):** `frontend/display_other/timeline_display.js`
- **Action:** Remove the commented-out placeholder block above the era-navigation wiring, and remove any dead code branches exposed by the lane-logic and validation fixes (e.g. the `r.lane = 'biblical'` blanket fallback, the random-X fallback in `getXForTimelineStage`). Consolidate the `records.forEach` categorisation loop so it assigns the lane in a single pass without post-hoc overrides.
- **Vibe Rule(s):** 1 function/file · ES6+ · 3-line comment header · Vanilla JS

- [ ] Task complete

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] No HTML files are created or modified by this plan

### CSS
- [ ] No CSS files are created or modified by this plan

### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

### Python
- [ ] No Python files are created or modified by this plan

### SQL / Database
- [ ] No SQL files are created or modified by this plan

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `frontend/display_other/timeline_display.js` | 3.0 — Visualizations | Yes | Update entry (lane logic, validation, initial index changed) |

### Sitemap Integrity Checks
- [ ] No new files were added — sitemap structure is unchanged
- [ ] No existing sitemap entries were broken or made stale by this plan
- [x] `detailed_module_sitemap.md` version number does NOT need incrementing (no structural change)

---

## Module Impact Audit

> Using `documentation/detailed_module_sitemap.md` as the reference, check whether this plan's changes affect other files or functionality **within the same module**, and whether any **connected or dependent modules** are impacted. A null result is valid — but the check must always be completed and shown.

### Intra-Module Check — Module 3.0: Visualizations Module

> Every other file in this module that is NOT being touched by this plan. Assess whether the plan's changes (schema shifts, shared CSS variables, JS event listeners, API contract changes, etc.) could affect each.

| File | Potentially Affected? | Reason / Null |
|------|-----------------------|---------------|
| `frontend/pages/maps.html` + sub-pages | No | No impact identified |
| `frontend/pages/timeline.html` | No | HTML skeleton references `timeline_display.js` but the rendering contract (function names, SVG element IDs, data attributes) is unchanged — only internal logic is rewritten |
| `frontend/pages/evidence.html` | No | No impact identified |
| `frontend/display_big/ardor_display.js` | No | No impact identified |
| `frontend/display_other/maps_display.js` | No | No impact identified |
| `css/elements/ardor_diagram.css` | No | No impact identified |
| `css/elements/timeline_diagram.css` | No | CSS class names used by the timeline (`timeline-node`, `timeline-node-item`, `lane-*`) are preserved — lane values stay the same (`prophecy`, `biblical`, `secular`) |
| `css/elements/map_diagram.css` | No | No impact identified |
| `admin/frontend/edit_modules/edit_diagram.js` | No | No impact identified |

### Cross-Module Check

> Modules that are architecturally connected to Module 3.0 per the System Architecture diagram in `detailed_module_sitemap.md`. Assess whether this plan's changes ripple into each.

| Module | Potentially Affected? | Reason / Null |
|--------|-----------------------|---------------|
| 1.0 — Foundation Module | No | No shared CSS variables, JS globals, or injected components affected |
| 2.0 — Records Module | No | `timeline_display.js` reads the `records` table through the existing WASM sql.js query — no schema changes, no API changes, no column contract changes |
| 4.0 — Ranked Lists Module | No | No impact identified |
| 5.0 — Essays Module | No | No impact identified |
| 6.1 — Admin Portal (Sub-Module) | No | No admin code is created or modified by this plan |
| 6.2 — System Core & DevOps | No | No impact identified |
| SQLite Database | No | No schema changes — the existing `idx_records_timeline` index is sufficient |

### Module Impact Summary
- [x] Intra-module check completed — all other files in Module 3.0 reviewed
- [x] Cross-module check completed — all architecturally connected modules reviewed
- [x] Impact result: **Null — no downstream impact identified** (the plan is entirely self-contained within `timeline_display.js`; no other files or modules are affected)

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No structural changes — no files added, moved, or renamed |
| `documentation/simple_module_sitemap.md` | No | High-level module scope unchanged |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No new DB tables or columns introduced |
| `documentation/vibe_coding_rules.md` | No | No rules need clarification |
| `documentation/style_mockup.html` | No | No new page layouts |
| `documentation/git_vps.md` | No | No deployment or workflow changes |
| `documentation/guides/guide_appearance.md` | No | Public-facing UI unchanged (internal JS logic only) |
| `documentation/guides/guide_dashboard_appearance.md` | No | No admin UI or dashboard code touched |
| `documentation/guides/guide_function.md` | **Yes** | §3.2 Timeline data flow needs updating to reflect the corrected lane categorization logic (gospel_category-driven instead of artificial modulo/hardcoded checks) and the removal of the random-X fallback |
| `documentation/guides/guide_security.md` | No | No auth, session, or rate-limiting changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns introduced |
| `documentation/guides/guide_maps.md` | No | Maps not touched |
| `documentation/guides/guide_timeline.md` | **Yes** | Document the corrected lane-assignment rules (event → biblical, person/theme → secular, OldTestament/PreIncarnation → prophecy), the timeline-stage validation that skips invalid records, and the data-derived initial era index |
| `documentation/guides/guide_donations.md` | No | Not touched |
| `documentation/guides/guide_welcoming_robots.md` | No | Not touched |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present