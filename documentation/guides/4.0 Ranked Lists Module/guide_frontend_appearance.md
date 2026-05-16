---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Ranked Lists Module pages — Wikipedia rankings, Academic challenges with responses, Popular challenges with responses
version: 1.1.0
dependencies: [simple_module_sitemap.md, guide_function.md, guide_dashboard_appearance.md, ranked_lists_nomenclature.md]
---

## 4.1 Ranked Wikipedia (`frontend/pages/debate/wikipedia.html`)

```text
+---------------------------------------------------------------------------------+
| <header #invisible-header aria-hidden="true">                                   |
| (SEO metadata injected by header.js)                                            |
+---------------------------------------------------------------------------------+
| Search Header (search_header.js)                                                |
| data-search-header-active-nav="debate"                                          |
+---------------------------------------------------------------------------------+
| .page-shell #page-shell                                                         |
|                                                                                 |
| <main .site-main #site-main role="main">                                        |
|   <div .content-wrap>                                                           |
|                                                                                 |
|     .landing-page__header                                                       |
|       <h1 .landing-page__heading> "Wikipedia Articles"                          |
|       <p .text-sm .text-muted> "A ranked list of global historical              |
|        consensus and debates."                                                  |
|                                                                                 |
|     #wikipedia-list-container                                                   |
|     (populated by list_view_wikipedia.js -> renderWikipediaList())              |
|     +-------------------------------------------------------------------+      |
|     |                                                                   |      |
|     | .list-row .flex .gap-4 .py-4  (border-bottom: 1px solid)          |      |
|     | +-------+-----------------------------------------------+         |      |
|     | | .list-rank  | .list-content .flex-1                   |         |      |
|     | | .text-lg    |                                         |         |      |
|     | | .font-bold  | <h2 .text-lg .font-semibold .mb-1>      |         |      |
|     | | .text-muted |   <a .text-primary .hover:text-accent   |         |      |
|     | | .w-8        |      href="{wikipedia_link}"            |         |      |
|     | |             |      target="_blank">                   |         |      |
|     | |  "1."       |     "{wikipedia_title}"                 |         |      |
|     | |             |   </a>                                  |         |      |
|     | |             |                                         |         |      |
|     | |             | <div .mt-2>                              |         |      |
|     | |             |   <span .badge .badge--muted>            |         |      |
|     | |             |     "Rank {n}"                           |         |      |
|     | |             |   <span .badge .badge--accent .ml-2>     |         |      |
|     | |             |     "Score: {score.toFixed(2)}"          |         |      |
|     | |             |   <a .text-xs .text-accent .ml-2         |         |      |
|     | |             |      href="{wikipedia_link}"             |         |      |
|     | |             |      target="_blank">                    |         |      |
|     | |             |     "External Link ↗"                   |         |      |
|     | +-------+-----------------------------------------------+         |      |
|     |                                                                   |      |
|     | .list-row  (repeats for each published entry, sorted by rank)      |      |
|     | ...                                                               |      |
|     |                                                                   |      |
|     +-------------------------------------------------------------------+      |
|                                                                                 |
|     .pagination .mt-6 .text-sm  (flex, gap: --space-2)                          |
|       [1] [2] [3]                                                               |
|                                                                                 |
|   </div>                                                                        |
| </main>                                                                         |
|                                                                                 |
+---------------------------------------------------------------------------------+
| Footer (footer.js)  data-footer-target="page-shell"                             |
+---------------------------------------------------------------------------------+
```

## 4.2a Ranked Academic Challenges (`frontend/pages/debate/academic_challenge.html`)

```text
+---------------------------------------------------------------------------------+
| <header #invisible-header aria-hidden="true">                                   |
| (SEO metadata injected by header.js)                                            |
+---------------------------------------------------------------------------------+
| Search Header (search_header.js)                                                |
| data-search-header-active-nav="debate"                                          |
+---------------------------------------------------------------------------------+
| .page-shell #page-shell                                                         |
|                                                                                 |
| <main .site-main #site-main role="main">                                        |
|   <div .content-wrap>                                                           |
|                                                                                 |
|     .landing-page__header                                                       |
|       <h1 .landing-page__heading> "Academic Challenges"                         |
|       <p .text-sm .text-muted> "Addressing peer-reviewed scholarly claims       |
|        with evidence-based responses."                                          |
|                                                                                 |
|     #academic-challenge-list-container                                          |
|     (populated by list_view_academic_challenges_with_response.js                |
|      -> renderAcademicChallengesWithResponses())                                |
|     +-------------------------------------------------------------------+      |
|     |                                                                   |      |
|     | .list-card-group .mb-6                                            |      |
|     |                                                                   |      |
|     | ── Challenge Row ──                                               |      |
|     | .list-row .flex .gap-4 .py-4  (border-bottom: 1px dashed)         |      |
|     | +-------+-----------------------------------------------+         |      |
|     | | .list-rank  | .list-content .flex-1                   |         |      |
|     | | .text-lg    |                                         |         |      |
|     | | .font-bold  | <h2 .text-lg .font-semibold .mb-1>      |         |      |
|     | | .text-muted |   <a .text-primary .hover:text-accent   |         |      |
|     | | .w-8        |      href="{academic_challenge_link}"   |         |      |
|     | |             |      target="_blank">                   |         |      |
|     | |  "1."       |     "{academic_challenge_title}"        |         |      |
|     | |             |   </a>                                  |         |      |
|     | |             |                                         |         |      |
|     | |             | <div .mt-2>                              |         |      |
|     | |             |   <span .badge .badge--muted>            |         |      |
|     | |             |     "Academic Rank {n}"                  |         |      |
|     | |             |   <span .badge .badge--accent .ml-2>     |         |      |
|     | |             |     "Score: {score.toFixed(2)}"          |         |      |
|     | +-------+-----------------------------------------------+         |      |
|     |                                                                   |      |
|     | ── Response Sub-Card (when challenge has published response) ──    |      |
|     | .list-row .flex .gap-4 .py-4 .pl-12 .bg-secondary                 |      |
|     |   (border-bottom: 1px solid; border-left: 4px solid accent)       |      |
|     | +---------------------------------------------------------------+ |      |
|     | | .list-content .flex-1                                         | |      |
|     | |                                                               | |      |
|     | | <h3 .text-base .font-semibold .mb-1>                          | |      |
|     | |   <a .text-accent .hover:underline                            | |      |
|     | |      href="../response.html?id={slug}">                       | |      |
|     | |     "Response: {title}"                                       | |      |
|     | |   </a>                                                        | |      |
|     | +---------------------------------------------------------------+ |      |
|     |                                                                   |      |
|     | .list-card-group  (repeats per challenge, sorted by rank)          |      |
|     | ...                                                               |      |
|     |                                                                   |      |
|     +-------------------------------------------------------------------+      |
|                                                                                 |
|     .pagination .mt-6 .text-sm  (flex, gap: --space-2)                          |
|       [1] [2] [3]                                                               |
|                                                                                 |
|   </div>                                                                        |
| </main>                                                                         |
|                                                                                 |
+---------------------------------------------------------------------------------+
| Footer (footer.js)  data-footer-target="page-shell"                             |
+---------------------------------------------------------------------------------+
```

## 4.2b Ranked Popular Challenges (`frontend/pages/debate/popular_challenge.html`)

```text
+---------------------------------------------------------------------------------+
| <header #invisible-header aria-hidden="true">                                   |
| (SEO metadata injected by header.js)                                            |
+---------------------------------------------------------------------------------+
| Search Header (search_header.js)                                                |
| data-search-header-active-nav="debate"                                          |
+---------------------------------------------------------------------------------+
| .page-shell #page-shell                                                         |
|                                                                                 |
| <main .site-main #site-main role="main">                                        |
|   <div .content-wrap>                                                           |
|                                                                                 |
|     .landing-page__header                                                       |
|       <h1 .landing-page__heading> "Popular Challenges"                          |
|       <p .text-sm .text-muted> "Addressing popular-level claims with            |
|        evidence-based responses."                                               |
|                                                                                 |
|     #popular-challenge-list-container                                           |
|     (populated by list_view_popular_challenges_with_response.js                 |
|      -> renderPopularChallengesWithResponses())                                 |
|     +-------------------------------------------------------------------+      |
|     |                                                                   |      |
|     | .list-card-group .mb-6                                            |      |
|     |                                                                   |      |
|     | ── Challenge Row ──                                               |      |
|     | .list-row .flex .gap-4 .py-4  (border-bottom: 1px dashed)         |      |
|     | +-------+-----------------------------------------------+         |      |
|     | | .list-rank  | .list-content .flex-1                   |         |      |
|     | | .text-lg    |                                         |         |      |
|     | | .font-bold  | <h2 .text-lg .font-semibold .mb-1>      |         |      |
|     | | .text-muted |   <a .text-primary .hover:text-accent   |         |      |
|     | | .w-8        |      href="{popular_challenge_link}"    |         |      |
|     | |             |      target="_blank">                   |         |      |
|     | |  "1."       |     "{popular_challenge_title}"         |         |      |
|     | |             |   </a>                                  |         |      |
|     | |             |                                         |         |      |
|     | |             | <div .mt-2>                              |         |      |
|     | |             |   <span .badge .badge--muted>            |         |      |
|     | |             |     "Popular Rank {n}"                   |         |      |
|     | |             |   <span .badge .badge--accent .ml-2>     |         |      |
|     | |             |     "Score: {score.toFixed(2)}"          |         |      |
|     | +-------+-----------------------------------------------+         |      |
|     |                                                                   |      |
|     | ── Response Sub-Card (when challenge has published response) ──    |      |
|     | .list-row .flex .gap-4 .py-4 .pl-12 .bg-secondary                 |      |
|     |   (border-bottom: 1px solid; border-left: 4px solid accent)       |      |
|     | +---------------------------------------------------------------+ |      |
|     | | .list-content .flex-1                                         | |      |
|     | |                                                               | |      |
|     | | <h3 .text-base .font-semibold .mb-1>                          | |      |
|     | |   <a .text-accent .hover:underline                            | |      |
|     | |      href="../response.html?id={slug}">                       | |      |
|     | |     "Response: {title}"                                       | |      |
|     | |   </a>                                                        | |      |
|     | +---------------------------------------------------------------+ |      |
|     |                                                                   |      |
|     | .list-card-group  (repeats per challenge, sorted by rank)          |      |
|     | ...                                                               |      |
|     |                                                                   |      |
|     +-------------------------------------------------------------------+      |
|                                                                                 |
|     .pagination .mt-6 .text-sm  (flex, gap: --space-2)                          |
|       [1] [2] [3]                                                               |
|                                                                                 |
|   </div>                                                                        |
| </main>                                                                         |
|                                                                                 |
+---------------------------------------------------------------------------------+
| Footer (footer.js)  data-footer-target="page-shell"                             |
+---------------------------------------------------------------------------------+
```
