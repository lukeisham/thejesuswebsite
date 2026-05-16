---
name: guide_function.md
purpose: Visual ASCII representations of Ranked Lists Module data flows — Wikipedia ranking pipeline, challenge ranking pipeline (academic + popular), response insertion, public frontend
version: 1.1.1
dependencies: [simple_module_sitemap.md, data_schema.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, ranked_lists_nomenclature.md]
---

## 4.0 Ranked Lists Module

### 4.1 Wikipedia Life Cycle

```text
+------------------------------------------------------------------+
|  SIDEBAR INPUTS (contextual — populates on row selection)         |
|                                                                    |
|  Wikipedia Weights:                                                |
|    Label/multiplier pairs (JSON Object in wikipedia_weight)        |
|    [Scholarly: 8] [Popularity: 5] [Historical: 7]                  |
|    Add Weight: [New name___] [Val] [Add Weight]                    |
|                                                                    |
|  Saved Search Terms (read-only overview):                          |
|    - Tacitus Annals                                                |
|    - Tacitus historiography                                        |
|                                                                    |
|  Search Terms (add/modify textarea):                               |
|    Auto-saves on change via wikipedia_search_terms.js              |
|    Writes to wikipedia_search_term column (JSON Array)             |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  GATHER BUTTON (triggers pipeline_wikipedia.py)                   |
|                                                                    |
|  1. Reads wikipedia_search_term from records table                 |
|  2. Queries Wikipedia REST API with each search term               |
|  3. Filters out non-article pages (disambiguation, lists,          |
|     categories, portals, templates)                                |
|  4. Selects best match per term                                    |
|  5. Computes base score from wordcount (log scale, 1-100)          |
|  6. Writes wikipedia_title, wikipedia_link (JSON),                 |
|     wikipedia_rank (base score) with status='draft'                |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  CALCULATE BUTTON (wikipedia_ranking_calculator.js)               |
|                                                                    |
|  refreshWikipediaRankings():                                       |
|  1. Reads all records with wikipedia_rank > 0                      |
|  2. For each record:                                               |
|     Final Rank = Base Rank x Product of all active Multipliers     |
|     (multipliers parsed from wikipedia_weight JSON Object)         |
|  3. Sorts records by computed score descending                     |
|  4. PUTs new rank positions with status='draft'                    |
|     (default-to-draft rule: even published records revert)         |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SAVE DRAFT / PUBLISH (function bar actions)                      |
|                                                                    |
|  Save Draft:                                                       |
|    Collects sidebar state (weights, terms, slug, snippet, meta)    |
|    PUT /api/admin/records/{id} with status='draft'                 |
|    Does NOT trigger re-rank                                        |
|                                                                    |
|  Publish:                                                          |
|    publishWikipediaRankings():                                     |
|    PUT /api/admin/lists/wikipedia (ranked order)                   |
|    Sets ALL listed records to status='published'                   |
|    Commits final ranked order to live frontend                     |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='wikipedia_entry', sub_type=NULL: main article entries       |
|  type='wikipedia_entry', sub_type='ranked_weight': weight rows     |
|                                                                    |
|  Columns: wikipedia_title, wikipedia_link (JSON Blob),             |
|  wikipedia_rank (64-bit int), wikipedia_weight (JSON Object),      |
|  wikipedia_search_term (JSON Array), snippet, slug, status         |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/wikipedia?status=published                            |
|                                                                    |
|  Client-side grouping (list_view_wikipedia.js):                    |
|    sub_type = NULL         -> main entry (title, link, rank)       |
|    sub_type = 'ranked_weight' -> weight row (multipliers JSON)     |
|  Rows grouped by id, score computed, sorted descending             |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Full feed (wikipedia.html):                                       |
|    list_view_wikipedia.js — ranked list with sidebar filters       |
|    Each row: rank position, title, snippet, thumbnail,             |
|    external link to Wikipedia article                              |
+------------------------------------------------------------------+
```

### 4.2 Challenge Life Cycle (Academic + Popular)

```text
+------------------------------------------------------------------+
|  DASHBOARD ROUTING (two independent single-mode pages)            |
|                                                                    |
|  dashboard_app.js -> loadModule("challenge-academic")              |
|    -> window.renderChallengeAcademic()                             |
|    -> DEFAULT_WEIGHTS.academic:                                    |
|       Difficulty [8], Scholarly Interest [5],                       |
|       Historical Significance [7]                                  |
|                                                                    |
|  dashboard_app.js -> loadModule("challenge-popular")               |
|    -> window.renderChallengePopular()                               |
|    -> DEFAULT_WEIGHTS.popular:                                     |
|       Popularity [3], Virality [5], Search Volume [4]              |
|                                                                    |
|  No toggle — each page is accessed via its own dashboard card      |
|  and hardcodes the mode string ("academic" or "popular")           |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  ORCHESTRATOR INIT (per mode)                                     |
|                                                                    |
|  renderChallengeAcademic() / renderChallengePopular():             |
|   1. _setLayoutColumns("360px", "1fr")                             |
|   2. Fetch HTML template from /admin/frontend/                     |
|      dashboard_challenge_{mode}.html                               |
|   3. _setColumn("sidebar", sidebarHTML)                            |
|   4. _setColumn("main", functionBar + listAreaHTML)                |
|   5. window.initChallengeWeighting()                               |
|      -> Loads DEFAULT_WEIGHTS[mode] or cached per-mode state       |
|   6. _refreshOverviews(mode)                                       |
|   7. _wireActionButtons() -> Refresh, Publish, Agent Search,       |
|      Insert Response                                               |
|   8. window.displayChallengeList(mode)                             |
|      -> Populates _challengeModuleState.challenges                 |
|   9. window.initInsertChallengeResponse()                          |
|  10. window.renderMetadataWidget(...)                               |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SIDEBAR INPUTS (challenge_weighting_handler.js)                  |
|                                                                    |
|  Weighting Criteria:                                               |
|    Editable label/value pairs rendered as rows                     |
|    Reorder, edit value, remove supported                           |
|    Add Weight form: [New name___] [Val] [Save Draft]               |
|    Auto-saves on every change with status='draft'                  |
|    Per-mode state cached independently:                            |
|      _challengeModuleState.academicWeightingCriteria               |
|      _challengeModuleState.popularWeightingCriteria                |
|                                                                    |
|  Saved Search Terms (read-only overview):                          |
|    academic_challenge_search_terms.js (Academic mode)               |
|    popular_challenge_search_terms.js (Popular mode)                 |
|    Refreshes on row selection and term changes                     |
|                                                                    |
|  Search Terms (add/modify textarea):                               |
|    Auto-saves on change, writes to *_search_term (JSON Array)      |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  GATHER BUTTON (shared gather_trigger.js -> DeepSeek agent)       |
|                                                                    |
|  Triggers pipeline:                                                |
|    pipeline_academic_challenges.py (WHERE type='challenge_academic')|
|    pipeline_popular_challenges.py  (WHERE type='challenge_popular') |
|                                                                    |
|  Uses saved search terms to discover external sources via          |
|  DeepSeek agent pipeline                                           |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  AGENT SEARCH BUTTON (challenge_ranking_calculator.js)            |
|                                                                    |
|  window.triggerAgentSearch():                                       |
|  Triggers a DeepSeek agent pipeline run for the SELECTED           |
|  challenge record — discovers external sources using that           |
|  record's saved search terms                                       |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  CALCULATE BUTTON (challenge_ranking_calculator.js)               |
|                                                                    |
|  1. Reads all records for current mode                             |
|  2. For each record:                                               |
|     Final Rank = Base Rank x Product of all active Multipliers     |
|     (multipliers from *_challenge_weight JSON Object)              |
|  3. Sorts by computed score descending                             |
|  4. PUTs new rank positions with status='draft'                    |
|     (default-to-draft rule: all records revert to draft)           |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  INSERT RESPONSE (insert_challenge_response.js)                   |
|                                                                    |
|  1. Opens <dialog> with title input + parent challenge context     |
|  2. POST /api/admin/responses { parent_slug, title }               |
|  3. Creates draft response record with challenge_id FK set         |
|  4. Links response ID into parent's responses column (JSON Blob)   |
|  5. Refreshes challenge list (new response sub-card appears)       |
|  6. Navigates to 5.2 Challenge Response editor                     |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SAVE DRAFT / PUBLISH (function bar actions)                      |
|                                                                    |
|  Save Draft:                                                       |
|    Collects sidebar state (weights, terms)                         |
|    PUT /api/admin/records/{id} with status='draft'                 |
|    Does NOT trigger re-rank                                        |
|                                                                    |
|  Publish:                                                          |
|    Sets ALL listed records to status='published'                   |
|    Commits final ranked order to live frontend                     |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  SQLite Database — records table                                  |
|                                                                    |
|  type='challenge_academic', sub_type=NULL: main entries             |
|  type='challenge_academic', sub_type='ranked_weight': weight rows   |
|  type='challenge_popular',  sub_type=NULL: main entries             |
|  type='challenge_popular',  sub_type='ranked_weight': weight rows   |
|                                                                    |
|  Academic columns: academic_challenge_title,                        |
|    academic_challenge_link (JSON Blob),                             |
|    academic_challenge_rank (64-bit int),                            |
|    academic_challenge_weight (JSON Object),                         |
|    academic_challenge_search_term (JSON Array)                      |
|                                                                    |
|  Popular columns: popular_challenge_title,                          |
|    popular_challenge_link (JSON Blob),                              |
|    popular_challenge_rank (64-bit int),                             |
|    popular_challenge_weight (JSON Object),                          |
|    popular_challenge_search_term (JSON Array)                       |
|                                                                    |
|  Response linking: responses (JSON Blob), challenge_id (FK)        |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Public API — serve_all.py                                        |
|                                                                    |
|  /api/public/challenges?type=challenge_academic&status=published    |
|  /api/public/challenges?type=challenge_popular&status=published     |
|                                                                    |
|  Client-side grouping:                                             |
|    sub_type = NULL         -> main entry (title, link, rank)       |
|    sub_type = 'ranked_weight' -> weight row (multipliers JSON)     |
|  Rows grouped by id, score computed, sorted descending             |
+----------------------------------+-------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  Frontend Display                                                  |
|                                                                    |
|  Academic (academic_challenge.html):                                |
|    list_view_academic_challenges_with_response.js                   |
|    Ranked list with response sub-cards inserted inline              |
|                                                                    |
|  Popular (popular_challenge.html):                                  |
|    list_view_popular_challenges_with_response.js                    |
|    Ranked list with response sub-cards inserted inline              |
|                                                                    |
|  Each row: rank position, challenge title, snippet,                |
|    thumbnail + external link, optional response sub-card            |
|    (title, snippet, thumbnail + internal link to /debate/response)  |
|                                                                    |
|  Single response (/debate/response?id={slug}):                     |
|    response_display.js — renders body (markdown->HTML),             |
|    bibliography, context_links, links back via challenge_id         |
+------------------------------------------------------------------+
```

---

## Technical Description

### Wikipedia Function

The Wikipedia module's data flow begins with the dual-pane dashboard loaded by `dashboard_wikipedia.js`. The left sidebar (`wikipedia_sidebar_handler.js`) delegates to two sub-modules: `wikipedia_weights.js` renders the multi-weight editor where each named multiplier (e.g. "Scholarly: 8") is stored as a label/value pair in the `wikipedia_weight` JSON Object column, and `wikipedia_search_terms.js` manages a read-only overview list plus an editable textarea that auto-saves search terms to the `wikipedia_search_term` JSON Array column. When the Gather button is clicked, `pipeline_wikipedia.py` reads search terms from the records table, queries the Wikipedia REST API for each term, filters out non-article pages (disambiguation, lists, categories, portals, templates), selects the best match, and computes a base score from the article's wordcount on a log scale (1-100), writing `wikipedia_title`, `wikipedia_link`, and `wikipedia_rank` with `status='draft'`. The Calculate button triggers `refreshWikipediaRankings()` in `wikipedia_ranking_calculator.js`, which computes `Final Rank = Base Rank x Product of all active Multipliers` for every record, re-sorts the list by score, and PUTs new rank positions — all records revert to draft under the default-to-draft rule, even previously published ones. Save Draft collects the current sidebar state and PUTs without triggering a re-rank. Only Publish (via `publishWikipediaRankings()`) sets all listed records to `status='published'` and commits the final ranked order to the live frontend. On the public side, `list_view_wikipedia.js` fetches `/api/public/wikipedia?status=published`, groups rows by `id` to merge main entries (`sub_type=NULL`) with their `ranked_weight` sub-type rows, computes scores from the weight JSON, sorts descending, and renders each row with rank position, title, snippet, thumbnail, and external Wikipedia link.

### Challenge Function

The Challenge module is split into two independent single-mode dashboard pages — `dashboard_challenge_academic.js` and `dashboard_challenge_popular.js` — each accessed via its own dashboard card with no toggle or state switching. The orchestrator (`renderChallengeAcademic()` or `renderChallengePopular()`) sets the Providence layout to a 360px sidebar and 1fr main column, fetches the mode-specific HTML template, initialises `challenge_weighting_handler.js` with `DEFAULT_WEIGHTS[mode]` (Academic: Difficulty/Scholarly Interest/Historical Significance; Popular: Popularity/Virality/Search Volume), wires the action buttons, populates the ranked list via `challenge_list_display.js`, and initialises `insert_challenge_response.js`. The weighting handler manages an interactive criteria list with add/edit/remove/reorder, auto-saving every change as draft and caching per-mode state independently in `_challengeModuleState` (`.academicWeightingCriteria` / `.popularWeightingCriteria`). The Gather button triggers mode-specific Python pipelines (`pipeline_academic_challenges.py` or `pipeline_popular_challenges.py`) which filter by type discriminator and use saved search terms via a DeepSeek agent to discover external sources. Agent Search (`triggerAgentSearch()`) does the same for a single selected record. Calculate re-sorts using `Final Rank = Base Rank x Product of all active Multipliers` from the `*_challenge_weight` JSON Object and reverts all records to draft. Insert Response opens a `<dialog>`, creates a new draft response record with `challenge_id` FK linking it to the selected challenge, updates the parent's `responses` JSON Blob column, and navigates to the 5.2 Challenge Response editor. On the public side, `list_view_academic_challenges_with_response.js` and `list_view_popular_challenges_with_response.js` fetch from `/api/public/challenges?type={mode}&status=published`, group rows by `id` to merge main entries with weight sub-type rows, compute and sort by score, and render ranked rows with response sub-cards inserted inline — each response linking to `/debate/response?id={slug}` where `response_display.js` renders the full body, bibliography, and context links.
