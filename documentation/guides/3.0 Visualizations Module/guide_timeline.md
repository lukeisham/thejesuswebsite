---
title: guide_timeline.md
version: 1.2.0
purpose: Visual ASCII representations of the interactive timeline layout, mapped to front-end components (source of truth)
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md, guide_maps.md, visualizations_nomenclature.md]
---

## 3.2 Visual Interactive Timeline Display Overview

**Purpose:** Full-screen or large-canvas layouts for interactive timeline exploration. The timeline serves as a chronological backbone for the entire archive, allowing users to see the intersection of biblical events, secular history, and manuscript transmission.

**Relevant Files:**
- **HTML:** `frontend/pages/timeline.html`
- **CSS:** `css/3.0_visualizations/timeline.css`
- **JS:** `js/3.0_visualizations/frontend/timeline_display.js`

**Standards Reference:** All interactive controls (Zoom, Era Navigation) must adhere to the [UI Standards in guide_style.md §10](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_style.md).

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
|                     |            (SVG Rendering Engine)                 |
|  - Zoom In/Out      |                                                   |
|  - Toggle Layers    |                           * [Node: Resurrection]  |
|  - Era Slider       |             *             *                       |
|                     |             * [Node: Cross] * [Layer: Ritual]     |
|  [Layer Toggle]     |       *     *       *     *       *     *         |
|  [x] Biblical       |  ====[*]====[*]====[*]====[*]====[*]====[*]====   |
|  [ ] Secular        |     [Yr]   [Yr]   [Yr]   [Yr]   [Yr]   [Yr]       |
|                     |      (Horizontal "Linear Pulse" Axis)             |
|                     |                                                   |
|  [Metadata Panel]   |      [ < PREV ERA ]           [ NEXT ERA > ]      |
|  (Selected Node)    |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

## 3.2.1 The "Linear Pulse" Logic
- **Horizontal Axis:** A continuous 2px ink line representing the progression of time.
- **Scaling:** The X-coordinate is calculated based on the `era` and `timeline` fields.

```text
  [ X-Axis Positioning ]
  
  ERA: [ Galilee Ministry ]          ERA: [ Passion Week ]
  Timeline: [ Sermon ]  [ Miracles ] [ Palm Sunday ] [ Monday ]
  +----------[*]-----------[*]---------|----------[*]-------[*]------>
  Coordinates: (x=120)     (x=340)               (x=600)   (x=680)
```

## 3.2.2 Interactive Layers
The timeline supports two vertical "lanes" or "layers" to provide context.
The legacy Prophecy lane has been removed; era-based lane assignment
(PreIncarnation/OldTestament → secular, others → biblical) is determined
at render time.

```text
  [ Vertical Lanes (Y-Axis) ]
  
  (Biblical)     *     *     *     *     <-- (Mid Lane: Oxblood Dots)
  ---------------------------------------
  (Secular)      o           o           <-- (Bottom Lane: Charcoal Circles)
  ======================================= (Main Axis)
```

## 3.2.3 Data Injection & Mapping
- **Mapping:** Database fields map directly to SVG attributes.
- **Query:** Timeline nodes are queried from the WASM SQLite engine with type and status filters:

```sql
SELECT id, title, timeline, era, gospel_category, description, primary_verse, slug
FROM records
WHERE timeline IS NOT NULL
  AND type = 'record'
  AND status = 'published'
LIMIT 200;
```

```text
  [ DB to SVG Mapping ]
  
  SQLite Record:                 SVG Element:
  id: "ULID-123" ----------> id: "node-123"
  timeline: "PalmSunday" --> x: 600
  category: "event"  ------> fill: "#8E3B46"
  title: "Entry..."  ------> <title>Entry...</title>
```

## 3.2.4 User Interaction
- **Hover/Click States:** Interaction triggers visual feedback and sidebar updates.

```text
  [ Node States ]
  
     (Normal)        (Hover)           (Selected/Click)
        *               ( * )             [[ * ]]
      4px r           8px r            10px stroke-ring
                                          |
                                          v
                                   Update Sidebar.js
```

## 3.2.5 Visual Styles (SVG Constants)
Standardized visual tokens for all timeline elements.

```text
  [ Visual Scale ]
  
  Axis Line:  -------------------------  (2px)
  Grid Line:  - - - - - - - - - - - - -  (1px Dashed)
  Labels:     "Year 30 AD"               (10px Roboto Mono)
```

## 3.2.6 Navigation Landmarks (Synoptic Links)
- **Synoptic Links:** Nodes clustered vertically connected by a thin line.

```text
  [ Synoptic Witnessing ]
  
           [ Matthew ]  *
                        |
           [ Mark ]     *  <-- (Vertical link shows shared 
                        |          event across Gospels)
           [ Luke ]     *
  ======================|================ Axis
```

## 3.2.7 Query Filters (v2.0 Schema Compliance)

As of schema v2.0, the timeline display applies strict type and status
discriminators to prevent draft leakage and wrong-type row inclusion:

| Filter | Value | Purpose |
| :--- | :--- | :--- |
| `type` | `'record'` | Excludes essays, blog posts, challenges, responses, and news articles from the timeline |
| `status` | `'published'` | Prevents draft records from appearing on the public timeline |
| `timeline IS NOT NULL` | — | Only records with a timeline position are rendered as nodes |

**Lane assignment** is now computed at render time based on the `era` field:
- `PreIncarnation` and `OldTestament` era records are placed in the **secular** lane
- All other era values are placed in the **biblical** lane
