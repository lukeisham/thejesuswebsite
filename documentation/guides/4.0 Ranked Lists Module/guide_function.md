---
name: guide_function.md
purpose: Visual ASCII representations of Ranked Lists Module data flows — Wikipedia weights, challenge weights, responses, public frontend
version: 1.0.0
dependencies: [detailed_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md]
---

# Purpose of this document.

# Purpose of this document. 

This document provides visual ASCII representations detailing how data physically flows through the 8 interconnected modules of the application.

---

---

## 4.0 Ranked Lists Module

### 4.1 Wikipedia Weights — Data Flow

The Wikipedia dashboard module provides a dual-pane interface for managing
Wikipedia article rankings. The left sidebar shows contextual record details
(title, slug, weight multiplier, search terms, snippet, slug, meta) for the
selected record. The right pane displays the ranked list.

**Draft/Publish Cycle:** All edits (weight, search terms, metadata) save the
record as draft. "Refresh" re-sorts by weight and sets records to draft.
"Recalculate" re-fetches Wikipedia data via the pipeline and sets the record
to draft. Only "Publish" sets all listed records to published and commits
the final ranked order to the live frontend.

 +----------------------------------------------------------+
 | 1. ADMIN ACTION: Select a record from the ranked list    |
 |    -> sidebar populates with record title, slug, weight |
 |    -> search terms render as deletable chips             |
 |    -> metadata (snippet/slug/meta) loads for editing     |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 2. ADMIN ACTION: Edit weight / search terms / metadata   |
 |    -> Weight: PUT /api/admin/records/{id} with           |
 |       wikipedia_weight + status=draft                    |
 |    -> Search Terms: add/remove chips, save as JSON array |
 |       via PUT with status=draft                          |
 |    -> Metadata: snippet/slug/meta editable with          |
 |       auto-gen buttons (calls snippet_generator.py /      |
 |       metadata_generator.py via POST endpoints)          |
 |    -> Slug auto-gen: local slugify from title            |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 3. ADMIN ACTION: Click "Recalculate" (per record or all) |
 |    -> launches `pipeline_wikipedia.py`                   |
 |    -> reads wikipedia_search_term from records table     |
 |    -> queries Wikipedia REST API with search terms       |
 |    -> filters out non-article pages (disambiguation,     |
 |       lists, categories, portals, templates)             |
 |    -> selects best match, computes base score from       |
 |       wordcount (log scale, 1-100)                       |
 |    -> writes wikipedia_title, wikipedia_link (JSON),     |
 |       wikipedia_rank (base score) with status=draft      |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 4. ADMIN ACTION: Modify wikipedia_weight (JSON Object)     |
 |    (sidebar -> label/multiplier pairs)                   |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 5. ADMIN ACTION: Click "Refresh"                         |
 |    -> recalculates: Final Rank = Base Rank × Product of  |
 |       all active Multipliers                             |
 |    -> re-sorts list by computed score                    |
 |    -> PUTs new rank positions + status=draft             |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 6. ADMIN ACTION: Click "Publish"                         |
 |    -> PUT /api/admin/lists/wikipedia (ranked order)      |
 |    -> Sets all listed records to status=published        |
 +------------------------+---------------------------------+
                          |
                          v
 +----------------------------------------------------------+
 | 7. FRONTEND: Ranked Wikipedia List (§4.1)                |
 |    Public page reads wikipedia_rank, sorts, displays     |
 +----------------------------------------------------------+


### 4.2 Challenge Weights — Data Flow

The Challenge dashboard has been split into two independent single-mode pages
(\`dashboard_challenge_academic.js\` and \`dashboard_challenge_popular.js\`).
There is no toggle — each page is accessed via its own dashboard card and
hardcodes the mode. Both pages share the same sub-modules and backend pipelines.

#### 4.2a Academic Challenge Orchestrator Lifecycle

\`\`\`text
 +-------------------------------------------------------+
 |  Dashboard Card: "Academic Challenges" (🎓)         |
 |  -> window.loadModule("challenge-academic")          |
 +---------------------------+---------------------------+
                             |
                             v
 +-------------------------------------------------------+
 |  dashboard_app.js routes to:                          |
 |  window.renderChallengeAcademic()                     |
 +---------------------------+---------------------------+
                             |
                             v
 +-------------------------------------------------------+
 |  renderChallengeAcademic():                           |
 |  1. _setLayoutColumns("360px", "1fr")              |
 |  2. fetch /admin/frontend/                            |
 |     dashboard_challenge_academic.html                 |
 |  3. _setColumn("sidebar", sidebarHTML)               |
 |  4. _setColumn("main", functionBar + listAreaHTML)   |
 |  5. window.initChallengeWeighting()                   |
 |     -> Uses DEFAULT_WEIGHTS.academic for defaults     |
 |        (Difficulty, Scholarly Interest,               |
 |         Historical Significance)                      |
 |  6. _refreshOverviews("academic")                    |
 |  7. _wireActionButtons()                              |
 |     -> Refresh, Publish, Agent Search,                |
 |        Insert Response                                |
 |  8. window.displayChallengeList("academic")          |
 |     -> populates _challengeModuleState.challenges    |
 |        AND .academicChallenges                       |
 |  9. window.initInsertChallengeResponse()              |
 | 10. window.renderMetadataWidget(...)                  |
 +---------------------------+---------------------------+
                             |
                             v
 +-------------------------------------------------------+
 |  User interacts with:                                 |
 |  - Weighting sidebar (add/edit/remove weights)        |
 |  - Search terms textarea (auto-save)                  |
 |  - Ranked list (select row, view public page)         |
 |  - Action buttons (Refresh, Publish, Agent Search,    |
 |    Insert Response)                                   |
 +---------------------------+---------------------------+
                             |
                             v
 +-------------------------------------------------------+
 |  Frontend Render: Ranked Academic List                |
 |  /frontend/pages/debate/academic_challenge.html       |
 +-------------------------------------------------------+
\`\`\`

#### 4.2b Popular Challenge Orchestrator Lifecycle

The Popular flow is functionally identical to the Academic flow (§4.2a). Only
three things differ:

1. **Mode string:** \`"popular"\` instead of \`"academic"\`
2. **HTML template URL:** \`/admin/frontend/dashboard_challenge_popular.html\`
3. **Default weights:** \`DEFAULT_WEIGHTS.popular\` (Popularity, Virality,
   Search Volume) instead of \`DEFAULT_WEIGHTS.academic\`

No toggle, no state switching, no \`_saveCurrentModeState\` /
\`_restoreModeState\` — the orchestrator is a single hardcoded mode with
a flat state object.

#### Shared Backend Pipelines

Both pages share the same Python pipelines. Each pipeline filters by its
own type discriminator (`WHERE type = 'challenge_academic'` /
`WHERE type = 'challenge_popular'`) so it only processes records of its
intended challenge type:

\`\`\`text
 +----------------------------------+
 |  Backend Pipelines               |
 |                                  |
 | pipeline_academic_challenges.py  |
 | pipeline_popular_challenges.py   |
 +-----------+----------------------+
             |
             v
 +-------------------------------------------------------+
 |           Update SQLite DB Records                    |
 |  academic_challenge_rank, academic_challenge_weight,   |
 |  popular_challenge_rank,  popular_challenge_weight,    |
 |  (plus _title and _link columns)                      |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |    WASM Query -> ORDER BY academic_rank DESC          |
 |                   / popular_rank DESC                 |
 +-------------------------------------------------------+
                     |
                     v
 +-------------------------------------------------------+
 |  Frontend Render: Ranked Academic + Popular Lists     |
 |  (§4.2 Public Views — 2 separate ranked feeds)        |
 +-------------------------------------------------------+
\`\`\`

### 4.3 Inserting Responses — Data Flow

> **Schema Note:** The public API now uses `WHERE type = 'challenge_academic'` as the primary discriminator for fetching academic challenges. `academic_challenge_title != ''` is retained as a legacy fallback.

```text
 +-------------------------------------------------------+
 |        Admin Portal: dashboard_app.js                 |
 |   Routing -> ranks-responses (Insert Responses)        |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 |   Router injects single-list container              |
 |   (mode hardcoded per page — no toggle)              |
 +-------------------------------------------------------+
                         |
                         v
 +-------------------------------------------------------+
 | renderChallengeAcademic() or renderChallengePopular() |
 | -> initInsertChallengeResponse() wires dialog         |
 +-------------------------------------------------------+
             |                                |
             v                                v
 +-------------------------------------------------------+
 |  Fetches challenge list from SQLite (read-only):      |
 |    SELECT academic_challenge_title,                   |
 |           academic_challenge_rank,                    |
 |           responses                                   |
 |    FROM records                                       |
 |    WHERE academic_challenge_title != ''               |
 |    ORDER BY academic_challenge_rank                   |
 +-------------------------------------------------------+
             |
             v
 +-------------------------------------------------------+
 |  Renders browsable list with response status:         |
 |                                                       |
 |  1. historicity-of-miracles                           |
 |     responses: [none]               [+ Add Response]  |
 |                                                       |
 |  2. council-of-nicaea-claims                          |
 |     responses: [none]               [+ Add Response]  |
 |                                                       |
 |  3. jesus-myth-theory                                 |
 |     responses: [response-001]   [Remove]   [Edit]    |
 +-------------------------------------------------------+
             |
    +--------+--------+
    |                  |
    v                  v
 +------------------+  +-------------------------------+
 | [+ Add Response] |  | [Save / Remove]               |
 |                  |  |                               |
 | Opens §5.2       |  | PUT /api/admin/records/{id}   |
 | Response Editor  |  | Body: { responses:            |
 | to author        |  |   "response-001" }            |
 | content, then    |  |                               |
 | links back here  |  | -> Removes response link      |
 |                  |  |    when empty                 |
 +------------------+  +-------------------------------+
    |                  +-------------------------------+
    +--------+---------+
             |
             v
 +-------------------------------------------------------+
 |           Update SQLite DB Records                    |
 |    responses column (JSON Blob) updated with          |
 |    linked response ID(s)                              |
 +-------------------------------------------------------+
             |
             v
 +-------------------------------------------------------+
 |   Frontend re-render: list refreshes with new status  |
 +-------------------------------------------------------+
```
### 4.4 Challenge Frontend Data Flow (Public)

> **Plan:** `fix_frontend_schema_compliance.md`
>
> The public challenge and Wikipedia list views now fetch real data from the
> `/api/public/challenges` and `/api/public/wikipedia` endpoints, using type
> discriminators (`challenge_academic`, `challenge_popular`, `wikipedia_entry`)
> and `status = 'published'` filtering. Rows are grouped by `id` to merge main
> entries with their `ranked_weight` sub-type rows, then sorted by computed
> score for ranked display.

```text
  [ User navigates to /debate/academic-challenges ]
              |
              v
  +-------------------------------------------------------------------------+
  | list_view_academic_challenges.js — renderAcademicChallengesList()        |
  |   FETCH /api/public/challenges?type=challenge_academic&status=published  |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  | serve_all.py — public_challenges()                                       |
  |   SELECT id, title, slug, snippet, status, sub_type,                     |
  |          academic_challenge_title, academic_challenge_link,              |
  |          academic_challenge_rank, academic_challenge_weight              |
  |   FROM records                                                           |
  |   WHERE type = 'challenge_academic' AND status = 'published'             |
  |   GROUP BY id ORDER BY created_at DESC                                   |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  GROUP & MERGE (client-side)                                             |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | Rows grouped by id:                                               |    |
  |  |   sub_type = null           → main entry (title, link, rank)      |    |
  |  |   sub_type = 'ranked_weight' → weight row (academic_challenge_    |    |
  |  |                                weight JSON with multipliers)      |    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  COMPUTE SCORE                                                           |
  |  Parse academic_challenge_weight JSON → extract score (number/array/obj)  |
  |  Sort challenges by score descending                                     |
  +-------------------------------------------------------------------------+
              |
              v
  +-------------------------------------------------------------------------+
  |  RENDER RANKED ROWS                                                      |
  |  ┌──────────────────────────────────────────────────────────────────┐    |
  |  | #1  [score 98.5]  academic_challenge_title → /debate/challenge?id=|    |
  |  |     └─ Response sub-card (if challenge_id linked)                 |    |
  |  | #2  [score 87.2]  academic_challenge_title → ...                  |    |
  |  | ...                                                              |    |
  |  └──────────────────────────────────────────────────────────────────┘    |
  +-------------------------------------------------------------------------+

  ─── PARALLEL FLOWS ────────────────────────────────────────────────────────

  /debate/popular-challenges:
    → list_view_popular_challenges.js
    → /api/public/challenges?type=challenge_popular&status=published
    → Uses popular_challenge_* columns (same grouping/merge/score pattern)

  /debate/wikipedia-articles:
    → list_view_wikipedia.js
    → /api/public/wikipedia?status=published
    → Uses wikipedia_* columns (same grouping/merge/score pattern)

  /debate/response?id={slug}:
    → response_display.js
    → /api/public/responses/{slug}
    → Renders body (markdown→HTML), bibliography, context_links
    → Links back to parent challenge via challenge_id
```

---

