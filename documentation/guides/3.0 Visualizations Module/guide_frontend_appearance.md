---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Visualizations Module pages (ardor diagram, timeline, geographic maps)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, guide_style.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 3.0 Visualizations Module
**Scope:** Ardor diagram, Timeline chronological dots/progression, Map Geo-spatial layers.

### 3.1 Visual Interactive Ardor Diagram 
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

#### 3.1.1 Visual Interactive Ardor Diagram — Component Anatomy
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

