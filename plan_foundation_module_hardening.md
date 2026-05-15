---
name: plan_foundation_module_hardening
version: 1.0.0
module: 1.0 — Foundation
status: draft
created: 2026-05-15
---

# Plan: plan_foundation_module_hardening

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan fixes all issues discovered during a full review of the Foundation Module (1.0). It addresses critical bugs (missing CSS loading, placeholder content, typos), accessibility failures (missing focus states, keyboard navigation gaps), CSS quality issues (duplicate rules, hard-coded values breaking the 8px grid, inconsistent breakpoints, dead code), JavaScript robustness issues (event listener cleanup, XSS vectors, error isolation), and documentation gaps (missing CSS files in the sitemap). The work spans every file in `css/1.0_foundation/`, `js/1.0_foundation/frontend/`, `index.html`, `frontend/pages/about.html`, and the Foundation Module documentation guides. No new files are created; all changes are edits to existing files.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix critical HTML bugs in index.html

- **File(s):** `index.html`
- **Action:** Fix typo "ressurection" → "resurrection" on line 51 (`data-page-description`). Remove stray `s` character on line 95 (inside `<figure>` closing area).
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id`/`class` hooks

- [ ] Task complete

---

### T2 — Fix critical HTML bugs in about.html

- **File(s):** `frontend/pages/about.html`
- **Action:** Fix typo "rehotical" → "rhetorical" on line 96. Replace `[EMAIL_ADDRESS]` placeholder on line 118 with a real mailto link (use `luke.isham@gmail.com`). Fix or remove the dead `/donate.html` link on line 124 (replace with a placeholder paragraph noting donations are not yet available). Add missing `<link rel="stylesheet" href="../../css/1.0_foundation/sidebar.css">` to the `<head>` so the injected sidebar renders correctly.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Descriptive `id`/`class` hooks

- [ ] Task complete

---

### T3 — Wire data-ai-subject through initializer.js and header.js

- **File(s):** `js/1.0_foundation/frontend/initializer.js`, `js/1.0_foundation/frontend/header.js`
- **Action:** In `initializer.js`, read `data-ai-subject` from `<body>` and pass it into the `injectPageMetadata()` config object. In `header.js`, replace the hardcoded `ai:subject` meta value with `config.aiSubject` (falling back to the current hardcoded value if not provided). This makes the per-page `data-ai-subject` attributes on `index.html` and `about.html` functional.
- **Vibe Rule(s):** 1 function per file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T4 — Add error isolation to initializer.js

- **File(s):** `js/1.0_foundation/frontend/initializer.js`
- **Action:** Wrap each of the four injector calls (injectPageMetadata, injectSidebar, injectSearchHeader, injectFooter) in individual try-catch blocks so that a failure in one does not prevent the others from running. Log caught errors with `console.error`.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T5 — Harden header.js querySelector and add URL validation

- **File(s):** `js/1.0_foundation/frontend/header.js`
- **Action:** In `setMeta()`, escape the `name` parameter before interpolating into the querySelector template literal (guard against quote characters breaking the selector). Add basic URL format validation for `config.canonical` and `config.ogImage` — if invalid, fall back to defaults.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T6 — Fix XSS vector and add focus management in sidebar.js

- **File(s):** `js/1.0_foundation/frontend/sidebar.js`
- **Action:** Replace template literal HTML generation for `tocItems` (line 62-68) with `createElement()`/`textContent` to prevent XSS if tocItems data is ever user-supplied. Add focus management: in `openSidebar()`, move focus to the first sidebar nav link; in `closeSidebar()`, return focus to the element that triggered the open. Add re-injection guard at the top of `injectSidebar()` — if `#site-sidebar` already exists, remove it and its event listeners before re-injecting.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T7 — Add re-injection guard and use textContent in footer.js

- **File(s):** `js/1.0_foundation/frontend/footer.js`
- **Action:** Add a re-injection guard at the top of `injectFooter()` — if `#site-footer` already exists, remove it before re-injecting (prevents duplicate event listeners). Replace `mainEl.innerText` with `mainEl.textContent` on line 125 for better cross-browser support.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T8 — Consolidate keydown listeners in search_header.js

- **File(s):** `js/1.0_foundation/frontend/search_header.js`
- **Action:** Merge the two separate `keydown` listeners (lines 69 and 83) into a single listener with an if/else-if for Enter and Escape. Add a re-injection guard at the top of `injectSearchHeader()` — if `#site-header` already exists, remove it before re-injecting.
- **Vibe Rule(s):** 1 function per file · Vanilla ES6+ · Component injection

- [ ] Task complete

---

### T9 — Fix focus states in forms.css

- **File(s):** `css/1.0_foundation/frontend/forms.css`
- **Action:** Replace `input[type="range"]:focus { outline: none }` with a visible focus indicator (use `box-shadow: 0 0 0 2px var(--color-accent-primary)`). Add `:focus` fallback styles for `input[type="checkbox"]` and `input[type="radio"]` (not just `:focus-visible`). Add `select:disabled` styling (`opacity: 0.5; pointer-events: none; background-image: none`). Add visible focus state for `select:focus` matching the site's standard focus ring.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T10 — Add :focus-visible states to sidebar.css and landing.css

- **File(s):** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/landing.css`
- **Action:** In `sidebar.css`, add `:focus-visible` state to `.site-sidebar__nav li a` matching the existing `:hover` styling (Oxblood border-left, text colour change). In `landing.css`, add `:focus-visible` state to `.hero__links li a` matching the existing `:hover` styling.
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T11 — Make admin cards keyboard accessible

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** Add `.admin-card:focus-visible` styling matching the existing `:hover` state (Oxblood border, shadow). Add `.module-tab:disabled` styling (`opacity: 0.5; pointer-events: none; cursor: not-allowed`).
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T12 — Remove duplicate CSS rules from grid.css

- **File(s):** `css/1.0_foundation/grid.css`
- **Action:** Remove the duplicate `.site-sidebar__brand` definition (around line 257) — keep the authoritative version in `sidebar.css`. Remove the duplicate `.site-footer__legal-text` and `.site-footer__licence-link` definitions (around lines 377-383) — keep the authoritative versions in `footer.css`. Verify the remaining grid.css rules are structural only (display, grid-area, width, height) and not presentational.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T13 — Replace hard-coded values with design tokens

- **File(s):** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/footer.css`, `css/1.0_foundation/frontend/buttons.css`, `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** In `sidebar.css`: replace `29px` margin (line 62) with `var(--space-3)` (24px); replace `6px` padding (line 112) with `var(--space-1)` (8px); replace `10px` font-size (line 190) with `var(--text-xs)`. In `footer.css`: replace `4px` padding (line 66) with `var(--space-1)` (8px). In `buttons.css`: replace `10px` badge font-size (line 128) with `var(--text-xs)`. In `admin_components.css`: define `--tab-bar-height: 40px` token and reference it for `#module-tab-bar` height.
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T14 — Standardise responsive breakpoints

- **File(s):** `css/1.0_foundation/footer.css`, `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** In `footer.css`, change the `@media (max-width: 800px)` breakpoint to `@media (max-width: 1024px)` to align with the standard breakpoint used in `grid.css`, `landing.css`, and `sidebar.css`. In `admin_components.css`, change `@media (max-width: 900px)` to `@media (max-width: 1024px)` and `@media (max-width: 600px)` to `@media (max-width: 640px)` to match the standard set.
- **Vibe Rule(s):** CSS Grid for macro layout · CSS variables from `typography.css` · No frameworks

- [ ] Task complete

---

### T15 — Remove dead code and unused tokens

- **File(s):** `css/1.0_foundation/frontend/buttons.css`, `css/1.0_foundation/typography.css`
- **Action:** In `buttons.css`, remove the entire `.btn-skewed` rule block (duplicate of `.btn-primary`, marked as legacy). In `typography.css`, remove the `--color-dash-border-strong` token (never consumed by any CSS file). Optionally add a comment on `--color-dash-accent` noting it aliases `--color-accent-primary`.
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T16 — Fix admin_shell.css bugs

- **File(s):** `css/1.0_foundation/dashboard/admin_shell.css`
- **Action:** Add `overflow: hidden` to `.error-footer__message` (required for `text-overflow: ellipsis` to work). Add `pointer-events: none` to `#admin-canvas.is-loading::before` (prevent user interaction with content behind the loading overlay).
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T17 — Fix miscellaneous CSS issues

- **File(s):** `css/1.0_foundation/pictures.css`, `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/frontend/buttons.css`
- **Action:** In `pictures.css`, change `.picture-frame` border colour from `var(--color-black)` to `var(--color-text-primary)` to align with the site's Charcoal Ink aesthetic (not pure black). In `sidebar.css`, change `backdrop-filter: blur(1px)` to `backdrop-filter: blur(4px)` for a perceptible blur effect. In `buttons.css`, change `.list-row` hover from `border-left-width: 4px` to `box-shadow: inset 4px 0 0 var(--color-accent-primary)` to prevent content shifting.
- **Vibe Rule(s):** CSS variables from `typography.css` · Section comments · No frameworks

- [ ] Task complete

---

### T18 — Update detailed_module_sitemap.md with missing Foundation CSS files

- **File(s):** `documentation/detailed_module_sitemap.md`
- **Action:** The Foundation Module CSS file tree (lines 68-77) is missing 6 files: `shell.css`, `grid.css`, `sidebar.css`, `footer.css`, `landing.css`, `pictures.css`, `thumbnails.css`. Add them to the file tree under `css/1.0_foundation/` with appropriate description comments. Bump the frontmatter version.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check

- [ ] Task complete

---

## Final Tasks

### T19 — Vibe-Coding Audit

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
- [ ] N/A — no Python files modified in this plan

#### SQL / Database
- [ ] N/A — no SQL files modified in this plan

---

### T20 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: All critical bugs fixed (missing sidebar CSS in about.html, placeholder content replaced, typos corrected, dead data-ai-subject attributes wired up)
- [ ] **Achievement**: All accessibility failures resolved (focus states on forms/sidebar/hero/admin cards, keyboard navigation for sidebar, disabled state for select/tabs)
- [ ] **Achievement**: All CSS quality issues addressed (duplicate rules removed, hard-coded values tokenised, breakpoints standardised, dead code removed)
- [ ] **Achievement**: All JS robustness issues resolved (error isolation in initializer, XSS vector fixed in sidebar, event listener cleanup via re-injection guards, consolidated keydown listeners)
- [ ] **Achievement**: Documentation gaps closed (missing CSS files added to sitemap)
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: Only Foundation Module (1.0) files have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in Tasks were created or modified

---

### T21 — Documentation Update

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
| `documentation/detailed_module_sitemap.md` | Yes | Already handled in T18 — add missing Foundation CSS files (shell.css, grid.css, sidebar.css, footer.css, landing.css, pictures.css, thumbnails.css) to the 1.0 CSS file tree. Bump version. |
| `documentation/simple_module_sitemap.md` | No | No module scope or high-level structure change. |
| `documentation/site_map.md` | No | No new files created — all changes are edits to existing files. |
| `documentation/data_schema.md` | No | No database changes. |
| `documentation/vibe_coding_rules.md` | No | No new shared tools or ownership changes. Existing rules are sufficient. |
| `documentation/style_mockup.html` | No | No new page layouts introduced. |
| `documentation/git_vps.md` | No | No deployment or VPS config changes. |
| `documentation/guides/guide_appearance.md` | No | The per-module guide (`documentation/guides/1.0 Foundation Module/guide_frontend_appearance.md`) is handled in T22. The root-level `guide_appearance.md` is not affected. |
| `documentation/guides/guide_dashboard_appearance.md` | No | Admin shell CSS changes (T16) are bug fixes, not layout changes. No ASCII diagram updates needed. |
| `documentation/guides/guide_function.md` | No | The per-module guide (`documentation/guides/1.0 Foundation Module/guide_function.md`) is handled in T22. The root-level `guide_function.md` is not affected. |
| `documentation/guides/guide_security.md` | Yes | Note the XSS fix in sidebar.js (T6: tocItems now uses createElement/textContent instead of template literals) and the querySelector escaping in header.js (T5). |
| `documentation/guides/guide_style.md` | No | No new BEM namespaces or design tokens introduced — existing tokens are reused. |
| `documentation/guides/guide_maps.md` | No | No map changes. |
| `documentation/guides/guide_timeline.md` | No | No timeline changes. |
| `documentation/guides/guide_donations.md` | No | No donation flow changes (the dead `/donate.html` link was replaced with a placeholder paragraph, not a new flow). |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, robots.txt, or AI-accessibility changes (the `data-ai-subject` wiring is an internal improvement, not a new directive). |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` file trees reflect every new/moved/renamed file; `simple_module_sitemap.md` updated if module scope changed; `site_map.md` master tree updated and version bumped
- [ ] **All ASCII diagrams updated:** any `guide_dashboard_appearance.md` or `guide_appearance.md` layout diagrams reflect the new component placement; any `guide_function.md` logic-flow diagrams document the new pipeline or data flow
- [ ] **Style guide updated:** `guide_style.md` includes any new BEM namespace, CSS pattern, or design token introduced by this plan
- [ ] **Shared-tool ownership documented:** `vibe_coding_rules.md` §7 table updated if a new shared tool was created or an existing tool's ownership or consumer list changed
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan

---

### T22 — Module Guide Update

> Update the per-module guide files in `documentation/guides/` to reflect all changes made by this plan.
> This is a **mandatory task** — the module guides must stay in sync with the source code.

- **File(s):** All guide files in `documentation/guides/1.0 Foundation Module/`.
- **Action:** For each guide file in the module subfolder:
  - **`guide_frontend_appearance.md`**: Verify all ASCII diagrams still match source code after changes. The search header DOM structure diagram (§1.7.1) should reflect the consolidated keydown listener from T8. The footer component anatomy table (§1.5.1) should still be accurate after T7/T12.
  - **`guide_function.md`**: Update the bootstrap lifecycle diagram (§1.0) to reflect the try-catch error isolation added in T4. Update the metadata injection lifecycle (§1.1) to show `config.aiSubject` passthrough from T3. Update the search header lifecycle (§1.3) to reflect the consolidated single keydown listener from T8. Update the technical description paragraph to mention error isolation and the `data-ai-subject` wiring.
  - **`foundation_nomenclature.md`**: Add any new terms introduced (e.g. `config.aiSubject` parameter). Remove `--color-dash-border-strong` (deleted in T15). Remove `.btn-skewed` (deleted in T15). Update `.list-row` definition to reflect box-shadow instead of border-left (T17). Update `.error-footer__message` definition to note `overflow: hidden` (T16). Bump version.
- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [ ] All ASCII diagrams in module guides match current source code
- [ ] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [ ] Nomenclature file covers all terms used in module source files
- [ ] Version numbers bumped on all modified guide files

---

### T23 — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
