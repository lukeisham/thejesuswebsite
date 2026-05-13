---
name: guide_style.md
purpose: description of visual appearance of the website 
version: 1.11.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md, typography.css, shell.css]
---

# Guide to Visual Appearance

This document defines the visual identity and UI/UX standards for the project, ensuring architectural consistency across all modules. It serves as the primary "Design System" reference for all CSS development.

## 1. Style Philosophy
The "Living Museum" aesthetic blends a technical blueprint architecture with an archival collection feel. It prioritizes truth through typography, utilizing precision grids and high-contrast metadata to create an authoritative, "Technical Ledger" experience.

## 2. Reference Foundations
| Source | Influences |
| :--- | :--- |
| **The British Library** | Authoritative whitespace, high-density data tables, archival precision. |
| **Stanford Encyclopedia** | Long-form readability, citation density, minimalist navigation. |
| **Oxford Museum** | Premium typography, refined historical color palettes, contextual elegance. |

## 3. Typography System
| Usage | Typeface | CSS Variable | Intent |
| :--- | :--- | :--- | :--- |
| **Body Text** | *EB Garamond* | `--font-body` | Evokes printed historical manuscripts. |
| **Essays** | *Crimson Pro* | `--font-essay` | Premium reading serif for long-form content. |
| **Headings** | *Inter* | `--font-heading` | Authoritative modern digital skeleton. |
| **Metadata/UI** | *Roboto Mono* | `--font-mono` | Technical precision, dates, and archival tagging. |

## 4. Color Palette
| Category | Usage | Hex Code | CSS Variable |
| :--- | :--- | :--- | :--- |
| **Paper (Primary)** | Backgrounds | `#FCFBF7` | `--color-bg-primary` |
| **Paper (Aged)** | Secondary Layers | `#F4F2ED` | `--color-bg-secondary` |
| **Ink (Primary)** | Body Text | `#242423` | `--color-text-primary` |
| **Lead (Secondary)**| Meta-text | `#5B5B5B` | `--color-text-secondary` |
| **Oxblood** | Active Accents | `#8E3B46` | `--color-accent-primary` |
| **Deep Oxblood** | Dashboard Accent | `#8E3B46` | `--color-dash-accent` |
| **Clay Stone** | Standard Borders | `#E0DCD1` | `--color-border` |
| **Blueprint Green** | Success States | `#2E7D32` | `--color-status-success` |

## 5. Architectural Constraints
- **Grid System:** Strict 8px global grid (`--space-1` to `--space-16`) for visual harmony.
- **Structural Lines:** 1px dashed borders (`--border-width-thin`) for major dividers.
- **Corner Logic:** Zero rounding (`--radius-none`) on all structural elements.
- **Reading Width:** 720px maximum (`--content-max-width`) for content columns.

## 6. Layout & Navigation
| Component | Width/Position | CSS Variable | Styling Details |
| :--- | :--- | :--- | :--- |
| **Sidebar** | `280px` (Sticky Left) | `--sidebar-width` | 1px dashed border, sharp corners. |
| **Universal Footer**| Fixed Bottom | `--footer-height` | Aged paper BG, Mono "Metadata Block." |
| **Search Bar** | Centered Header | `--header-height` | 1px border (`--color-border`), 12px padding, Mono input, magnifying glass icon. |

## 7. Data Visualization Modules
| Module | Core Aesthetic | Implementation Details |
| :--- | :--- | :--- |
| **Timeline** | "Linear Pulse" | 2px ink axis, Oxblood nodes, Roboto Mono labels. |
| **Arbor Tree** | "Evidence Root" | 1px connecting lines, parchment cards, `shadow-sm`. |
| **Map** | "Archival Frame" | Dashed border, grayscale map, Oxblood POI markers. |

## 8. Listing & Records
| Type | Pattern | Hover/Interactive State |
| :--- | :--- | :--- |
| **Ordinary List** | Zebra-striped rows | 2px left-border Oxblood highlight. |
| **Ranked List** | Serif rank numbers | High-density vertical alignment. |
| **All Records Table** | High-density 4-column table | Monospaced metadata typography (`--font-mono`), zebra-striped rows, sticky header, clickable rows with hover highlight, status badges (Draft/Published). |
| **Bulk Review Panel** | Visually distinct review table | Bordered container with `--color-accent-muted`, sticky action bar, checkbox column, invalid rows red-tinted (`rgba(142, 59, 70, 0.06)`), validation status icons. |
| **Response Inserts** | Dashed boundaries | Labeled interjections (Top-left, Mono, 10px, Lead Grey). |

## 9. Content Elements
| Element | Visual Treatment | Implementation |
| :--- | :--- | :--- |
| **Essays** | Manuscript column | Single column; Drop-caps (3 lines, bold, 4px margin); `--font-essay`. |
| **Citations** | MLA style | `0.85rem` size; `--color-text-secondary`. |
| **Footnotes** | Marginal/Inline | Lead-grey brackets `[...]`; `--text-xs`. |
| **Images** | Solid black frame | 1px solid black; Centered "Fig X" caption. (Also applies to Admin UI previews) |
| **Bible Verses** | Dotted underline | Click-to-open fly-out boxes; Serif italics. |

## 10. Interactive Controls
| Control | Specification | Aesthetic | CSS Mapping |
| :--- | :--- | :--- | :--- |
| **Buttons** | Sharp corners, 1px | Mono text; Paper fill (default); Oxblood hover. | `--border-width-thin` |
| **Sliders** | 1px vectors | Oxblood thumb; Mono value displays. | `--color-accent-primary` |
| **Checkboxes** | Sharp rectangular | Oxblood selection; Mono labels. | `--radius-none` |
| **Switches** | Binary block | Oxblood (ON) / Lead Grey (OFF). | `--transition-base` |
| **Dropdowns** | Charcoal border | Dashed border lists; Zebra-stripe options. | `--color-bg-secondary` |

## 11. Container Architecture
| Component | Visual Description | CSS Variable |
| :--- | :--- | :--- |
| **Main Column** | 720px max-width; Left-aligned. | `--content-max-width` |
| **Zebra Striping** | Alternating Paper backgrounds (`--color-bg-primary` vs `--color-bg-secondary`). | `--color-bg-secondary` |
| **Dashed Borders** | 1px dashed Clay Stone borders. | `--color-border` |
| **Content Cards** | 1px solid Clay Stone; No radius. | `--radius-none` |
| **Modals** | Aged paper; Base shadow. | `--shadow-base` |

## 12. Depth & Interaction Tokens
| Category | Specification | CSS Variable |
| :--- | :--- | :--- |
| **Shadows** | Minimal / Functional | `--shadow-sm` / `--shadow-md` |
| **Transitions**| Subtle / Swift | `--transition-fast` (150ms) / `--transition-base` |
| **Focus Rings**| Accent / Gold | `2px solid var(--color-accent-primary)` |

## 13. Spacing & Geometry
| Category | Rule | Intent |
| :--- | :--- | :--- |
| **8px Grid** | Multiples of 8px | All layout spacing MUST use `--space-N`. |
| **Corner Radius**| Globally 0px | Enforced via `--radius-none`. |
| **Border Width**| 1px (thin), 2px (base/thick) | `--border-width-thin` / `--border-width-base` / `--border-width-thick`. |

## 14. System Feedback & States
| State | Visual Treatment | CSS Variable |
| :--- | :--- | :--- |
| **Loading** | Pulse animation | `--color-accent-primary` |
| **Success** | Green text/border | `--color-status-success` |
| **Error** | Oxblood alert box | `--color-accent-primary` |
| **Disabled** | Lead Grey; 0.5 Opacity | `--color-text-muted` |

## 15. Iconography & Specialized Accents
| Element | Visual Style |
| :--- | :--- |
| **Icons** | Minimalist thin-line SVGs (1px stroke); No fills. |
| **Scrollbars** | Thin 1px charcoal track; No rounded caps. |
| **Citations** | Lead Grey color; Monospace IDs; `[...]`. |
| **Registration** | 1px dashed Oxblood "cut marks" for emphasis. |

## 16. Layer Hierarchy (Z-Index)
| Layer | Range | Components |
| :--- | :--- | :--- |
| **Base** | `0` | Background, content grid. |
| **Mid** | `10 - 50` | Floating nodes, interactive canvas. |
| **Top** | `100` | Sidebar, Sticky Header, Sticky Footer. |
| **Overlay** | `200+` | Modals, Fly-outs. |

## 17. Responsive Strategy
| Category | Strategy | Implementation |
| :--- | :--- | :--- |
| **Breakpoints** | 1024px (Tablet) / 640px (Mobile) | Sidebar collapses; Grid stacks. |
| **Typography** | Scaled Scale | 112.5% (Desktop) to 100% (Mobile). |
| **Constraints** | Overflow | No horizontal scrolling except Timeline. |

## 18. Dashboard Architecture & Module Aesthetics

The admin dashboard (`dashboard.html`) is a single-page application shell with a
Providence 2-column work canvas, a universal header, a module tab bar, a card
grid landing area, and a fixed error/status footer. All ten dashboard modules
are loaded as fragments into this shell via `dashboard_app.js`.

### 18.1 Dashboard Shell Layout

| Component | Visual Description | Implementation |
| :--- | :--- | :--- |
| **Body** | Full-height flex column (`100dvh`), `overflow: hidden` | `#admin-dashboard` in `admin_shell.css` |
| **Universal Header** | 64px fixed height, 1pt bottom border, double favicon (32px), site title (Inter semibold), nav links (Return / Dashboard / Logout) with Oxblood hover | `dashboard_universal_header.css`, `admin_shell.css` |
| **Module Tab Bar** | 40px horizontal strip, `--color-bg-secondary` fill, UPPERCASE Inter labels; active tab: Oxblood text + 2px bottom border | `.module-tab` in `admin_components.css` §5 |
| **Card Grid** | 3-column grid (3×3 + 1 centred), 1pt border cards with `--color-dash-accent` hover, card title (Inter semibold), description (EB Garamond) | `#admin-cards`, `.admin-card` in `admin_components.css` §4 |
| **Error/Status Footer** | 36px fixed bottom, Roboto Mono xs, `--color-bg-secondary` fill, 1pt top border | `#admin-error-footer` in `admin_shell.css` §3 |

### 18.2 Providence 2-Column Work Canvas

When a module is loaded, the card grid is replaced by a CSS Grid canvas:

```
[sidebar column] | [1px divider] | [24px gap] | [main column]
```

| Property | Specification |
| :--- | :--- |
| **Grid Tracks** | `--sidebar-width` (default 280px) + `1px` + `24px` + `--main-width` (default `1fr`) |
| **Column Hook** | `_setLayoutColumns(width/null)` sets `--sidebar-width` and `--main-width` via CSS custom properties |
| **Divider** | Permanent 1px `--color-border` track — not a border on a column element |
| **Columns Scroll** | Both `.providence-col` panels scroll independently; 4px thin scrollbar, zero radius |
| **No-Sidebar State** | `.no-sidebar` on `#admin-canvas` hides the sidebar column and resize handle |
| **Resize Handle** | 8px-wide drag target in the divider track; 1px centred indicator; `is-dragging`: Oxblood indicator | `admin_components.css` §7 |

### 18.3 Per-Module Layout Patterns

Each dashboard module renders its own layout inside the Providence canvas. Three
structural patterns recur:

| Pattern | Description | Used By |
| :--- | :--- | :--- |
| **Split-Pane (Sidebar + Main)** | Fixed-width sidebar with a document list + scrollable editor area, separated by a 1px divider | Essay, Blog Posts, News Sources |
| **Full-Width Table** | A single main-area table with a sticky function bar, search bar, and optional bulk review panel | Records All |
| **Multi-Section Form** | Vertically stacked form sections with a sticky section navigator sidebar | Records Single |
| **Dual-Pane (Controls + List)** | A parameter sidebar (weights, search terms) + a scrollable ranked list with row expansion | Challenge, Wikipedia |
| **Canvas + Sidebar** | A visual canvas (tree, map, timeline) with an optional control sidebar | Arbor |
| **Card Grid Dashboard** | Row-oriented health cards, activity table, trace panel, and test console | System |

### 18.4 Shared Button & Form Token Conventions

All dashboard modules share these visual conventions (sourced from `typography.css`):

| Element | Font | Size | Border Radius | Border |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Action Button** | Inter (heading) | `--text-xs` | `--radius-sm` (2px) or `--radius-md` (3px) | `--border-width-thin` |
| **Secondary Button** | Inter | `--text-xs` | `--radius-sm` | `--border-width-thin` |
| **Toggle Button** | Inter | `--text-xs` | `--radius-sm` | `--border-width-thin` |
| **Text Input** | Roboto Mono | `--text-sm` | `--radius-sm` | `--border-width-thin` |
| **Textarea** | Body or Mono | `--text-sm` | `--radius-sm` | `--border-width-thin` |
| **Select Dropdown** | Roboto Mono | `--text-sm` | `--radius-sm` | `--border-width-thin` |
| **Chip / Tag** | Roboto Mono | `--text-xs` | `--radius-full` (pill) or `--radius-md` or `--radius-sm` | `--border-width-thin` |
| **Status Badge** | Inter | `--text-xs` | `--radius-sm` | none |

**Rounding policy**: Structural containers (cards, panels, modals) use `--radius-none` (0px).
Interactive controls (buttons, inputs, selects) use `--radius-sm` (2px) or `--radius-md` (3px).
Tags may use `--radius-full` (9999px) for pill shapes. Nothing exceeds `--radius-base` (4px).

**Button color states**:

| State | Visual Treatment |
| :--- | :--- |
| **Save Draft** | Secondary fill (`--color-white`), Clay border, Lead Grey text |
| **Publish** | Oxblood fill (`--color-dash-accent`), parchment text (`--color-text-inverse`) |
| **Delete** | Transparent fill, Lead Grey text, Oxblood hover border/text |
| **Generate All** (metadata widget) | Full-width Oxblood fill (`--color-accent-primary`), parchment text |
| **Refresh / Crawl** | Accent fill (`--color-accent-primary`), parchment text |

**Focus states**: All dashboard inputs, selects, and buttons use `border-color:
--color-dash-accent` on `:focus` and `:focus-visible`. Focus rings are 2px solid
`--color-dash-accent` with 2px offset.

### 18.5 Section Heading Convention (Dashboard)

Dashboard section headings follow a uniform pattern:

| Heading Level | Use |
| :--- | :--- |
| `### N.M` (numbered) | Modules that correspond to a named sitemap sub-module (e.g., `### 2.1`, `### 4.2`) |
| `###` (un-numbered) | Sub-features within a module (e.g., search bars, editor sections) |

Visual treatment: Inter semibold, `--text-md`, `--tracking-tight`, 1px
`--color-border` bottom rule, `--space-1` padding-bottom.

---

## 19. Module Reference — Visual Patterns by Module

### 19.1 Records All Dashboard (2.0 — `dashboard_records_all.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Single-column table fills the main Providence column | `#admin-canvas` with sidebar hidden |
| **Function Bar** | Sticky toolbar: 6 sort-toggle buttons (Roboto Mono xs) + New Record button (Inter semibold, Oxblood). Active toggle: Oxblood fill + parchment text. | `.records-all__function-bar`, `.toggle-btn`, `.toggle-btn--active` |
| **Search Bar** | Inline search field with magnifying glass icon, clear button, hit-count status text | `.records-all__search-bar`, `.records-all__search-input` (`--font-mono`) |
| **Upload Bar** | CSV upload button row below search | `.records-all__upload-bar` |
| **Records Table** | 4-column (`title 28%` / `verse 22%` / `snippet 35%` / `status 15%`); sticky `thead` with Inter uppercase headers; monospaced `td`; zebra-striped rows; row hover → `--color-bg-tertiary`; clickable rows | `.records-all__table`, `.records-all__status--published` (Oxblood), `--draft` (muted) |
| **Endless Scroll** | 1px sentinel div at table bottom triggers `IntersectionObserver` | `.records-all__scroll-sentinel` |
| **Bulk Review Panel** | Visually distinct bordered container (`--color-accent-muted` border), sticky action bar (Save as Draft / Discard), review table with checkbox column, invalid rows: `rgba(142,59,70,0.06)` tint, validation status icons | `.bulk-review-panel`, `.bulk-review__row--invalid` |

### 19.2 Records Single Dashboard (2.0 — `dashboard_records_single.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Multi-section form in main column; sticky section navigator in sidebar | Providence grid with sidebar |
| **Section Navigator** | Vertical link list, Inter xs, `--radius-sm`, active: left-border Oxblood highlight | `.section-nav__link` |
| **Function Bar** | Sticky Save Draft / Publish / Delete buttons | `.function-bar`, `.btn--draft`, `.btn--publish`, `.btn--delete` |
| **Form Fields** | Monospaced inputs and selects (`--text-sm`), `--radius-sm`, 1pt Clay border, `--color-bg-primary` fill. Focus: `--color-accent-primary` border | `.form-field__input`, `.form-field__select`, `.form-field__textarea` |
| **Verse Builder** | 3-dropdown + input row (book / chapter / verse); rendered as chips in a flex-wrap container | `.verse-builder__select`, `.verse-builder__chips`, `.chip` |
| **Bibliography Editor** | Per-source cards with type-select + 2-column field grid + remove button (Oxblood) | `.bibliography-editor__entry` (js/9.0_cross_cutting/dashboard/mla_source_handler.js, css/9.0_cross_cutting/dashboard/mla_widget.css) |
| **Paragraph Editor** | Dynamic textarea array with add/remove controls | `.paragraph-editor__textarea` |
| **Picture Preview** | Sub-section heading; full (400×300) and thumbnail (200×150) preview boxes, `--radius-sm`, `--color-bg-tertiary` fill | `.form-section__subheading`, `.picture-preview`, `.picture-preview--full`, `--thumb` (js/9.0_cross_cutting/dashboard/picture_handler.js, css/9.0_cross_cutting/dashboard/picture_widget.css) |
| **Context Links** | Table-based slug/type editor with add/remove rows | `.context-links-editor`, `__table`, `__row`, `__td`, `__remove-btn`, `__add-row` (js/9.0_cross_cutting/dashboard/context_link_handler.js, css/9.0_cross_cutting/dashboard/context_links_widget.css) |
| **Unique Identifiers** | Two-column table (Identifier Type \| Value) for IAA, Pledius, Manuscript | `.external-refs-editor`, `__table`, `__row`, `__td`, `__label`, `__value-input` (js/9.0_cross_cutting/dashboard/external_refs_handler.js, css/9.0_cross_cutting/dashboard/external_refs_widget.css) |
| **Section Subheading** | Sub-section heading within a form section | `.form-section__subheading` |
| **Slug/Snippet/Metadata** | Rendered via shared `metadata_widget.js` (js/9.0_cross_cutting/dashboard/metadata_widget.js) (see §21) | `.metadata-widget` |

### 19.3 Challenge Dashboard (4.0 — `dashboard_challenge.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Dual-pane: parameter sidebar + ranked list area, integrated into Providence columns | `.providence-col-sidebar` + `.providence-col-main` |
| **Function Bar** | Toggle (Academic / Popular) + Refresh / Publish actions | `.function-bar__toggle-group`, `.btn--toggle-active` |
| **Sidebar** | Vertically stacked sections with a primary heading: "ACADEMIC/POPULAR WEIGHTING AND SEARCH TERMS". | `.challenge-sidebar`, `.challenge-sidebar__heading` |
| **Weight Items** | Horizontal row: reorder grip (≡) + name (Inter) + numeric value input (Mono) + remove (×) | `.challenge-weight-item__name`, `__value`, `__remove` |
| **Ranked List** | Zebra-striped rows; rank badge (Mono, `--radius-sm`, `--color-bg-tertiary`); score column (Mono semibold); expandable body area showing linked responses | `.challenge-row`, `.challenge-row__rank`, `__score`, `__body` |
| **Response Cards** | Nested inside expanded rows: card with title (Inter) + status badge (Draft/Published) | `.challenge-response-card` |
| **Response Dialog** | Modal (`<dialog>`) for creating new responses: title input + full-width buttons | `.challenge-dialog` |
| **List Region Toggle** | Aria-controlled dual list regions (Academic / Popular) with frontend-link | `.challenge-list-region` |

### 19.4 Wikipedia Dashboard (4.0 — `dashboard_wikipedia.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Dual-pane: parameter sidebar + ranked list area | `.wikipedia-editor-layout` |
| **Sidebar** | Record info header + search terms textarea + weighting list + metadata editor + Recalculate button (full-width) | `.wikipedia-sidebar`, `.wikipedia-sidebar__header` |
| **Ranked List** | Zebra-striped rows; rank badge (Mono, `--radius-sm`); title link; score column; status badge (Draft/Published); Select button to load record | `.wikipedia-row`, `.wikipedia-row__rank`, `__score`, `__select-btn` |
| **Metadata Editor** | Inline slug/snippet/metadata fields + auto-generate buttons | `.wikipedia-metadata-editor__field` |

### 19.5 Essay & Historiography Dashboard (5.0 — `dashboard_essay_historiography.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Split-pane: document sidebar (260px) + 1px divider + editor area (1fr) | `.essay-editor-layout` (CSS Grid) |
| **Function Bar** | Sticky: Essay/Historiography toggle (segmented, Oxblood active) + Save Draft / Publish / Delete buttons | `.function-bar__toggle-group`, `.btn--toggle-active` |
| **Sidebar** | Search input + Published/Drafts grouped lists; active item: Oxblood text, 2px left border | `.essay-sidebar-list__item--active` |
| **Editor Area** | Vertically stacked sections: title input (Inter xl), markdown editor panes, snippet generator, bibliography, context links, picture upload | `.essay-editor-area`, `.essay-editor-field` |
| **Markdown Toolbar** | Horizontal button strip (Inter xs, `--radius-sm`), active: Oxblood fill. Styled by `essay_WYSIWYG_editor.css` | `.markdown-toolbar__btn` |
| **Split Markdown Panes** | Left: monospaced textarea. Right: live preview matching public `--font-essay` typography (Crimson Pro). 1px divider between. | `.markdown-editor-panes`, `.markdown-editor-preview` |
| **Bibliography Editor** | Scoped to `#essay-bibliography-container`; 2-column field grid; MLA type-select | Same `.bibliography-editor` BEM as Records module |

### 19.6 Blog Posts Dashboard (6.0 — `blog_posts_dashboard.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Split-pane: post sidebar (260px) + 1px divider + editor area (1fr) — mirrors Essay layout | `.blog-editor-layout` |
| **Function Bar** | Sticky: New Post button + Save Draft / Publish / Delete buttons | `.blog-new-post-btn`, `.btn--draft`, `.btn--publish`, `.btn--delete` |
| **Sidebar** | Published/Drafts grouped lists; active: Oxblood 2px left border | `.blog-sidebar-list__item--active` |
| **Editor Area** | Title input (Inter xl), markdown panes (WYSIWYG), snippet generator, bibliography, context links, picture upload | `.blog-editor-area` |
| **Markdown Preview** | Matches public blog rendering; `--font-body` (EB Garamond) in preview | `blog_WYSIWYG_editor.css` |

### 19.7 News Sources Dashboard (6.0 — `news_sources_dashboard.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Split-pane: record-detail sidebar (360px) + 1px divider + news sources table (1fr) | `.news-sources-editor-layout` |
| **Function Bar** | Sticky: Refresh / Publish / Crawl (Oxblood accent) buttons, right-aligned | `#news-sources-function-bar` |
| **Sidebar** | Header (record title, Inter lg) + URL editor (Mono input) + search keyword chips + metadata widget + record metadata footer. Sections separated by thin horizontal rules. | `.news-sources-sidebar__section`, `__header`, `__record-title` |
| **Keyword Chips** | Pill-shaped (`--radius-full`), Mono xs, with circular remove button (×) | `.news-sources-search-term-chip` |
| **Sources Table** | Sticky header (Inter uppercase, `--color-border-strong` bottom border), Mono URL cells, status badges (Active=Green, Inactive=Muted), Select button per row | `.news-sources-table`, `.news-sources-row__status` |

### 19.8 System Dashboard (7.0 — `dashboard_system.*`)

| Component | Visual Pattern | Key CSS Classes |
| :--- | :--- | :--- |
| **Layout** | Single-column scrolling area with card grid, tables, and console panels. No sidebar. | `#admin-canvas.no-sidebar` |
| **Function Bar** | Action bar with Refresh button, 1px bottom border | `.function-bar--system` |
| **Health Cards** | Responsive grid (`auto-fill, minmax(260px, 1fr)`); each card: `--color-bg-secondary` fill, 1pt border, `--radius-sm` (2px). Value: Mono lg, color-coded (green=ok, amber=degraded, oxblood=error, muted=offline). Resource meters: 8px bar with color-coded fill. | `.health-card`, `.health-card__value`, `.meter-bar` |
| **Agent Activity Table** | Sticky header, Mono xs, zebra-striped rows; status color-coded (green, oxblood, amber). Running rows pulse. Clickable rows expand trace panel. | `.agent-activity-table`, `.status--completed`, `--failed`, `--running` |
| **Trace Reasoning Panel** | Collapsible `<details>` with Mono pre-wrap content, max-height 240px | `.trace-reasoning-panel` |
| **Test Console** | Button controls + scrollable output `<pre>` with Mono xs text, max-height 300px | `.test-output-console` |
| **MCP Error Log** | Collapsible error stream, max-height 160px scroll, Mono xs | `.mcp-error-log` |
| **Docs Controls** | Documentation regeneration buttons | `.docs-controls` |

### 19.9 Arbor Diagram Dashboard (3.0 — `dashboard_arbor.*`)

Detailed in §20 below. The Arbor editor uses a blueprint-grid canvas with
draggable node rows, SVG connector overlays, and an orphan pool for unlinked
nodes.

---

## 20. Arbor Dashboard Editor — Interactive Node Patterns

The Arbor Diagram dashboard editor (`dashboard_arbor.css`) extends the
Providence design system with interactive tree-editing patterns:

| Category | Pattern | Implementation |
| :--- | :--- | :--- |
| **Tree Canvas** | Blueprint grid background, scrollable overflow | `radial-gradient` with `--color-border` dots at 20px spacing |
| **Node Row** | Sharp-cornered drag card with shadow | `--radius-none`, `--shadow-sm`, `--color-bg-secondary` fill |
| **Node Grip** | Mono trigram (☰) drag handle | `--font-mono`, `--text-xs`, `--color-text-muted` |
| **Node Label** | Inter heading, text-overflow ellipsis | `--font-heading`, `--text-sm`, `pointer-events: none` |
| **Drag State** | Dashed border, reduced opacity | `.is-dragging { border-style: dashed; opacity: 0.4 }` |
| **Drop Target** | Oxblood border + rose glow | `--color-accent-primary` border, `box-shadow: 0 0 0 2px var(--color-accent-muted)` |
| **Invalid Drop** | Muted background, not-allowed cursor | `.is-drop-invalid { opacity: 0.6; cursor: not-allowed }` |
| **Tree Branches** | 2px vertical border + horizontal `::before` pseudo-elements | `border-left: 2px solid var(--color-border-strong)` on nested `<ul>` |
| **Orphan Pool** | Horizontal flex wrap, inset drop target glow | `display: flex; flex-wrap: wrap; gap: var(--space-2)` |
| **SVG Connectors** | Cubic bezier paths, non-interactive overlay | `pointer-events: none; z-index: 1` |
| **Child Dropdown** | Positioned dropdown with hover highlight | `position: fixed; z-index: 100; --shadow-md` |
| **Save Indicator** | Fading toast notification | `opacity 0 → 1 transition, auto-hides after 1.5s` |

---

## 21. Consistency Checklist

To maintain the Providence Technical Ledger aesthetic, all new dashboard
elements must pass:

1.  **Rounding Discipline:** Structural containers and cards use `--radius-none` (0px). Interactive controls (buttons, inputs) use `--radius-sm` (2px) or `--radius-md` (3px). Tags may use `--radius-full` (9999px). Nothing exceeds `--radius-base` (4px).
2.  **Mono Logic:** Is `var(--font-mono)` used for all metadata, IDs, dates, and UI labels?
3.  **Border Precision:** Are borders `var(--border-width-thin)` (1px)? Are structural dividers 1px `--color-border` tracks — never borders on column elements?
4.  **Oxblood Accent:** Do active/hover states transition to `var(--color-accent-primary)` or `var(--color-dash-accent)`?
5.  **Grid Alignment:** Are all spacing values multiples of 8px (`var(--space-N)`)?
6.  **Depth Integrity:** Is `var(--shadow-sm)` used for floating elements (dropdowns, drag cards)?
7.  **Dashboard Contrast:** Do admin-specific elements (tab bar, card hover, publish buttons) use `var(--color-dash-accent)`?
8.  **Status Feedback:** Are success states `var(--color-status-success)`, errors `var(--color-accent-primary)`, disabled states `--color-text-muted`?
9.  **CSS Variable Only:** No hardcoded colors (`#fff`, `#000`, rgba values), no hardcoded font sizes (`11px`, `14px`), no hardcoded spacing (`4px`, `8px`). All values MUST come from `typography.css` variables.
10. **Sub-Section Integrity:** Are dashboard sub-section headings numbered only when they correspond to a named sitemap sub-module? (Un-numbered for sub-features.)

---

## 22. Shared-Component Styling — `.metadata-widget` BEM Namespace

The `metadata_widget.css` stylesheet (in `css/9.0_cross_cutting/dashboard/`) defines the canonical shared dashboard
component. It uses BEM (Block Element Modifier) naming and is consumed by all
six dashboard editor modules: Records Single, Essay & Historiography, Blog
Posts, Challenge, News Sources, and Wikipedia.

| BEM Class | Purpose | Key Variables Used |
|:---|:---|:---|
| `.metadata-widget` | Block container — vertical flex stack | `--space-2` gap |
| `.metadata-widget__heading` | Section heading | `--font-heading`, `--text-sm`, `--weight-medium`, `--color-text-secondary`, `--tracking-wide` |
| `.metadata-widget__field` | Label + input/textarea + button vertical stack | `--space-1` gap |
| `.metadata-widget__label` | Field label | `--font-heading`, `--text-xs`, `--weight-medium`, `--color-text-secondary`, `--tracking-wide` |
| `.metadata-widget__inline` | Horizontal input + button row | Flexbox, `--space-1` gap |
| `.metadata-widget__input` | Text input (monospace) | `--font-mono`, `--text-xs`, `--color-text-primary`, `--color-bg-primary`, `--border-width-thin`, `--color-border` |
| `.metadata-widget__input--readonly` | Read-only modifier (muted) | `--color-text-muted`, `--color-bg-tertiary` |
| `.metadata-widget__textarea` | Textarea (monospace, resizable) | Same as input + `resize: vertical` |
| `.metadata-widget__textarea--mono` | Mono modifier (muted, tertiary bg) | `--color-text-muted`, `--color-bg-tertiary` |
| `.metadata-widget__btn` | Individual auto-gen button | `--font-heading`, `--text-xs`, `--weight-medium`, `--color-border`, hover→`--color-bg-tertiary`, `--color-border-strong`, active→`--color-accent-primary` |
| `.metadata-widget__generate-all` | Primary "Generate All" button (full-width Oxblood) | `--font-heading`, `--text-sm`, `--weight-semibold`, `--color-text-inverse`, `--color-accent-primary`, hover→`--color-accent-hover` |
| `.metadata-widget__divider` | Horizontal rule separator | `--border-width-thin`, `--color-border` |
| `.metadata-widget__hint` | Helper text below fields | `--font-mono`, `--text-xs`, `--color-text-muted` |
| `.metadata-widget__readonly-row` | Two-column read-only timestamp row | Flexbox, `--space-2` gap |
| `.metadata-widget__status` | Generation progress text (italic) | `--font-mono`, `--text-xs`, `--color-text-muted` |
| `.metadata-widget__tag-input` | Tag entry field (flex: 1) | `--font-mono`, `--text-xs`, fills row space |

**Design principles demonstrated:**
- **Standardized Horizontal Symmetry:** All fields (Slug, Snippet, Keywords) follow a strict horizontal row pattern: `[Input/Textarea/Tags] + [Action Button]`.
- **Keywords Row Alignment:** The Keywords field is standardized to place the "Add" input and "GENERATE" button in a single flex row, ensuring visual parity with Slug and Snippet rows.
- **Rounding discipline:** Inputs and buttons use `--radius-sm` (2px). No rounding on structural containers.
- **Mono logic:** All inputs, textareas, hints use `--font-mono`.
- **Border precision:** All borders are `var(--border-width-thin)`.
- **Oxblood accent:** Generate All button uses `--color-accent-primary` with `--color-accent-hover` on hover.
- **Grid alignment:** All spacing uses `--space-N` multiples of 8px.
- **Transition subtlety:** Buttons use `--transition-fast` (150ms).
- **CSS variable purity:** No hardcoded colors, font sizes, or spacing values.

---

### 22a. Shared-Component Styling — `.picture-preview` BEM Namespace

The `.picture-preview` BEM namespace lives in `css/9.0_cross_cutting/dashboard/picture_widget.css` and provides shared styling for the picture preview component used across dashboard modules.

| BEM Class | Purpose | Key Variables Used |
|:---|:---|:---|
| `.picture-preview-row` | Grid container for full + thumbnail side-by-side | `--space-3` gap |
| `.picture-preview` | Preview box container | `--color-bg-tertiary`, `--border-width-thin`, `--radius-sm` |
| `.picture-preview--full` | Full-size modifier (max 800px) | -- |
| `.picture-preview--thumb` | Thumbnail modifier (max 200px) | -- |
| `.picture-preview__placeholder` | Placeholder text | `--font-mono`, `--text-xs`, `--color-text-muted` |

### 22b. Shared-Component Styling — `.bibliography-editor` BEM Namespace

The `.bibliography-editor` BEM namespace lives in `css/9.0_cross_cutting/dashboard/mla_widget.css` and provides shared styling for the MLA bibliography table editor (Books, Articles, Websites) used across dashboard modules.

| BEM Class | Purpose | Key Variables Used |
|:---|:---|:---|
| `.bibliography-editor` | Block container | `--space-3` margin |
| `.bibliography-editor__section` | Per-type table block wrapper | `--space-4` margin |
| `.bibliography-editor__subheading` | Section heading (Books / Articles / Websites) | `--font-heading`, `--text-md`, `--weight-semibold` |
| `.bibliography-editor__table` | Full-width editable table | `width: 100%`, `border-collapse: collapse` |
| `.bibliography-editor__thead` | Table header wrapper | (structural) |
| `.bibliography-editor__th` | Column header cell | `--font-mono`, `--text-xs`, `--color-bg-tertiary` |
| `.bibliography-editor__th--remove` | Remove column header (40px) | (structural) |
| `.bibliography-editor__tbody` | Table body wrapper | (structural) |
| `.bibliography-editor__row` | Data row with hover state | `--color-bg-secondary` hover |
| `.bibliography-editor__td` | Data cell | `--space-1` / `--space-2` padding |
| `.bibliography-editor__td--remove` | Remove cell (40px, centered) | (structural) |
| `.bibliography-editor__input` | Inline text input in cells | `--font-mono`, `--text-sm`, `--radius-sm` |
| `.bibliography-editor__remove-btn` | Per-row × remove button | `--color-accent-primary`, `--font-heading`, `--text-lg` |
| `.bibliography-editor__add-row` | Add button row below table | Flexbox, `--space-1` |
| `.bibliography-editor__add-btn` | Add button per table section | `--font-heading`, `--text-sm` |

### 22c. Shared-Component Styling — `.context-links-editor` BEM Namespace

The `.context-links-editor` BEM namespace lives in `css/9.0_cross_cutting/dashboard/context_links_widget.css` and provides shared styling for the context links table editor used across dashboard modules.

| BEM Class | Purpose | Key Variables Used |
|:---|:---|:---|
| `.context-links-editor` | Block container | `--space-3` margin |
| `.context-links-editor__table` | Full-width editable table | `width: 100%`, `border-collapse: collapse` |
| `.context-links-editor__thead` | Table header wrapper | (structural) |
| `.context-links-editor__th` | Column header cell | `--font-mono`, `--text-xs`, `--color-bg-tertiary` |
| `.context-links-editor__th--remove` | Remove column header (40px) | (structural) |
| `.context-links-editor__tbody` | Table body wrapper | (structural) |
| `.context-links-editor__row` | Data row with hover state | `--color-bg-secondary` hover |
| `.context-links-editor__row--empty` | Empty-state row | (structural) |
| `.context-links-editor__td` | Data cell (mono font) | `--font-mono`, `--text-sm` |
| `.context-links-editor__td--remove` | Remove cell (40px, centered) | (structural) |
| `.context-links-editor__empty-text` | "No context links" placeholder | `--font-body`, `--text-muted`, italic |
| `.context-links-editor__remove-btn` | Per-row × remove button | `--color-accent-primary`, `--font-heading`, `--text-lg` |
| `.context-links-editor__add-row` | 3-column inline add form | CSS Grid: `2fr 1fr auto`, `--space-1` gap |

### 22d. Shared-Component Styling — `.external-refs-editor` BEM Namespace

The `.external-refs-editor` BEM namespace lives in `css/9.0_cross_cutting/dashboard/external_refs_widget.css` and provides shared styling for the unique identifiers table editor used across dashboard modules.

| BEM Class | Purpose | Key Variables Used |
|:---|:---|:---|
| `.external-refs-editor` | Block container | `--space-3` margin |
| `.external-refs-editor__table` | Full-width two-column table | `width: 100%`, `border-collapse: collapse` |
| `.external-refs-editor__thead` | Table header wrapper | (structural) |
| `.external-refs-editor__th` | Column header cell | `--font-mono`, `--text-xs`, `--color-bg-tertiary` |
| `.external-refs-editor__tbody` | Table body wrapper | (structural) |
| `.external-refs-editor__row` | Data row with hover state | `--color-bg-secondary` hover |
| `.external-refs-editor__td` | Data cell | `--space-1` / `--space-2` padding |
| `.external-refs-editor__td--label` | Label cell (220px fixed width) | (structural) |
| `.external-refs-editor__label` | Identifier type label text | `--font-mono`, `--text-sm`, `--weight-medium` |
| `.external-refs-editor__value-input` | Inline editable value input | `--font-mono`, `--text-sm`, `--radius-sm` |

---

## 23. Unified WYSIWYG Editor — `.wysiwyg-*` BEM Namespace

> **Plan:** `plan_standardize_dashboard_wysiwyg.md`

> The `wysiwyg_dashboard_layout.css` and `wysiwyg_editor.css` stylesheets define the canonical unified WYSIWYG editor layout, replacing the legacy `essay-*` and `blog-*` namespaces. All four markdown-authoring dashboards (Essays, Historiography, Blog Posts, Challenge Response) consume this shared namespace.

### Core Layout Classes

| BEM Class | Purpose | CSS Variable References |
|-----------|---------|------------------------|
| `.wysiwyg-function-bar` | Sticky top function bar | `--color-bg-primary`, `--color-border` |
| `.wysiwyg-editor-layout` | Split-pane grid (sidebar \| editor) | CSS Grid: `260px 1px 1fr` |
| `.wysiwyg-sidebar` | Left sidebar (search + lists) | `--color-bg-secondary` |
| `.wysiwyg-sidebar-search` | Search input bar | `--font-mono`, `--text-xs` |
| `.wysiwyg-sidebar-group` | Published/Drafts list groups | `--color-text-secondary` |
| `.wysiwyg-sidebar-list` | Scrollable item list | `--color-bg-primary` |
| `.wysiwyg-sidebar-list__item` | Individual list item | `--color-border`, hover states |
| `.wysiwyg-editor-area` | Right editor pane | `--color-bg-primary`, `overflow-y: auto` |
| `.wysiwyg-editor-field` | Form field wrapper | `--space-2` gap |
| `.wysiwyg-editor-section` | Editor subsection container | `--color-border` top rule |
| `.wysiwyg-editor-section__heading` | Section heading | `--font-heading`, `--weight-semibold`, `--text-md` |

### Markdown Editor Classes

| BEM Class | Purpose | CSS Variable References |
|-----------|---------|------------------------|
| `.markdown-toolbar` | Formatting toolbar | `--color-bg-secondary`, `--radius-sm` |
| `.markdown-editor-panes` | Split input/preview | CSS Grid: `1fr 1fr` |
| `.markdown-editor-textarea` | Markdown input | `--font-mono`, `--text-sm` |
| `.markdown-editor-preview` | Live HTML preview | `--font-body`, `--text-sm` |

### Picture Upload Classes

| BEM Class | Purpose | CSS Variable References |
|-----------|---------|------------------------|
| `.picture-preview-row` | Full + thumbnail previews | Flexbox row |

> **Namespace Migration:** These `.wysiwyg-*` classes replace the legacy `essay-*` and `blog-*` namespaces from the pre-standardization era. All four dashboards now use the unified namespace.


---

## 24. Public Blog Frontend — `.blog-*` BEM Namespace

> **Plan:** `fix_frontend_schema_compliance.md`
>
> The `blog.css` stylesheet (`css/6.0_news_blog/frontend/blog.css`) defines the canonical public-facing blog display styles, replacing the old `essay-*` cross-references that were mistakenly applied to blog pages. The blog feed and single post pages use this BEM namespace exclusively.

### Blog Feed Classes (list_blogpost.js, blog_snippet_display.js)

| BEM Class | Purpose | CSS Variable References |
|:---|:---|:---|
| `.blog-item` | Feed item container, max-width constrained | `65ch` |
| `.blog-item__title` | Post title in serif heading | `--font-serif`, `--color-primary` |
| `.blog-item__link` | Title link, accent on hover | `--color-primary`, `--color-accent` |
| `.blog-item__date` | Publication date in monospace | `--font-mono`, `--color-muted` |
| `.blog-item__snippet` | Truncated snippet paragraph | `--color-secondary` |
| `.blog-item__read-more` | "Read more →" link | `--color-accent` |

### Blog Single Post Classes (display_blogpost.js)

| BEM Class | Purpose | CSS Variable References |
|:---|:---|:---|
| `.blog-header` | Post header with bottom border | `--color-border`, `--space-6`, `--space-8` |
| `.blog-title` | Main post title | `--font-serif`, `--color-primary` |
| `.blog-date` | Publication date | `--font-mono`, `--color-muted` |
| `.blog-body` | Markdown-rendered body content | `--font-body`, `--line-height-relaxed`, max-width `65ch` |
| `.blog-content-main` | Wrapper for entire post content | `--content-max-width` |
| `.blog-metadata` | Metadata section with top border | `--color-border`, `--space-8`, `--space-6` |
| `.blog-metadata__heading` | Metadata section heading | `--font-heading`, `--weight-semibold` |
| `.blog-metadata__grid` | Two-column definition list grid | CSS Grid, `--space-2` gap |
| `.blog-metadata__item` | Individual metadata row (dt + dd) | `--color-secondary` |
| `.blog-context-links` | Related resources section | `--space-6` |
| `.blog-context-links__list` | Flex row of context link items | `--space-4` gap, `flex-wrap` |
| `.blog-link` | Individual context link anchor | `--color-accent`, hover `underline` |

### Design Principles

- **BEM Purity:** All classes use strict BEM naming — `blog-*` block, `__` element, no utility modifiers.
- **Variable-Only:** No hardcoded colors, font sizes, or spacing — all values sourced from `typography_colors.css`.
- **Reading Comfort:** Body content constrained to `65ch` with `--line-height-relaxed` for long-form readability.
- **Separation from Dashboard:** These public-facing classes are entirely independent of the `.wysiwyg-*` dashboard namespace used in the admin editor.
