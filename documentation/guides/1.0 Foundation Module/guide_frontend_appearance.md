---
name: guide_frontend_appearance.md
purpose: Visual ASCII representations of the public-facing Foundation Module pages (landing, about, sidebar, footer, header, branding, typography)
version: 1.0.0
dependencies: [detailed_module_sitemap.md, guide_style.md]
---

# Guide to Page Appearance & Structural Layouts

This document maintains visual ASCII blueprints for the various page templates defined in the CSS Architecture (`Module 4`). These diagrams dictate the HTML structural constraints (`div` / `grid` flow), ensuring consistent visual identity across the public-facing site. It is the source of truth for the appearance of the public facing pages.

**Note:** The Admin Portal appearance will be documented separately in `guide_dashboard_appearance.md`.

---

## 1.0 Foundation Module
**Scope:** Global Grid, Typography, Colors, Shared UI (Sidebar, Header, Footer).

### 1.1 Website Landing Page (Public)
**Purpose:** The website entry point. Designed for a understated confidence factor with clear navigation, and immediate overview of content. 

**Relevant Files:**
- **HTML:** `index.html`
- **CSS:** `css/1.0_foundation/landing.css`, `css/1.0_foundation/grid.css`, `css/1.0_foundation/typography.css`, `css/1.0_foundation/shell.css`
- **JS:** `js/1.0_foundation/frontend/header.js`, `js/1.0_foundation/frontend/footer.js`, `js/2.0_records/frontend/setup_db.js`, `js/2.0_records/frontend/sql-wasm.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                                                                         |
|                         The Jesus Website.                              |
|                                                                         |
|          A detailed presentation of the evidence for Jesus.             |
|-------------------------------------------------------------------------|
|                                                                         |
|                 +---------------------------------+                     |
|                 |                                 |                     |
|                 |      Picture of Jesus           |                     |
|                 |                                 |                     |
|                 |                                 |                     |
|                 +---------------------------------+                     |
|                                                                         |
|               Text block with links (center justified)                  |
|                                                                         |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     | 
+-------------------------------------------------------------------------+
```

---

### 1.2 Internal Landing Page (Public)
**Purpose:** The entry point for context essays, the debate section, or resource lists. Utilizes a grid of category items for easy navigation.

**Relevant Files:**
- **HTML:** `frontend/pages/context.html`, `frontend/pages/debate.html`, `frontend/pages/resources.html`
- **CSS:** `css/1.0_foundation/landing.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/5.0_essays_responses/frontend/view_context_essays.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
| SITE LOGO | [ Search Bar ] | [ Nav Links... ]                           |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar Nav]      |   The Jesus Website: [Records or Context etc]     |
|                     |                                                   |
|  - Records          |   +-------------+ +-------------+ +-------------+ |
|  - Context          |   |  [Item 1]   | |   [Item 2]  | |  [Item 3]   | |
|  - Resources        |   |             | |             | |             | |
|  - Debate           |   |             | |             | |             | |
|  - About            |   +-------------+ +-------------+ +-------------+ |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 1.3 About Page
**Purpose:** The about page providing the tech stack, methodology, and contact information. Includes a sidebar for navigation and a single column for content.

**Relevant Files:**
- **HTML:** `frontend/pages/about.html`
- **CSS:** `css/5.0_essays_responses/frontend/essays.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/footer.js`

```text
+-------------------------------------------------------------------------+
| [Invisible Header: Injects SEO, robots, and agent-specific metadata]    |
|-------------------------------------------------------------------------|
|                     |                                                   |
|  [Sidebar]          |   ABOUT THE JESUS WEBSITE                         |
|                     |                                                   |
|                     |   +-------------------------------------------+   |
|                     |   | [ Picture]                                |   |
|                     |   |                                           |   |
|                     |   +-------------------------------------------+   |
|                     |                                                   |
|                     |   [Section: Tech Stack]                           |
|                     |   "Welcome to The Jesus Website. Our mission      |
|                     |   is to..."                                       |
|                     |                                                   |
|                     |   [Section: Methodology]                          |
|                     |   "We gather evidence from..."                    |
|                     |                                                   |
|                     |   [Section: Contact]                              |
|                     |   "Reach out to us at..."                         |
|                     |                                                   |
|-------------------------------------------------------------------------|
|  [Universal Footer]                                                     |
+-------------------------------------------------------------------------+
```

### 1.4 Universal Sticky Sidebar & Search
**Purpose:** Provides contextual navigation, filtering, or localized data (e.g., Table of Contents) without losing scroll position on long data views. (Appears on all pages except 'index.html' or 'Admin Portal' pages)

**Relevant Files:**
- **HTML:** (generated by `sidebar.js`)
- **CSS:** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/sidebar.js`

```text
+-------------------------+
| The Jesus Website       |
|-------------------------|
|                         |
|  - Records              |
|  - Evidence             |
|  - Timeline             |
|  - Maps                 |
|  - Context Essays       |
|  - Debate & Discussion  |
|  - Resource lists       |
|  - News                 |
|  - About                |
|                         |
|-------------------------|
|  [Admin Portal]         |
+-------------------------+
```

#### 1.4.1 Sidebar — Technical Anatomy Mapping
**Purpose:** Documents the mapping between visual interface elements and their technical implementation in `sidebar.js` and `sidebar.css`.

**Relevant Technical Files:**
- **Logic:** `js/1.0_foundation/frontend/sidebar.js`
- **Styles:** `css/1.0_foundation/sidebar.css`, `css/1.0_foundation/grid.css`

```text
+----------------------+-----------------------------+------------------------------------+
| Interface Element    | CSS Component Class         | DOM ID / Hook                      |
|----------------------|-----------------------------|------------------------------------|
| Main Container       | .site-sidebar               | #site-sidebar                      |
| Top Brand Label      | .site-sidebar__brand        | #sidebar-brand "The Jesus website" |
| Navigation List      | .site-sidebar__nav          | #sidebar-main-nav                  |
| Navigation Link      | .site-sidebar__nav li a     | #sidebar-nav-[id]                  |
| Section Divider      | .site-sidebar__divider      | (No ID)                            |
| Category Label       | .site-sidebar__nav-category | (No ID)                            |
| Table of Contents    | .site-sidebar__nav          | #sidebar-toc                       |
| Mobile Backdrop      | .sidebar-backdrop           | #sidebar-backdrop                  |
| Admin Link           | .site-sidebar__admin-link   | #sidebar-admin-link                |
+----------------------+-----------------------------+------------------------------------+
```

### 1.5 Universal Footer & Creative Commons
**Purpose:** The universal footer that anchors the bottom of every readable page. Redesigned into a single horizontal strip for a more streamlined, modern aesthetic while maintaining accessibility and functional access to utility tools.

**Relevant Files:**
- **HTML:** (generated by `footer.js`)
- **CSS:** `css/1.0_foundation/footer.css`, `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/footer.js`

```text
+-----------------------------------------------------------------------------------------+
| [Copyright 2026] | [ Aleph/Omega icon ] | [Copyright Licence]   [Print] | [Copy] | [Copy] |
+-----------------------------------------------------------------------------------------+
```

#### 1.5.1 Footer — Component Breakdown
- **Legal & Branding (Left):** Displays site copyright, the Aleph/Omega branding icon (`assets/favicon.png`), and the CC BY-NC 4.0 license link.
- **Utility Actions (Right):** Horizontal group of ghost buttons providing specialized Print and Copy functionality.
- **Structural Behavior:** Leverages `justify-content: space-between` on a single-row flex container. Collapses to a centered vertical stack on screens below 800px.

---

### 1.6 Universal Image/Picture Layouts
**Purpose:** Every picture is displaed with a lightweight thin line around that is longer at the base to include the caption aka 'picture label'. ***Note*** that Thumbnails do not follow this rule and only display the picture. (see `thumbnails_display.js`)

**Relevant Files:**
- **HTML:** (generated by `pictures_display.js`)
- **CSS:** `css/1.0_foundation/pictures.css`
- **JS:** `js/2.0_records/frontend/pictures_display.js`

```text
+-------------------------------------------------------------------------+
|+-----------------------------------------------------------------------+|
|                            [Picture / PNG]                            ||
|+-----------------------------------------------------------------------+|
| [Picture Label]                                                         |
+-------------------------------------------------------------------------+
```

### 1.7 Universal Navigation Header
**Purpose:** Managed by `header.js`, this component injects invisible SEO metadata and optionally a visible top header (Search Bar only) on pages that require global search access.

**Relevant Files:**
- **HTML:** (injected into certain pages via `search_header.js`)
- **CSS:** `css/1.0_foundation/grid.css`
- **JS:** `js/1.0_foundation/frontend/search_header.js`

```text
+-------------------------------------------------------------------------+
| [ Search Bar ]                                                          |
+-------------------------------------------------------------------------+
```

#### 1.7.1 Search Header — Detailed Component Anatomy
**Purpose:** Documents the precise internal structure and layout behaviour of the visible search header bar injected by `search_header.js`. Renders only the search input — no site logo, no navigation links.

**Relevant Files:**
- **JS:** `js/1.0_foundation/frontend/search_header.js`
- **CSS:** `css/1.0_foundation/grid.css` (§3 — Visible Search Header)

**HTML DOM Structure (generated by `search_header.js`):**
```text
<header class="site-header" id="site-header">  ← grid-area: header
│
└── <div class="site-header__search">            ← flex: 1; max-width: 480px
    └── <input type="search" id="global-search-input">
            placeholder: "Search records, people, events…"
            Events: Enter  → URL redirect to records.html?search=<term>
                    Escape → clear input only (no navigation)
```

**Visual Layout (Desktop — above 1024px):**
```text
+-------------------------------------------------------------------------+
|                    .site-header (height: 64px, sticky top: 0)           |
|-------------------------------------------------------------------------|
|                                                                         |
|                     .site-header__search                                |
|                     flex: 1 (grows); max-width: 480px                   |
|                                                                         |
|                     +-----------------------------------+               |
|                     | Search records, people, events…  |               |
|                     +-----------------------------------+               |
|                                                                         |
+-------------------------------------------------------------------------+
         ← flex container: align-items: center; gap: var(--space-3) →
```

**Visual Layout (Tablet / Mobile — at or below 1024px):**
```text
+------------------------------------------+
|  [ Search ]                              |
|  padding-inline shrinks to --space-2     |
+------------------------------------------+
```

**Critical CSS Rules (grid.css):**
```text
  .site-header              → display: flex; height: 64px; sticky; z-index: 100
  .site-header__search      → flex: 1; max-width: 480px; margin-inline: auto
```

**Integration Notes:**
- Triggered by `initializer.js` when `data-search-header-active-nav` is set on `<body>`, OR by a direct inline call to `injectSearchHeader(anchorId)`.
- Inserted into the DOM **before** the sidebar element (default target: `#site-sidebar`).
- On Enter, redirects the browser to `/frontend/pages/records.html?search=<encoded term>`; `list_view.js` reads the `search` URL param on `thejesusdb:ready` and calls `db.searchRecords()` automatically.
- On Escape, clears the input field only — no page navigation occurs.

---

### 1.8 Branding, Icons & Identity
**Purpose:** Establishes the core visual identity of "The Jesus Website" through symbolic archetypes.

**Primary Icon:** `assets/favicon.png`
**Design Concept:** A thin black circle enclosing the letters **א (Aleph)** and **Ω (Omega)** side by side.
**Symbolic Rationale:** Represents the "Alpha and Omega" (Beginning and End) concept, utilizing the first letter of the Hebrew alphabet and the last letter of the Greek alphabet to reflect the Judeo-Christian historical and theological scope of the project.

**Usage:**
- **Browser Tab:** Injected via `header.js` as the standard site `favicon`.
- **Universal Footer:** Centered as a minimalist signature.

**Relevant Files:**
- **Image:** `assets/favicon.png`
- **Logic:** `js/1.0_foundation/frontend/header.js`, `js/1.0_foundation/frontend/footer.js`

---

### 1.9 Interactive Typography Standards
**Purpose:** Establishes the authoritative "Technical Blueprint" aesthetic for all interactive controls (buttons, sliders, checkboxes, and toggles) across the codebase. This ensures consistency and prevents visual divergence.

#### Interactive Elements Directory

| Element Type | Primary Selectors | Visual Context / Usage | Governing CSS File |
| :--- | :--- | :--- | :--- |
| **Generic Buttons** | `.btn-primary`, `.btn-outline`, `.btn--filled` | The standard "Technical Instruction" Node used globally for submitting forms, major navigation, and list-card actions. | `css/1.0_foundation/frontend/buttons.css` |
| **Footer Action Buttons** | `.footer-btn` | Minimal ghost-style buttons (Print, Copy URL, Copy Contents) located in the Universal Footer. | `css/1.0_foundation/footer.css` |
| **Timeline Controls** | `.timeline-actions button` | Navigational controls (#zoom-in, #zoom-out, #prev-era, #next-era) within the massive timeline canvas. | `css/3.0_visualizations/frontend/timeline.css` |
| **Map Controls** | `.map-actions button` | Navigational controls (#zoom-in, #zoom-out, #toggle-layers) within the geospatial map canvas. | `css/3.0_visualizations/frontend/maps.css` |
| **Login Buttons** | `.login-box button` | Explicitly sharp-cornered, high-contrast action buttons used exclusively in the Admin Portal login sequence. | `css/7.0_system/auth_login.css` |
| **Range Sliders** | `input[type="range"]` | Blueprint Vector sliders with square tracker thumb and high-visibility active states (e.g. Map Era filter). | `css/1.0_foundation/frontend/forms.css` |
| **Checkboxes & Radios** | `input[type="checkbox"]`, `input[type="radio"]` | Form selection inputs rendered as sharp boxes with contrasting selected states and cross-hatching or distinct border logic. | `css/1.0_foundation/frontend/forms.css` |
| **Toggle Switches** | `.toggle-switch__input`, `.toggle-switch__slider` | Dual-state visual logic switches relying on precise before/after pseudo-element translation. | `css/1.0_foundation/frontend/forms.css` |

---

