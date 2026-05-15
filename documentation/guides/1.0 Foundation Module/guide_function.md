---
name: guide_function.md
purpose: Lifecycle diagrams and technical description of Foundation Module bootstrapping and page initialization logic
version: 1.2.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, data_schema.md, guide_frontend_appearance.md, foundation_nomenclature.md]
---

# Foundation Module — Function & Lifecycle

## 1.0 Bootstrap Lifecycle

```text
  [ User Browser Request ]
             |
             v
  [ DOMContentLoaded fires ]
             |
             v
+-------------------------------------------------------------+
|                   initializer.js                            |
+-------------------------------------------------------------+
|                                                             |
|  1. Read data-* attributes from <body>                      |
|     (incl. data-ai-subject for AI meta)                     |
|       |                                                     |
|  2. try { injectPageMetadata(config) }  --> <head> SEO, OG  |
|       |   catch → console.error                             |
|       |                                                     |
|  3. try { injectSidebar(anchorId) }     --> <aside> nav+ToC |
|       |   catch → console.error                             |
|       |   (skipped if no active-nav)                        |
|       |                                                     |
|  4. try { injectSearchHeader(anchorId) }--> <header> search |
|       |   catch → console.error                             |
|       |   (skipped if no active-nav)                        |
|       |                                                     |
|  5. try { injectFooter(anchorId) }      --> <footer> legal  |
|           catch → console.error                             |
|                                                             |
+-------------------------------------------------------------+
             |
             v
  [ Page shell fully assembled ]
```

---

## 1.1 Metadata Injection Lifecycle (header.js)

```text
  injectPageMetadata(config)
             |
             v
  +----------------------------------+
  | Resolve defaults from config     |
  | (title, description, canonical,  |
  |  robots, ogImage, ogType,        |
  |  aiSubject)                      |
  | Validate canonical/ogImage URLs  |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Set document.title               |
  | "{title} — The Jesus Website"    |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | setMeta() x8                     |
  | description, robots, author,     |
  | og:title, og:description,        |
  | og:url, og:type, og:image,       |
  | og:site_name, twitter:card,      |
  | twitter:title, twitter:desc,     |
  | twitter:image                    |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | setMeta() x3 — AI directives    |
  | ai:purpose, ai:subject,         |
  | ai:reading-level                 |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | setLink() x2                     |
  | rel=canonical, rel=icon          |
  +----------------------------------+
```

---

## 1.2 Sidebar Injection Lifecycle (sidebar.js)

```text
  injectSidebar(anchorId, activePage, tocItems)
             |
             v
  +----------------------------------+
  | Re-injection guard: remove       |
  | existing #site-sidebar +         |
  | #sidebar-backdrop + handlers     |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Build nav HTML from 9 navLinks   |
  | Mark activePage with .is-active  |
  | and aria-current="page"          |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Build optional ToC via DOM API   |
  | createElement/textContent        |
  | (XSS-safe — no innerHTML)        |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Compose <aside> with:            |
  | brand → nav → ToC → admin link   |
  | + .sidebar-backdrop overlay      |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | insertAdjacentHTML("beforebegin")|
  | before #anchorId element         |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Wire mobile off-canvas controls: |
  | "toggleSidebar" custom event     |
  | backdrop click → closeSidebar()  |
  | Escape key → closeSidebar()      |
  | Focus mgmt: open → first link,  |
  | close → return to trigger elem   |
  +----------------------------------+
```

---

## 1.3 Search Header Lifecycle (search_header.js)

```text
  injectSearchHeader(anchorId)
             |
             v
  +----------------------------------+
  | Re-injection guard: remove       |
  | existing #site-header            |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Compose <header> with            |
  | #global-search-input             |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | insertAdjacentHTML("beforebegin")|
  | before #anchorId element         |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | Single keydown listener:         |
  | Enter → encode + redirect to     |
  |   /records?search=<term>         |
  | Escape → clear input value       |
  +----------------------------------+
```

---

## 1.4 Footer Lifecycle (footer.js)

```text
  injectFooter(anchorId)
             |
             v
  +----------------------------------+
  | Compose <footer> with:           |
  | Legal group: © year + mark +     |
  |   CC BY-NC 4.0 link              |
  | Actions group: Print, Copy URL,  |
  |   Copy Contents buttons          |
  +----------------------------------+
             |
             v
  +----------------------------------+
  | insertAdjacentHTML("afterend")   |
  | after #anchorId element          |
  | (fallback: append to body)       |
  +----------------------------------+
             |
             v
  +------------------------------------------------------+
  |              Button Event Wiring                      |
  +------------------------------------------------------+
  |                                                      |
  | Print  ──> window.print()                            |
  |                                                      |
  | Copy URL ──> clipboard.writeText(location.href)      |
  |              └──> flashSuccess(btn, "Copied!")        |
  |                                                      |
  | Copy Contents ──> clipboard.writeText(#site-main     |
  |                   || <main> innerText)                |
  |                   └──> flashSuccess(btn, "Copied!")   |
  |                                                      |
  +------------------------------------------------------+
             |
             v
  +------------------------------------------------------+
  | flashSuccess(btn, label)                              |
  | add .is-success → swap label → wait 1800ms → reset   |
  +------------------------------------------------------+
```

---

## Technical Description

The Foundation Module (`1.0`) is the bootstrapping layer for every public-facing page. It owns no data and makes no API calls — its sole responsibility is assembling the page shell from reusable UI components. On `DOMContentLoaded`, `initializer.js` reads declarative `data-*` attributes from the `<body>` element (including `data-ai-subject` for per-page AI crawler hints) and calls four injectors in a fixed sequence, each wrapped in an independent try-catch block so a failure in one does not prevent the others from running: `injectPageMetadata` populates the invisible `<head>` with SEO meta tags, Open Graph properties, Twitter Card tags, AI crawler directives (with `config.aiSubject` passthrough), and the favicon link — it validates URL inputs and escapes querySelector selectors to prevent injection. `injectSidebar` removes any existing sidebar via a re-injection guard, then builds the sticky left-hand navigation panel with nine hardcoded nav links, optional table-of-contents entries built safely via `createElement()`/`textContent` (not innerHTML), and a mobile off-canvas toggle with focus management (focus moves to the first nav link on open, returns to the trigger element on close). `injectSearchHeader` removes any existing header, then inserts the visible top bar containing only a search input with a single consolidated keydown listener that redirects to `/records?search=<term>` on Enter and clears on Escape. `injectFooter` removes any existing footer, then appends the legal strip (copyright, branding mark, CC BY-NC 4.0 licence) and three action buttons (Print via `window.print()`, Copy URL and Copy Contents via the Clipboard API with `textContent` for cross-browser support, each confirmed by a 1.8-second `flashSuccess` state). The sidebar and search header injections are conditional — they fire only when their corresponding `data-sidebar-active-nav` or `data-search-header-active-nav` body attributes are present, which is why the root landing page (`index.html`) renders without either component. All visual styling is governed by centralised CSS design tokens defined in `typography.css` and structural grids in `shell.css` and `grid.css`, enforcing the Living Museum palette and Technical Blueprint aesthetic across every page variant.
