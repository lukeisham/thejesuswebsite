---
name: plan_fix_module5_audit_bugs
version: 1.0.0
module: 5.0 — Essays & Responses
status: draft
created: 2026-05-16
---

# Plan: plan_fix_module5_audit_bugs

## Purpose

> Fix all 11 bugs discovered during the Module 5.0 (Essays & Responses) audit. Three critical bugs — a missing CSS visibility class causing bibliography sections to never display, a missing `type` discriminator on challenge response saves, and an XSS vulnerability in bibliography rendering — are addressed first. Five high/medium bugs follow: silent data loss on corrupted JSON, missing cascade delete on `challenge_id` FK, missing CSS class definitions for bibliography entries and essay body links, and a stale copy-paste comment. Three low-severity bugs round out the plan: a race condition on sidebar highlight timing, duplicated utility functions across frontend files, and an API inconsistency note for the historiography list endpoint.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix `is-visible-block` CSS class in bibliography display

- **File(s):** `js/5.0_essays_responses/frontend/sources_biblio_display.js`
- **Action:** Replace all four occurrences of `is-visible-block` with `is-visible` (lines 19, 60, 64, 70). The class `is-visible-block` does not exist in `css/1.0_foundation/grid.css` — only `is-visible`, `is-visible-flex`, and `is-visible-grid` are defined. This bug causes the bibliography container to never become visible.
- **Vibe Rule(s):** 1 function per JS file · vanilla ES6+

- [ ] Task complete

---

### T2 — Add missing `type` field to challenge response payload

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`
- **Action:** In `_collectEditorData()` (line 354), add `type: "challenge_response"` to the payload object. Currently the payload only has `title` and `body` — the essay equivalent in `document_status_handler.js` correctly includes a `type` field via `typeMap[mode]`. Without this, PUT requests may fail to set the type discriminator or silently corrupt the record type.
- **Vibe Rule(s):** 1 function per JS file · vanilla ES6+

- [ ] Task complete

---

### T3 — Fix XSS vulnerability in bibliography rendering

- **File(s):** `js/5.0_essays_responses/frontend/sources_biblio_display.js`
- **Action:** HTML-escape all bibliography entries before injecting via `innerHTML`. On lines 40, 43, and 53, wrap each value with an `escapeHtml()` function call. Add a local `escapeHtml()` helper at the top of the file (matching the pattern in `view_context_essays.js:496`) that escapes `&`, `<`, `>`, and `"` characters. This prevents stored XSS if bibliography JSON contains HTML or script tags.
- **Vibe Rule(s):** 1 function per JS file · vanilla ES6+ · no inline scripts

- [ ] Task complete

---

### T4 — Log corrupted parent responses JSON instead of silent reset

- **File(s):** `admin/backend/routes/responses.py`
- **Action:** In the response creation handler (around line 76-80), replace the silent `except (json.JSONDecodeError, TypeError): response_list = []` with a block that logs the corruption via `logging.warning()` including the parent slug and the raw corrupted value, then still falls back to `[]`. Import `logging` at the top of the file if not already imported. This preserves the current behavior (no breaking change) but makes the data loss visible in server logs.
- **Vibe Rule(s):** Readability first · document API quirks and data anomalies

- [ ] Task complete

---

### T5 — Add application-level cascade delete for challenge responses

- **File(s):** `admin/backend/routes/records.py`
- **Action:** In the DELETE `/api/admin/records/{record_id}` handler, before deleting the target record, check if the record being deleted has `type` in (`challenge_academic`, `challenge_popular`). If so, execute a secondary DELETE to remove all records where `challenge_id` matches the target record's `id`. This ensures child challenge responses are cleaned up when a parent challenge is deleted, since the SQLite FK `challenge_id` lacks `ON DELETE CASCADE`. Add a log message noting the cascade count.
- **Vibe Rule(s):** Readability first · explicit self-documenting code · stateless and safe to run repeatedly

- [ ] Task complete

---

### T6 — Add missing `.biblio-entry` CSS to essays and responses stylesheets

- **File(s):** `css/5.0_essays_responses/frontend/essays.css`, `css/5.0_essays_responses/frontend/responses.css`
- **Action:** Add a `.biblio-entry` rule to both files with `padding-left: 2em; text-indent: -2em; margin-bottom: 0.5em;` (MLA hanging-indent format). Currently `.biblio-entry` is only defined in `css/2.0_records/frontend/detail_view.css`, which is not included by essay or response HTML pages. Copy the exact same rule values from `detail_view.css:132` to maintain visual consistency.
- **Vibe Rule(s):** CSS variables for colors/fonts/spacing · section headings as comments · no frameworks

- [ ] Task complete

---

### T7 — Add missing `.essay-body__link` CSS class

- **File(s):** `css/5.0_essays_responses/frontend/essays.css`
- **Action:** Add a `.essay-body__link` rule with `color: var(--color-accent-primary); text-decoration: underline;` and a hover state. This class is used by the markdown link converter in `view_context_essays.js:447` and `view_historiography.js:416` but is currently undefined, causing links in essays to render with default browser styling.
- **Vibe Rule(s):** CSS variables for colors/fonts/spacing · section headings as comments · no frameworks

- [ ] Task complete

---

### T8 — Fix stale copy-paste comment

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`
- **Action:** On line 416, change the comment `// Collect context links from shared tool` to `// Return assembled payload` (or remove it entirely). The current comment is a copy-paste artifact from the context links block at line 380 and is misleading — it sits above `return payload;`.
- **Vibe Rule(s):** 1 function per JS file · vanilla ES6+

- [ ] Task complete

---

### T9 — Fix race condition on sidebar highlight after new essay creation

- **File(s):** `js/5.0_essays_responses/dashboard/dashboard_essay.js`
- **Action:** Replace the fixed 100ms `setTimeout` at line 258 with a `requestAnimationFrame` wrapper or a brief `setTimeout(fn, 0)` that fires after the DOM paint from the awaited `displayEssayHistoriographyList()`. The current 100ms delay may fire before the sidebar DOM has rendered, silently failing to highlight the new item. Use `requestAnimationFrame(function() { requestAnimationFrame(function() { ... }); })` (double-rAF) to guarantee the sidebar has painted.
- **Vibe Rule(s):** 1 function per JS file · vanilla ES6+

- [ ] Task complete

---

### T10 — Remove duplicated escapeHtml/escapeAttr from essay frontend files

- **File(s):** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js`, `frontend/pages/context_essay.html`
- **Action:** (a) In `context_essay.html`, add `<script src="../../js/9.0_cross_cutting/frontend/html_utils.js"></script>` before the `view_context_essays.js` script tag. (b) In `view_context_essays.js`, remove the local `escapeHtml()` (line 496) and `escapeAttr()` (line 505) definitions — they are now provided by `html_utils.js`. Keep `formatEssayDate()` (line 477) which is unique to this file. (c) In `view_historiography.js`, remove `escapeHtmlHist()` (line 465) and `escapeAttrHist()` (line 474), replacing all call sites with `escapeHtml()` and `escapeAttr()` from `html_utils.js`. Also remove `formatDateHist()` (line 446) and replace call sites with `formatDate()` from `html_utils.js` (verify the output format matches first — if `formatDateHist` differs, keep it). Confirm `historiography.html` already includes `html_utils.js`.
- **Vibe Rule(s):** Semantic HTML5 tags · no inline scripts · 1 function per JS file · vanilla ES6+ · Cross-Plan Shared-Tool Ownership (§7)

- [ ] Task complete

---

### T11 — Document historiographical_essay public API inconsistency

- **File(s):** `documentation/guides/5.0 Essays & Responses Module/guide_function.md`
- **Action:** In the Essay Life Cycle diagram's "Public API" box, add a note: `historiographical_essay excluded from /api/public/essays list (singleton served via /api/public/essays/historiography only)`. This documents the intentional design decision that the historiography singleton has its own dedicated endpoint and does not appear in the general essays list. No code change needed — this is documentation-only.
- **Vibe Rule(s):** Source-of-Truth Discipline

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

- [ ] **Achievement**: All 3 critical bugs fixed — bibliography visibility, challenge response type field, XSS escaping
- [ ] **Achievement**: All 2 high-severity bugs fixed — corrupted JSON logging, cascade delete for orphaned responses
- [ ] **Achievement**: All 3 medium-severity bugs fixed — biblio-entry CSS, essay-body__link CSS, stale comment
- [ ] **Achievement**: All 3 low-severity bugs fixed — race condition, duplicate utilities, API documentation
- [ ] **Necessity**: The Module 5.0 audit findings have been fully addressed
- [ ] **Targeted Impact**: Only Module 5.0 (Essays & Responses) files and their direct dependencies (Module 4.0 challenge response, shared cross-cutting utilities) were modified
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T14 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

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
| `documentation/detailed_module_sitemap.md` | No | No new files created or moved |
| `documentation/simple_module_sitemap.md` | No | No module scope change |
| `documentation/site_map.md` | No | No new files created |
| `documentation/data_schema.md` | No | No schema changes (cascade delete is application-level, not DDL) |
| `documentation/vibe_coding_rules.md` | No | No shared-tool ownership changes |
| `documentation/style_mockup.html` | No | No layout changes |
| `documentation/git_vps.md` | No | No deployment changes |
| `documentation/guides/guide_appearance.md` | No | No public page layout changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | No dashboard layout changes |
| `documentation/guides/guide_function.md` | No | No new data flows (T11 updates the module-level guide instead) |
| `documentation/guides/guide_security.md` | Yes | Note the XSS fix in `sources_biblio_display.js` (T3): bibliography entries are now HTML-escaped before innerHTML injection. Add a brief entry under input validation noting that all user-generated content rendered via innerHTML must be escaped. |
| `documentation/guides/guide_style.md` | Yes | Add `.biblio-entry` and `.essay-body__link` as canonical CSS patterns in the Module 5.0 section, with their CSS variable references and the rationale for duplicating `.biblio-entry` from `detail_view.css`. |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO changes |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan

---

### T15 — Module Guide Update

> Update the per-module guide files in `documentation/guides/` to reflect all changes made by this plan.
> This is a **mandatory task** — the module guides must stay in sync with the source code.

- **File(s):** All guide files in `documentation/guides/5.0 Essays & Responses Module/`.
- **Action:** For each guide file in the module subfolder:
  - **`guide_frontend_appearance.md`**: No layout changes — verify diagrams still match after T10 (html_utils.js inclusion). No update expected.
  - **`guide_function.md`**: Add the historiography API note from T11. Verify the Essay Life Cycle and Challenge Response Life Cycle diagrams still match the codebase after T2 (type field fix) and T5 (cascade delete). Bump version.
  - **`essays_responses_nomenclature.md`**: Add `escapeHtml` (shared, from `html_utils.js`), `is-visible` (CSS visibility toggle class), `.biblio-entry` (MLA hanging-indent), and `.essay-body__link` (essay body hyperlink) if not already present. Remove any entries for `is-visible-block` if listed. Bump version.
  - **Version bump**: Increment `version` in every modified guide's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [ ] All ASCII diagrams in module guides match current source code
- [ ] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [ ] Nomenclature file covers all terms used in module source files
- [ ] Version numbers bumped on all modified guide files

---

### T16 — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
