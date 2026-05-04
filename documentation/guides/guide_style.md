---
name: guide_style.md
purpose: description of visual appearance of the website 
version: 1.4.0
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
| **Antique Gold** | Dashboard Focus | `#D4AF37` | `--color-dash-accent` |
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
| **Border Width**| 1px (thin), 2px (base) | `--border-width-thin` / `--border-width-base`. |

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

## 18. Dashboard & Editor Aesthetics
| Category | Rule / Visual Description | Implementation / CSS |
| :--- | :--- | :--- |
| **Layout Convention** | Bespoke single page layout, featuring a double header, an occasional sidebar and a fixed universal footer | Documentation convention|
| **Field Ownership Map** | Documents database column ownership using `§N.M` notation. | Documentation convention |
| **Section Numbering** | Numbered (`### 2.1`) for sitemap modules; un-numbered for sub-features. | Documentation convention |
| **Admin Shell** | Dashboard color scheme; Gold accents. | `--color-dash-accent` |
| **Editor Style** | Mono fields; data-dense aesthetics. | `--font-mono` |
| **Action Bar** | Gold focus. | `--color-dash-accent` |
| **Return Link**| Lead Grey, tertiary BG hover. | `--font-mono`, `--color-text-muted`, `--transition-fast` |
| **Blog WYSIWYG Editor** | Split-pane markdown editor with live preview. Toolbar uses Providence type scale. Preview matches public blog typography (`--font-body`). | `blog_WYSIWYG_editor.css`, `blog_posts_dashboard.css` |

## 19. Arbor Dashboard Editor — Interactive Node Patterns

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

## 20. Consistency Checklist
To maintain the Technical Blueprint aesthetic, all new elements must pass:
1.  **Zero Rounding:** Is `var(--radius-none)` applied?
2.  **Mono Logic:** Is `var(--font-mono)` used for UI labels?
3.  **Border Precision:** Are borders `var(--border-width-thin)`?
4.  **Oxblood Hover:** Does it transition to `var(--color-accent-primary)`?
5.  **Grid Alignment:** Are spacing values multiples of 8px (`var(--space-N)`)?
6.  **Depth Integrity:** Is `var(--shadow-sm)` used for floating nodes?
7.  **Dashboard Contrast:** Does the admin portal use `var(--color-dash-accent)`?
8.  **Status Feedback:** Are success states using `var(--color-status-success)`?
9.  **Sub-Section Integrity:** Are dashboard sub-section headings numbered only when they correspond to a named sitemap sub-module? (Un-numbered for sub-features.)
