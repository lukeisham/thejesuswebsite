---
name: guide_style.md
purpose: description of visual appearance of the website 
version: 1.0.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md]
---

# Guide to Visual Appearance

This document defines the visual identity and UI/UX standards for the project, ensuring architectural consistency across all modules.

## 1. Style Philosophy
The "Living Museum" aesthetic blends a technical blueprint architecture with an archival collection feel. It prioritizes truth through typography, utilizing precision grids and high-contrast metadata to create an authoritative, "Technical Ledger" experience.

## 2. Reference Foundations
| Source | Influences |
| :--- | :--- |
| **The British Library** | Authoritative whitespace, high-density data tables, archival precision. |
| **Stanford Encyclopedia** | Long-form readability, citation density, minimalist navigation. |
| **Oxford Museum** | Premium typography, refined historical color palettes, contextual elegance. |

## 3. Typography System
| Usage | Typeface | Intent |
| :--- | :--- | :--- |
| **Body Text** | *EB Garamond* / *Lora* | Evokes printed historical manuscripts and archival records. |
| **Headings** | *Inter* / *Outfit* | Provides a clean, authoritative modern digital skeleton. |
| **Metadata/UI** | *Roboto Mono* | Suggests technical precision, dates, and archival tagging. |

## 4. Color Palette
| Category | Usage | Hex Code |
| :--- | :--- | :--- |
| **Paper (Primary)** | Backgrounds | `#FCFBF7` |
| **Paper (Aged)** | Secondary Layers | `#F4F2ED` |
| **Ink (Primary)** | Body Text | `#242423` |
| **Lead (Secondary)** | Meta-text | `#5B5B5B` |
| **Oxblood** | Active Accents | `#8E3B46` |
| **Clay Stone** | Borders/Lines | `#E0DCD1` |
| **Inkpot Dark** | Dashboard BG | `#121212` |
| **Antique Gold** | Dashboard Accent| `#D4AF37` |

## 5. Architectural Constraints
- **Grid System:** Strict 8px global grid for visual harmony.
- **Structural Lines:** 1px dashed borders for all major dividers (header, sidebar, footer) to simulate technical blueprint registration lines.
- **Corner Logic:** Zero rounding (`radius-none`) on all structural elements.
- **Reading Width:** 720px maximum for content columns (approx. 75 characters per line).

## 6. Layout & Navigation
| Component | Width/Position | Styling Details |
| :--- | :--- | :--- |
| **Sidebar** | `280px` (Sticky Left) | 1px dashed border, text-only hierarchy, sharp corners. |
| **Universal Footer**| Fixed Bottom | Aged paper background, Roboto Mono "Technical Metadata Block." |
| **Search Bar** | Centered Header | Minimalist outline, Roboto Mono input field. |

## 7. Data Visualization Modules
| Module | Core Aesthetic | Implementation Details |
| :--- | :--- | :--- |
| **Timeline** | "Linear Pulse" | 2px ink axis, Oxblood selected nodes, Roboto Mono labels. |
| **Arbor Tree** | "Evidence Root" | 1px connecting lines, parchment cards, light drop-shadows. |
| **Map** | "Archival Frame" | Dashed blueprint border, grayscale map, Oxblood POI markers. |

## 8. Listing & Records
| Type | Pattern | Hover/Interactive State |
| :--- | :--- | :--- |
| **Ordinary List** | Zebra-striped rows | 2px left-border Oxblood highlight. |
| **Ranked List** | Serif rank numbers | High-density vertical alignment. |
| **Response Inserts** | Dashed boundaries | Labeled interjections between evidence nodes. |

## 9. Content Elements
| Element | Visual Treatment |
| :--- | :--- |
| **Essays** | Manuscript-style single column with large drop-caps for introductions. |
| **Citations** | MLA style, `0.85rem` size, Lead Grey text. |
| **Footnotes** | Marginal (desktop) or inline (mobile) within lead-grey brackets `[...]`. |
| **Images** | Solid black frame with centered "Fig X: [Label]" captions. |
| **Bible Verses** | Dotted underline; fly-out boxes with ESV text in serif italics. |

## 10. Interactive Controls
| Control | Specification | Aesthetic |
| :--- | :--- | :--- |
| **Buttons** | Sharp corners, 1px border | Roboto Mono; Oxblood fill on hover. |
| **Sliders** | Minimalist 1px vectors | Oxblood thumb; Mono value displays. |
| **Checkboxes** | Sharp rectangular housing | Oxblood selection; Mono labels. |
| **Switches** | Binary sliding block | Oxblood (ON) / Lead Grey (OFF). |
| **Dropdowns** | Charcoal border/Sharp edges | Dashed border lists; Zebra-stripe options. |



