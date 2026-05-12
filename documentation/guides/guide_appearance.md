---
name: guide_appearance.md
purpose: Visual ASCII representations of the public-facing pages for "The Jesus Website"
version: 1.4.0
dependencies: [guide_dashboard_appearance.md, detailed_module_sitemap.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 1.0 Foundation Module
**Scope:** Global Grid, Typography, Colors, Shared UI (Sidebar, Header, Footer).

### 1.1 Website Landing Page
**Purpose:** The website entry point. Designed for a understated confidence factor with clear navigation, and immediate overview of content. 

**Relevant Files:**
- **HTML:** `index.html`
- **CSS:** `css/1.0_foundation/landing.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/typography.css`, `css/1.0_foundation/shell.css`
- **JS:** `js/1.0_foundation/frontend/header.js`, `js/1.0_foundation/frontend/footer.js`, `js/2.0_records/frontend/setup_db.js`, `js/2.0_records/frontend/sql-wasm.js`

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
- **CSS:** `css/1.0_foundation/landing.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/view_context_essays.js`

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

### 1.3 About Page
**Purpose:** The about page providing the tech stack, methodology, and contact information. Includes a sidebar for navigation and a single column for content.

**Relevant Files:**
- **HTML:** `frontend/pages/about.html`
- **CSS:** `css/5.0_essays_responses/frontend/essays.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/footer.js`

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

### 1.4 Universal Sticky Sidebar & Search
**Purpose:** Provides contextual navigation, filtering, or localized data (e.g., Table of Contents) without losing scroll position on long data views. (Appears on all pages except 'index.html' or 'Admin Portal' pages)

**Relevant Files:**
- **HTML:** (generated by `sidebar.js`)
- **CSS:** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/sidebar.js`

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
|-------------------------|
|  [Admin Portal]         |
+-------------------------+
```

#### 1.4.1 Sidebar — Technical Anatomy Mapping
**Purpose:** Documents the mapping between visual interface elements and their technical implementation in `sidebar.js` and `sidebar.css`.

**Relevant Technical Files:**
- **Logic:** `js/1.0_foundation/frontend/sidebar.js`
- **Styles:** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/grid.css`

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
| Admin Link           | .site-sidebar__admin-link   | #sidebar-admin-link                |
+----------------------+-----------------------------+------------------------------------+
```

### 1.5 Universal Footer & Creative Commons
**Purpose:** The universal footer that anchors the bottom of every readable page. Redesigned into a single horizontal strip for a more streamlined, modern aesthetic while maintaining accessibility and functional access to utility tools.

**Relevant Files:**
- **HTML:** (generated by `footer.js`)
- **CSS:** `css/1.0_foundation/footer.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/footer.js`

```text
+-----------------------------------------------------------------------------------------+
| [Copyright 2026] | [ Aleph/Omega icon ] | [Copyright Licence]   [Print] | [Copy] | [Copy] |
+-----------------------------------------------------------------------------------------+
```

#### 1.5.1 Footer — Component Breakdown
- **Legal & Branding (Left):** Displays site copyright, the Aleph/Omega branding icon (`assets/favicon.png`), and the CC BY-NC 4.0 license link.
- **Utility Actions (Right):** Horizontal group of ghost buttons providing specialized Print and Copy functionality.
- **Structural Behavior:** Leverages `justify-content: space-between` on a single-row flex container. Collapses to a centered vertical stack on screens below 800px.

---

### 1.6 Universal Image/Picture Layouts
**Purpose:** Every picture is displaed with a lightweight thin line around that is longer at the base to include the caption aka 'picture label'. ***Note*** that Thumbnails do not follow this rule and only display the picture. (see `thumbnails_display.js`)

**Relevant Files:**
- **HTML:** (generated by `pictures_display.js`)
- **CSS:** `css/1.0_foundation/pictures.css`
- **JS:** `js/2.0_records/frontend/pictures_display.js`

```text
+-------------------------------------------------------------------------+
|+-----------------------------------------------------------------------+|
|                            [Picture / PNG]                            ||
|+-----------------------------------------------------------------------+|
| [Picture Label]                                                         |
+-------------------------------------------------------------------------+
```

### 1.7 Universal Navigation Header
**Purpose:** Managed by `header.js`, this component injects invisible SEO metadata and optionally a visible top header (Search Bar only) on pages that require global search access.

**Relevant Files:**
- **HTML:** (injected into certain pages via `search_header.js`)
- **CSS:** `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/search_header.js`

```text
+-------------------------------------------------------------------------+
| [ Search Bar ]                                                          |
+-------------------------------------------------------------------------+
```

#### 1.7.1 Search Header — Detailed Component Anatomy
**Purpose:** Documents the precise internal structure and layout behaviour of the visible search header bar injected by `search_header.js`. Renders only the search input — no site logo, no navigation links.

**Relevant Files:**
- **JS:** `js/1.0_foundation/frontend/search_header.js`
- **CSS:** `css/1.0_foundation/grid.css` (§3 — Visible Search Header)

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

### 1.8 Branding, Icons & Identity
**Purpose:** Establishes the core visual identity of "The Jesus Website" through symbolic archetypes.

**Primary Icon:** `assets/favicon.png`
**Design Concept:** A thin black circle enclosing the letters **א (Aleph)** and **Ω (Omega)** side by side.
**Symbolic Rationale:** Represents the "Alpha and Omega" (Beginning and End) concept, utilizing the first letter of the Hebrew alphabet and the last letter of the Greek alphabet to reflect the Judeo-Christian historical and theological scope of the project.

**Usage:**
- **Browser Tab:** Injected via `header.js` as the standard site `favicon`.
- **Universal Footer:** Centered as a minimalist signature.

**Relevant Files:**
- **Image:** `assets/favicon.png`
- **Logic:** `js/1.0_foundation/frontend/header.js`, `js/1.0_foundation/frontend/footer.js`

---

### 1.9 Interactive Typography Standards
**Purpose:** Establishes the authoritative "Technical Blueprint" aesthetic for all interactive controls (buttons, sliders, checkboxes, and toggles) across the codebase. This ensures consistency and prevents visual divergence.

#### Interactive Elements Directory

| Element Type | Primary Selectors | Visual Context / Usage | Governing CSS File |
| :--- | :--- | :--- | :--- |
| **Generic Buttons** | `.btn-primary`, `.btn-outline`, `.btn--filled` | The standard "Technical Instruction" Node used globally for submitting forms, major navigation, and list-card actions. | `css/1.0_foundation/frontend/buttons.css` |
| **Footer Action Buttons** | `.footer-btn` | Minimal ghost-style buttons (Print, Copy URL, Copy Contents) located in the Universal Footer. | `css/1.0_foundation/footer.css` |
| **Timeline Controls** | `.timeline-actions button` | Navigational controls (#zoom-in, #zoom-out, #prev-era, #next-era) within the massive timeline canvas. | `css/3.0_visualizations/frontend/timeline.css` |
| **Map Controls** | `.map-actions button` | Navigational controls (#zoom-in, #zoom-out, #toggle-layers) within the geospatial map canvas. | `css/3.0_visualizations/frontend/maps.css` |
| **Login Buttons** | `.login-box button` | Explicitly sharp-cornered, high-contrast action buttons used exclusively in the Admin Portal login sequence. | `css/7.0_system/auth_login.css` |
| **Range Sliders** | `input[type="range"]` | Blueprint Vector sliders with square tracker thumb and high-visibility active states (e.g. Map Era filter). | `css/1.0_foundation/frontend/forms.css` |
| **Checkboxes & Radios** | `input[type="checkbox"]`, `input[type="radio"]` | Form selection inputs rendered as sharp boxes with contrasting selected states and cross-hatching or distinct border logic. | `css/1.0_foundation/frontend/forms.css` |
| **Toggle Switches** | `.toggle-switch__input`, `.toggle-switch__slider` | Dual-state visual logic switches relying on precise before/after pseudo-element translation. | `css/1.0_foundation/frontend/forms.css` |

---

## 2.0 Records Module
**Scope:** SQLite Schema & Python Pipelines, Single record deep-dive views, Full list view, Searching & Filtering.

### 2.1 Search Pipeline & Master Data Index
**Purpose:** The primary entry point for browsing and searching all records. Displays a dynamically populated row-based list filtered by a search query or showing all records as a master index. The page reads the `search` URL parameter on load and queries the WASM SQLite engine for matching results.

**Relevant Files:**
- **HTML:** `frontend/pages/records.html`
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`, `js/2.0_records/frontend/setup_db.js`, `js/2.0_records/frontend/sanitize_query.js`, `js/1.0_foundation/frontend/search_header.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ]                                              |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   MASTER DATA INDEX / SEARCH RESULTS              |
|                     |                                                   |
|                     |   Query: "peter" — 47 results                     |
|                     |                                                   |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |   [Title]  | [Category] [Snippet] [Primary Verse]  |
|                     |                                                   |
|  [Pagination]       |   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]        |
|                     |                                                   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 2.2 Single Record Deep-Dive 
**Purpose:** The detailed presentation for individual items from the database. Prioritizes dense data presentation including pictures, bibliography, and context links.

**Relevant Files:**
- **HTML:** `frontend/pages/record.html`
- **CSS:** `css/2.0_records/frontend/detail_view.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/pictures.css`
- **JS:** `js/2.0_records/frontend/single_view.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`, `js/2.0_records/frontend/pictures_display.js`

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
|                     |   [BIBLIOGRAPHY — combined MLA list]              |
|                     |   [CONTEXT LINKS — linked list]                   |
|                     |   [UNIQUE IDENTIFIERS — label:value list]         |
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
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`

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
- **CSS:** `css/2.0_records/frontend/list_view.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/2.0_records/frontend/list_view.js`

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
- **CSS:** `css/3.0_visualizations/frontend/ardor.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/3.0_visualizations/frontend/ardor_display.js`

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
- **Logic:** `js/3.0_visualizations/frontend/ardor_display.js`
- **Styles:** `css/3.0_visualizations/frontend/ardor.css`

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

### 3.2 Visual Interactive Timeline Display 
**Purpose:** Full-screen or large-canvas layouts for interactive timeline layout. 

**Relevant Files:**
- **HTML:** `frontend/pages/timeline.html`
- **CSS:** `css/3.0_visualizations/frontend/timeline.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/3.0_visualizations/frontend/timeline_display.js`

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
- **Logic:** `js/3.0_visualizations/frontend/timeline_display.js`
- **Styles:** `css/3.0_visualizations/frontend/timeline.css`

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

### 3.3 Visual Interactive Geographic Maps
**Purpose:** Interactive map layouts. 

**Relevant Files:**
- **HTML:** `frontend/pages/maps.html`, `frontend/pages/maps/map_jerusalem.html`, `frontend/pages/maps/map_empire.html`, `frontend/pages/maps/map_levant.html`, `frontend/pages/maps/map_galilee.html`, `frontend/pages/maps/map_judea.html`
- **CSS:** `css/3.0_visualizations/frontend/maps.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/3.0_visualizations/frontend/maps_display.js`

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
- **Logic:** `js/3.0_visualizations/frontend/maps_display.js`
- **Styles:** `css/3.0_visualizations/frontend/maps.css`

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
**Scope:** Ranked Wikipedia article lists (§4.1), Ranked historical challenge lists (§4.2).

### 4.1 Ranked Wikipedia Views
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

### 4.2 Ranked Challenge Views
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

## 5.0 Essays & Responses Module
**Scope:** Essays (Context, Theological, Spiritual) & Historiography (§5.1), Challenge Responses (§5.2).

### 5.1 Essay Layouts (Context, Theological, Spiritual) & Historiography
**Purpose:** High-readability typography layout for long-form contextual, theological, and spiritual essays plus the historiographical essay. Includes an abstract, author details, inline MLA citations, and a full bibliography.

**Relevant Files:**
- **HTML:** `frontend/pages/context_essay.html`, `frontend/pages/debate/historiography.html`
- **CSS:** `css/5.0_essays_responses/frontend/essays.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/view_context_essays.js`, `js/5.0_essays_responses/frontend/view_historiography.js`, `js/5.0_essays_responses/frontend/mla_snippet_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`, `js/2.0_records/frontend/display_snippet.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW]                               |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   [ESSAY TITLE]                                   |
|                     |   [Optional subtitle]                             |
|                     |   [PRIMARY VERSE]                                 |
|                     |   By [Author], The Jesus Website [YEAR]           |
|                     |   +--------------------------------------+        |
|                     |   | Abstract:[SNIPPET]                   |        |
|                     |   |                                      |        |
|                     |   +--------------------------------------+        |
|                     |                                                   |
|                     |   [Body Text - Premium Typography / Max-Width]    |
|                     |   "Lorem ipsum dolor sit amet, consectetur        |
|                     |   adipiscing elit. Mauris blandit aliquet elit,   |
|                     |   eget tincidunt nibh pulvinar a..."              |
|                     |   [Inline MLA Snippet]                            |
|                     |                                                   |
|  [Table of          |   +-------------------------------------------+   |
|  Contents]          |   | [ Picture ]                               |   |
|   - Section 1       |   |                                           |   |
|   - Section 2       |   |                                           |   |
|   - Section 3       |   +-------------------------------------------+   |
|                     |                                                   |
|                     |    [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 5.2 Challenge Response Layouts
**Purpose:** High-readability typography layout for individual challenge response pages. Shares the essay typography treatment but links back to the originating challenge and displays the challenge context alongside the response.

**Relevant Files:**
- **HTML:** `frontend/pages/debate/response.html`
- **CSS:** `css/5.0_essays_responses/frontend/responses.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/response_display.js`, `js/5.0_essays_responses/frontend/list_view_responses.js`, `js/5.0_essays_responses/frontend/mla_snippet_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ LIST VIEW]                               |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   [CHALLENGE TITLE]                               |
|                     |   [CHALLENGE CONTEXT]                             |
|                     |   By [Author], The Jesus Website [YEAR]           |
|                     |   +--------------------------------------+        |
|                     |   | Abstract:[SNIPPET]                   |        |
|                     |   |                                      |        |
|                     |   +--------------------------------------+        |
|                     |                                                   |
|                     |   [Body Text - Premium Typography / Max-Width]    |
|                     |   "Lorem ipsum dolor sit amet, consectetur        |
|                     |   adipiscing elit. Mauris blandit aliquet elit,   |
|                     |   eget tincidunt nibh pulvinar a..."              |
|                     |   [Inline MLA Snippet]                            |
|                     |                                                   |
|  [Table of          |   +-------------------------------------------+   |
|  Contents]          |   | [ Picture ]                               |   |
|   - Section 1       |   |                                           |   |
|   - Section 2       |   |                                           |   |
|   - Section 3       |   +-------------------------------------------+   |
|                     |                                                   |
|                     |    [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 6.0 News & Blog Module
**Scope:** Combined News & Blog Landing Page (§6.1), News Feed (§6.2), Blog Feed (§6.3), Individual Blog Post View (§6.4).

### 6.1 Combined News & Blog Landing Page
**Purpose:** The combined entry point for news and blog content. Shows the latest snippets from both feeds side-by-side, with a link at the bottom of each column directing users to the dedicated full feed.

**Relevant Files:**
- **HTML:** `frontend/pages/news_and_blog.html`
- **CSS:** `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/news_snippet_display.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: News & Blog                  |
|                     |                                                   |
|  - Records          |   +-------------------+  +--------------------+   |
|  - Context          |   | [LATEST NEWS]     |  | [LATEST BLOGPOSTS] |   |
|  - Resources        |   | - Snippet 1       |  | - Snippet 1        |   |
|  - Debate           |   | - Snippet 2       |  | - Snippet 2        |   |
|  - About            |   | - Snippet 3       |  | - Snippet 3        |   |
|                     |   | View all news →   |  | View all posts →   |   |
|                     |   +-------------------+  +--------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 6.1.1 Combined News & Blog Landing Page — Component Anatomy
**Purpose:** Documents the internal DOM structure of `news_and_blog.html`, including the two-column snippet grid and the per-column "view all" navigation links.

**Relevant Technical Files:**
- **Structure:** `frontend/pages/news_and_blog.html`
- **Logic:** `js/6.0_news_blog/frontend/news_snippet_display.js`, `js/6.0_news_blog/frontend/blog_snippet_display.js`
- **Styles:** `css/1.0_foundation/grid.css`

**HTML DOM Structure:**
```text
<main class="site-main" id="site-main">
└── <div class="news-blog-landing">
    │
    ├── <section class="news-blog-landing__col news-blog-landing__col--news">
    │   ├── <h2>Latest News</h2>
    │   ├── <ul class="news-snippet-list">        ← rendered by news_snippet_display.js
    │   │   ├── <li class="news-snippet-item">    ← one per news_items entry
    │   │   │   ├── <span class="snippet-date">   ← Publish Date
    │   │   │   ├── <h3 class="snippet-headline"> ← Headline
    │   │   │   └── <p class="snippet-body">      ← Snippet body
    │   │   └── (repeats…)
    │   └── <a class="news-blog-landing__view-all" href="/frontend/pages/news.html">
    │           View all news →
    │
    └── <section class="news-blog-landing__col news-blog-landing__col--blog">
        ├── <h2>Latest Blog Posts</h2>
        ├── <ul class="blog-snippet-list">        ← rendered by blog_snippet_display.js
        │   ├── <li class="blog-snippet-item">    ← one per blogposts entry
        │   │   ├── <span class="snippet-date">   ← Publish Date
        │   │   ├── <h3 class="snippet-title">    ← Title
        │   │   └── <p class="snippet-body">      ← Body excerpt
        │   └── (repeats…)
        └── <a class="news-blog-landing__view-all" href="/frontend/pages/blog.html">
                View all posts →
```

**Layout Behaviour:**
- Two columns sit side-by-side on desktop (above 800px) using a two-column CSS grid
- Below 800px the columns stack vertically, News above Blog
- Both "view all" links are the same `.news-blog-landing__view-all` class — a minimal inline text link styled consistently with the site's ghost-link pattern

---

### 6.2 News Feed Page
**Purpose:** The dedicated full feed for news items, displaying a vertical chronological list of news posts.

**Relevant Files:**
- **HTML:** `frontend/pages/news.html`
- **CSS:** `css/5.0_essays_responses/frontend/responses.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/list_newsitem.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: News                         |
|                     |                                                   |
|  - Records          |   +-------------------------------------------+   |
|  - Context          |   | [Headline]        [Publish Date]          |   |
|  - Resources        |   | [Snippet body]                            |   |
|  - Debate           |   | [External link →]                         |   |
|  - About            |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [Headline]        [Publish Date]          |   |
|                     |   | [Snippet body]                            |   |
|                     |   | [External link →]                         |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 6.3 Blog Feed Page
**Purpose:** The dedicated full feed for blog posts, displaying a vertical list of authored posts.

**Relevant Files:**
- **HTML:** `frontend/pages/blog.html`
- **CSS:** `css/6.0_news_blog/frontend/blog.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/list_blogpost.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: Blog                         |
|                     |                                                   |
|  - Records          |   +-------------------------------------------+   |
|  - Context          |   | [Title]           [Publish Date]          |   |
|  - Resources        |   | By [Author]                               |   |
|  - Debate           |   | [Body excerpt]                            |   |
|  - About            |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [Title]           [Publish Date]          |   |
|                     |   | By [Author]                               |   |
|                     |   | [Body excerpt]                            |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

### 6.4 Individual Blog Post View
**Purpose:** The dedicated page for reading a single blog post with full content, metadata, bibliography, and picture.

**Relevant Files:**
- **HTML:** `frontend/pages/blog_post.html`
- **CSS:** `css/6.0_news_blog/frontend/blog.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/6.0_news_blog/frontend/display_blogpost.js`, `js/2.0_records/frontend/pictures_display.js`, `js/5.0_essays_responses/frontend/sources_biblio_display.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   [BLOG POST TITLE]                               |
|                     |   By [Author], [Publish Date]                     |
|  - Records          |                                                   |
|  - Context          |   [Body Content]                                  |
|  - Resources        |   "Lorem ipsum dolor sit amet, consectetur        |
|  - Debate           |   adipiscing elit..."                             |
|  - About            |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [ Picture ]                               |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [BIBLIOGRAPHY]                                 |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

---

## 7.0 URL Slug Architecture
**Scope:** Clean-slug URL rewriting layer that maps human-readable paths to internal filesystem locations.

### 7.1 Clean Slug URL Scheme
**Purpose:** All public-facing URLs use clean, human-readable slugs instead of raw filesystem paths. The URL rewriting layer (nginx → FastAPI) handles the translation transparently.

**Relevant Documentation:** `url_slug_restructure.md` (full plan), `guide_function.md §7.3.1` (architecture diagram)

**Path Convention:**
| Pattern | Example | Serves |
|---------|---------|--------|
| `/` | `/` | `index.html` |
| `/about` | `/about` | `frontend/pages/about.html` |
| `/records` | `/records` | `frontend/pages/records.html` |
| `/record/{slug}` | `/record/jesus-baptism` | `frontend/pages/record.html?slug=jesus-baptism` |
| `/context/essay?id=` | `/context/essay?id=1` | `frontend/pages/context_essay.html?id=1` |
| `/blog/post?id=` | `/blog/post?id=my-post` | `frontend/pages/blog_post.html?id=my-post` |
| `/debate/academic-challenges` | `/debate/academic-challenges` | `frontend/pages/debate/academic_challenge.html` |
| `/resources/events` | `/resources/events` | `frontend/pages/resources/Events.html` |
| `/maps/roman-empire` | `/maps/roman-empire` | `frontend/pages/maps/map_empire.html` |

**Key Design Decisions:**
1. **Path-based record slugs** — Records use `/record/{slug}` (e.g. `/record/jesus-baptism`) not query params. Nginx named-capture rewrite maps the slug to `?slug=` internally so `single_view.js` reads it unchanged.
2. **`<base>` tag strategy** — Every HTML page has `<base href="/frontend/pages/">` (or `/frontend/pages/debate/`, `/frontend/pages/maps/`, `/frontend/pages/resources/` for subdirectories) so relative CSS/JS asset references resolve from the original directory even though the browser address bar shows a clean slug.
3. **Two-layer fallback** — Clean slugs are resolved first by nginx rewrite rules, then by FastAPI route handlers as a fallback for development environments.
4. **301 redirects** — Old `/frontend/pages/...` paths permanently redirect to the new clean slugs. Legacy query-param record URLs (`/record.html?slug=...` or `?id=...`) also 301 to `/record/{slug}`.
