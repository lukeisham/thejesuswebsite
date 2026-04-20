---
name: guide_appearance.md
purpose: Visual ASCII representations of the public-facing pages for "The Jesus Website"
version: 1.1.0
dependencies: [guide_dashboard_appearance.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Dashboard appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 1.0 Foundation Module
**Scope:** Global Grid, Typography, Colors, Shared UI (Sidebar, Header, Footer).

### 1.1 Website Landing Page
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

### 1.2 Internal Landing Page
**Purpose:** The entry point for context essays, the debate section, or resource lists. Utilizes a grid of category items for easy navigation.

**Relevant Files:**
- **HTML:** `frontend/pages/context.html`, `frontend/pages/debate.html`, `frontend/pages/resources.html`
- **CSS:** `css/design_layouts/views/index_landing.css`, `css/elements/grid.css`
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

### 1.3 Internal Landing Page: News Feed
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

### 1.4 About Page
**Purpose:** The about page providing the tech stack, methodology, and contact information. Includes a sidebar for navigation and a single column for content.

**Relevant Files:**
- **HTML:** `frontend/pages/about.html`
- **CSS:** `css/design_layouts/views/essay_layout.css`, `css/elements/grid.css`
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

### 1.5 Universal Sticky Sidebar 
**Purpose:** Provides contextual navigation, filtering, or localized data (e.g., Table of Contents) without losing scroll position on long data views. (Appears on all pages except 'index.html' or dashboard pages)

**Relevant Files:**
- **HTML:** (generated by `sidebar.js`)
- **CSS:** `css/design_layouts/universal/sidebar.css`, `css/elements/grid.css`
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

#### 1.5.1 Sidebar — Technical Anatomy Mapping
**Purpose:** Documents the mapping between visual interface elements and their technical implementation in `sidebar.js` and `sidebar.css`.

**Relevant Technical Files:**
- **Logic:** `frontend/display_other/sidebar.js`
- **Styles:** `css/design_layouts/universal/sidebar.css`, `css/elements/grid.grid.css`

```text
+----------------------+-----------------------------+------------------------------------+
| Interface Element    | CSS Component Class         | DOM ID / Hook                      |
|----------------------|-----------------------------|------------------------------------|
| Main Container       | .site-sidebar               | #site-sidebar                      |
| Top Brand Label      | .site-sidebar__brand        | #sidebar-brand "The Jesus website" |
| Navigation List      | .site-sidebar__nav          | #sidebar-main-nav                  |
| Navigation Link      | .site-sidebar__nav li a     | #sidebar-nav-[id]                  |
| Section Divider      | .site-sidebar__divider      | (No ID)                            |
| Category Label       | .site-sidebar__nav-category | (No ID)                            |
| Table of Contents    | .site-sidebar__nav          | #sidebar-toc                       |
| Mobile Backdrop      | .sidebar-backdrop           | #sidebar-backdrop                  |
+----------------------+-----------------------------+------------------------------------+
```

### 1.6 Universal Footer
**Purpose:** The universal footer that anchors the bottom of every readable page. Redesigned into a single horizontal strip for a more streamlined, modern aesthetic while maintaining accessibility and functional access to utility tools.

**Relevant Files:**
- **HTML:** (generated by `footer.js`)
- **CSS:** `css/design_layouts/universal/footer.css`, `css/elements/grid.css`
- **JS:** `frontend/display_other/footer.js`

```text
+-----------------------------------------------------------------------------------------+
| [Copyright 2026] | [ Aleph/Omega icon ] | [Copyright Licence]   [Print] | [Copy] | [Copy] |
+-----------------------------------------------------------------------------------------+
```

#### 1.6.1 Footer — Component Breakdown
- **Legal & Branding (Left):** Displays site copyright, the Aleph/Omega branding icon (`assets/favicon.png`), and the CC BY-NC 4.0 license link.
- **Utility Actions (Right):** Horizontal group of ghost buttons providing specialized Print and Copy functionality.
- **Structural Behavior:** Leverages `justify-content: space-between` on a single-row flex container. Collapses to a centered vertical stack on screens below 800px.

---

### 1.7 Picture
**Purpose:** Every picture is displaed with a lightweight thin line around that is longer at the base to include the caption aka 'picture label'. ***Note*** that Thumbnails do not follow this rule and only display the picture. (see `thumbnails_display.js`)

**Relevant Files:**
- **HTML:** (generated by `pictures_display.js`)
- **CSS:** `css/elements/pictures.css`
- **JS:** `frontend/display_other/pictures_display.js`

```text
+-------------------------------------------------------------------------+
|+-----------------------------------------------------------------------+|
|                            [Picture / PNG]                            ||
|+-----------------------------------------------------------------------+|
| [Picture Label]                                                         |
+-------------------------------------------------------------------------+
```

### 1.8 Universal Header
**Purpose:** Managed by `header.js`, this component injects invisible SEO metadata and optionally a visible top header (Search Bar only) on pages that require global search access.

**Relevant Files:**
- **HTML:** (injected into certain pages via `search_header.js`)
- **CSS:** `css/elements/grid.css`
- **JS:** `frontend/display_other/search_header.js`

```text
+-------------------------------------------------------------------------+
| [ Search Bar ]                                                          |
+-------------------------------------------------------------------------+
```

#### 1.8.1 Search Header — Detailed Component Anatomy
**Purpose:** Documents the precise internal structure and layout behaviour of the visible search header bar injected by `search_header.js`. Renders only the search input — no site logo, no navigation links.

**Relevant Files:**
- **JS:** `frontend/display_other/search_header.js`
- **CSS:** `css/elements/grid.css` (§3 — Visible Search Header)

**HTML DOM Structure (generated by `search_header.js`):**
```text
<header class="site-header" id="site-header">  ← grid-area: header
│
└── <div class="site-header__search">            ← flex: 1; max-width: 480px
    └── <input type="search" id="global-search-input">
            placeholder: "Search records, people, events…"
            Events: Enter  → URL redirect to records.html?search=<term>
                    Escape → clear input only (no navigation)
```

**Visual Layout (Desktop — above 1024px):**
```text
+-------------------------------------------------------------------------+
|                    .site-header (height: 64px, sticky top: 0)           |
|-------------------------------------------------------------------------|
|                                                                         |
|                     .site-header__search                                |
|                     flex: 1 (grows); max-width: 480px                   |
|                                                                         |
|                     +-----------------------------------+               |
|                     | Search records, people, events…  |               |
|                     +-----------------------------------+               |
|                                                                         |
+-------------------------------------------------------------------------+
         ← flex container: align-items: center; gap: var(--space-3) →
```

**Visual Layout (Tablet / Mobile — at or below 1024px):**
```text
+------------------------------------------+
|  [ Search ]                              |
|  padding-inline shrinks to --space-2     |
+------------------------------------------+
```

**Critical CSS Rules (grid.css):**
```text
  .site-header              → display: flex; height: 64px; sticky; z-index: 100
  .site-header__search      → flex: 1; max-width: 480px; margin-inline: auto
```

**Integration Notes:**
- Triggered by `initializer.js` when `data-search-header-active-nav` is set on `<body>`, OR by a direct inline call to `injectSearchHeader(anchorId)`.
- Inserted into the DOM **before** the sidebar element (default target: `#site-sidebar`).
- On Enter, redirects the browser to `/frontend/pages/records.html?search=<encoded term>`; `list_view.js` reads the `search` URL param on `thejesusdb:ready` and calls `db.searchRecords()` automatically.
- On Escape, clears the input field only — no page navigation occurs.

---

### 1.9 Branding & Icons
**Purpose:** Establishes the core visual identity of "The Jesus Website" through symbolic archetypes.

**Primary Icon:** `assets/favicon.png`
**Design Concept:** A thin black circle enclosing the letters **א (Aleph)** and **Ω (Omega)** side by side.
**Symbolic Rationale:** Represents the "Alpha and Omega" (Beginning and End) concept, utilizing the first letter of the Hebrew alphabet and the last letter of the Greek alphabet to reflect the Judeo-Christian historical and theological scope of the project.

**Usage:**
- **Browser Tab:** Injected via `header.js` as the standard site `favicon`.
- **Universal Footer:** Centered as a minimalist signature.

**Relevant Files:**
- **Image:** `assets/favicon.png`
- **Logic:** `frontend/display_other/header.js`, `frontend/display_other/footer.js`

---

### 1.10 Truth through Typography
**Purpose:** Establishes the authoritative "Technical Blueprint" aesthetic for all interactive controls (buttons, sliders, checkboxes, and toggles) across the codebase. This ensures consistency and prevents visual divergence.

#### Interactive Elements Directory

| Element Type | Primary Selectors | Visual Context / Usage | Governing CSS File |
| :--- | :--- | :--- | :--- |
| **Generic Buttons** | `.btn-primary`, `.btn-outline`, `.btn--filled` | The standard "Technical Instruction" Node used globally for submitting forms, major navigation, and list-card actions. | `css/elements/list_card_button.css` |
| **Footer Action Buttons** | `.footer-btn` | Minimal ghost-style buttons (Print, Copy URL, Copy Contents) located in the Universal Footer. | `css/design_layouts/universal/footer.css` |
| **Timeline Controls** | `.timeline-actions button` | Navigational controls (#zoom-in, #zoom-out, #prev-era, #next-era) within the massive timeline canvas. | `css/elements/timeline_diagram.css` |
| **Map Controls** | `.map-actions button` | Navigational controls (#zoom-in, #zoom-out, #toggle-layers) within the geospatial map canvas. | `css/elements/map_diagram.css` |
| **Login Buttons** | `.login-box button` | Explicitly sharp-cornered, high-contrast action buttons used exclusively in the Admin Dashboard login sequence. | `css/design_layouts/views/login_view.css` |
| **Range Sliders** | `input[type="range"]` | Blueprint Vector sliders with square tracker thumb and high-visibility active states (e.g. Map Era filter). | `css/elements/forms.css` |
| **Checkboxes & Radios** | `input[type="checkbox"]`, `input[type="radio"]` | Form selection inputs rendered as sharp boxes with contrasting selected states and cross-hatching or distinct border logic. | `css/elements/forms.css` |
| **Toggle Switches** | `.toggle-switch__input`, `.toggle-switch__slider` | Dual-state visual logic switches relying on precise before/after pseudo-element translation. | `css/elements/forms.css` |

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.

### 2.2 Single Record Deep-Dive 
**Purpose:** The detailed presentation for individual items from the database. Prioritizes dense data presentation including pictures, bibliography, and context links.

**Relevant Files:**
- **HTML:** `frontend/pages/record.html`
- **CSS:** `css/design_layouts/views/single_layout.css`, `css/elements/grid.css`, `css/elements/pictures.css`
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

### 2.3 Resource List (Verses) View
**Purpose:** High-density row-based layout for resource lists involving specific biblical references.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/OT Verses.html`, `frontend/pages/resources/People.html`, `frontend/pages/resources/Miracles.html`, `frontend/pages/resources/Events.html`, `frontend/pages/resources/Sermons and Sayings.html`, `frontend/pages/resources/objects.html`
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/grid.css`
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

### 2.4 Resource List (Non-Verses) View
**Purpose:** High-density row-based layout for resource lists with unique IDs like manuscripts or archeological sites.

**Relevant Files:**
- **HTML:** `frontend/pages/resources/Manuscripts.html`, `frontend/pages/resources/Sites.html`, `frontend/pages/resources/Internal witnesses.html`, `frontend/pages/resources/External witnesses.html`, `frontend/pages/resources/Objects.html`, `frontend/pages/resources/Places.html`, `frontend/pages/resources/Sources.html`, `frontend/pages/resources/World Events.html`
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/grid.css`
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

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Visual Interactive Ardor diagram Display 
**Purpose:** Full-screen or large-canvas layouts for interactive evidence graph ('Ardor diagram') layout. 

**Relevant Files:**
- **HTML:** `frontend/pages/evidence.html`
- **CSS:** `css/elements/ardor_diagram.css`, `css/elements/grid.css`
- **JS:** `frontend/display_big/ardor_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   +-------------------------------------------+   |
|                     |   |                                           |   |
|  - Records          |   |          [ MASSIVE CANVAS AREA ]          |   |
|  - Evidence         |   |              (Renders Ardor)              |   |
|  - Timeline         |   |                                           |   |
|  - Maps             |   |   [Node A] --+-> [Node]                   |   |
|  - Context          |   |              |                            |   |
|  - Resources        |   |              +-> [Node]                   |   |
|  - Debate           |   |                                           |   |
|  - About            |   |-------------------------------------------|   |
|                     |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 3.1.1 Visual Interactive Ardor diagram — Component Anatomy
**Purpose:** Documents the internal structure of the recursive evidence tree ('Ardor diagram'), which utilizes a vertically stacked layout within the main content area.

**Relevant Technical Files:**
- **Structure:** `frontend/pages/evidence.html`
- **Logic:** `frontend/display_big/ardor_display.js`
- **Styles:** `css/elements/ardor_diagram.css`

**HTML DOM Structure:**
```text
<main class="site-main is-full-bleed" id="site-main">
└── <div class="diagram-layout">
    │
    ├── <div class="diagram-canvas-container">
    │   └── <svg class="ardor-svg">          ← Dynamic D3/SVG canvas area
    │       ├── <path class="ardor-edge">     ← Relationship connectors
    │       └── <g class="ardor-node">        ← Data containers
    │           ├── <rect>                   ← Node boundary
    │           ├── <text class="title">     ← Record title
    │           └── <text class="meta">      ← Record type/era
```

### 3.2 Visual Interactive timeline Display 
**Purpose:** Full-screen or large-canvas layouts for interactive timeline layout. 

**Relevant Files:**
- **HTML:** `frontend/pages/timeline.html`
- **CSS:** `css/elements/timeline_diagram.css`, `css/elements/grid.css`
- **JS:** `frontend/display_other/timeline_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   Interactive Historical Timeline                 |
|                     |   Explore the chronological intersection...       |
|  - Records          |                                                   |
|  - Evidence         |   +-------------------------------------------+   |
|  - Timeline         |   |                                           |   |
|  - Maps             |   |          [ MASSIVE CANVAS AREA ]          |   |
|  - Context          |   |              (Renders SVG)                |   |
|  - Resources        |   |                                           |   |
|  - Debate           |   |          *             *             *    |   |
|  - About            |   |   ====[*]==========[*]===========[*]====  |   |
|                     |   |    [Year 30]   [Year 33]     [Year 70]    |   |
|                     |   |                                           |   |
|                     |   |-------------------------------------------|   |
|                     |   | [Zoom +/-]                                |   |
|                     |   | [<< Prev Era][ Galilee Ministry ][Next >>]|   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [METADATA PANEL]                          |   |
|                     |   | Event / Year / Category / Link            |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 3.2.1 Visual Interactive Timeline — Component Anatomy
**Purpose:** Breakdown of the chronological timeline visualization, documenting the controls and the horizontally-scrolling canvas.

**Relevant Technical Files:**
- **Structure:** `frontend/pages/timeline.html`
- **Logic:** `frontend/display_other/timeline_display.js`
- **Styles:** `css/elements/timeline_diagram.css`

**HTML DOM Structure:**
```text
<div class="timeline-interface-container" id="timeline-interface">
│
├── <div class="timeline-canvas-wrapper" id="timeline-canvas-wrapper">
│   └── <svg id="interactive-timeline">       ← Massive horizontally-scrolling canvas
│       ├── <g id="grid-layer">               ← Time markers and background
│       ├── <line class="timeline-axis-line"> ← The central horizontal spine
│       └── <g id="node-layer">               ← Interactive event dots (.timeline-node)
│
└── <div class="timeline-controls">
    ├── <div class="timeline-actions">       ← Buttons: #zoom-in, #zoom-out
    └── <div class="timeline-era-navigation"> ← Buttons: #prev-era, #next-era
```

**Metadata Display (Post-Click):**
```text
<aside class="timeline-metadata-panel" id="timeline-metadata-panel">
    <h2 id="metadata-title">           ← Event name
    <p id="metadata-date">             ← Precise historical year/era
    <p id="metadata-category">         ← Category (biblical, secular, etc)
    <p id="metadata-verse">            ← Primary biblical reference
    <div id="metadata-snippet">        ← Event description
    <a id="metadata-link">             ← Deep-link to record.html
```

### 3.3 Visual Interactive Map Display
**Purpose:** Interactive map layouts. 

**Relevant Files:**
- **HTML:** `frontend/pages/maps.html`, `frontend/pages/maps/map_jerusalem.html`, `frontend/pages/maps/map_empire.html`, `frontend/pages/maps/map_levant.html`, `frontend/pages/maps/map_galilee.html`, `frontend/pages/maps/map_judea.html`
- **CSS:** `css/elements/map_diagram.css`, `css/elements/grid.css`
- **JS:** `frontend/display_other/maps_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   Interactive Geospatial Maps                     |
|                     |   Explore the geography of historical events...    |
|  - Records          |                                                   |
|  - Evidence         |   +-------------------------------------------+   |
|  - Timeline         |   |                                           |   |
|  - Maps             |   |              [ MAP AREA ]                 |   |
|  - Context          |   |            (Renders Maps)                 |   |
|  - Resources        |   |                                           |   |
|  - Debate           |   |                    * [Node A]             |   |
|  - About            |   |                 /                         |   |
|                     |   |   * [Node B] -------- * [Node C]          |   |
|                     |   |                                           |   |
|                     |   |-------------------------------------------|   |
|                     |   | [Views: Empire, Judea, Galilee...] [+] [-]|   |
|                     |   | Temporal Slider: [========] [30 AD]       |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [METADATA PANEL]                          |   |
|                     |   | Date / Category / Snippet / Link          |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 3.3.1 Visual Interactive Map — Component Anatomy
**Purpose:** Detailed breakdown of the interactive geospatial map interface, including controls, canvas, and metadata display.

**Relevant Technical Files:**
- **Structure:** `frontend/pages/maps.html`
- **Logic:** `frontend/display_other/maps_display.js`
- **Styles:** `css/elements/map_diagram.css`

**HTML DOM Structure:**
```text
<div class="map-interface-container" id="map-interface">
│
├── <div class="map-canvas-wrapper">
│   └── <svg id="interactive-map">      ← Map vector canvas
│       ├── <g id="base-layer">         ← Geographic outlines
│       ├── <g id="foundation-layer">   ← Region labels
│       └── <g id="node-layer">         ← Interactive data circles (.map-node)
│
└── <div class="map-controls">
    ├── <div class="map-views">         ← Radio buttons: Empire, Levant, Judea...
    ├── <div class="map-actions">       ← Buttons: #zoom-in, #zoom-out, #toggle-layers
    └── <div class="map-era-slider">    ← Input: #era-filter + #era-display
```

**Metadata Display (Post-Click):**
```text
<aside class="map-metadata-panel" id="map-metadata-panel">
    <h2 id="metadata-title">            ← Connected record title
    <p id="metadata-date">              ← Period or Era from database
    <p id="metadata-category">          ← Record category (event, person, etc)
    <p id="metadata-verse">             ← Primary biblical reference
    <p id="metadata-snippet">           ← Summary from database
    <a href="#" id="metadata-link">     ← Deep-link to record.html
```

---

## 4.0 Ranked Lists Module
**Scope:** Ranked Wikipedia article lists, Ranked historical challenges.

### 4.1 Standard List / Ranked Wikipedia view
**Purpose:** Ranked listing of Wikipedia articles with sidebar for filters and a main list area.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/wikipedia.html`
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/grid.css`, `css/elements/list_card_button.css`, `css/elements/thumbnails.css`
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
|                     |   |    [Thumbnail + External Link]            |   |
|  [Pagination]       |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 4.2 Standard List / Ranked View with Response Inserted
**Purpose:** Special variant for challenge lists where a specific response record is inserted directly into the list flow for high context.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/popular_challenge.html`, `frontend/pages/debate/academic_challenge.html`   
- **CSS:** `css/design_layouts/views/list_layout.css`, `css/elements/grid.css`, `css/elements/list_card_button.css`, `css/elements/thumbnails.css`
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

---

## 5.0 Essays Module
**Scope:** Context-Essay (Thematic context), Historiography, Blog/News, Responses.

### 5.1 & 5.2 Essay & Response Layout
**Purpose:** High-readability typography layouts for long-form contextual essays, the historiographical essay, and challenge responses. Includes an abstract and author details.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/historiography.html`, `frontend/pages/response.html`, `frontend/pages/context_essay.html`  
- **CSS:** `css/design_layouts/views/essay_layout.css`, `css/design_layouts/views/response_layout.css`, `css/elements/grid.css`
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

### 5.3 Blog or News Feed Pages
**Purpose:** The dedicated feed page for either blogs or news items, displaying a vertical list of posts.

**Relevant Files:**
- **HTML:** `frontend/pages/news.html`, `frontend/pages/blog.html`
- **CSS:** `css/design_layouts/views/response_layout.css`, `css/elements/grid.css`
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
xes with contrasting selected states and cross-hatching or distinct border logic. | `css/elements/forms.css` |
| **Toggle Switches** | `.toggle-switch__input`, `.toggle-switch__slider` | Dual-state visual logic switches relying on precise before/after pseudo-element translation. | `css/elements/forms.css` |
