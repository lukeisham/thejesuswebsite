---
name: guide_frontend_appearance.md
purpose: ASCII wireframes of the two public-facing page layouts for the 2.0 Records Module — list view and single record detail view
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_function.md, records_nomenclature.md]
---

# 2.0 Records Module — Frontend Appearance

## List View (`records.html` + `list_view.js`)

```text
+============================================================================================+
| [Invisible Header — SEO metadata injected by header.js]                                    |
+============================================================================================+
| SITE LOGO              [ Search Bar __________________ ]                                   |
+============================================================================================+
|                        |                                                                   |
|  Sidebar               |  RECORDS LIST                                                     |
|  (nav links)           |  (or "Search Results: 'peter' -- 47 results")                     |
|                        |                                                                   |
|                        |  -- resource-row format (records with verse) -----------          |
|                        |  +--------------------------------------------------------------+ |
|                        |  | [Title link]        | [era/map meta]  [Primary Verse]        | |
|                        |  |                     | [Snippet preview text...]              | |
|                        |  +--------------------------------------------------------------+ |
|                        |  | [Title link]        | [era/map meta]  [Primary Verse]        | |
|                        |  |                     | [Snippet preview text...]              | |
|                        |  +--------------------------------------------------------------+ |
|                        |                                                                   |
|                        |  -- list-row-item format (records without verse) --------         |
|                        |  +--------------------------------------------------------------+ |
|                        |  | [meta prefix]  [Title link]                                  | |
|                        |  |                [Snippet preview text...]                      | |
|                        |  +--------------------------------------------------------------+ |
|                        |                                                                   |
|                        |  ...                                                              |
|                        |                                                                   |
|                        |  [< Previous]                              [Next >]               |
|                        |                                                                   |
+============================================================================================+
| [Universal Footer]                                                                         |
+============================================================================================+
```

## Single Record Detail View (`record.html` + `single_view.js`)

```text
+============================================================================================+
| [Invisible Header — record-specific canonical, og:type, ai:subject meta tags]              |
+============================================================================================+
| SITE LOGO              [ Search Bar __________________ ]                                   |
+============================================================================================+
|                        |                                                                   |
|  Sidebar               |  [< Back to list]                                                 |
|  (nav links)           |                                                                   |
|                        |  RECORD TITLE                                    (.record-title)  |
|                        |  Primary Verse Reference                  (.record-primary-verse) |
|                        |  Secondary Verse Reference (if present)                           |
|                        |                                                                   |
|                        |  +------------------------------------------+                     |
|                        |  |                                          |                     |
|                        |  |          Picture                         |                     |
|                        |  |          (pictures_display.js)           |                     |
|                        |  |                                          |                     |
|                        |  +------------------------------------------+                     |
|                        |                                                                   |
|                        |  DESCRIPTION                              (.record-description)   |
|                        |  Multi-paragraph body text rendered from                          |
|                        |  JSON array of strings.                                           |
|                        |                                                                   |
|                        |  ---- Bibliography ----                (.record-section-bibliography) |
|                        |  Combined MLA entries with hanging indent                         |
|                        |  (rendered by sources_biblio_display.js)                          |
|                        |                                                                   |
|                        |  ---- Context Links ----                  (.record-section-context) |
|                        |  Linked list of related record slugs                               |
|                        |                                                                   |
|                        |  ---- References ----                  (.record-section-references) |
|                        |  IAA: [value]                                                      |
|                        |  Pledius: [value]                                                  |
|                        |  Manuscript: [value]                                               |
|                        |                                                                   |
|                        |  ---- Metadata Grid ----               (.record-section-metadata)  |
|                        |  +------------------+------------------+                          |
|                        |  | Era              | Gospel Category  |                          |
|                        |  | [value]          | [value]          |                          |
|                        |  +------------------+------------------+                          |
|                        |  | Map Label        | Timeline         |                          |
|                        |  | [value]          | [value]          |                          |
|                        |  +------------------+------------------+                          |
|                        |  | Geo ID           | Page Views       |                          |
|                        |  | [value]          | [value]          |                          |
|                        |  +------------------+------------------+                          |
|                        |                                                                   |
+============================================================================================+
| [Universal Footer]                                                                         |
+============================================================================================+
```
