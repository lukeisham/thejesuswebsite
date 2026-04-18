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
- **"The Living Museum":** A technical blueprint aesthetic that blends a precision grid layout with an archival palette of aged parchment and Oxblood accents, underpinned by a high-contrast typographical system that pairs authoritative Inter sans-serif headings with Roboto Mono metadata for a "Living Museum" feel.
- **Core Principles:** High contrast, precision structural alignments, minimal ornamentation, and a focus on "Truth through Typography."

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
- **Precision Grid:** Uses a global 8px grid system for mathematical visual harmony. Major structural dividers (header, sidebar, footer) use **1px dashed borders** to simulate technical blueprint registration lines.
- **No Rounding:** All structural elements use sharp corners (`radius-none`) to maintain an architectural, archival feel.

## 6. Navigation
### 6.1 Sidebar
- **The "Vertical Index":** A sticky left-aligned sidebar (`280px` width) with a **1px dashed border**. No icons; pure text-based navigation using a tiered hierarchical list with sharp architectural edges. 
### 6.2 Universal-footer
- **The "Technical Metadata Block":** Aged paper background. Contains copyright, action buttons, and links styled strictly in **Roboto Mono** to resemble the technical footer of an archival drawing.
### 6.3 Search-bar
- **The "Global Query":** Centered in the top header. Minimalist outline style using **Roboto Mono** for search inputs to emphasize the archival query experience.

## 7. Timeline diagram
- **The "Linear Pulse":** A horizontal axis using a solid 2px ink line. Events appear as solid dots that expand to labeled thumbnails on hover. Selected nodes use **Deep Oxblood** for sharp focus. Labels and metadata snippets strictly use **Roboto Mono**.

## 8. 'Arbor-tree-style' diagram
- **The "Evidence Root":** A recursive vertical tree structure (`parent_id` driven). Uses thin, 1px grey connecting lines. Nodes are styled as clean parchment cards with a light drop-shadow to separate layers.

## 9. Map diagram
- **The "Archival Frame":** Framed in a **dashed blueprint border**. Uses a custom grayscale-with-tint map style. Points of interest are marked with minimalist historical icons using the Oxblood accent. Location data and era displays are rendered in **Roboto Mono**.

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



