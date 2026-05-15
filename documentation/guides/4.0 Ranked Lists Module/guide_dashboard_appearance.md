---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal and editing screens for 4.0 Ranked Lists Module
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, high_level_schema.md, guide_frontend_appearance.md, guide_function.md, ranked_lists_nomenclature.md]
---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).

### 4.1 Backend for Wikipedia Ranked List (`dashboard_wikipedia.js`)
**Corresponds to Public Sections:** 4.1 (Ranked Wikipedia Views)
**Purpose:** Dual-pane interface for managing Wikipedia article rankings. Left sidebar displays multiple dynamic weighting multipliers and search term management (textarea + overview list). Right pane displays the ranked list with endless scroll.

**Plan:** `plan_dashboard_wikipedia.md`

**DB Fields:**
```
── wikipedia_sidebar_handler.js ─────────────────────────────────────────
wikipedia_link         TEXT (JSON Blob)    — source link data
wikipedia_title        TEXT                — article title
wikipedia_weight       TEXT (JSON Object)  — multipliers for rank algorithm
wikipedia_search_term  TEXT (JSON Array)   — search terms for Wikipedia pipeline

── wikipedia_ranking_calculator.js ──────────────────────────────────────
wikipedia_rank         TEXT (64-bit int)   — rank position
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]   [ Calculate ] |
+---------------------------------------------------------------------------------+
| Wikipedia Sidebar                | Wikipedia Items (Main Area)                  |
| (contextual — selected record)   |                                               |
|----------------------------------+-----------------------------------------------|
| RECORD: Tacitus — Annals         | 1. Tacitus — Annals    (Score: 42)  [select] |
| Slug: tacitus-annals             |    wikipedia.org/wiki/Annals_(Tacitus)         |
|                                  |                                               |
| Wikipedia Weights:               | 2. Josephus — Antiquities (Score: 38) [select] |
| Scholarly        [8]             |    wikipedia.org/wiki/...                      |
| Popularity       [5]             |                                               |
| Historical       [7]             | 3. Pliny the Younger   (Score: 35)  [select]  |
|                                  |    wikipedia.org/wiki/...                      |
| Add Weight                       | ... (Endless Scroll paginated)                 |
| [New name___] [Val] [Add Weight] |                                               |
|                                  |                                               |
| Saved Search Terms               |                                               |
|  Tacitus Annals                  |                                               |
|  Tacitus historiography          |                                               |
|                                  |                                               |
| Search Terms (add/modify)        |                                               |
| ┌─────────────────────────┐      |                                               |
| │ Tacitus Annals          │      |                                               |
| │ Tacitus historiography  │      |                                               |
| └─────────────────────────┘      |                                               |
|                                  |                                               |
| [ Recalculate This Record ]      |                                               |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Any weight, search term, or metadata modification auto-saves the record as draft. "Save Draft" collects the current sidebar state (weights, terms, slug, snippet, metadata) and PUTs it with `status: 'draft'` WITHOUT triggering a re-rank. "Gather" triggers the Wikipedia pipeline to discover new articles. "Calculate" re-sorts the list using saved weights and sets ALL affected records to `status: 'draft'` (the "default to draft" rule — even previously published records revert to draft). Only "Publish" commits the final ranked order and sets all listed records to published.

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_wikipedia.html` | Wikipedia list management container |
| `css/4.0_ranked_lists/dashboard/dashboard_wikipedia.css` | Sidebar controls & list aesthetics |
| `js/4.0_ranked_lists/dashboard/dashboard_wikipedia.js` | Module orchestration |
| `js/4.0_ranked_lists/dashboard/wikipedia_list_display.js` | Data fetching & row hydration |
| `js/4.0_ranked_lists/dashboard/wikipedia_sidebar_handler.js` | Sidebar: delegate to weights/search terms |
| `js/4.0_ranked_lists/dashboard/wikipedia_weights.js` | Wikipedia Weight editor (multi-weight) |
| `js/4.0_ranked_lists/dashboard/wikipedia_search_terms.js` | Wikipedia Search Terms editor (overview + textarea) |
| `js/4.0_ranked_lists/dashboard/wikipedia_ranking_calculator.js` | Ranking & weight logic |
| `backend/pipelines/pipeline_wikipedia.py` | Wikipedia API ingestion pipeline |

---

### 4.2a Backend for Academic Challenge Ranked List (`dashboard_challenge_academic.js`)
**Corresponds to Public Sections:** 4.2 (Ranked Challenge Views)
**Purpose:** Single-mode interface for managing Academic challenge rankings. No toggle — the mode is hardcoded to "academic". Features a weighting sidebar with nested editable criteria rows, an Add Weight form directly below the criteria, a read-only Saved Search Terms overview, a Search Terms (add/modify) textarea, and full draft/publish cycle with Agent Search and Insert Response. The main area includes a status legend mapping `○D` (Draft) and `●P` (Published) symbols.

**Plan:** See `guide_dashboard_appearance.md` §4.2a — this guide is the authoritative layout reference.

**DB Fields:**
```
── Academic Challenges (challenge_weighting_handler.js) ─────────────────
academic_challenge_link        TEXT (JSON Blob)
academic_challenge_title       TEXT
academic_challenge_rank        TEXT (64-bit int)
academic_challenge_weight      TEXT (JSON Object)
academic_challenge_search_term TEXT (JSON Array)    — DeepSeek agent search terms

── Response linking (insert_challenge_response.js) ──────────────────────
responses                      TEXT (JSON Blob)    — links to response records
challenge_id                   TEXT (FK)           — set on response record
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]   [ Calculate ]   [ Insert Response ] |
+---------------------------------------------------------------------------------+
| Weighting & Search (Sidebar)  | Academic Challenge List (Main Area)
|-------------------------------+-------------------------------------------------|
| ACADEMIC WEIGHTING            | ┌─ Academic Challenges ─────────────────────────┐|
| AND SEARCH TERMS              | │ 1. Challenge Title One       Score: 85  ○D │|
|                               | │     └─ Response: (Draft)                    │|
| Difficulty         [8]        | │ 2. Challenge Title Two       Score: 72  ●P │|
| Scholarly Interest  [5]       | │     └─ Response: (Published)                │|
| Historical Signif.  [7]       | │ 3. Challenge Title Three     Score: 60  ○D │|
|                               | │     └─ No responses yet.                     │|
| Add Weight                    | │ ... (endless scroll)                         │|
| [New name___] [Val] [Save Draft]  | └──────────────────────────────────────────────┘|
|                               |                                                 |
| Saved Search Terms            |    Legend:  ○D = Draft status                  |
|  jesus                        |             ●P = Published status              |
|  historicity                  |                                                 |
|  early christianity           |    Each row title links to the public           |
|                               |    frontend page:                              |
| Search Terms (add/modify)     |    /frontend/pages/debate/                      |
| ┌─────────────────────────┐   |      academic_challenge.html?id={slug}          |
| │ jesus                   │   |                                                 |
| │ historicity             │   |                                                 |
| │ early christianity      │   |                                                 |
| └─────────────────────────┘   |                                                 |
| Currently editing: **Academic**|                                                 |
| search terms                   |                                                 |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Any weight or search term modification auto-saves as draft. "Save Draft" collects sidebar state and PUTs with `status: 'draft'` WITHOUT triggering a re-rank. "Gather" triggers the DeepSeek pipeline to discover new articles (uses the shared `gather_trigger.js`). "Calculate" re-sorts using saved weights and sets ALL affected records to `status: 'draft'` (default-to-draft rule). "Insert Response" creates a new draft response linked to the selected challenge. Only "Publish" commits ranks to live.

---

### 4.2b Backend for Popular Challenge Ranked List (`dashboard_challenge_popular.js`)
**Corresponds to Public Sections:** 4.2 (Ranked Challenge Views)
**Purpose:** Single-mode interface for managing Popular challenge rankings. No toggle — the mode is hardcoded to "popular". Structurally identical to the Academic page (§4.2a) — only label strings, the public-page link, and default weighting criteria (Popularity, Virality, Search Volume) differ.

**Plan:** See `guide_dashboard_appearance.md` §4.2b — this guide is the authoritative layout reference.

**DB Fields:**
```
── Popular Challenges (challenge_weighting_handler.js) ──────────────────
popular_challenge_link         TEXT (JSON Blob)
popular_challenge_title        TEXT
popular_challenge_rank         TEXT (64-bit int)
popular_challenge_weight       TEXT (JSON Object)
popular_challenge_search_term  TEXT (JSON Array)    — DeepSeek agent search terms

── Response linking (insert_challenge_response.js) ──────────────────────
responses                      TEXT (JSON Blob)    — links to response records
challenge_id                   TEXT (FK)           — set on response record
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]   [ Calculate ]   [ Insert Response ] |
+---------------------------------------------------------------------------------+
| Weighting & Search (Sidebar)  | Popular Challenge List (Main Area)               |
|-------------------------------+-------------------------------------------------|
| POPULAR WEIGHTING             | ┌─ Popular Challenges ──────────────────────────┐|
| AND SEARCH TERMS              | │ 1. Challenge Title One       Score: 85  ○D │|
|                               | │     └─ Response: (Draft)                    │|
| Popularity         [3]        | │ 2. Challenge Title Two       Score: 72  ●P │|
| Virality           [5]        | │     └─ Response: (Published)                │|
| Search Volume      [4]        | │ 3. Challenge Title Three     Score: 60  ○D │|
|                               | │     └─ No responses yet.                     │|
| Add Weight                    | │ ... (endless scroll)                         │|
| [New name___] [Val] [Save Draft]  | └──────────────────────────────────────────────┘|
|                               |                                                 |
| Saved Search Terms            |    Legend:  ○D = Draft status                  |
|  jesus                        |             ●P = Published status              |
|  miracles                     |                                                 |
|  resurrection                 |    Each row title links to the public           |
|                               |    frontend page:                              |
| Search Terms (add/modify)     |    /frontend/pages/debate/                      |
| ┌─────────────────────────┐   |      popular_challenge.html?id={slug}           |
| │ jesus                   │   |                                                 |
| │ miracles                │   |                                                 |
| │ resurrection            │   |                                                 |
| └─────────────────────────┘   |                                                 |
| Currently editing: **Popular** |                                                 |
| search terms                   |                                                 |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

> **Draft/Publish Cycle:** Same as Academic (§4.2a). "Save Draft" collects sidebar state and PUTs with `status: 'draft'`. "Calculate" re-sorts using saved weights and sets ALL records to draft. "Gather" uses the shared `gather_trigger.js`. Only "Publish" commits ranks to live.

**Overview List:**
A single read-only "Saved Search Terms" overview section sits between the Add Weight form and the Search Terms textarea. It lists the active search terms for the current mode and refreshes on row selection and whenever search terms change. Two mode-specific scripts handle the rendering: `academic_challenge_search_terms.js` (for Academic) and `popular_challenge_search_terms.js` (for Popular).

**File Inventory:**
| File | Purpose |
|------|---------|
| `admin/frontend/dashboard_challenge_academic.html` | Academic-only challenge list management container with status legend |
| `admin/frontend/dashboard_challenge_popular.html` | Popular-only challenge list management container with status legend |
| `css/4.0_ranked_lists/dashboard/dashboard_challenge.css` | Sidebar controls, single-list region, overview styles, status legend (shared) |
| `js/4.0_ranked_lists/dashboard/dashboard_challenge_academic.js` | Academic module orchestration (single-mode, no toggle) |
| `js/4.0_ranked_lists/dashboard/dashboard_challenge_popular.js` | Popular module orchestration (single-mode, no toggle) |
| `js/4.0_ranked_lists/dashboard/challenge_list_display.js` | Data fetching, row hydration, frontend-page links |
| `js/4.0_ranked_lists/dashboard/challenge_weighting_handler.js` | Weight & search term management, auto-save |
| `js/4.0_ranked_lists/dashboard/challenge_ranking_calculator.js` | Score/rank logic + Agent Search |
| `js/4.0_ranked_lists/dashboard/insert_challenge_response.js` | Response creation & linking |

### 4.3 Backend for Inserting Challenge Responses (`insert_challenge_response.js`)
**Corresponds to Public Sections:** 4.2 (Challenge Views with Response Inserted)
**Purpose:** Browse challenge lists and link a written response to a specific challenge record. The response content itself is authored in §5.2. This functionality is integrated into the Challenge dashboard (§4.2) via the "Insert Response" button and the Responses tab.

**DB Fields:**
```
── WRITE ─────────────────────────────────────────────────────────────────
responses         TEXT (JSON Blob)   — links this record to one or more
                                        response records; content authored
                                        in §5.2 dashboard_challenge_response.js
challenge_id      TEXT (FK)          — set on the new response record

── READ ONLY (list display) ──────────────────────────────────────────────
academic_challenge_title  TEXT       — challenge label (Academic tab)
academic_challenge_rank   TEXT (64-bit int) — sort order
popular_challenge_title   TEXT       — challenge label (Popular tab)
popular_challenge_rank    TEXT (64-bit int) — sort order
```

```text
+---------------------------------------------------------------------------------+
| [✦✦] Jesus Website Dashboard | < Return to Frontpage | Dashboard | Logout >      |
+---------------------------------------------------------------------------------+
| Function Bar: [ Save Draft ]   [ Publish ]   [ Delete ]   [ Gather ]   [ Calculate ]   [ ★ Insert Response ] |
+---------------------------------------------------------------------------------+
| Weighting Ranks (Sidebar)     | Ranked Challenge List (Main Area)               |
|-------------------------------+-------------------------------------------------|
| WEIGHTING RANKS               | ┌─ Academic Challenges (visible) ─────────────┐ |
|                               | │ 1. Challenge Title One    Score: 85  ○D     │ |
| Difficulty         [8]        | │     └─ Response: (Draft)                    │ |
| Scholarly Interest  [5]       | │ 2. Challenge Title Two    Score: 72  ●P     │ |
| Historical Signif.  [7]       | │     └─ Response: (Published)                │ |
|                               | │ 3. Challenge Title Three  Score: 60  ○D     │ |
| Add Weight                    | │     └─ No responses yet.                    │ |
| [New name___] [Val] [Publish] | │ ... (endless scroll)                        │ |
|                               | └──────────────────────────────────────────────┘ |
| Current Search Terms (read)   | ┌─ Popular Challenges (hidden) ───────────────┐ |
|  jesus                        | │ (pre-loaded, aria-hidden="true")             │ |
|  historicity                  | │ shown when Popular toggle is active          │ |
|                               | └──────────────────────────────────────────────┘ |
| Current Ranking Weights (read)|                                                 |
|  Difficulty: 8                |  ── When [ Insert Response ] button clicked ──  |
|  Scholarly Interest: 5        |                                                 |
|                               | ┌─ <dialog> ──────────────────────────────────┐ |
| Search Terms (add/modify)     | │ Create Response                              │ |
| ┌─────────────────────────┐   | │                                              │ |
| │ jesus                   │   | │ Response Title:                              │ |
| │ historicity             │   | │ [______________________________________]     │ |
| │ early christianity      │   | │ Parent challenge: Challenge Title One        │ |
| └─────────────────────────┘   | │                                              │ |
| Currently editing: **Academic**| │        [Cancel]  [Create Draft Response]    │ |
| search terms                   | └──────────────────────────────────────────────┘ |
|                               |                                                 |
|                               |  POST /api/admin/responses                      |
|                               |  { parent_slug, title }                         |
|                               |  → Creates draft response (challenge_id set)    |
|                               |  → Refreshes challenge list (new sub-card)      |
|                               |  → Navigates to §5.2 Challenge Response editor  |
+---------------------------------------------------------------------------------+
| [ Status Bar: System running normally / Error logs appear here ]                |
+---------------------------------------------------------------------------------+
```

---

