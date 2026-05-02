---
name: plan_dashboard_challenge
version: 1.0.0
module: 4.0 — Ranked Lists
status: draft
created: 2026-05-02
---

# Plan: plan_dashboard_challenge

## Purpose

> **One-paragraph summary of what this plan achieves, why it is needed, and which part of the site it affects.**

This plan implements the "Challenge" dashboard module, which manages the two primary debate lists (Academic and Popular). It features a toggle-driven interface for switching between the lists, a weighting sidebar for fine-tuning the ranking logic for each category, and a main area for viewing and publishing the ranked challenges. This module is critical for organizing and prioritizing the historical and public challenges that the project addresses through its scholarly responses, ensuring that the most impactful queries are surfaced with appropriate prominence.

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, ensure all of the following files exist and match the logic in `documentation/dashboard_refractor.md` before marking the Audit task as complete.

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_challenge.html` | Challenge list management container |
| **CSS** | `css/4.0_ranked_lists/dashboard/dashboard_challenge.css` | Sidebar controls & list aesthetics |
| **JS** | `js/4.0_ranked_lists/dashboard/dashboard_challenge.js` | Module orchestration & initialization |
| **JS** | `js/4.0_ranked_lists/dashboard/challenge_list_display.js` | Data fetching & row hydration |
| **JS** | `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js` | Real-time score/rank logic |
| **JS** | `js/4.0_ranked_lists/dashboard/insert_challenge_response.js` | Response creation & challenge linking |
| **JS** | `js/4.0_ranked_lists/dashboard/metadata_handler.js` | Metadata footer (Snippet/Slug/Meta) management |

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Create Challenge Dashboard HTML

- **File(s):** `admin/frontend/dashboard_challenge.html`
- **Action:** Create the structural container for the challenge editor, including the Academic/Popular toggle bar, weighting sidebar anchor, and ranked list container.
- **Vibe Rule(s):** Semantic HTML5 tags · No inline styles · No inline scripts · Predictable Hooks

- [ ] Task complete

---

### T2 — Implement Challenge Dashboard CSS

- **File(s):** `css/4.0_ranked_lists/dashboard/dashboard_challenge.css`
- **Action:** Implement the toggle-driven dual-pane layout styling, with specific visual states for active list selections and the weighting sidebar.
- **Vibe Rule(s):** Grid for everything · CSS Variables · Vanilla Excellence · User Comments

- [ ] Task complete

---

### T3 — Implement Challenge Orchestrator

- **File(s):** `js/4.0_ranked_lists/dashboard/dashboard_challenge.js`
- **Action:** Initialize the challenge module and coordinate the switching between Academic/Popular views and the ranking recalculation logic.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T4 — Implement Challenge List Display

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
- **Action:** Implement the logic to fetch and render the active challenge list. The renderer must nest 'Response' sub-cards (showing Draft/Published status) directly under their parent challenges, mimicking the frontend layout in `guide_appearance.md`.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5 — Implement Challenge Weighting Logic

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
- **Action:** Implement the UI logic for managing multipliers for the current challenge category and adding new weighting criteria.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5a — Implement Search Term Management

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
- **Action:** Implement UI for viewing and editing the `popular_challenge_search_term` (TEXT / JSON Blob) and `academic_challenge_search_term` (TEXT / JSON Blob) fields for the active record. Each field stores the search terms used to source pipeline content. The active field is determined by the current Academic/Popular toggle state. Changes must be saved back to the database via the admin API.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Challenge Ranking Calculator

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js`
- **Action:** Implement the logic to compute challenge ranks based on category-specific weights and push updates to the database. The calculator must read `popular_challenge_search_term` or `academic_challenge_search_term` (depending on active toggle) and pass those terms to the pipeline when triggering a re-run.
- **Dependencies:** `admin/backend/admin_api.py` (get_list, update_list), `backend/pipelines/pipeline_academic_challenges.py`, `backend/pipelines/pipeline_popular_challenges.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T7 — Implement Response Insertion Logic

- **File(s):** `js/4.0_ranked_lists/dashboard/insert_challenge_response.js`
- **Action:** Implement the logic to link a challenge item to a response record and trigger the creation of draft responses where needed.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T8 — Implement Metadata Footer
- **File(s):** `js/4.0_ranked_lists/dashboard/metadata_handler.js`
- **Action:** Implement the Metadata Footer logic to display/edit Snippet, Slug, and Meta-Data. Include buttons to trigger auto-generation via `snippet_generator.py` and `metadata_generator.py` with manual override support.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T10 — Vibe-Coding Audit

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
- [ ] metadata_handler.js: Verify identical behaviour with counterparts in essay_historiography, blog_posts, challenge_response, wikipedia, news_sources
- [ ] Any module-specific variations are documented in a comment at the top of the file

---

### T11 — Purpose Check

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
| `documentation/detailed_module_sitemap.md` | Yes | Add new Challenge dashboard files under Module 4.0. |
| `documentation/simple_module_sitemap.md` | No | High-level module structure remains unchanged. |
| `documentation/site_map.md` | Yes | Run /sync_sitemap to track new Challenge editor files. |
| `documentation/data_schema.md` | Yes | `popular_challenge_search_term` and `academic_challenge_search_term` (TEXT / JSON Blob) added; confirm fields are documented. |
| `documentation/vibe_coding_rules.md` | No | Rules remain consistent. |
| `documentation/style_mockup.html` | No | Style mockup is unaffected. |
| `documentation/git_vps.md` | No | No deployment changes. |
| `documentation/guides/guide_appearance.md` | No | Public-facing appearance is unaffected. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Update ASCII diagrams for the Challenge list editor and toggles. |
| `documentation/guides/guide_function.md` | Yes | Document dual-list toggle logic and challenge weighting flow. |
| `documentation/guides/guide_security.md` | Yes | Note validation for challenge weighting and response linking. |
| `documentation/guides/guide_style.md` | Yes | Document the toggle bar and ranked list CSS patterns. |
| `documentation/guides/guide_maps.md` | No | Map logic is unaffected. |
| `documentation/guides/guide_timeline.md` | No | Timeline logic is unaffected. |
| `documentation/guides/guide_donations.md` | No | Donation logic is unaffected. |
| `documentation/guides/guide_welcoming_robots.md` | No | SEO is unaffected. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
