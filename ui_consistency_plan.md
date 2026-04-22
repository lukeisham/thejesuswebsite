# UI Consistency Implementation Plan: Interactive Elements

This plan outlines the steps required to ensure that navigation buttons, sliders, checkboxes, and other interactive features are consistently applied across all pages of "The Jesus Website," adhering to the **Technical Blueprint** aesthetic defined in the project's documentation.

---

## 0. Source of Truth for UI/UX
The following files serve as the definitive source of truth for all UI/UX implementations across the site:

*   **[guide_style.md](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_style.md):** The master design document. Defines the "Technical Blueprint" aesthetic, typography systems, color palettes (e.g., Oxblood), and interactive control specifications.
*   **[guide_appearance.md](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_appearance.md):** Maps specific UI components to their governing CSS modules and provides technical anatomy diagrams.
*   **[guide_dashboard_appearance.md](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_dashboard_appearance.md):** The specialized source of truth for the Admin Portal, ensuring it maintains parity with the public site's aesthetic.
*   **[typography_colors.css](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/css/elements/typography_colors.css):** The implementation-level source of truth for CSS variables (tokens). All styles should reference these variables rather than hardcoded values.
*   **[vibe_coding_rules.md](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/vibe_coding_rules.md):** Outlines the foundational "Vibe Coding" philosophy, emphasizing precision, minimalism, and technical authority.

---

## 1. Core Implementation Modules
These files are the primary vehicles for enforcing consistency. Changes to these files propagate across the entire site.

*   **[forms.css](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/css/elements/forms.css):** Standardizes sliders, checkboxes, radios, switches, and dropdowns.
*   **[list_card_button.css](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/css/elements/list_card_button.css):** Standardizes generic buttons (`.btn-primary`, `.btn-outline`) and interactive list items.
*   **[grid.css](file:///Users/lukeishammacbookair/Developer/thejesuswebsite/css/layout/grid.css):** Governs the 8px global grid and structural dashed borders.

---

## 2. Phase 1: Global Infrastructure & Standardizations
*Focus: Aligning global stylesheets and resolving known high-level discrepancies.*

### Task 1: Global Audit & Dependency Cleanup
- [ ] **Global Audit:** Ensure every HTML file (Public & Admin) includes `typography_colors.css`, `list_card_button.css`, and `forms.css`.
- [ ] **Fix Style Discrepancy:** Update `.list-row:hover` in `list_card_button.css` to use a **2px** border-left (correcting the current 4px override, per `guide_style.md` §8).
- [ ] **JS Class Alignment:** Verify that dynamically generated elements in `sidebar.js` and `footer.js` use standardized utility classes (`.btn-primary`, `.font-mono`, etc.).

### Task 2: Navigation & Utility Standardization
- [ ] **Sidebar Nav:** Ensure links follow text-only hierarchy with sharp-cornered hover states (defined in `guide_style.md` §6).
- [ ] **Table of Contents (ToC):** **Fix Discrepancy:** Update `essay_layout.css` to ensure ToC links use the **Inter** font family to match Sidebar nav styling.
- [ ] **Pagination:** **Fix Discrepancy:** Update `list_layout.css` to change `.pagination-btn` radius to **0px** (`radius-none`) and add **Oxblood** hover state.
- [ ] **Footer Actions:** Standardize the three action buttons in the Universal Footer (`#footer-btn-print`, `#footer-btn-copy-url`, `#footer-btn-copy-contents`).
- [ ] **Global Search:** Verify search input and Enter/Escape visual feedback follow the high-contrast style.
- [ ] **Back-to Links:** Standardize "Back to..." breadcrumb links (e.g., `record.html`, `essay.html`) with consistent hover and Mono font.

### Task 3: Form & Overlay Element Standardization
- [ ] **Checkboxes/Switches:** Ensure usage of `.toggle-switch` or standard styles from `forms.css`.
- [ ] **Dropdowns/Selects:** Verify charcoal border and zebra-striped options.
- [ ] **Fly-outs & Tooltips:** Standardize Bible verse fly-out boxes and generic tooltips with `radius-none` and `1px dashed/solid` borders.

---

## 3. Phase 2: Module-Specific Remediation
*Focus: Deep-dive audits of individual modules to remove hardcoded styles and local overrides.*

### 3.1 Admin Portal (Module 6.1)
- [ ] **CSS Migration:** Move all inline `style="..."` attributes from `dashboard_app.js` and `admin.html` into `dashboard_admin.css`.
- [ ] **Tokenization:** Replace all hardcoded hex codes (e.g., `#2e7d32`) with approved CSS variables from `typography_colors.css`.
- [ ] **Geometry Alignment:** Force `radius-none` on all admin-specific containers (removing `radius-sm` or 2px rounding).
- [ ] **Utility Standardization:** Ensure the **Logout** button, "Add New" records, and "Save" tools use `.btn-primary` or `.btn-outline`.
- [ ] **Form Elements:** Verify all inputs, selects, and toggles in the Record Editor match the `forms.css` specification.

### 3.2 Timeline Module (Module 3.2)
- [ ] **Canvas Controls:** Standardize Zoom (+/-) and Era Navigation (<< >>) buttons.
- [ ] **Era Labels:** Ensure SVG labels use 10px Roboto Mono.
- [ ] **Metadata Panel:** Verify fly-out metadata panel uses serif titles and mono metadata consistently.

### 3.3 Map Module (Module 3.3)
- [ ] **Fix Inconsistency:** Replace hardcoded hex values (#D4AF37, #8E3B46) in `maps_display.js` with CSS variables (`--color-dash-accent`, `--color-accent-primary`).
- [ ] **Era Slider:** Verify range slider uses "Blueprint Vector" style (1px track, Oxblood block thumb).
- [ ] **View Selectors:** Ensure radio buttons for "Empire", "Levant", etc., are sharp-cornered squares.
- [ ] **Action Buttons:** Standardize "Toggle Layers" and Zoom buttons.

### 3.4 Ardor (Arbor) Diagram (Module 3.1)
- [ ] **Visual Nodes:** Ensure SVG rects have `rx: 0` (sharp corners) and 2px solid borders.
- [ ] **Relationship Links:** Verify paths use standardized charcoal ink stroke.
- [ ] **Node Buttons:** Interactive buttons in "Edit Diagram Hierarchy" must match `.btn-primary`.

---

## 4. Phase 3: Final Verification & Conflict Audit
*Focus: Post-implementation testing to ensure no regressions or style collisions.*

### Step 1: Visual Fidelity Check
*Validate against the "Technical Blueprint" requirements:*
*   [ ] **Geometry:** Zero rounding (`radius-none`) on every button, input, and card.
*   [ ] **Typeface:** `Roboto Mono` for all interactive labels and button text.
*   [ ] **Accents:** Every button/link transitions to **Oxblood** (`var(--color-accent-primary)`) on hover.
*   [ ] **Grid:** All components align to the 8px registration grid.
*   [ ] **Highlight:** List hovers show the 2px left-border highlight in Oxblood.

### Step 2: Cross-Module Impact Audit
*   [ ] **Layout Integrity:** Does applying `radius-none` break any flex/grid alignments in Sidebar or Footer?
*   [ ] **Canvas Collision:** Do standardized styles interfere with SVG canvas logic in Timeline/Map?
*   [ ] **Admin SPA Flow:** Does updating `forms.css` or `list_card_button.css` cause regressions in the SPA layout?

### Step 3: Structural & Style Conflict Audit
*   [ ] **Inline Styles:** Flag and remove hardcoded `style="..."` attributes on buttons/form elements.
*   [ ] **Local Overrides:** Audit `<style>` blocks for high-specificity IDs bypassing global classes.
*   [ ] **Class Redundancy:** Identify local CSS redefining properties already in `forms.css` or `list_card_button.css`.

---

## 5. Documentation & References Updates

- [ ] **Update `guide_style.md`:** Maintain the "Consistency Checklist" section.
- [ ] **Update `guide_appearance.md`:** Ensure ASCII diagrams reflect sharp-cornered button styles.
- [ ] **Cross-Linking:** Ensure each module guide references `guide_style.md` for UI standards.

---
*Created: April 22, 2026*
*Status: Audit Findings Integrated into Action Items*
