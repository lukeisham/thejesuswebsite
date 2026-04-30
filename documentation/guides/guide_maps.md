---
title: guide_maps.md
version: 1.1.1
purpose: Visual ASCII representations of the interactive map layouts, mapped to front-end components (source of truth)
---

## 3.3 Visual Interactive Map Display Overview

**Purpose:** Interactive geospatial visualization of historical record data. Maps provide spatial context for events, people, and objects, allowing users to understand the geographical scope of the archive.

**Relevant Files:**
- **HTML:** `frontend/pages/maps.html`, `frontend/pages/maps/map_*.html`, `fr ontend/pages/maps/map_*.html`
- **CSS:** `css/3.0_visualizations/maps.css`
- **JS:** `frontend/display_other/maps_display.js`

**Standards Reference:** All map controls (Zoom, Layer Toggles, Era Slider) must adhere to the [UI Standards in guide_style.md §10](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_style.md).

```text
+-------------------------------------------------------------------------+
| [Invisible Header]                                                      |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|  [Sidebar]          |                                                   |
|                     |                                                   |
|  [Interactive       |             [ TOPONYM LAYER ]                     |
|   Controls]         |            (Labels: "Judea", "Galilee")           |
|                     |                                                   |
|  - Zoom In/Out      |             [ NODE LAYER ]                        |
|  - Toggle Layers    |            (Icons: Crosses, Pillars)              |
|  - Era Slider       |                                                   |
|                     |              * [Bethlehem]                        |
|  [View Selector]    |             /                                     |
|  ( ) Empire         |            /                                      |
|  ( ) Levant         |      * [Emmaus] -------- * [Jerusalem]            |
|  (x) Judea          |                          |                        |
|  ( ) Galilee        |               * [Hebron] |                        |
|                     |                          |                        |
|  [Metadata Panel]   |         [ BASE TOPOGRAPHY LAYER ]                 |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

## 3.3.1 The "Antique Layer" Aesthetic
- **Style:** High-contrast, custom grayscale map style with a subtle parchment tint (`#FCFBF7`).
- **Icons:** Minimalist historical markers (crosses for events, pillars for sites, squares for manuscripts) using the Deep Oxblood (`#8E3B46`) accent color.
- **Lines:** Political boundaries rendered as 1px dashed Charcoal Ink lines.

```text
  [ Symbols & Aesthetics ]
  
  ( Event )      ( Site )       ( Manuscript )    ( Boundary )
      +             | |              [ ]            - - - -
     +X+            |#|              [#]           - - - -
      +             |_|              [ ]            - - - -
  (Oxblood)      (Oxblood)        (Antique Gold)   (Charcoal)
```

## 3.3.2 Multi-View Hierarchy
The system supports several distinct map views, each filtered by the `map_label` field in the database.

```text
  [ Zoom Hierarchy ]
  
  +---------------------------------------+
  |  EMPIRE (Mediterranean Basin)         |
  |  +-------------------------------+    |
  |  |  LEVANT (Region)              |    |
  |  |  +-------------------------+  |    |
  |  |  |  JUDEA / GALILEE (Prov) |  |    |
  |  |  |  +-------------------+  |  |    |
  |  |  |  | JERUSALEM (City)  |  |  |    |
  |  |  |  +-------------------+  |  |    |
  |  |  +-------------------------+  |    |
  |  +-------------------------------+    |
  +---------------------------------------+
```

## 3.3.3 Map Layering System
Each map is composed of three primary functional layers rendered sequentially.

```text
  [ Z-Index Layering ]
                       / [ NODE LAYER ]         <-- (3) Dynamic Record Data
                      /-----------------------/
                     / [ FOUNDATION LAYER ]    <-- (2) Landmark Labels
                    /-----------------------/
                   / [ BASE LAYER ]          <-- (1) Land, Sea, Boundaries
                  /_______________________/
```

## 3.3.4 Data Mapping & Interaction
- **Filtering:** `maps_display.js` filters the global `records` table for items matching the current `map_label`.
- **Node Interaction:** Hovering displays a tooltip; clicking updates the Sidebar.

```text
  [ Interaction Flow ]
  
  MAP CANVAS             SIDEBAR (METADATA PANEL)
  +-------------+        +--------------------------+
  |   * [Node]----(Click)---> [ Record Title ]      |
  |  /          |        |                          |
  | *           |        |  * Date: 30 AD           |
  |             |        |  * Type: Event           |
  | [Hover: Tooltip]     |  * Snippet: ...          |
  +-------------+        |                          |
                         |  [ VIEW FULL RECORD > ]  |
                         +--------------------------+
```

## 3.3.5 The Era Slider Integration
- As users move the Era Slider in the sidebar, the Map Node layer updates in real-time to reflect the selected slice of history.

```text
  [ Temporal Filtering ]
  
  ERA SLIDER: [---(o)---] (Year: 30 AD)
                   |
                   v
  MAP VIEW: (Filter nodes where record.era matches selection)
  
  ( Visible )      ( Hidden )       ( Visible )
     Node A           Node B           Node C
   (Era: Life)    (Era: Early)       (Era: Life)
```

## 3.3.6 The Geo-Data ID System (`geo_id`)

**Purpose:** To provide a deterministic, high-precision link between database records and specific SVG/Canvas coordinates without relying on floating-point latitude/longitude strings.

**The 64-Bit Coordinate Hash:**
- Each `geo_id` is a 64-bit integer that represents a unique "cell" or "point" on the archaeological map grid.
- Using integers instead of floats ensures 100% stability in SQL indexing and prevents rounding errors when scaling the map from **Empire** view down to **Jerusalem City** view.

```text
  [ ID Resolution Process ]
  
  (1) RAW DATA        (2) GEO-LOOKUP TOOL     (3) SQLITE RECORD
  Lat: 31.7767   -->   [ tools/geo_lookup.py ] --> geo_id: 3334680946...
  Long: 35.2345         (Bit-Packing Engine)        (Primary Index)
  
  (4) CANVAS RENDERER   (5) VISUAL OUTPUT
  [ maps_display.js ]  -->  x=452.1, y=890.3
  (Inverse Transform)       (SVG Coordinate)
```

**Workflow for Adding Data:**
1. **Find:** For existing locations (e.g., *Capernaum*), consult the master `assets/geo_index.json` registry to find the pre-assigned `geo_id`.
2. **Generate:** For new discovery sites or specific event locations, use the `tools/geo_lookup.py` script. Input the target Latitude/Longitude, and the script will output the correct 64-bit project-compliant ID.
3. **Database Entry:** Ensure the ID is entered into the `geo_id` field as a raw integer (BigInt) in the `records` table.

**Source Registry:**
- **Primary Source:** [The Global Archaeological Geo-Index] — a project-specific mapping table that ensures consistency between historical maps and modern GPS coordinates.
- **Local Mirror:** `assets/geo_index.json` contains a cached mapping of common locations used in the initial seed data.## 3.3.7 Creation & Assembly of Map Layers

**Purpose:** Actionable workflow for generating visual layers and integrating them into the visual system.

### A. Asset Creation ("The How")
1. **Reference Map Selection:**
   - Source historical base maps from academic sources (e.g., *Oxford Bible Atlas*, *ESV Study Bible Maps*, or *BibleMapper* exports).
   - Ensure the reference map uses a projection compatible with the project's coordinate grid (Universal Transverse Mercator or similar).
2. **Layer-Based Tracing (Figma/Sketch):**
   - **Layer 0 (Background):** Add a rectangle with the `#FCFBF7` parchment tint.
   - **Layer 1 (The Sea):** Trace coastal boundaries first, following the shoreline with the Pen Tool. Fill with a very light, desaturated blue or simply leave as a distinct path with a light halftone texture.
   - **Layer 2 (Land & Topography):** Trace major mountain ranges and rift valleys (like the Jordan Rift) as simple, low-opacity strokes.
   - **Layer 3 (Political & Trade):** Use 1px dashed lines for Roman provincial borders and the *Via Maris* or *King's Highway*.
3. **Path Simplification & "Human" Aesthetic:**
   - **Manual Simplification:** After tracing, select paths and use `Object > Path > Simplify` (Illustrator) or the equivalent in Figma to reduce points by ~60%. 
   - **Threshold:** Maintain a point-to-pixel ratio that permits a slight "jitter" or wobble — this preserves the "antique hand-drawn" feel of a Living Museum artifact while reducing SVG file size.
   - **Constraint:** Ensure no single path contains more than 500 points to keep browser rendering smooth during rapid zooming.
4. **Interactive Node Icons:**
   - Design a set of three master symbols (Cross, Pillar, Square) in a separate `symbols.svg` file.
   - Each symbol should be designed on a 24x24px grid but scaled down to 4-8px within the final map SVG to ensure pixel-perfect clarity.
5. **The Jerusalem Calibration (Testing):**
   - Before exporting, place a "Calibration Node" at the known pixel coordinates for Jerusalem (e.g., `500, 400`).
   - If the `geo_id` for Jerusalem does not align with your trace, the base layer must be repositioned or scaled to match the project's coordinate master.

### B. Code Integration ("The Where")
| Layer Type | Source File Location | HTML Integration Point |
|:---|:---|:---|
| **Base (Static)** | `assets/maps/raw_geo_*.svg` | Inline in `frontend/pages/maps/map_*.html` |
| **Foundation (Static)**| `assets/maps/raw_labels_*.svg` | Inline in `frontend/pages/maps/map_*.html` |
| **Nodes (Dynamic)** | SQLite `records` table | Injected by `maps_display.js` into `#node-layer` |

```text
  [ Technical Implementation Workflow ]
  
  1. Figma Export -----> 2. Frontend HTML Shell -----> 3. JS Data Injection
  (raw_judea.svg)       (pages/maps/map_judea.html)     (maps_display.js)
  
  <svg id="interactive-map" viewBox="0 0 1000 800">
     <g id="base-layer"> [ Pasted Path Data ] </g>
     <g id="foundation-layer"> [ Pasted Text Data ] </g>
     <g id="node-layer"> <!-- JS INJECTS CIRCLES HERE --> </g>
  </svg>
```

### C. Implementation Standards
- **Coordinate Stability:** Every map view MUST use the same `viewBox` scale. If Judea is a sub-section of Levant, it should use a translated/scaled transform of the parent coordinate space to keep `geo_id` math simple.
- **Styling:** Do not use inline `fill` or `stroke` in the SVG. Rely on `css/3.0_visualizations/maps.css` classes for the "Antique/Oxblood" aesthetic.
- **Node Injection:** `maps_display.js` must search for the `#node-layer` container and append SVG `<circle>` or `<use>` elements dynamically.