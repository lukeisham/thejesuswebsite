---
name: visualizations_nomenclature.md
purpose: Glossary of terms used throughout the Visualizations Module and the broader codebase
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md]
---

# Visualizations Nomenclature — 3.0 Visualizations Module

## Global Terms (Codebase-Wide)

| Term | Definition |
|------|------------|
| **The Living Museum** | Name of the overall colour palette and design aesthetic — warm parchment tones and charcoal ink evoking an archival/museum feel |
| **Technical Blueprint** | Design philosophy — sharp corners, 1px structural borders, monospace metadata, dashed blueprint-style dividers |
| **8px Grid** | Foundational spacing system — all spacing values are multiples of 8px, tokenised via `--space-{n}` |
| **BEM** | Naming convention (Block__Element--Modifier) used for all CSS component classes across the entire codebase |
| **CSS Custom Properties (Design Tokens)** | Centralised design tokens defined in `typography.css` under `:root`, including colour, typography, spacing, shadow, border, and transition tokens |
| **Colour Tokens** | `--color-*` design tokens defining the palette: `bg-primary` (Soft Parchment), `text-primary` (Charcoal Ink), `accent-primary` (Deep Oxblood), `border` (Clay Stone), `status-success` (Blueprint Green), and others |
| **Typography Tokens** | `--font-*` (body, essay, heading, mono) and `--text-*` (xs through 4xl) tokens defining font families and type scale |
| **Spacing Tokens** | `--space-*` tokens (1 through 16) implementing the 8px grid system |
| **Deep Oxblood** | `#8e3b46` — primary accent colour used for links, active states, key hovers, and loading indicators across all modules |
| **Charcoal Ink** | `#242423` — primary text colour for body copy and headings |
| **Soft Parchment** | `#fcfbf7` — main page background colour |
| **Providence** | Dashboard 2-column grid system with permanent 1px structural divider and width hooks (`#providence-col-sidebar`, `#providence-col-main`) |
| **Page Shell** | The top-level CSS Grid layout (`#page-shell`) with named grid areas: `header`, `sidebar`, `main`, `footer` |
| **Oxblood Pulse** | `@keyframes oxblood-pulse` — CSS opacity-pulse animation for indeterminate loading states |
| **Registration Marks** | Decorative L-shaped corner cut marks (1px dashed Oxblood) applied via `.has-registration-mark` — evoking print/archival aesthetics |
| **State Classes** | Composable feedback classes: `.state-loading`, `.state-success`, `.state-error`, `.state-disabled` used across all modules |
| **Utility Classes** | `.is-hidden`, `.is-visible`, `.is-visible-flex`, `.is-visible-grid`, `.is-active`, `.is-open`, `.is-dragging`, `.is-loading` for JS-controlled visibility states |
| **Invisible SEO Header** | `<header id="invisible-header" aria-hidden="true">` — zero-height DOM anchor used by `header.js` to inject SEO metadata |
| **`data-*` Body Attributes** | Standardised `data-page-title`, `data-page-description`, `data-page-canonical`, `data-og-type`, `data-og-image` attributes on `<body>` consumed by `initializer.js` |
| **AI Metadata Directives** | `<meta name="ai:purpose" content="historical-evidence-archive">`, `<meta name="ai:subject">`, `<meta name="ai:reading-level" content="academic">` — LLM-specific hints injected on every page |
| **AI-Welcoming** | Design principle giving LLM crawlers (GPTBot, ChatGPT-User, Google-Extended, Claude-Web, DeepSeek, CCBot) fast, unrestricted access in `robots.txt` |
| **Icon System** | `.icon` base class with size modifiers (`--sm`, `--md`, `--lg`) and colour variants (`--accent`, `--muted`) — thin-line stroke SVG aesthetic |

## Module-Specific Terms (3.0 Visualizations Module)

| Term | Type | Definition |
|------|------|------------|
| **Arbor** | Sub-module | The recursive parent-child evidence tree visualization (§3.1). Named for the branching tree structure of evidentiary relationships. Dashboard editor + public display. |
| **Ardor** | Alias | Legacy/alternative spelling of "Arbor" found in frontend file names (`ardor_display.js`, `ardor.css`). Refers to the same evidence diagram; treat as synonymous with Arbor. |
| **Timeline** | Sub-module | Horizontally-scrolling chronological dot-and-axis visualization (§3.2). Renders published records as SVG circles positioned by their `timeline` field along a 37-stage ordered axis. |
| **Maps** | Sub-module | Interactive geospatial placeholder visualization (§3.3). Currently uses pseudo-random node positioning derived from record IDs rather than real geographic coordinates. |
| **TIMELINE_STAGES** | Constant | Ordered array of 37 canonical timeline position strings (from `PreIncarnation` through `ReturnOfJesus`) used to compute X-axis placement. Defined in `timeline_display.js`. |
| **Zone** | Layout concept | Vertical Y-position category for timeline nodes classified by `map_label` field. Three zones: supernatural (Y=50–150, top cloud), default (Y=300, stacked on axis), spiritual (Y=360–500, scattered below). |
| **Supernatural Cloud** | Layout pattern | Loose cluster of timeline nodes with `map_label='supernatural'` rendered at the top of the SVG (Y=50–150). X-position follows the node's timeline stage; Y is deterministically scattered. |
| **Spiritual Scatter** | Layout pattern | Timeline nodes with `map_label='spiritual'` rendered below the main axis (Y=360–500) with both X and Y positions derived from deterministic hash functions, detached from the stage axis. |
| **Axis Stacking** | Layout pattern | Default timeline nodes grouped by their `timeline` stage and stacked vertically in a column centered on the main axis (Y=300). Spacing between stacked nodes is zoom-responsive. |
| **Zoom Recalculation** | Interaction model | Timeline zoom that re-renders all node positions with recalculated spacing (`nodeSpacing = 14 + (scale - 1) * 7`) rather than applying a CSS transform. Ensures stacked columns expand cleanly at higher zoom levels. |
| **Linear Pulse** | Visual pattern | The horizontal dashed SVG axis line at Y=300 representing the progression of time on the Timeline page. 2px stroke with `stroke-dasharray="10, 4"`. |
| **Orphan Node** | Data state | A record whose `parent_id` is null — appears in the Arbor dashboard's orphan pool as an unattached node available for drag-and-drop attachment into the tree. |
| **Orphan Pool** | UI element | The drop zone at the bottom of the Arbor dashboard editor (`#arbor-orphan-pool`) displaying all orphan nodes. Dragging a node here sets its `parent_id` to null. |
| **Node Layer** | SVG layer | The `<g id="node-layer">` group in Timeline and Maps SVGs where interactive data circles are rendered dynamically by JavaScript. |
| **Grid Layer** | SVG layer | The `<g id="grid-layer">` group in the Timeline SVG containing the background rect and the central dashed axis line. |
| **Axis Markers Layer** | SVG layer | The `<g id="axis-markers-layer">` group in the Timeline SVG containing stage label text elements rendered below each stacked column. |
| **Base Layer** | SVG layer | The `<g id="base-layer">` group in the Maps SVG containing placeholder geographic outlines (static paths and border). |
| **Foundation Layer** | SVG layer | The `<g id="foundation-layer">` group in the Maps SVG containing region label text elements (e.g. "JUDEA"). |
| **Era Slider** | UI control | Range input (`#era-filter`, min=-100, max=100) on the Maps page that filters visible nodes by temporal proximity (±40-year window). |
| **Era Navigation** | UI control | Prev/Next button pair on the Timeline page that cycles through `TIMELINE_STAGES` and smooth-scrolls the canvas wrapper to center the target stage. |
| **View Selector** | UI control | Radio button group (`input[name="map_view"]`) on the Maps page toggling between geographic views: Empire, Levant, Judea, Galilee, Jerusalem. |
| **Metadata Panel** | UI component | Hidden-by-default `<aside>` panel (`.timeline-metadata-panel` or `.map-metadata-panel`) revealed on node click, displaying title, era, category, verse, description snippet, and deep-link. |
| **ardor-canvas-area** | DOM ID | Container element on `evidence.html` into which `ardor_display.js` injects the rendered SVG evidence tree. |
| **window.__diagramNodes** | Runtime state | In-memory Map of all Arbor nodes (keyed by ID) maintained by the dashboard editor for optimistic UI updates before server persistence. |
| **window.__changedNodes** | Runtime state | In-memory Map tracking which nodes have been re-parented since last save/publish in the Arbor dashboard editor. Cleared on successful publish. |
| **Deterministic Scatter** | Algorithm | Hash function (`deterministicScatter(id, axis, min, max)`) that maps a record ID to a stable pseudo-random position within a range, used for supernatural and spiritual zone placement. |
| **buildTreeSVG** | Function | Public Ardor display function that performs a depth-first layout pass, centering parents above children, and renders SVG with rect nodes, text labels, and cubic bezier edge paths. |
| **Cubic Bezier Edge** | Visual pattern | SVG `<path>` connector drawn between parent and child nodes in both the public Ardor diagram and the dashboard editor, using control points at the vertical midpoint. |
