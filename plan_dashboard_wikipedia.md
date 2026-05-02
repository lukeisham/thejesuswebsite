---
name: plan_dashboard_wikipedia
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_wikipedia

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Wikipedia" dashboard module, a specialized interface for managing and prioritizing archival Wikipedia article data. It features a dual-pane layout with a weighting sidebar for adjusting ranking multipliers and a main scrollable list of articles with real-time score recalculation. This module enables administrators to fine-tune the relevance and ordering of external historical references based on weighted qualitative criteria, ensuring the debate and context pages surface the most significant evidence.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar:          [ Refresh ]   [ Recalculate ]                            |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar) | Wikipedia Items (Main Area)                         |
|---------------------------+-----------------------------------------------------|
| First century context (1) | 1. Article Title One (Total Score: 42)              |
| [^] [v]                   |                                                     |
|                           | 2. Article Title Two (Total Score: 38)              |
| Theological weight (5)    |                                                     |
| [^] [v]                   | 3. Article Title Three (Total Score: 35)            |
|                           |                                                     |
| [New Name] [Val] [Publish]| ... (Endless Scroll)                                |
|                           |                                                     |
| Wikipedia search terms:   |                                                     |
| list of terms             |                                                     |
| [New Term] [Publish]      |-----------------------------------------------------|
|                           | [Snippet] [Slug] [Meta-Data]                        |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_wikipedia.html` | Wikipedia list management container |
| **CSS** | `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css` | Sidebar controls & list aesthetics |
| **JS** | `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js` | Module orchestration & initialization |
| **JS** | `js/4.0_ranked_lists/dashboard/display_wikipedia_list.js` | Data fetching & row hydration |
| **JS** | `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js` | Real-time ranking & weight logic |
| **JS** | `js/4.0_ranked_lists/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |
| **Python** | `backend/pipelines/pipeline_wikipedia.py` | Wikipedia API ingestion & base-score pipeline |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T3/T4/T6 call `get_list`, `update_list` endpoints for record CRUD |
| `js/admin_core/dashboard_module_loader.js` | `plan_dashboard_login_shell` | T3 registers the Wikipedia module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T3 surfaces pipeline failures via shared error display |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T8 reads `wikipedia_search_terms`, writes `wikipedia_title`, `wikipedia_link`, `wikipedia_rank` |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T3/T4 query records with `wikipedia_title IS NOT NULL` filter |
| `js/4.0_ranked_lists/frontpage/render_wikipedia_list.js` | (public frontend) | T6 final rank values feed the WASM-ordered public list at §4.1 |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Wikipedia Dashboard HTML

- **File(s):** `admin/frontend/dashboard_wikipedia.html`
- **Action:** Create the structural container for the Wikipedia editor, including the weighting sidebar anchor, the ranked list container, and the Refresh/Recalculate function bar.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Wikipedia Dashboard CSS

- **File(s):** `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css`
- **Action:** Implement the 'providence' theme dual-pane layout with a fixed weighting sidebar and high-density list styling for article metadata.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Wikipedia Orchestrator

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js`
- **Action:** Initialize the Wikipedia module and coordinate the list rendering, weighting updates, and score recalculation processes.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Wikipedia List Display

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js`
- **Action:** Implement the logic to fetch ranked article data and render it with endless scroll support and total score displays.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Weighting Sidebar Logic

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_weighting_handler.js`
- **Action:** Implement the UI logic for displaying and modifying individual weighting multipliers and adding new weighting criteria.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Ranking Calculator

- **File(s):** `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js`
- **Action:** Implement the logic to compute total ranking scores from the current weights and commit the updated ranks to the database.
- **Dependencies:** `admin/backend/admin_api.py` (get_list, update_list), `backend/pipelines/pipeline_wikipedia.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T7 — Implement Metadata Footer
- **File(s):** `js/4.0_ranked_lists/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T8 — Refactor Wikipedia Pipeline Script

- **File(s):** `backend/pipelines/pipeline_wikipedia.py`
- **Action:** Refactor `pipeline_wikipedia.py` so it is triggered when an admin clicks "Recalculate" and processes one record at a time based on its stored `wikipedia_search_terms`:
  1. Read `wikipedia_search_terms` from the records table (a comma-separated string of terms configured per record via the admin editor).
  2. For each search term, call the Wikipedia REST API (`/w/api.php?action=query&list=search&srsearch=...`) to find matching articles.
  3. Filter results to exclude non-article pages (anything not in `NS_MAIN` namespace 0), disambiguation pages, and list pages.
  4. Select the best match and write `wikipedia_title`, `wikipedia_link`, and `wikipedia_rank` (base importance score derived from pageview data or search rank position) to the record's row in SQLite.
  5. The rank is a **base score only** — the admin's `wikipedia_weight` multiplier is applied separately by the frontend ranking calculator on "Refresh".
  6. The script must be stateless and safe to run repeatedly (idempotent — re-running overwrites previous results cleanly).
- **Vibe Rule(s):** Logic is explicit and self-documenting · Scripts are stateless and safe to run repeatedly · API quirks or data anomalies documented inline

- [ ] Task complete

---

### T9 — Vibe-Coding Audit

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

#### Shared-Tool Consistency
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response, challenge, news_sources
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T10 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: The core objective outlined in the summary has been fully met
- [ ] **Necessity**: The underlying reason/need for this plan has been resolved
- [ ] **Targeted Impact**: The specific parts of the site mentioned have been updated as intended
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new Wikipedia dashboard files under Module 4.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new Wikipedia editor files. |
| `documentation/data_schema.md` | No | No schema changes in this plan. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagram for the Wikipedia list editor. |
| `documentation/guides/guide_function.md` | Yes | Document weighting rank logic and ranking recalculation flow. |
| `documentation/guides/guide_security.md` | Yes | Note validation for weighting values and rank updates. |
| `documentation/guides/guide_style.md` | Yes | Document dual-pane layout and weighting sidebar CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T3/T4/T6 call `get_list`, `update_list` endpoints for record CRUD |
| `js/admin_core/dashboard_module_loader.js` | `plan_dashboard_login_shell` | T3 registers the Wikipedia module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T3 surfaces pipeline failures via shared error display |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T8 reads `wikipedia_search_terms`, writes `wikipedia_title`, `wikipedia_link`, `wikipedia_rank` |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T3/T4 query records with `wikipedia_title IS NOT NULL` filter |
| `js/4.0_ranked_lists/frontpage/render_wikipedia_list.js` | (public frontend) | T6 final rank values feed the WASM-ordered public list at §4.1 |

---
