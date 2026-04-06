---
name: guide_appearance.md
purpose: Visual ASCII representations of the public-facing pages for "The Jesus Website"
version: 1.0.1
dependencies: [guide_dashboard_appearance.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site.

**Note:** The Admin Dashboard appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 1.1 Website Landing Page (Foundation Module)
**Purpose:** The website entry point. Designed for a understated confidence factor with clear navigation, and immediate overview of content. 

**Relevant Files:**
- **HTML:** `index.html`
- **CSS:** `css/design_layouts/views/index_landing.css`, `css/elements/grid.css`, `css/elements/typography_colors.css`
- **JS:** `frontend/display_other/header.js`, `frontend/display_other/footer.js`, `frontend/core/setup_db.js`, `frontend/core/sql-wasm.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                                                                         |
|                         The Jesus Website.                              |
|                                                                         |
|          A detailed presentation of the evidence for Jesus.             |
|-------------------------------------------------------------------------|
|                                                                         |
|                 +---------------------------------+                     |
|                 |                                 |                     |
|                 |      Picture of Jesus           |                     |
|                 |                                 |                     |
|                 |                                 |                     |
|                 +---------------------------------+                     |
|                                                                         |
|               Text block with links (center justified)                  |
|                                                                         |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     | 
+-------------------------------------------------------------------------+
```

---

## 1.2 Internal Landing Page (Foundation Module)
**Purpose:** The entry point for context essays, the debate section, or resource lists. Utilizes a grid of category items for easy navigation.

**Relevant Files:**
- **HTML:** `frontend/pages/context.html`, `frontend/pages/debate.html`, `frontend/pages/resources.html`
- **CSS:** `css/design_layouts/views/index_landing.css`
- **JS:** `frontend/display_big/view_context_essays.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: [Records or Context etc]     |
|                     |                                                   |
|  - Records          |   +-------------+ +-------------+ +-------------+ |
|  - Context          |   |  [Item 1]   | |   [Item 2]  | |  [Item 3]   | |
|  - Resources        |   |             | |             | |             | |
|  - Debate           |   |             | |             | |             | |
|  - About            |   +-------------+ +-------------+ +-------------+ |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```
## 1.3 Internal Landing Page: News Feed (Foundation Module)
**Purpose:** The entry point for the news and updates feed, showing side-by-side latest news and blog posts snippets.

**Relevant Files:**
- **HTML:** `frontend/pages/news_and_blog.html`
- **CSS:** `css/elements/grid.css`
- **JS:** `frontend/display_other/news_snippet_display.js`, `frontend/display_other/blog_snippet_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: [Records or Context etc]     |
|                     |                                                   |
|  - Records          |   +-------------------+  +--------------------+   |
|  - Context          |   | [LATEST NEWS]     |  | [LATEST BLOGPOSTS] |   |
|  - Resources        |   | - Snippet 1       |  | - Snippet 1        |   |
|  - Debate           |   | - Snippet 2       |  | - Snippet 2        |   |
|  - About            |   +-------------------+  +--------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```
## 5.3 Blog or News Feed Pages (Essays Module)
**Purpose:** The dedicated feed page for either blogs or news items, displaying a vertical list of posts.

**Relevant Files:**
- **HTML:** `frontend/pages/news.html`, `frontend/pages/blog.html`
- **CSS:** `css/design_layouts/views/response_layout.css`
- **JS:** `frontend/display_big/list_blogpost.js`, `frontend/display_big/list_newsitem.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: [Records or Context etc]     |
|                     |                                                   |
|  - Records          |   +-------------------------------------------+   |
|  - Context          |   |       [POST: either News or Blog]         |   |
|  - Resources        |   |                                           |   |
|  - Debate           |   +-------------------------------------------+   |
|  - About            |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   |       [POST: either News or Blog]         |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

## 1.4 About page (Foundation Module)
**Purpose:** The about page providing the tech stack, methodology, and contact information. Includes a sidebar for navigation and a single column for content.

**Relevant Files:**
- **HTML:** `frontend/pages/about.html`
- **CSS:** `css/design_layouts/views/essay_layout.css`
- **JS:** `frontend/display_other/footer.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   ABOUT THE JESUS WEBSITE                         |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [ Picture]                                |   |
|                     |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [Section: Tech Stack]                           |
|                     |   "Welcome to The Jesus Website. Our mission      |
|                     |   is to..."                                       |
|                     |                                                   |
|                     |   [Section: Methodology]                          |
|                     |   "We gather evidence from..."                    |
|                     |                                                   |
|                     |   [Section: Contact]                              |
|                     |   "Reach out to us at..."                         |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 4.1 Standard List / Ranked Wikipedia view
**Purpose:** Ranked listing of Wikipedia articles with sidebar for filters and a main list area.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/wikipedia.html`
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/list_card_button.css`, `css/elements/thumbnails.css`
- **JS:** `frontend/display_big/list_view_wikipedia.js`, `frontend/display_other/thumbnails_display.js`

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
|  [Pagination]       |   |    [Thumbnail + External Link]            |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

## 4.2 Standard List / Ranked View with Response Inserted
**Purpose:** Special variant for challenge lists where a specific response record is inserted directly into the list flow for high context.

**Relevant Files:**
- **HTML:** `frontend/pages/challenges/Popular Challenges.html`, `frontend/pages/challenges/Academic Challenges.html`   
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/list_card_button.css`, `css/elements/thumbnails.css`
- **JS:** `frontend/display_big/list_view_popular_challenges_with_response.js`, `frontend/display_big/list_view_academic_challenges_with_response.js`, `frontend/display_big/list_view_responses.js`, `frontend/display_other/thumbnails_display.js`

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

## 2.3 Resource List (Verses) View (Records Module)
**Purpose:** High-density row-based layout for resource lists involving specific biblical references.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/OT Verses.html`, `frontend/pages/resources/People.html`, `frontend/pages/resources/Miracles.html`, `frontend/pages/resources/Events.html`, `frontend/pages/resources/Sermons and Sayings.html`, `frontend/pages/resources/objects.html`
- **CSS:** `css/design_layouts/views/list_layout.css`
- **JS:** `frontend/display_big/list_view.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   LIST TITLE: [Category or Ranked List Name]      |
|                     |                                                   |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|                     |   [Title]  | [Primary verse reference] [Snippet]  |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```
## 2.4 Resource List (Non-Verses) View (Records Module)
**Purpose:** High-density row-based layout for resource lists with unique IDs like manuscripts or archeological sites.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/Manuscripts.html`, `frontend/pages/resources/Sites.html`, `frontend/pages/resources/Internal witnesses.html`, `frontend/pages/resources/External witnesses.html`, `frontend/pages/resources/Objects.html`, `frontend/pages/resources/Places.html`, `frontend/pages/resources/Sources.html`, `frontend/pages/resources/World Events.html`
- **CSS:** `css/design_layouts/views/list_layout.css`
- **JS:** `frontend/display_big/list_view.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   LIST TITLE: [Category or Ranked List Name]      |
|                     |                                                   |
|                     |[Title]  | [Unique ID eg IAA-001] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-002] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-003] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-004] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-005] [Snippet] [Link] |
|                     |[Title]  | [Unique ID eg IAA-006] [Snippet] [Link] |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 2.2 Single Record Deep-Dive 
**Purpose:** The detailed presentation for individual items from the database. Prioritizes dense data presentation including pictures, bibliography, and context links.

**Relevant Files:**
- **HTML:** `frontend/pages/record.html`
- **CSS:** `css/design_layouts/views/single_layout.css`, `css/elements/pictures.css`
- **JS:** `frontend/display_big/single_view.js`, `frontend/display_other/sources_biblio_display.js`, `frontend/display_other/pictures_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: specific canonical/meta tags for this record]        |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW ]                              |
|-------------------------------------------------------------------------|
|< Back to Landingpage|   [RECORD TITLE]                                  |
|                     |   [PRIMARY VERSE]                                 |
|                     |                                                   | 
|  [Sidebar]          |   [PICTURE]                                       |
|                     |   [PICTURE LABEL]                                 |
|                     |                                                   |
|                     |   [DESCRIPTION]                                   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY]                                  |
|                     |   [CONTEXT LINKS]                                 |
|                     |                                                   |
|                     |   [OTHER DATA eg ERA, MAP AND CATEGORY etc]       |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 5.1 & 5.2 Essay & Response Layout
**Purpose:** High-readability typography layouts for long-form contextual essays, the historiographical essay, and challenge responses. Includes an abstract and author details.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/historiography.html`, `frontend/pages/response.html`, `frontend/pages/context_essay.html`  
- **CSS:** `css/design_layouts/views/essay_layout.css`, `css/design_layouts/views/response_layout.css`
- **JS:** `frontend/display_big/view_historiography.js`, `frontend/display_other/mla_snippet_display.js`, `frontend/display_other/sources_biblio_display.js`, `frontend/display_other/display_snippet.js`, `frontend/display_big/response_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW]                               |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   [ESSAY OR CHALLENGE TITLE]                      |
|                     |   [Optional subtitle]                             |
|                     |   [PRIMARY VERSE /OR/ CHALLENGE]                  |
|                     |   By [Author], The Jesus Website [YEAR]           |
|                     |   +--------------------------------------+        |
|                     |   | Abstract:[SNIPPET]                   |        |
|                     |   |                                      |        |
|                     |   |                                      |        |
|                     |   +--------------------------------------+        |
|                     |                                                   |
|                     |   [Body Text - Premium Typography / Max-Width]    |
|                     |   "Lorem ipsum dolor sit amet, consectetur        |
|                     |   adipiscing elit. Mauris blandit aliquet elit,   |
|                     |   eget tincidunt nibh pulvinar a..."              |
|                     |   [Inline MLA Snippet]                   |
|                     |                                                   |
|  [Table of          |   +-------------------------------------------+   |
|  Contents]          |   | [ Picture ]                               |   |
|   - Section 1       |   |                                           |   |
|   - Section 2       |   |                                           |   |
|   - Section 3       |   |                                           |   |
|   - Section 4       |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |    [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 3.3 Visual Interactive Map Display
**Purpose:** Interactive map layouts. 

**Relevant Files:**
- **HTML:** `frontend/pages/maps.html`, `frontend/pages/maps/map_jerusalem.html`, `frontend/pages/maps/map_empire.html`, `frontend/pages/maps/map_levant.html`, `frontend/pages/maps/map_galilee.html`, `frontend/pages/maps/map_judea.html`
- **CSS:** `css/elements/map_diagram.css`
- **JS:** `frontend/display_other/maps_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|  [Sidebar]          |                                                   |
|                     |                                                   |
|  [Interactive       |                                                   |
|   Controls]         |              [ MAP AREA ]                         |
|                     |            (Renders Maps)                         |
|  - Zoom In/Out      |                                                   |
|  - Toggle Layers    |                                                   |
|  - Era Slider       |                    * [Node A]                     |
|                     |                   /                               |
|                     |                  /                                |
|                     |        * [Node B] -------- * [Node C]             |
|                     |                            |                      |
|                     |                 * [Node D] |                      |
|                     |                            |                      |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```
## 3.2 Visual Interactive timeline Display 
**Purpose:** Full-screen or large-canvas layouts for interactive timeline layout. 

**Relevant Files:**
- **HTML:** `frontend/pages/timeline.html`
- **CSS:** `css/elements/timeline_diagram.css`
- **JS:** `frontend/display_other/timeline_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|  [Sidebar]          |                                                   |
|                     |                                                   |
|  [Interactive       |                                                   |
|   Controls]         |              [ MASSIVE CANVAS AREA ]              |
|                     |            (Renders SVG Timelines)                |
|  - Zoom In/Out      |                                                   |
|  - Toggle Layers    |                           *                       |
|  - Era Slider       |             *             *                       |
|                     |             *             *             *         |
|                     |       *     *       *     *       *     *         |
|                     |  ====[*]====[*]====[*]====[*]====[*]====[*]====   |
|                     |     [Yr]   [Yr]   [Yr]   [Yr]   [Yr]   [Yr]       |
|                     |                                                   |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

## 3.1 Visual Interactive Ardor diagram Display 
**Purpose:** Full-screen or large-canvas layouts for interactive evidence graph ('Ardor diagram') layout. 

**Relevant Files:**
- **HTML:** `frontend/pages/evidence.html`
- **CSS:** `css/elements/ardor_diagram.css`
- **JS:** `frontend/display_big/ardor_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|  [Sidebar]          |                                                   |
|                     |                                                   |
|  [Interactive       |                                                   |
|   Controls]         |              [ MASSIVE CANVAS AREA ]              |
|                     |            (Renders Ardor Node Graphs)            |
|  - Zoom In/Out      |                                                   |
|  - Toggle Layers    |                                 +----------+      |
|  - Era Slider       |                           +---->| [Node C] |      |
|                     |      +----------+         |     +----------+      |
|                     |      | [Node A] |---------+                       |
|                     |      +----------+         |     +----------+      |
|                     |                           +---->| [Node B] |      |
|                     |                                 +----------+      |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## Universal Components (1.0 Foundation Module)

### 1.5 Universal Sticky Sidebar 
**Purpose:** Provides contextual navigation, filtering, or localized data (e.g., Table of Contents) without losing scroll position on long data views. (Appears on all pages except 'index.html' or dashboard pages)

**Relevant Files:**
- **HTML:** (generated by `sidebar.js`)
- **CSS:** `css/design_layouts/universal/sidebar.css`
- **JS:** `frontend/display_other/sidebar.js`

```text
+-------------------------+
| The Jesus Website       |
|-------------------------|
|                         |
|  - Records              |
|  - Evidence             |
|  - Timeline             |
|  - Maps                 |
|  - Context Essays       |
|  - Debate & Discussion  |
|  - Resource lists       |
|  - News                 |
|  - About                |
|                         |
|                         |
|                         |
+-------------------------+
```

### 1.6 Universal Footer
**Purpose:** The unviersal footer that anchors the bottom of every readable page, providing specialised print and copy buttons that print the contents of the page (Not including the sidebar.)

**Relevant Files:**
- **HTML:** (generated by `footer.js`)
- **CSS:** `css/design_layouts/universal/footer.css`
- **JS:** `frontend/display_other/footer.js`


```text
+-------------------------------------------------------------------------+
| [Print contents] | [Copy URL] | [Copy contents]                         |
|-------------------------------------------------------------------------|
| [Copyright 2026] | [favicon] | [Copyright Licence]                      |
+-------------------------------------------------------------------------+
```

### 1.7 Picture
**Purpose:** Every picture is displaed with a lightweight thin line around 
that is longer at the base to include the caption aka 'picture label'. ***Note*** that
Thumbnails do not follow this rule and only display the picture. (see `thumbnails_display.js`)

**Relevant Files:**
- **HTML:** (generated by `pictures_display.js`)
- **CSS:** `css/elements/pictures.css`
- **JS:** `frontend/display_other/pictures_display.js`

```text
+-------------------------------------------------------------------------+
|+-----------------------------------------------------------------------+|
||                            [Picture / PNG]                            ||
|+-----------------------------------------------------------------------+|
| [Picture Label]                                                         |
+-------------------------------------------------------------------------+
```

### 1.8 Universal Header
**Purpose:** Managed by `header.js`, this component injects invisible SEO metadata and optionally a visible top header (Logo, Search Bar, and Navigation) on pages that require complex search or broad navigation.

**Relevant Files:**
- **HTML:** (injected into certain pages via `search_header.js`)
- **CSS:** `css/elements/grid.css`
- **JS:** `frontend/display_other/search_header.js`

```text
+-------------------------------------------------------------------------+
| SITE LOGO | [ Search Bar ] | [ Records ] [ Context ] [ Debate ] [About] |
+-------------------------------------------------------------------------+
```



