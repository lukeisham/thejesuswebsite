---
name: guide_style.md
purpose: description of visual appearance of the website 
version: 1.0.0
dependencies: [guide_dashboard_appearance.md, guide_appearance.md]
---

# Guide to Visual Appearance

This is the source of truth for the .css styling and UI/UX experience. 

## 1. Reference websites
- **The British Library (Archives):** For its use of authoritative whitespace and clean, high-density data tables.
- **Stanford Encyclopedia of Philosophy:** For long-form citation-heavy readability and simple sidebar navigation.
- **Oxford Museum of Natural History:** For premium typography and refined color palettes in historical context.

## 2. Style summary 
- **"The Living Museum":** The aesthetic combines the weight of a physical archive with the speed of a modern Single Page Application. 
- **Core Principles:** High contrast, minimal ornamentation, intentional whitespace, and a focus on "Truth through Typography."

## 3. Typography   
- **Body Text:** *EB Garamond* (or *Lora*) - A classic, highly readable serif that evokes the feel of a printed historical manuscript.
- **Headers:** *Inter* or *Outfit* - Clean, authoritative sans-serifs with tight tracking for a modern digital skeleton.
- **Interface/Monospace:** *Roboto Mono* - Used for metadata, dates, and technical ID labels (e.g., "IAA-001") to suggest precision.

## 4. Color Palette
- **Backgrounds:** Primary: `#FCFBF7` (Soft Parchment); Secondary: `#F4F2ED` (Aged Paper).
- **Text:** Primary: `#242423` (Charcoal Ink); Secondary: `#5B5B5B` (Lead Grey).
- **Accents:** Active Links: `#8E3B46` (Deep Oxblood); Borders: `#E0DCD1` (Clay Stone).
- **Dashboard:** Background: `#121212` (Inkpot Dark); Accent: `#D4AF37` (Antique Gold).

## 5. Grid Layout
- **The Golden Ratio:** Content columns target a max-width of `720px` for optimal reading speed (approx. 75 characters per line).
- **Responsive Spacing:** Uses a global 8px grid system. Margins and padding must be multiples of 8 (16px, 32px, 64px) to ensure mathematical visual harmony.

## 6. Navigation
### 6.1 Sidebar
- **The "Vertical Index":** A sticky left-aligned sidebar (`280px` width) with a subtle 1px border. No icons; pure text-based navigation using a tiered hierarchical list. 
### 6.2 Universal-footer
- **The "Legal Ledger":** Deep charcoal background with light grey text. Contains copyright, standard print buttons, and "Cite this Record" functionality.
### 6.3 Search-bar
- **The "Global Query":** Centered in the top header. Minimalist outline style with an "Antique Gold" focus effect when active.

## 7. Timeline diagram
- **The "Linear Pulse":** A horizontal axis using a solid 2px ink line. Events appear as solid dots that expand to labeled thumbnails on hover. No jarring colors; strictly monochrome with Oxblood highlights.

## 8. 'Arbor-tree-style' diagram
- **The "Evidence Root":** A recursive vertical tree structure (`parent_id` driven). Uses thin, 1px grey connecting lines. Nodes are styled as clean parchment cards with a light drop-shadow to separate layers.

## 9. Map diagram
- **The "Antique Layer":** Uses a custom grayscale-with-tint map style. Points of interest are marked with minimalist historical icons (crosses, pillars) that use the Oxblood accent color.

## 10. Ordinary list styling
- **The "Table of Records":** High-density row layout. Alternate row shading (Zebra striping) using `#F4F2ED`. Hovering a row applies a 2px left border of Oxblood ink.

## 11. Ranked list (and response insert) styling 
- **The "Weighted Feed":** Same as ordinary lists, but with large serif rank numbers (1, 2, 3) on the left.
- **Response Inserts:** These rows are styled with a subtle 1px dashed border and a vertical "Response" indicator to show they are interjected between evidence points.

## 12. Individual Essay and Response styling 
- **The "Manuscript View":** Single narrow column. Large drop-caps for the introduction. Footnotes appear in the right margin on desktop, or inline on mobile, wrapped in lead-grey brackets `[...]`.

## 13. Dashboard styling 
- **The "Architect's Tool":** Dark mode by default (`#121212`). Uses high-contrast gold (`#D4AF37`) for active buttons and status indicators. Functional, dense, and no-nonsense.

## 14. Elements: pictures, inline MLA citations, Bible verse expansions, and other elements 
- **Pictures:** Always enclosed in a thin black frame with a centered "Fig X: [Label]" caption underneath.
- **MLA Citations:** Styled in a smaller font size (`0.85rem`) in lead-grey.
- **Verse Expansion:** Dotted underlines on verse references. Clicking reveals a clean fly-out or pop-over box with the full ESV text in serif italics.



