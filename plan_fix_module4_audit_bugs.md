---
name: plan_fix_module4_audit_bugs
version: 1.0.0
module: 4.0 — Ranked Lists
status: complete
created: 2026-05-17
---

# Plan: plan_fix_module4_audit_bugs

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

Fix all confirmed bugs discovered during the Module 4.0 Ranked Lists audit. The bugs span the dashboard JavaScript files (Wikipedia and Challenge sub-modules) and affect score calculation logic, state management, API endpoint addressing, publish position indexing, pipeline timeout handling, and URL encoding. These fixes ensure the admin dashboard correctly calculates and publishes rankings, uses consistent API addressing, and handles asynchronous pipeline operations safely. The affected files are all within `js/4.0_ranked_lists/dashboard/`.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix inverted score calculation in challenge_list_display.js

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
- **Action:** At line 184, remove the `* (index + 1)` position multiplier from the `totalScore` formula. The sum of weight values IS the score — multiplying by position number rewards lower-ranked items. Also fix line 188 fallback to use a flat value (e.g. `totalScore = 0`) instead of `(index + 1) * 10`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T2 — Guard _challengeModuleState assignment to prevent clobbering

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`, `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`
- **Action:** On line 17 of both files, change the unconditional `window._challengeModuleState = { ... }` to a guarded assignment: `window._challengeModuleState = window._challengeModuleState || { ... }`. This prevents the second script from clobbering the first's state if both are loaded on the same page.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T3 — Fix 0-based position in challenge publish to 1-based

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js`
- **Action:** At line 316, change `position: index` to `position: index + 1` to match the 1-based convention used by `wikipedia_ranking_calculator.js` (line 145). The API and frontend expect 1-based rank positions.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T4 — Fix slug/id mismatch in wikipedia_search_terms.js

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_search_terms.js`
- **Action:** At line 137, change the fetch URL from `state.activeRecordId` to `encodeURIComponent(state.activeRecordSlug)` to match the guard on line 125 which checks `state.activeRecordSlug`. The Wikipedia module uses `activeRecordId` for internal state but `activeRecordSlug` for API addressing (matching the challenge module's resolved pattern from issue #15).
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T5 — Fix slug/id mismatch in wikipedia_weights.js

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_weights.js`
- **Action:** At line 211, change the fetch URL from `state.activeRecordId` to `encodeURIComponent(state.activeRecordSlug)` to match the guard on line 202 which checks `state.activeRecordSlug`. Same pattern as T4.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T6 — Add encodeURIComponent to wikipedia_sidebar_handler.js fetch URLs

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** At lines 21 and 267, wrap `state.activeRecordId` with `encodeURIComponent()` in the fetch URL construction. This prevents malformed requests if the ID contains special URL characters.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T7 — Remove Enter key preventDefault in challenge_weighting_handler.js

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
- **Action:** At line 372, remove the `e.preventDefault()` call. The search terms parser (line 449) splits by `[\n,]+` and `loadChallengeSearchTerms` (line 103) joins stored array values with `\n`. Blocking newline entry contradicts the system's own storage format. Users should be able to enter terms on individual lines as the parser expects. Keep the Enter keydown listener but let it trigger an immediate save without blocking the newline.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T8 — Add explicit status preservation to challenge response auto-save

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_response_status_handler.js`
- **Action:** At line 464-465, after `var payload = _collectEditorData();`, add `payload.status = window._challengeResponseModuleState.currentStatus || "draft";` to explicitly preserve the record's current status during auto-save. This prevents the API from potentially defaulting to draft when no status field is provided in the PUT body.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T9 — Replace fixed 3-second timeout with longer delay and status feedback in dashboard_wikipedia.js

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`
- **Action:** At lines 330-334, replace the `setTimeout(..., 3000)` after pipeline trigger with a 10-second timeout and add a `surfaceError("Pipeline running — list will refresh automatically...")` message before the timeout. This gives the pipeline adequate time and informs the user that a refresh is pending.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T10 — Replace fixed 3-second timeout in wikipedia_sidebar_handler.js recalculate

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js`
- **Action:** At lines 203-207, replace the `setTimeout(..., 3000)` with a 10-second timeout and add a `surfaceError("Recalculating — will refresh shortly...")` message before the timeout. Same pattern as T9.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T11 — Sync activeRecordId after metadata slug change in dashboard_challenge_academic.js

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js`
- **Action:** At line 232 where `state.activeRecordSlug = data.slug` is set after a successful save, also verify that `state.activeRecordId` remains the canonical identifier (the numeric ID from the database, not the slug). If `activeRecordId` is being used as a slug-based identifier elsewhere in the file, ensure all fetch URLs consistently use `encodeURIComponent(state.activeRecordSlug)` for the API path — matching the pattern already established at line 218.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

### T12 — Sync activeRecordId after metadata slug change in dashboard_challenge_popular.js

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js`
- **Action:** Same fix as T11 but for the popular module. Ensure all fetch URLs use `encodeURIComponent(state.activeRecordSlug)` consistently and that `activeRecordId` sync is correct after metadata saves that may change the slug.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment · Vanilla ES6+

- [x] Task complete

---

## Final Tasks

### T13 — Vibe-Coding Audit

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

### T14 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Score calculation in challenge_list_display.js produces correct values (higher-weighted items score higher)
- [ ] **Achievement**: Challenge publish uses 1-based positions matching Wikipedia publish convention
- [ ] **Achievement**: All Wikipedia auto-save functions use consistent slug-based API addressing with URL encoding
- [ ] **Achievement**: State clobbering between academic/popular modules is prevented by guarded assignment
- [ ] **Achievement**: Pipeline timeouts give adequate time and provide user feedback
- [ ] **Achievement**: Challenge response auto-save explicitly preserves record status
- [ ] **Symmetry**: Both academic and popular challenge dashboard files receive identical fixes (T2, T11/T12)
- [ ] **Necessity**: All 12 confirmed bugs have been resolved
- [ ] **Targeted Impact**: Only `js/4.0_ranked_lists/dashboard/` files were modified
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T15 — Module Guide Update

> Refactor the per-module guide files in `documentation/guides/4.0 Ranked Lists Module/` to match all changes made by this plan.

- **File(s):** All guide files in `documentation/guides/4.0 Ranked Lists Module/`.
- **Action:** For each guide file present in the module subfolder, cross-reference it against the source code and update to reflect this plan's changes (skip any that don't exist for this module):
  - **`guide_dashboard_appearance.md`** (if present): No structural changes to dashboard layouts — verify diagrams still match. No updates expected.
  - **`guide_frontend_appearance.md`** (if present): No structural changes to frontend layouts — verify diagrams still match. No updates expected.
  - **`guide_function.md`** (if present): Update the Wikipedia life cycle diagram's "CALCULATE BUTTON" section and Challenge life cycle "CALCULATE BUTTON" section to note that positions are 1-based. Update the Wikipedia "GATHER BUTTON" section to reflect the 10-second feedback timeout instead of implicit immediate refresh. Update the technical description paragraphs if any algorithmic details changed (score formula, timeout behavior).
  - **`ranked_lists_nomenclature.md`** (if present): Verify the "Final Rank" term definition still matches the corrected algorithm. No new terms introduced by this plan.
  - **Version bump**: Increment `version` in every modified guide's YAML frontmatter.

  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [ ] All ASCII diagrams in module guides match current source code
- [ ] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [ ] Nomenclature file covers all terms used in module source files
- [ ] Version numbers bumped on all modified guide files
- [ ] No stale references to files or logic changed by this plan

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
