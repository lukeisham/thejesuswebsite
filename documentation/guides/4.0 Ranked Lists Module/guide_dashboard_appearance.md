---
name: guide_dashboard_appearance.md
purpose: Visual ASCII representations of the Admin Portal dashboard screens for 4.0 Ranked Lists Module — Wikipedia, Academic Challenge, Popular Challenge
version: 1.1.0
dependencies: [simple_module_sitemap.md, data_schema.md, guide_frontend_appearance.md, guide_function.md, ranked_lists_nomenclature.md]
---

## 4.1 Wikipedia Dashboard (`dashboard_wikipedia.html`)

```text
+---------------------------------------------------------------------------------+
| #wikipedia-function-bar  .function-bar                                          |
|                                                                                 |
| [ Save Draft ]  [ Publish ]  [ Delete ]  [ Gather ]  [ Calculate ]             |
|  .btn--draft     .btn--publish .btn--delete .btn--accent .btn--secondary        |
+---------------------------------------------------------------------------------+
| #wikipedia-editor-layout  .wikipedia-editor-layout  (CSS Grid: 2 columns)       |
|                                                                                 |
| #wikipedia-sidebar                | .wikipedia-divider | #wikipedia-list-area   |
| .wikipedia-sidebar                | (1px structural)   | .wikipedia-list-area   |
|-----------------------------------+--------------------+------------------------|
| .wikipedia-sidebar__header        |                    |                        |
| h2: "ARTICLE DETAIL"             |                    |                        |
|                                   |                    |                        |
| ── Section 1: Article Info ──     |                    |                        |
| #wikipedia-record-info            |                    |                        |
| h3: "Article"                     |                    |                        |
| #wikipedia-record-title  "—"      |                    |                        |
| #wikipedia-record-slug   "—"      |                    |                        |
|                                   |                    |                        |
| <hr .wikipedia-sidebar__divider>  |                    |                        |
|                                   |                    |                        |
| ── Section 2: Weight Editor ──    |                    |                        |
| #wikipedia-weight-editor          |                    | #wikipedia-list-loading|
| h3: "Wikipedia Weight"            |                    |  .state-loading        |
|                                   |                    |  "Loading Wikipedia    |
| #wikipedia-weighting-list         |                    |   articles..."         |
|  .wikipedia-weighting-list        |                    |                        |
|  (dynamically populated rows)     |                    | #wikipedia-ranked-list |
|                                   |                    |  <ol> .wikipedia-      |
| #wikipedia-new-weight             |                    |   ranked-list          |
|  .wikipedia-new-weight__form      |                    |  (dynamically          |
|  [New name___] [Val] [Add]        |                    |   populated rows)      |
|   #wikipedia-new-weight-name      |                    |                        |
|   #wikipedia-new-weight-value     |                    |                        |
|   #btn-wikipedia-add-weight       |                    |                        |
|    .btn--draft                    |                    |                        |
|                                   |                    |                        |
| <hr .wikipedia-sidebar__divider>  |                    |                        |
|                                   |                    |                        |
| ── Section 3: Search Terms ──     |                    |                        |
| #wikipedia-search-terms           |                    |                        |
| h3: "Search Terms"                |                    |                        |
|                                   |                    |                        |
| .wikipedia-search-terms-overview  |                    |                        |
|  <ul> #wikipedia-search-terms-    |                    |                        |
|   overview-list                   |                    |                        |
|  (read-only, dynamically          |                    |                        |
|   populated)                      |                    |                        |
|                                   |                    |                        |
| #wikipedia-search-terms-input     |                    |                        |
|  <textarea rows="4">              |                    |                        |
|  placeholder: "Enter search       |                    |                        |
|   terms (one per line or          |                    |                        |
|   comma-separated)..."            |                    |                        |
|                                   |                    |                        |
| #wikipedia-search-terms-hint      |                    |                        |
|  "Currently editing:              |                    | #wikipedia-list-empty  |
|   **Wikipedia** search terms"     |                    |  .state-empty          |
|                                   |                    |  "No Wikipedia         |
| <hr .wikipedia-sidebar__divider>  |                    |   articles found..."   |
|                                   |                    |                        |
| ── Section 4: Metadata ���─         |                    | #wikipedia-list-error  |
| #wikipedia-metadata-container     |                    |  .state-error          |
|  (metadata widget injected by     |                    |  "Unable to load       |
|   wikipedia_sidebar_handler.js)   |                    |   Wikipedia list."     |
|                                   |                    |                        |
| <hr .wikipedia-sidebar__divider>  |                    |                        |
|                                   |                    |                        |
| ── Section 5: Actions ──          |                    |                        |
| #btn-wikipedia-recalculate-record |                    |                        |
|  .btn--secondary .btn--full       |                    |                        |
|  "Recalculate This Article"       |                    |                        |
+---------------------------------------------------------------------------------+
```

## 4.2a Academic Challenge Dashboard (`dashboard_challenge_academic.html`)

```text
+---------------------------------------------------------------------------------+
| #challenge-function-bar  .function-bar                                          |
|                                                                                 |
| [ Save Draft ] [ Publish ] [ Delete ] [ Gather ] [ Calculate ] [Insert Response]|
|  .btn--draft   .btn--publish .btn--delete .btn--accent .btn--secondary          |
+---------------------------------------------------------------------------------+
| #challenge-editor-layout  .challenge-editor-layout  (CSS Grid: 2 columns)       |
|                                                                                 |
| #challenge-sidebar                | .challenge-divider | #challenge-list-area   |
| .challenge-sidebar                | (1px structural)   | .challenge-list-area   |
|-----------------------------------+--------------------+------------------------|
| .challenge-sidebar__header        |                    |                        |
| h2 #challenge-sidebar-heading:    |                    |                        |
| "ACADEMIC WEIGHTING AND           |                    |                        |
|  SEARCH TERMS"                    |                    |                        |
|                                   |                    |                        |
| ── Weighting Criteria List ──     |                    | #challenge-status-     |
| #challenge-weighting-list         |                    |  legend                |
|  .challenge-weighting-list        |                    |  .challenge-status-    |
|  (dynamically populated rows      |                    |   legend               |
|   by challenge_weighting_         |                    |  ○D = Draft status     |
|   handler.js)                     |                    |  ●P = Published status |
|                                   |                    |                        |
| ── Add Weight Form ──             |                    |                        |
| #challenge-new-weight             |                    | #academic-challenge-   |
|  .challenge-new-weight            |                    |  list-region           |
| h3: "Add Weight"                  |                    |  .challenge-list-region|
|  .challenge-new-weight__form      |                    |                        |
|  [New name___] [Val] [Save Draft] |                    | .challenge-list-       |
|   #challenge-new-weight-name      |                    |  region__header        |
|   #challenge-new-weight-value     |                    | h3: "Academic          |
|   #btn-challenge-add-weight       |                    |  Challenges"           |
|    .btn--draft                    |                    | <a> "View Public       |
|                                   |                    |  Page ->"              |
| ── Saved Ranking Weights ──       |                    |  (links to /frontend/  |
| #challenge-ranking-weights-       |                    |   pages/debate/        |
|  overview                         |                    |   academic_challenge   |
| h3: "Saved Ranking Weights"       |                    |   .html)               |
| <ul> #challenge-ranking-weights-  |                    |                        |
|  overview-list                    |                    | #academic-challenge-   |
|  .challenge-overview-list         |                    |  list-loading          |
|  (read-only, dynamically          |                    |  .state-loading        |
|   populated by academic_          |                    |  "Loading              |
|   challenge_ranking_weights.js)   |                    |   challenges..."       |
|                                   |                    |                        |
| ── Saved Search Terms ──          |                    | #academic-challenge-   |
| #challenge-search-terms-overview  |                    |  ranked-list           |
| h3: "Saved Search Terms"          |                    |  <ol> .challenge-      |
| <ul> #challenge-search-terms-     |                    |   ranked-list          |
|  overview-list                    |                    |  (dynamically          |
|  .challenge-overview-list         |                    |   populated by         |
|  (read-only, dynamically          |                    |   challenge_list_      |
|   populated by academic_          |                    |   display.js)          |
|   challenge_search_terms.js)      |                    |                        |
|                                   |                    | #academic-challenge-   |
| ── Search Terms (add/modify) ──   |                    |  list-empty            |
| #challenge-search-terms           |                    |  .state-empty          |
| h3: "Search Terms (add/modify)"   |                    |                        |
|                                   |                    | #academic-challenge-   |
| #challenge-search-terms-input     |                    |  list-error            |
|  <textarea rows="4">              |                    |  .state-error          |
|  placeholder: "Enter search       |                    |                        |
|   terms (one per line or          |                    |                        |
|   comma-separated)..."            |                    |                        |
|                                   |                    |                        |
| #challenge-search-terms-hint      |                    |                        |
|  "Currently editing:              |                    |                        |
|   **Academic** search terms"      |                    |                        |
|                                   |                    |                        |
| ── Metadata Widget ──             |                    |                        |
| #metadata-widget-container        |                    |                        |
|  .challenge-sidebar__section      |                    |                        |
|  (injected by orchestrator)       |                    |                        |
+---------------------------------------------------------------------------------+

+---------------------------------------------------------------------------------+
| <dialog> #challenge-insert-response-dialog  .challenge-dialog                   |
| (hidden by default — shown on "Insert Response" click)                          |
|                                                                                 |
| .challenge-dialog__header                                                       |
|   h3: "Create Response"                                                         |
|                                                                                 |
| .challenge-dialog__body                                                         |
|   <label> "Response Title"                                                      |
|   <input> #challenge-response-title-input  .challenge-dialog__input             |
|   <p> #challenge-response-parent-label  .challenge-dialog__parent-label         |
|                                                                                 |
| .challenge-dialog__footer                                                       |
|   [Cancel]                .btn--draft                                           |
|   [Create Draft Response] .btn--publish                                         |
+---------------------------------------------------------------------------------+
```

## 4.2b Popular Challenge Dashboard (`dashboard_challenge_popular.html`)

```text
+---------------------------------------------------------------------------------+
| #challenge-function-bar  .function-bar                                          |
|                                                                                 |
| [ Save Draft ] [ Publish ] [ Delete ] [ Gather ] [ Calculate ] [Insert Response]|
|  .btn--draft   .btn--publish .btn--delete .btn--accent .btn--secondary          |
+---------------------------------------------------------------------------------+
| #challenge-editor-layout  .challenge-editor-layout  (CSS Grid: 2 columns)       |
|                                                                                 |
| #challenge-sidebar                | .challenge-divider | #challenge-list-area   |
| .challenge-sidebar                | (1px structural)   | .challenge-list-area   |
|-----------------------------------+--------------------+------------------------|
| .challenge-sidebar__header        |                    |                        |
| h2 #challenge-sidebar-heading:    |                    |                        |
| "POPULAR WEIGHTING AND            |                    |                        |
|  SEARCH TERMS"                    |                    |                        |
|                                   |                    |                        |
| ── Weighting Criteria List ──     |                    | #challenge-status-     |
| #challenge-weighting-list         |                    |  legend                |
|  .challenge-weighting-list        |                    |  ○D = Draft status     |
|  (dynamically populated rows      |                    |  ●P = Published status |
|   by challenge_weighting_         |                    |                        |
|   handler.js)                     |                    |                        |
|                                   |                    |                        |
| ── Add Weight Form ──             |                    | #popular-challenge-    |
| #challenge-new-weight             |                    |  list-region           |
| h3: "Add Weight"                  |                    |  .challenge-list-region|
|  .challenge-new-weight__form      |                    |                        |
|  [New name___] [Val] [Save Draft] |                    | .challenge-list-       |
|   #challenge-new-weight-name      |                    |  region__header        |
|   #challenge-new-weight-value     |                    | h3: "Popular           |
|   #btn-challenge-add-weight       |                    |  Challenges"           |
|    .btn--draft                    |                    | <a> "View Public       |
|                                   |                    |  Page ->"              |
| ── Saved Ranking Weights ──       |                    |  (links to /frontend/  |
| #challenge-ranking-weights-       |                    |   pages/debate/        |
|  overview                         |                    |   popular_challenge    |
| h3: "Saved Ranking Weights"       |                    |   .html)               |
| <ul> #challenge-ranking-weights-  |                    |                        |
|  overview-list                    |                    | #popular-challenge-    |
|  .challenge-overview-list         |                    |  list-loading          |
|  (read-only, dynamically          |                    |  .state-loading        |
|   populated by popular_           |                    |  "Loading              |
|   challenge_ranking_weights.js)   |                    |   challenges..."       |
|                                   |                    |                        |
| ── Saved Search Terms ──          |                    | #popular-challenge-    |
| #challenge-search-terms-overview  |                    |  ranked-list           |
| h3: "Saved Search Terms"          |                    |  <ol> .challenge-      |
| <ul> #challenge-search-terms-     |                    |   ranked-list          |
|  overview-list                    |                    |  (dynamically          |
|  .challenge-overview-list         |                    |   populated by         |
|  (read-only, dynamically          |                    |   challenge_list_      |
|   populated by popular_           |                    |   display.js)          |
|   challenge_search_terms.js)      |                    |                        |
|                                   |                    | #popular-challenge-    |
| ── Search Terms (add/modify) ──   |                    |  list-empty            |
| #challenge-search-terms           |                    |  .state-empty          |
| h3: "Search Terms (add/modify)"   |                    |                        |
|                                   |                    | #popular-challenge-    |
| #challenge-search-terms-input     |                    |  list-error            |
|  <textarea rows="4">              |                    |  .state-error          |
|  placeholder: "Enter search       |                    |                        |
|   terms (one per line or          |                    |                        |
|   comma-separated)..."            |                    |                        |
|                                   |                    |                        |
| #challenge-search-terms-hint      |                    |                        |
|  "Currently editing:              |                    |                        |
|   **Popular** search terms"       |                    |                        |
|                                   |                    |                        |
| ── Metadata Widget ──             |                    |                        |
| #metadata-widget-container        |                    |                        |
|  .challenge-sidebar__section      |                    |                        |
|  (injected by orchestrator)       |                    |                        |
+---------------------------------------------------------------------------------+

+---------------------------------------------------------------------------------+
| <dialog> #challenge-insert-response-dialog  .challenge-dialog                   |
| (hidden by default — shown on "Insert Response" click)                          |
|                                                                                 |
| .challenge-dialog__header                                                       |
|   h3: "Create Response"                                                         |
|                                                                                 |
| .challenge-dialog__body                                                         |
|   <label> "Response Title"                                                      |
|   <input> #challenge-response-title-input  .challenge-dialog__input             |
|   <p> #challenge-response-parent-label  .challenge-dialog__parent-label         |
|                                                                                 |
| .challenge-dialog__footer                                                       |
|   [Cancel]                .btn--draft                                           |
|   [Create Draft Response] .btn--publish                                         |
+---------------------------------------------------------------------------------+
```
