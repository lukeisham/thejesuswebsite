---
name: fix_news_module_bugs
version: 1.0.0
module: 6.0 — News & Blog
status: draft
created: 2026-05-06
---

# Plan: fix_news_module_bugs

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan fixes three bugs identified in the News Sources dashboard module (Module 6.0). First, the news crawler pipeline (`pipeline_news.py`) only parses JSON API responses and silently fails on RSS/Atom XML feeds — the most common format for news sources — because `_crawl_source` raises a `ValueError` whenever the response is not a dict. Second, the `_handleSaveUrl` function in `news_sources_sidebar_handler.js` uses `var` with duplicate declarations across a `try/catch` block, which is fragile and violates ES6+ best practice. Third, the sidebar's input fields and Add/Save buttons are always active even when no record is selected, causing silent no-ops that confuse the user. After this plan, the crawler will correctly ingest RSS/Atom XML feeds, the URL-save handler will use clean `let`-scoped variables, and the sidebar will visually disable all inputs and buttons when no record is selected.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Add RSS/Atom XML Parsing to `_crawl_source` in `pipeline_news.py`

- **File(s):** `backend/pipelines/pipeline_news.py`
- **Action:** Refactor `_crawl_source` to detect whether the `make_request` response is a dict (JSON) or a string/bytes (XML), and add a new internal helper `_parse_rss_feed(raw_text, source_url, keywords)` that uses Python's built-in `xml.etree.ElementTree` to extract `<item>` (RSS 2.0) and `<entry>` (Atom) elements, applying the same keyword-matching and standard `{title, timestamp, url}` output shape as `_parse_json_feed`.
- **Vibe Rule(s):** Readability First · Modular Pipelines — stateless and safe to run repeatedly · Document API quirks and data anomalies inline

- [ ] Task complete

---

### T2 — Update `_crawl_source` to Route XML vs JSON Responses

- **File(s):** `backend/pipelines/pipeline_news.py`
- **Action:** Update the `_crawl_source` dispatch logic so that when `make_request` returns a string or bytes value (indicating an XML/text response), it calls `_parse_rss_feed` instead of raising a `ValueError`, and only raises `ValueError` if *both* parsers return zero items.
- **Vibe Rule(s):** Readability First · API quirks documented inline · Stateless and repeatable

- [ ] Task complete

---

### T3 — Fix `var` Scoping Bug in `_handleSaveUrl`

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Replace the duplicate `var url` / `var name` declarations inside the `try/catch` block in `_handleSaveUrl` with a single `let url` and `let name` declared before the `try` block, assigned inside `try` (for JSON input) and reassigned in `catch` (for plain URL string input), eliminating the fragile hoisting dependency.
- **Vibe Rule(s):** Vanilla ES6+ · One function per file · File opens with three comment lines

- [ ] Task complete

---

### T4 — Disable Sidebar Inputs When No Record Is Selected

- **File(s):** `js/6.0_news_blog/dashboard/news_sources_sidebar_handler.js`
- **Action:** Add a `_setSidebarDisabled(disabled)` internal helper that sets the `disabled` attribute on all sidebar interactive elements (`#news-sources-url-input`, `#btn-news-save-url`, `#news-search-term-input`, `#btn-news-add-term`, `#news-sources-snippet-input`, `#btn-news-auto-snippet`, `#news-sources-slug-input`, `#btn-news-auto-slug`, `#news-sources-meta-input`, `#btn-news-auto-meta`) and an `opacity: 0.45` inline style on the sidebar sections, then call `_setSidebarDisabled(true)` inside `initNewsSourcesSidebar` and `_setSidebarDisabled(false)` at the top of `populateNewsSourcesSidebar`.
- **Vibe Rule(s):** Vanilla ES6+ · One function per file · Component Injection pattern · No inline styles on structural HTML (inline `disabled` attribute on form controls is standard and acceptable)

- [ ] Task complete

---

### T5 — Update News Sources ASCII Diagram in `guide_dashboard_appearance.md`

- **File(s):** `documentation/guides/guide_dashboard_appearance.md`
- **Action:** Update the §6.1 ASCII diagram (News Sources section) to reflect that (a) the sidebar inputs and buttons are visually disabled/dimmed when no record is selected, and (b) a note is added below the diagram clarifying that selecting a row from the right-hand table activates the sidebar controls.
- **Vibe Rule(s):** Source-of-Truth Discipline — documentation must stay in sync with implementation · Human-readable comments

- [ ] Task complete

---

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
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T7 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary.

- [ ] **Achievement**: The news crawler pipeline correctly parses both RSS/Atom XML and JSON API feeds — no source type causes a silent failure
- [ ] **Achievement**: `_handleSaveUrl` uses `let`-scoped variables with no duplicate declarations — the try/catch scoping bug is resolved
- [ ] **Achievement**: All sidebar inputs and action buttons are disabled (with visual opacity reduction) until a record row is selected — no silent no-ops
- [ ] **Necessity**: All three bugs identified in the code review have been resolved
- [ ] **Achievement**: The §6.1 ASCII diagram in `guide_dashboard_appearance.md` accurately reflects the disabled-sidebar UX behaviour
- [ ] **Targeted Impact**: Only `pipeline_news.py`, `news_sources_sidebar_handler.js`, and `guide_dashboard_appearance.md` were modified — no other files touched
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | No | No new files added or existing files moved |
| `documentation/simple_module_sitemap.md` | No | No module scope change |
| `documentation/site_map.md` | No | No new files added |
| `documentation/data_schema.md` | No | No new tables or columns introduced |
| `documentation/vibe_coding_rules.md` | No | No rule ambiguity identified during this plan |
| `documentation/style_mockup.html` | No | No new page layout or visual change |
| `documentation/git_vps.md` | No | No deployment or VPS config changes |
| `documentation/guides/guide_appearance.md` | No | No public-facing page or UI component added |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Covered by T5 — update the §6.1 ASCII diagram to show disabled sidebar state and row-selection activation note |
| `documentation/guides/guide_function.md` | Yes | Document the updated `_crawl_source` routing logic (JSON vs RSS/XML dispatch) and the `_setSidebarDisabled` pattern |
| `documentation/guides/guide_security.md` | No | No auth, session, or input validation logic touched |
| `documentation/guides/guide_style.md` | No | No new CSS patterns or design tokens introduced |
| `documentation/guides/guide_maps.md` | No | No map-related logic changed |
| `documentation/guides/guide_timeline.md` | No | No timeline logic changed |
| `documentation/guides/guide_donations.md` | No | No external integrations or donation flows changed |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, or robots.txt changes |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
