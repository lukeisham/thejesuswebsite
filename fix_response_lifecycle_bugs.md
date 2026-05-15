---
name: fix_response_lifecycle_bugs
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-15
---

# Plan: fix_response_lifecycle_bugs

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Fix 7 bugs in the challenge response lifecycle that prevent response body content from being saved or loaded, leave the `type` discriminator unset on creation, and display raw UUIDs instead of human-readable challenge titles on the frontend. These bugs affect the dashboard response editor (creation, save, load), the backend API routes, and both public frontend display pages. Without these fixes, response content is silently lost on every save.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Set type discriminator on response creation

- **File(s):** `admin/backend/routes/responses.py`
- **Action:** Add `type` column with value `'challenge_response'` to the INSERT statement in `create_response()` (line ~58-68). The column list and VALUES placeholder both need the new field.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable · snake_case fields

- [ ] Task complete

---

### T2 — Fix save/publish to use `body` instead of `markdown_content`

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`
- **Action:** In `_collectEditorData()` (line ~354-357), change `markdown_content: textarea ? textarea.value : ""` to `body: textarea ? textarea.value : ""`. Also update the publish validation (line ~191) to check `payload.body` instead of `payload.markdown_content`.
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T3 — Fix content loader to read `body` field

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_load_content.js`
- **Action:** Change line ~57 from `doc.markdown_content || doc.content || ""` to `doc.body || doc.content || ""` so the editor loads the correct field from the API response.
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T4 — Add type filter to admin response list endpoint

- **File(s):** `admin/backend/routes/responses.py`
- **Action:** In `get_responses()` (line ~118-126), change the WHERE clause from `challenge_id IS NOT NULL` to `(type = 'challenge_response' OR challenge_id IS NOT NULL)` to use the type discriminator with legacy fallback.
- **Vibe Rule(s):** Explicit readable logic · Stateless/repeatable

- [ ] Task complete

---

### T5 — Fix frontend response display to show parent challenge title

- **File(s):** `js/5.0_essays_responses/frontend/response_display.js`
- **Action:** After fetching the response, make a second fetch to `/api/public/challenges` or `/api/public/records/{challenge_id}` to resolve the parent challenge's title. Replace the raw UUID display at lines ~69 and ~132 with the resolved title. If the title fetch fails, fall back to the existing UUID display.
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T6 — Fix response list view to show parent challenge title

- **File(s):** `js/5.0_essays_responses/frontend/list_view_responses.js`
- **Action:** After fetching responses, collect all unique `challenge_id` values and batch-resolve their titles. Replace the raw UUID display at line ~81 with the resolved title. If resolution fails for a given ID, fall back to displaying the UUID.
- **Vibe Rule(s):** 1 function per file · 3-line header comment · Vanilla ES6+

- [ ] Task complete

---

### T7 — Update plan_issues.md

- **File(s):** `plan_issues.md`
- **Action:** Append issues #18-24 (the 7 bugs found in this audit) to the Issue Table with status "Resolved". Add resolution notes referencing this plan.
- **Vibe Rule(s):** Source-of-Truth Discipline

- [ ] Task complete

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

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [ ] **Achievement**: Response body content is correctly saved to the `body` column and loaded back into the editor
- [ ] **Achievement**: New response records are created with `type = 'challenge_response'`
- [ ] **Achievement**: Frontend displays human-readable challenge titles instead of raw UUIDs
- [ ] **Achievement**: Admin list endpoint uses type discriminator with legacy fallback
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T10 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added or renamed |
| `documentation/simple_module_sitemap.md` | No | No module scope changes |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No schema changes — existing `type` and `body` columns already documented |
| `documentation/vibe_coding_rules.md` | No | No shared-tool ownership changes |
| `documentation/style_mockup.html` | No | No visual layout changes |
| `documentation/git_vps.md` | No | No deployment changes |
| `documentation/guides/guide_appearance.md` | No | No public page layout changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard layout changes |
| `documentation/guides/guide_function.md` | No | Bug fixes only — no new pipelines or flows |
| `documentation/guides/guide_security.md` | No | No auth or security changes |
| `documentation/guides/guide_style.md` | No | No new CSS patterns |
| `documentation/guides/guide_maps.md` | No | Not related |
| `documentation/guides/guide_timeline.md` | No | Not related |
| `documentation/guides/guide_donations.md` | No | Not related |
| `documentation/guides/guide_welcoming_robots.md` | No | Not related |

- [ ] **All site-map documents updated:** N/A — no new files
- [ ] **All ASCII diagrams updated:** N/A — no layout changes
- [ ] **Style guide updated:** N/A — no new CSS patterns
- [ ] **Shared-tool ownership documented:** N/A — no shared tool changes
- [ ] **Version numbers bumped:** N/A — no documentation modified
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
