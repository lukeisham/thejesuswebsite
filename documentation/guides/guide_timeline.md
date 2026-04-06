---
title: guide_timeline.md
version: 1.1.1
purpose: Visual ASCII representations of the interactive timeline layout, mapped to front-end components (source of truth)
---

## 3.2 Visual Interactive Timeline Display Overview

**Purpose:** Full-screen or large-canvas layouts for interactive timeline exploration. The timeline serves as a chronological backbone for the entire archive, allowing users to see the intersection of biblical events, secular history, and manuscript transmission.

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
|                     |            (SVG Rendering Engine)                 |
|  - Zoom In/Out      |                                                   |
|  - Toggle Layers    |                           * [Node: Resurrection]  |
|  - Era Slider       |             *             *                       |
|                     |             * [Node: Cross] * [Layer: Ritual]     |
|  [Layer Toggle]     |       *     *       *     *       *     *         |
|  [x] Biblical       |  ====[*]====[*]====[*]====[*]====[*]====[*]====   |
|  [ ] Secular        |     [Yr]   [Yr]   [Yr]   [Yr]   [Yr]   [Yr]       |
|  [x] Prophecy       |      (Horizontal "Linear Pulse" Axis)             |
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
The timeline supports multiple vertical "lanes" or "layers" to provide context.

```text
  [ Vertical Lanes (Y-Axis) ]
  
  (Prophecy)    [#]   [#]                <-- (Top Lane: Golden Squares)
  ---------------------------------------
  (Biblical)     *     *     *     *     <-- (Mid Lane: Oxblood Dots)
  ---------------------------------------
  (Secular)      o           o           <-- (Bottom Lane: Charcoal Circles)
  ======================================= (Main Axis)
```

## 3.2.3 Data Injection & Mapping
- **Mapping:** Database fields map directly to SVG attributes.

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
