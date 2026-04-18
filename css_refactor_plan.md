# CSS Refactor Plan: The Living Museum - Technical Blueprint

## Objective
Refactor the following CSS files to implement a cohesive "technical blueprint aesthetic" that blends a precision grid layout with an archival palette:
- `css/elements/grid.css`
- `css/elements/timeline_diagram.css`
- `css/elements/map_diagram.css`
- `css/elements/ardor_diagram.css`
- `css/design_layouts/universal/footer.css`

## Aesthetic Vision
**"A technical blueprint aesthetic that blends a precision grid layout with an archival palette of aged parchment and Oxblood accents, underpinned by a high-contrast typographical system that pairs authoritative Inter sans-serif headings with Roboto Mono metadata for a 'Living Museum' feel."**

## Refactoring Steps by File

### 1. `css/elements/grid.css` (Precision Grid & Base Typesetting)
- **Grid Layout**: Enforce a strict "precision grid layout" using CSS Grid or Flexbox, ensuring exact mathematical alignments (e.g., using multiples of 8px). Introduce visual markers of a "technical blueprint" like subtle dashed borders or defined column gaps.
- **Typography Integration**: Ensure `Inter` is universally applied to headers (`h1`-`h6`) with tight tracking. Apply `Roboto Mono` styling to metadata classes (`.meta`, `.date`, `.reference`, etc.).
- **Archival Palette**: Set the main background and text colors using project CSS variables mapping to aged parchment (`#FCFBF7` / `#F4F2ED`) and charcoal ink.

### 2. `css/elements/timeline_diagram.css`
- **Structure**: Apply a straight, precise line representing the timeline axis, mirroring a blueprint vector.
- **Typography**: Labels for timeline events must heavily utilize `Roboto Mono` to emphasize the archival/metadata aspect of historical events.
- **Colors**: Utilize Oxblood (`#8E3B46`) sparingly but sharply for current or active timeline nodes to highlight them against the parchment background. 

### 3. `css/elements/map_diagram.css`
- **Structure**: Frame the map like a historical archival document. Overlay map controls using precision grid coordinates.
- **Aesthetic**: Implement a grayscale/tinted map with precise overlays. 
- **Typography & Interaction**: Map pins or interactive points should reveal data in `Inter` headers and `Roboto Mono` coordinate/metadata formats. Interactions trigger Oxblood accent highlights.

### 4. `css/elements/ardor_diagram.css` (Arbor / Tree Diagram)
- **Structure**: Draw exact, 1px blueprint-style connecting lines between nodes (parents and children). 
- **Typography**: Style node cards as archival tickets. Use `Inter` for node titles and `Roboto Mono` for database IDs, reference tags, or relational metadata.
- **Colors**: Node frames should have a subtle parchment tone with sharper Oxblood borders on selection or focus.

### 5. `css/design_layouts/universal/footer.css`
- **Structure**: Refine the single-row horizontal strip to feel like the technical metadata block at the bottom of an archival blueprint.
- **Typography**: Complete standardizing over to `Roboto Mono` for copyright and exact links to match the technical blueprint requirement.
- **Colors**: Keep backgrounds dark charcoal or aged parchment, with clear typography contrast.

## Next Steps
- Execute changes progressively, component by component.
- Verify color contrast and typography mapping against the newly updated `guide_style.md`.
