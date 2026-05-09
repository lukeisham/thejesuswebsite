---
name: align_dashboard_styling
version: 1.0.0
module: 1.0 — Foundation
status: draft
created: 2026-05-09
---

# Plan: Align Dashboard Styling

## Purpose

> **Align all dashboard CSS files with the revised `guide_style.md` by (a) adding four missing design tokens to `typography.css`, (b) replacing the dark-mode legacy code in `metadata_widget.css` with Providence CSS variables, and (c) replacing hardcoded `border-radius` and `border` values in `dashboard_system.css` with CSS variables. This ensures every dashboard module passes the §21 Consistency Checklist and the shared metadata widget actually serves as the canonical example the guide claims it to be.**

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Add missing design tokens to `typography.css`

- **File(s):** `css/1.0_foundation/typography.css`
- **Action:** Add four missing CSS custom properties to the `:root` block: `--radius-md` (3px — between sm and base), `--radius-full` (9999px — pill shapes), `--border-width-thick` (2px — thick emphasis borders, maps to existing `--border-width-base` value), and `--shadow-lg` (0 8px 24px rgba(36,36,35,0.12) — large modal/dialog shadow). Place each in its named section (§8 Borders & Radii, §9 Shadows). Bump the file version to 1.2.0.
- **Vibe Rule(s):** CSS Variables Everything — all tokens in typography.css · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T2 — Refactor `metadata_widget.css` dark-mode legacy section

- **File(s):** `css/2.0_records/dashboard/metadata_widget.css`
- **Action:** Replace the dark-mode legacy code block (lines ~194–300: `.metadata-widget__tags` through `.metadata-widget__generate-all:hover`) with Providence CSS variables. Specifically: (a) tag chips: `--color-bg-secondary` fill, `--color-text-primary` text, `--radius-full` shape, `--border-width-thin` `--color-border` border, `--font-mono` `--text-xs`; (b) tag input/add button: `--font-mono` `--text-xs`, `--radius-sm`, `--border-width-thin` `--color-border`; (c) Generate All button: full-width `--color-accent-primary` solid fill (no gradient), `--color-text-inverse` text, `--font-heading` `--text-sm` `--weight-semibold`, `--radius-sm`, `--border-width-thin` `--color-accent-primary`; (d) divider: `--border-width-thin` `--color-border`; (e) status: `--font-mono` `--text-xs` `--color-text-muted`. All spacing: `--space-N`. All transitions: `--transition-fast`. Bump the file version to 1.1.0.
- **Vibe Rule(s):** Variables Everything — reference only typography.css · Grid/Flexbox hierarchy · User Comments · Vanilla Excellence

- [ ] Task complete

---

### T3 — Fix hardcoded values in `dashboard_system.css`

- **File(s):** `css/7.0_system/dashboard/dashboard_system.css`
- **Action:** Replace every hardcoded `border-radius` value with the appropriate CSS variable: `6px` → `--radius-sm` (2px, matching health-card conventions from §19.8), `4px` → `--radius-sm`. Replace every `border: 1px solid` and `border-bottom: 1px solid` with `var(--border-width-thin) solid`. Replace the spinner's `border-radius: 50%` with `--radius-full`. Verify all spacing values use `--space-N`. Bump the file version to 1.1.0.
- **Vibe Rule(s):** Variables Everything — reference only typography.css · User Comments · Vanilla Excellence

- [ ] Task complete

---

### T4 — Bump `guide_style.md` version post-update

- **File(s):** `documentation/guides/guide_style.md`
- **Action:** Increment the `version` in the YAML frontmatter from `1.5.0` to `1.6.0` to reflect the §18–§22 Dashboard Architecture rewrite completed in the previous session.
- **Vibe Rule(s):** Source-of-Truth Discipline · Version frontmatter on every doc

- [ ] Task complete

---

## Final Tasks

### T5 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### CSS (all modified files are CSS)
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment (no layout changes made — preserved)
- [ ] All colours, fonts, and spacing reference CSS variables from `typography.css` — **zero hardcoded values**
- [ ] Section headings and subheadings present as comments — preserved and readable
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

---

### T6 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: Four missing design tokens (`--radius-md`, `--radius-full`, `--border-width-thick`, `--shadow-lg`) added to `typography.css`
- [ ] **Achievement**: `metadata_widget.css` dark-mode legacy block replaced with Providence variables — it now serves as the canonical BEM example the guide describes
- [ ] **Achievement**: `dashboard_system.css` zero hardcoded `border-radius` or `border` values — all values reference CSS variables
- [ ] **Necessity**: The revised `guide_style.md` §§18–22 now has a codebase that matches it — the contradictions identified in the audit are resolved
- [ ] **Targeted Impact**: Only the three CSS files (+ `typography.css` + `guide_style.md` version bump) were modified — no JS, HTML, Python, or SQL touched
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T7 — Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> This is a **mandatory task** — it must be completed and checked off like any other task.
> Only update documents that are genuinely affected — do not touch unrelated files.

- **File(s):** All documents in `documentation/` (root + `guides/` subfolder) marked "Yes" in the table below.
- **Action:** For every "Yes" row, open the document and make the required change:
  - **Style guide** (`guide_style.md`): Remove the ⚠️ codebase note at the end of §22 (the violation it warned about is now fixed). Update the rounding policy table in §18.4 to reflect the newly available `--radius-md` and `--radius-full` tokens, and `--border-width-thick`.
  - **Site maps** (`detailed_module_sitemap.md`): No new files — only bump the version of the `typography.css` entry. Verify `metadata_widget.css` and `dashboard_system.css` file paths are present.
  - **All other "Yes" rows**: Apply the change described in the row's Change Description column.
  - **Version bump**: Increment `version` in every modified document's YAML frontmatter.
- **Vibe Rule(s):** Source-of-Truth Discipline · Inventory Check · Cross-reference `detailed_module_sitemap.md` · Version frontmatter on every doc

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Bump version; verify `typography.css` (1.0), `metadata_widget.css` (2.0), and `dashboard_system.css` (7.0) entries are present and correctly pathed |
| `documentation/simple_module_sitemap.md` | No | No module scope or high-level structure change |
| `documentation/site_map.md` | Yes | Bump version; verify all three edited CSS file paths exist in the master tree |
| `documentation/data_schema.md` | No | No database changes |
| `documentation/vibe_coding_rules.md` | No | No rule changes or shared-tool ownership changes |
| `documentation/style_mockup.html` | No | No new page layout or visual change |
| `documentation/git_vps.md` | No | No deployment or VPS changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or component changes |
| `documentation/guides/guide_dashboard_appearance.md` | No | File does not exist |
| `documentation/guides/guide_function.md` | No | No new logic flow, pipeline, or JS interaction |
| `documentation/guides/guide_security.md` | No | No auth, session, or security changes |
| `documentation/guides/guide_style.md` | Yes | Remove the ⚠️ codebase note in §22; update §18.4 rounding policy table to list `--radius-md` (3px), `--radius-full` (9999px), and `--border-width-thick` (2px) alongside existing tokens; update §21 checklist item #1 to reference the new tokens; bump version to 1.7.0 |
| `documentation/guides/guide_maps.md` | No | No map changes |
| `documentation/guides/guide_timeline.md` | No | No timeline changes |
| `documentation/guides/guide_donations.md` | No | No donation changes |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO or robots changes |

- [ ] **All site-map documents updated:** `detailed_module_sitemap.md` and `site_map.md` versions bumped
- [ ] **Style guide updated:** `guide_style.md` ⚠️ codebase note removed, §18.4 updated with new tokens, version bumped to 1.7.0
- [ ] **Shared-tool ownership documented:** Not applicable — no shared-tool ownership changes
- [ ] **Version numbers bumped:** every modified document's frontmatter `version` has been incremented
- [ ] **No stale references:** no document contains outdated references to files or logic that were changed or removed by this plan
