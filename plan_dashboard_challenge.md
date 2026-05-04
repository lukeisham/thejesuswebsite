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

This plan implements the "Challenge" dashboard module, which manages the two primary debate lists (Academic and Popular). It features a toggle-driven interface for switching between the lists, a weighting sidebar for fine-tuning the ranking logic for each category, and a main area for viewing and publishing the ranked challenges. A key feature of this module is the insert response function, where a response can be created and linked to a challenge, auto populating the challenge id field in the new response record.

```text
+---------------------------------------------------------------------------------+
| [Logo] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >   |
+---------------------------------------------------------------------------------+
| Function Bar: [ Academic | Popular ] Toggle   [ Refresh ]   [ Publish ]   [ Agent Search ]   [ Insert Response ] |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar) | Challenge Items (Main Area)                         |
|---------------------------+-----------------------------------------------------|
| Difficulty (8)            | 1. Challenge Title One (Total Score: 85)            |
| [^] [v]                   |                                                     |
|                           | 2. Challenge Title Two (Total Score: 72)            |
| Popularity (3)            |                                                     |
| [^] [v]                   | 3. Challenge Title Three (Total Score: 60)          |
|                           |                                                     |
|                           | ... (Endless Scroll)                                |
| [New Name] [Val] [Publish]|                                                     |
+---------------------------------------------------------------------------------+
| [ Error Message Display: System running normally / Error logs appear here ]     |
+---------------------------------------------------------------------------------+
```

---

## File Inventory

> [!IMPORTANT]
> To prevent skipping or drift, work through the tasks sequentially, and ensure each task is fully completed, and marked as complete, before moving to the next.  

| Type | Path | Purpose |
| :--- | :--- | :--- |
| **HTML** | `admin/frontend/dashboard_challenge.html` | Challenge list management container |
| **CSS** | `css/4.0_ranked_lists/dashboard/dashboard_challenge.css` | Sidebar controls & list aesthetics |
| **JS** | `js/4.0_ranked_lists/dashboard/dashboard_challenge.js` | Module orchestration & initialization |
| **JS** | `js/4.0_ranked_lists/dashboard/challenge_list_display.js` | Data fetching & row hydration |
| **JS** | `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js` | Real-time score/rank logic |
| **JS** | `js/4.0_ranked_lists/dashboard/insert_challenge_response.js` | Response creation & challenge linking |
| **JS** | `js/2.0_records/dashboard/metadata_handler.js` | ⬅️ Consumed shared tool (owned by plan_dashboard_records_single): Metadata footer |

---

## Dependencies

> Files outside this plan's inventory that are touched, called, or relied upon by tasks in this plan. Task authors must coordinate with these surfaces.

| Dependency | Owned By | Relationship |
| :--- | :--- | :--- |
| `admin/backend/admin_api.py` | `plan_backend_infrastructure` | T4 calls `GET /api/admin/records` (filtered); T5/T5a PUT to `PUT /api/admin/records/{id}` for weighting/search terms; T6 calls `POST /api/admin/agent/run` + `GET /api/admin/agent/logs` + `PUT /api/admin/lists/{name}`; T7 calls `POST /api/admin/responses` |
| `backend/pipelines/pipeline_academic_challenges.py` | `plan_backend_infrastructure` | T6 Agent Search triggers this pipeline which now calls `agent_client.py` for DeepSeek web search |
| `backend/pipelines/pipeline_popular_challenges.py` | `plan_backend_infrastructure` | T6 Agent Search triggers this pipeline which now calls `agent_client.py` for DeepSeek web search |
| `backend/scripts/agent_client.py` | `plan_backend_infrastructure` | T6 depends on the agent client for DeepSeek API web-search article discovery |
| `backend/scripts/snippet_generator.py` | `plan_backend_infrastructure` | T8 auto-gen snippet button triggers this script |
| `backend/scripts/metadata_generator.py` | `plan_backend_infrastructure` | T8 auto-gen meta button triggers this script |
| `js/2.0_records/dashboard/metadata_handler.js` | `plan_dashboard_records_single` | T8 includes this via `<script>` tag; calls `window.renderMetadataFooter()` |
| `js/7.0_system/dashboard/dashboard_app.js` | `plan_dashboard_login_shell` | T3 registers the Challenge module with the dashboard router |
| `js/admin_core/error_handler.js` | `plan_dashboard_login_shell` | T9 routes all fetch, save, and agent failures to the shared Status Bar |
| `css/typography_colors.css` | `plan_dashboard_login_shell` | T2 references Providence CSS custom properties |
| `database/database.sqlite` (`records` table) | `plan_backend_infrastructure` | T4 reads challenge rows; T5/T5a writes weights and search terms; T6 reads/writes ranks; T7 writes `challenge_id` on the newly created response record |

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
- **Action:** Implement the UI logic for managing multipliers for the current challenge category and adding new weighting criteria. **Any weight modification auto-saves the record as draft.**
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T5a — Implement Search Term Management

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
- **Action:** Implement UI for viewing and editing the `popular_challenge_search_term` (TEXT / JSON Blob) and `academic_challenge_search_term` (TEXT / JSON Blob) fields for the active record. Each field stores the search terms the DeepSeek agent uses to discover relevant articles on the open web. The active field is determined by the current Academic/Popular toggle state. **Any search term modification auto-saves the record as draft.** Changes must be saved back to the database via the admin API before the agent can use them.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

### T6 — Implement Challenge Ranking Calculator

- **File(s):** `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js`
- **Action:** Implement the logic to compute challenge ranks based on category-specific weights and the agent-discovered article scores, with full draft/publish cycle integration. The calculator must:
  1. On "Refresh": read all records' current `academic_challenge_rank` / `popular_challenge_rank` (depending on active toggle), apply the admin's weight multipliers from `challenge_weighting_handler.js`, re-sort the list, and **set all affected records to draft**. This ensures re-sorted rankings are not live until explicitly published.
  2. On "Agent Search": POST to `/api/admin/agent/run` with `{"pipeline": "academic_challenges" | "popular_challenges", "slug": str}` for the selected record. The DeepSeek agent then searches the open web using the record's search terms, discovers relevant articles, and the Python pipeline (`pipeline_academic_challenges.py` / `pipeline_popular_challenges.py`) writes the base rank and discovered articles back to the database **with status set to draft** (ingested external data must be reviewed before going live). Display a loading indicator until the agent run completes, then auto-refresh the list.
  3. On "Publish": commit the current ranked order to the live frontend data and **set all listed records to published**. This is the only path by which challenge rankings reach the public site.
- **Dependencies:** `admin/backend/admin_api.py` (`GET /api/admin/records`, `PUT /api/admin/records/{id}`, `PUT /api/admin/lists/{name}`, `POST /api/admin/agent/run`, `GET /api/admin/agent/logs`), `backend/pipelines/pipeline_academic_challenges.py`, `backend/pipelines/pipeline_popular_challenges.py`, `backend/scripts/agent_client.py`
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

### T7 — Implement Response Insertion Logic

- **File(s):** `js/4.0_ranked_lists/dashboard/insert_challenge_response.js`
- **Action:** Implement the logic to create a new draft response record and link it to its parent challenge. On trigger, POST to `POST /api/admin/responses` with `{"challenge_id": <parent_challenge_id>, "status": "draft"}`. The API writes the new response row with `challenge_id` populated (FK → `records.id`), then navigates the user to the Challenge Response editor for that new record.
- **Database field:** `challenge_id` (TEXT, FK → `records(id)`) — stored on the response record; set at creation time and updated by `challenge_link_handler.js` in `plan_dashboard_challenge_response`.
- **Vibe Rule(s):** 1 function per JS file · User Comments · Vanilla ES6+

- [ ] Task complete

---

## Final Tasks

---

### T8 — Include Metadata Footer (Shared Tool)
- **File(s):** Include `js/2.0_records/dashboard/metadata_handler.js` via `<script>` tag — DO NOT create a local copy
- **Action:** Add `<script>` tag and call `window.renderMetadataFooter(containerId, recordId)`. Shared tool owned by `plan_dashboard_records_single`.
- **Vibe Rule(s):** Consume via window.* API · Do not duplicate

- [ ] Task complete

---

### T9 — Error Message Generation

- **File(s):**
  - `js/4.0_ranked_lists/dashboard/challenge_list_display.js`
  - `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js`
  - `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js`
  - `js/4.0_ranked_lists/dashboard/insert_challenge_response.js`
  - `js/4.0_ranked_lists/dashboard/metadata_handler.js`
- **Action:** Add structured error message generation at every key failure point across the JavaScript modules. Each error must surface a human-readable message to the dashboard Status Bar via `js/admin_core/error_handler.js`. Failure points to cover:

  1. **Challenge List Fetch Failed** — `challenge_list_display.js` fetch to `/api/admin/records` fails or returns non-OK: `"Error: Unable to load challenge list. Please refresh and try again."`
  2. **Weight Save Failed** — `challenge_weighting_handler.js` PUT for weighting criteria returns non-OK: `"Error: Failed to save weighting changes. Please try again."`
  3. **Search Term Save Failed** — `challenge_weighting_handler.js` PUT for search terms returns non-OK: `"Error: Failed to save search terms. Please try again."`
  4. **Rank Calculation Failed** — `challenge_ranking_calculator.js` cannot compute or commit updated ranks: `"Error: Failed to refresh challenge rankings. Please try again."`
  5. **Pipeline Trigger Failed** — `challenge_ranking_calculator.js` POST to trigger pipeline returns non-OK or times out: `"Error: Challenge pipeline did not respond. Rankings may not be current."`
  6. **Agent Search Failed** — `challenge_ranking_calculator.js` POST to `/api/admin/agent/run` returns non-OK: `"Error: Agent search failed for '{title}'. Check search terms and API key."`
  7. **Agent Run Timeout** — agent run status remains `'running'` beyond the expected timeout threshold: `"Error: Agent search timed out for '{title}'. Partial results may have been saved."`
  8. **Response Insertion Failed** — `insert_challenge_response.js` POST to create draft response returns non-OK: `"Error: Failed to create response for challenge '{title}'."`
  9. **Metadata Save Failed** — `metadata_handler.js` PUT for snippet/slug/meta returns non-OK: `"Error: Failed to save metadata for '{title}'."`

  All errors must be routed through `js/admin_core/error_handler.js` and displayed in the Status Bar.

- **Vibe Rule(s):** Logic is explicit and self-documenting · User Comments · Vanilla ES6+

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

#### Shared-Tool Ownership
- [ ] `metadata_handler.js` included via `<script>` tag from `js/2.0_records/dashboard/` — no local copy created
- [ ] This plan does NOT own any shared tools

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
| `documentation/data_schema.md` | Yes | `popular_challenge_search_term` and `academic_challenge_search_term` (TEXT / JSON Blob) added; `challenge_id` (TEXT, FK → records(id)) added for response-to-challenge linking — confirm fields are documented. |
| `documentation/vibe_coding_rules.md` | Yes | Updated shared-tool consistency rule to ownership model (§7). |
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
