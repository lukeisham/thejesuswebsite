---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Visualizations Module pages — Arbor diagram, Timeline, Maps
version: 2.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_style.md, guide_dashboard_appearance.md, guide_function.md, visualizations_nomenclature.md]
---

## 3.0 Visualizations Module — Public Frontend

### 3.1 Arbor (Evidence) Diagram Page

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   +-------------------------------------------+   |
|                     |   |                                           |   |
|  - Records          |   |          [ FULL-BLEED CANVAS ]            |   |
|  - Evidence         |   |          (ardor-canvas-area)              |   |
|  - Timeline         |   |                                           |   |
|  - Maps             |   |   [Root A] --+-> [Child 1]                |   |
|  - Context          |   |              |                            |   |
|  - Resources        |   |              +-> [Child 2] --> [Leaf]     |   |
|  - Debate           |   |                                           |   |
|  - About            |   |   [Root B] -------> [Child 3]             |   |
|                     |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 3.1.1 Arbor Diagram — DOM Structure

```text
<body data-sidebar-active-nav="evidence">
└── <div class="page-shell" id="page-shell">
    └── <main class="site-main is-full-bleed" id="site-main">
        └── <div class="diagram-layout">
            └── <div id="ardor-canvas-area">
                └── <svg class="ardor-svg" viewBox="0 0 {width} {height}">
                    ├── <defs>
                    │   └── <marker id="arrow">          ← Arrow marker
                    ├── <g class="ardor-edges">
                    │   └── <path class="ardor-edge">    ← Cubic bezier connectors
                    └── <g class="ardor-nodes">
                        └── <g class="ardor-node" transform="translate(x,y)">
                            ├── <rect width="200" height="50">
                            ├── <text class="title">     ← Record title (max 28 chars)
                            └── <text class="meta">      ← Verse reference
```

### 3.2 Timeline Page

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   Timeline                                        |
|                     |   Explore historical evidence of Jesus in a        |
|  - Records          |   chronological arrangement.                       |
|  - Evidence         |                                                   |
|  - Timeline         |   +-------------------------------------------+   |
|  - Maps             |   |                                           |   |
|  - Context          |   |  (Supernatural Cloud Y=50-150)            |   |
|  - Resources        |   |       *        *     *                    |   |
|  - Debate           |   |                                           |   |
|  - About            |   |  =====[*][*][*]==[*]==[*][*]==[*]======   |   |
|                     |   |  (Main Axis Y=300 — stacked columns)      |   |
|                     |   |       [*]                                  |   |
|                     |   |                                           |   |
|                     |   |          o       o                        |   |
|                     |   |     o        o          o                 |   |
|                     |   |  (Spiritual Scatter Y=360-500)            |   |
|                     |   |                                           |   |
|                     |   |  [axis labels below stacked nodes]        |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [Zoom In] [Zoom Out]                      |   |
|                     |   | [<< Prev Era] [Galilee Ministry] [Next >>]|   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [METADATA PANEL] (hidden until node click) |   |
|                     |   | Title / Era > Timeline / Category / Verse  |   |
|                     |   | Description snippet / View Full Record →   |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

#### 3.2.1 Timeline — DOM Structure

```text
<body data-sidebar-active-nav="timeline">
└── <div class="page-shell" id="page-shell">
    └── <main class="site-main" id="site-main">
        └── <div class="content-wrap grid-single">
            ├── <header class="timeline-header">
            │   ├── <h1 class="record-title">Timeline</h1>
            │   └── <p class="record-primary-verse">
            │
            ├── <div class="timeline-interface-container" id="timeline-interface">
            │   ├── <div class="timeline-canvas-wrapper" id="timeline-canvas-wrapper">
            │   │   └── <svg id="interactive-timeline" viewBox="0 0 {dynamic} 600">
            │   │       ├── <g id="grid-layer">
            │   │       │   ├── <rect width="{dynamic}" height="600"> ← Background
            │   │       │   └── <line class="timeline-axis-line">     ← Dashed axis at Y=300
            │   │       ├── <g id="axis-markers-layer">               ← Stage labels
            │   │       └── <g id="node-layer">                       ← Zone-classified circles
            │   │
            │   └── <div class="timeline-controls">
            │       ├── <div class="timeline-actions">
            │       │   ├── <button id="zoom-in">
            │       │   └── <button id="zoom-out">
            │       └── <div class="timeline-era-navigation">
            │           ├── <button id="prev-era">
            │           ├── <span id="current-era-display">
            │           └── <button id="next-era">
            │
            └── <aside class="timeline-metadata-panel is-hidden" id="timeline-metadata-panel">
                ├── <h2 id="metadata-title">
                ├── <p id="metadata-date">              ← "Era/Timeline: {era} > {timeline}"
                ├── <p id="metadata-category">          ← "Category: {category}"
                ├── <p id="metadata-verse">             ← "{Book} {Ch}:{Vs}"
                ├── <div id="metadata-snippet">         ← Description (max 200 chars)
                └── <a id="metadata-link" href="/record/{slug}">
```

### 3.3 Maps Page

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| [ Search Bar ]                                                          |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   Maps                                            |
|                     |   Explore the geography of the evidence for Jesus. |
|  - Records          |                                                   |
|  - Evidence         |   +-------------------------------------------+   |
|  - Timeline         |   |                                           |   |
|  - Maps             |   |  [base-layer: placeholder geographic path] |   |
|  - Context          |   |                                           |   |
|  - Resources        |   |           JUDEA  (foundation-layer label)  |   |
|  - Debate           |   |                                           |   |
|  - About            |   |        * [node]     * [node]              |   |
|                     |   |                  * [node]                  |   |
|                     |   |     * [node]              * [node]         |   |
|                     |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | (o)Empire (o)Levant (*)Judea               |   |
|                     |   |           (o)Galilee (o)Jerusalem          |   |
|                     |   | [+] [-] [Layers]                          |   |
|                     |   | Temporal Slider: [========] [30 AD]        |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [METADATA PANEL] (hidden until node click) |   |
|                     |   | Title / Era / Category / Verse / Snippet   |   |
|                     |   | View Full Record →                         |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+

NOTE: Maps is a basic placeholder implementation. Node positions are
deterministic pseudo-random (derived from record ID), not real coordinates.
Geographic layers are static SVG paths, not actual cartographic data.
```

#### 3.3.1 Maps — DOM Structure

```text
<body data-sidebar-active-nav="maps">
└── <div class="page-shell" id="page-shell">
    └── <main class="site-main" id="site-main">
        └── <div class="content-wrap grid-single">
            ├── <header class="map-header">
            │   ├── <h1 class="record-title">Maps</h1>
            │   └── <p class="record-primary-verse">
            │
            ├── <div class="map-interface-container" id="map-interface">
            │   ├── <div class="map-canvas-wrapper" id="map-canvas-wrapper">
            │   │   └── <svg id="interactive-map" viewBox="0 0 1000 800">
            │   │       ├── <g id="base-layer">
            │   │       │   ├── <rect width="1000" height="800">  ← Background
            │   │       │   ├── <path ... opacity="0.3">          ← Placeholder geography
            │   │       │   └── <path ... stroke-dasharray>       ← Border outline
            │   │       ├── <g id="foundation-layer">
            │   │       │   └── <text>JUDEA</text>                ← Region label
            │   │       └── <g id="node-layer">                   ← Dynamic circles
            │   │
            │   └── <div class="map-controls">
            │       ├── <div class="map-views">                   ← Radio buttons
            │       │   (Empire | Levant | Judea[checked] | Galilee | Jerusalem)
            │       ├── <div class="map-actions">
            │       │   ├── <button id="zoom-in">+</button>
            │       │   ├── <button id="zoom-out">-</button>
            │       │   └── <button id="toggle-layers">Layers</button>
            │       └── <div class="map-era-slider">
            │           ├── <input type="range" id="era-filter" min="-100" max="100" value="30">
            │           └── <span id="era-display">30 AD</span>
            │
            └── <aside class="map-metadata-panel is-hidden" id="map-metadata-panel">
                ├── <h2 id="metadata-title">
                ├── <p id="metadata-date">              ← "Era: {era}"
                ├── <p id="metadata-category">          ← "Category: {category}"
                ├── <p id="metadata-verse">             ← "{Book} {Ch}:{Vs}"
                ├── <p id="metadata-snippet">           ← Description (max 160 chars)
                └── <a id="metadata-link" href="/record/{slug}">
```
