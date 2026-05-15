---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Ranked Lists Module pages (Wikipedia rankings, challenge rankings)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_style.md, guide_dashboard_appearance.md, guide_function.md, ranked_lists_nomenclature.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).

### 4.1 Ranked Wikipedia
**Purpose:** Ranked listing of Wikipedia articles with sidebar for filters and a main list area.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/wikipedia.html`
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/frontend/buttons.css`, `css/1.0_foundation/thumbnails.css`
- **JS:** `js/4.0_ranked_lists/frontend/list_view_wikipedia.js`, `js/2.0_records/frontend/thumbnails_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Challenge / Wikiepdia]                   |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav /     |   PAGE TITLE: [Category or Ranked List Name]      |
|   Filters]          |                                                   |
|                     |   +-------------------------------------------+   |
|  - By Rank          |   | 1. [Wikipedia Title]          [Rank]      |   |
|  - By Alphabet      |   |    [Snippet]                              |   |
|  - By Date          |   |    [Thumbnail + External Link]            |   |
|                     |   +-------------------------------------------+   |
|                     |   | 2. [Wikipedia Title]          [Rank]      |   |
|                     |   |    [Snippet]                              |   |
|                     |   |    [Thumbnail + External Link]            |   |
|                     |   +-------------------------------------------+   |
|                     |   | 3. [Wikipedia Title]          [Rank]      |   |
|                     |   |    [Snippet]                              |   |
|                     |   |    [Thumbnail + External Link]            |   |
|  [Pagination]       |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 4.2 Ranked Challenges
**Purpose:** Ranked listing of historical challenges (academic and popular) where a specific response record is inserted directly into the list flow for high context.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/popular_challenge.html`, `frontend/pages/debate/academic_challenge.html`   
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/frontend/buttons.css`, `css/1.0_foundation/thumbnails.css`
- **JS:** `js/4.0_ranked_lists/frontend/list_view_popular_challenges_with_response.js`, `js/4.0_ranked_lists/frontend/list_view_academic_challenges_with_response.js`, `js/5.0_essays_responses/frontend/list_view_responses.js`, `js/2.0_records/frontend/thumbnails_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Challenge / Wikipedia ]                   |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav /     |   PAGE TITLE: [Category or Ranked List Name]      |
|   Filters]          |                                                   |
|                     |   +-------------------------------------------+   |
|  - By Date          |   | 1. [Challenge Title]          [Rank]      |   |
|  - By Location      |   |    [Snippet]                              |   |
|  - By Source        |   |    [Thumbnail + External Link]            |   |
|                     |   +-------------------------------------------+   |
|                     |   |    [Response Title]                       |   |
|                     |   |    [Snippet]                              |   |
|                     |   |    [Thumbnail + Internal Link to slug]    |   |
|                     |   +-------------------------------------------+   |
|                     |   | 2. [Challenge Title]          [Rank]      |   |
|                     |   |    [Snippet]                              |   |
|  [Pagination]       |   |    [Thumbnail + External Link]            |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

