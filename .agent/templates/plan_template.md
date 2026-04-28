---
name: {{plan_name}}
version: 1.0.0
module: {{module_number}} — {{module_name}}
status: draft
created: {{date}}
---

# Plan: {{plan_name}}

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

{{purpose_summary}}

---

## Tasks

> Each task is a focused, bite-sized unit of work. Follow `documentation/vibe_coding_rules.md` for all code creation and edits.
> Check each box as you complete the task.

### T1 — {{task_1_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{e.g. "Semantic HTML5 tags · No inline styles" / "1 function per JS file · ES6+" / "snake_case fields"}}

- [ ] Task complete

---

### T2 — {{task_2_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{relevant rules}}

- [ ] Task complete

---

### T3 — {{task_3_title}}

- **File(s):** `{{file_path}}`
- **Action:** {{description of what to create or change}}
- **Vibe Rule(s):** {{relevant rules}}

- [ ] Task complete

---

<!-- Add additional T4, T5 … blocks as needed using the same pattern above -->

---

## Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

### Purpose Check
- [ ] Plan purpose stated in §Purpose has been fully achieved
- [ ] No scope creep — only files listed in §Tasks were created or modified

---

## Impact Audit

> Cross-reference every file touched against `documentation/detailed_module_sitemap.md`.
> Confirm the sitemap is still accurate; update it if any new files were added or paths changed.

| File | Module | Sitemap Entry Exists? | Action Required |
|------|--------|-----------------------|-----------------|
| `{{file_path}}` | {{module_number}} — {{module_name}} | Yes / No | None / Add entry / Update entry |

### Sitemap Integrity Checks
- [ ] All new files are listed under the correct module in `detailed_module_sitemap.md`
- [ ] No existing sitemap entries were broken or made stale by this plan
- [ ] If new files were added, run `/sync_sitemap` to propagate changes to `site_map.md`
- [ ] `detailed_module_sitemap.md` version number incremented if structure changed

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes / No | {{e.g. Add new file entries under Module X.X}} |
| `documentation/simple_module_sitemap.md` | Yes / No | {{e.g. Reflect new module scope}} |
| `documentation/site_map.md` | Yes / No | {{e.g. Run /sync_sitemap to regenerate}} |
| `documentation/data_schema.md` | Yes / No | {{e.g. Document new table or field added}} |
| `documentation/vibe_coding_rules.md` | Yes / No | {{e.g. Clarify rule that was ambiguous during this plan}} |
| `documentation/style_mockup.html` | Yes / No | {{e.g. Reflect new page layout}} |
| `documentation/git_vps.md` | Yes / No | {{e.g. Note any deployment or VPS config changes}} |
| `documentation/guides/guide_appearance.md` | Yes / No | {{e.g. Add ASCII diagram for new public page or component}} |
| `documentation/guides/guide_dashboard_appearance.md` | Yes / No | {{e.g. Update ASCII diagram for dashboard sidebar or admin UI change}} |
| `documentation/guides/guide_function.md` | Yes / No | {{e.g. Document new logic flow}} |
| `documentation/guides/guide_security.md` | Yes / No | {{e.g. Note any new auth or rate-limiting changes}} |
| `documentation/guides/guide_style.md` | Yes / No | {{e.g. Update if new CSS patterns introduced}} |
| `documentation/guides/guide_maps.md` | Yes / No | {{e.g. Update if map display or data logic changed}} |
| `documentation/guides/guide_timeline.md` | Yes / No | {{e.g. Update if timeline display or data logic changed}} |
| `documentation/guides/guide_donations.md` | Yes / No | {{e.g. Update if external support integrations changed}} |
| `documentation/guides/guide_welcoming_robots.md` | Yes / No | {{e.g. Update if SEO, robots.txt, or AI-accessibility changed}} |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
