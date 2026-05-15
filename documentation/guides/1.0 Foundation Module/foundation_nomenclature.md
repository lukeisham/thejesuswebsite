---
name: foundation_nomenclature.md
purpose: Glossary of terms used throughout the Foundation Module and the broader codebase
version: 1.0.0
dependencies: [detailed_module_sitemap.md]
---

# Foundation Nomenclature — 1.0 Foundation Module

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

## Module-Specific Terms (1.0 Foundation Module)

| Term | Type | Definition |
|------|------|------------|
| **`initializer.js`** | JS File | Central bootstrapper — fires on `DOMContentLoaded`, reads `data-*` attributes from `<body>`, and calls injectors in sequence: `injectPageMetadata`, `injectSidebar`, `injectSearchHeader`, `injectFooter` |
| **`header.js` — `injectPageMetadata(config)`** | JS Function | Injects `<title>`, `<meta>` (including Open Graph, Twitter Card, and AI directives), and `<link rel="canonical">` into `<head>` |
| **`footer.js` — `injectFooter(anchorId)`** | JS Function | Builds and inserts `<footer class="site-footer">` with print, copy URL, and copy contents action buttons |
| **`footer.js` — `flashSuccess()`** | JS Helper | Temporarily sets `.is-success` state on a footer button for 1.8s as visual confirmation feedback |
| **`sidebar.js` — `injectSidebar(anchorId, activePage, tocItems)`** | JS Function | Builds and inserts `<aside class="site-sidebar">` with brand, nav links, optional table of contents, and admin portal link |
| **`sidebar.js` — `openSidebar()` / `closeSidebar()` / `toggleSidebar()`** | JS Functions | Off-canvas sidebar controls for tablet/mobile viewport |
| **`search_header.js` — `injectSearchHeader(anchorId)`** | JS Function | Builds and inserts `<header class="site-header">` with a global search input |
| **`#global-search-input`** | ID | Search input element injected by `search_header.js` — redirects to `/records?search=<term>` on Enter |
| **`.site-header`** | CSS Class | Visible top navigation bar — sticky, 64px tall, contains logo, search bar, and nav links |
| **`.site-header__logo`** | CSS Class | Brand/text logo element within the header |
| **`.site-header__search-input`** | CSS Class | Monospace search input with Oxblood focus ring |
| **`.site-header__nav`** | CSS Class | Right-aligned horizontal navigation link list |
| **`.site-sidebar`** | CSS Class | Sticky left sidebar column — 280px fixed width, scrollable, flex column |
| **`.site-sidebar__brand`** | CSS Class | Uppercase brand label in the sidebar, tracking-widest, heading font |
| **`.site-sidebar__nav-category`** | CSS Class | Non-clickable section category heading (monospace, uppercase) |
| **`.site-sidebar__nav li a[aria-current="page"]`** | CSS Selector | Active page link — Oxblood accent, medium weight, border-left hover indicator |
| **`.site-sidebar__footer`** | CSS Class | Flex-anchored bottom section of sidebar |
| **`.site-sidebar__admin-link`** | CSS Class | "Admin Portal" link — monospace, dashed border, Technical Blueprint styling |
| **`.site-sidebar__divider`** | CSS Class | 1px Clay Stone rule between sidebar nav sections |
| **`.sidebar-backdrop`** | CSS Class | Semi-transparent dark overlay (0.45 opacity, `blur(1px)`) behind off-canvas sidebar on mobile |
| **`.site-footer`** | CSS Class | Full-width footer strip — two-row flex layout with legal group and action buttons |
| **`.site-footer__actions`** | CSS Class | Right-aligned action buttons group (Print / Copy URL / Copy Contents) |
| **`.site-footer__legal`** | CSS Class | Left-aligned legal group (Copyright + mark + licence link) |
| **`.site-footer__licence-link`** | CSS Class | CC BY-NC 4.0 licence link |
| **`.footer-btn`** | CSS Class | Ghost-style action button — monospace, sharp edges, used in footer |
| **`.footer-btn__icon`** | CSS Class | Unicode symbol icon inside footer buttons (⎙ Print, ⧉ Copy URL, ⊕ Copy Contents) |
| **`#footer-btn-print`** | ID | Print button — calls `window.print()` |
| **`#footer-btn-copy-url`** | ID | Copy URL button — uses `navigator.clipboard.writeText()` |
| **`#footer-btn-copy-contents`** | ID | Copy contents button — copies `#site-main` or `<main>` text content |
| **`.hero`** | CSS Class | Landing page hero section — centred flex column |
| **`.hero__title`** | CSS Class | Site title ("The Jesus Website.") — `--text-4xl`, serif font |
| **`.hero__subtitle`** | CSS Class | Tagline paragraph — `--text-md`, secondary colour |
| **`.hero__picture-block`** | CSS Class | Framed image container with archival caption |
| **`.hero__links`** | CSS Class | Wrapped flex row of navigation links with dot separators |
| **`.landing-card`** | CSS Class | Minimal content card — Soft Parchment background, Oxblood hover border |
| **`.landing-card__title`** | CSS Class | Card title (heading font, semibold) |
| **`.landing-card__desc`** | CSS Class | Card description (body font, secondary colour) |
| **`.landing-card__meta`** | CSS Class | Monospace metadata label pushed to card bottom |
| **`.landing-page__grid`** | CSS Class | 3-column card grid for internal landing pages |
| **`.page-shell--landing`** | CSS Modifier | Landing page variant — single column (no sidebar) |
| **`.layout-landing`** | CSS Class | Landing page flex layout — centred column, no sidebar |
| **`.layout-two-col`** | CSS Class | 2-column sub-layout inside main content area |
| **`.content-wrap`** | CSS Class | Max-width 720px content wrapper, left-aligned |
| **`.grid-single`** | CSS Class | Single column grid — used for essays, about, response pages |
| **`.grid-two-col`** | CSS Class | Two equal column grid — used for News + Blog feed |
| **`.grid-three-col`** | CSS Class | Three-column card grid — used for landing page cards |
| **`.record-picture-container`** | CSS Class | Main picture container — hidden by default, revealed via JS |
| **`.picture-frame`** | CSS Class | Inner border frame around images |
| **`.picture-label`** | CSS Class | Archival caption ("Fig 1: [Caption]") below framed images |
| **`.thumbnail`** | CSS Class | Fixed 64×64px thumbnail with `object-fit: cover` |
| **`.thumbnail--md`** | CSS Modifier | 96×96px thumbnail variant |
| **`.thumbnail--lg`** | CSS Modifier | 128×128px thumbnail variant |
| **`.inline-snippet`** | CSS Class | Multi-line text clamp with 3-line ellipsis limit |
| **`.btn-primary`** | CSS Class | Primary action button — 1px solid charcoal border, Oxblood hover fill |
| **`.btn--filled`** | CSS Modifier | Pre-filled Oxblood variant of button |
| **`.badge`** | CSS Class | Small monospace uppercase label (e.g. "Response", "Fragment") |
| **`.badge--accent`** | CSS Modifier | Oxblood background, white text badge variant |
| **`.badge--muted`** | CSS Modifier | Clay Stone background, secondary text badge variant |
| **`.toggle-switch`** | CSS Class | Binary technical toggle — rectangular housing, no rounding |
| **`.toggle-switch__slider`** | CSS Class | Visual slider track — Lead Grey (OFF) or Oxblood (ON) |
| **Providence Grid** | Dashboard System | 2-column grid: `#admin-canvas` with 4 explicit tracks (sidebar / divider / gap / main) |
| **`#admin-dashboard`** | ID | Full-height flex column dashboard body (100dvh, no body scroll) |
| **`#admin-header`** | ID | Dashboard header placeholder (64px, matching public site header) |
| **`#admin-error-footer`** | ID | Fixed-height (36px) dashboard status/error bar |
| **`#admin-cards`** | ID | Dashboard landing card grid — 3-column layout |
| **`.admin-card`** | CSS Class | Dashboard navigation card — white background, Oxblood hover border |
| **`.admin-card__icon`** | CSS Class | Dashboard card icon (monospace emoji/SVG) |
| **`.admin-card__title`** | CSS Class | Dashboard card title |
| **`.admin-card__desc`** | CSS Class | Dashboard card description |
| **`#module-tab-bar`** | ID | Horizontal module tab strip below dashboard header |
| **`.module-tab`** | CSS Class | Individual dashboard tab — uppercase heading font, Oxblood active state |
| **`.sidebar-resize-handle`** | CSS Class | 8px draggable resize handle in Providence divider track |
| **`.no-sidebar`** | CSS Modifier | Collapsed dashboard sidebar state |
| **Nav Links (9 entries)** | Sidebar Data | Navigation: Records, Evidence, Timeline, Maps, Context, Debate & Discussion, Resource Lists, News, About |
| **`Fig. 1 — [Label]`** | Caption Pattern | Archival caption convention for framed images ("Fig. 1 — Jesus of Nazareth (c. 4 BC – c. AD 30)") |
| **The Legal Ledger** | Footer Concept | Footer design — aged paper background, monospace metadata, ledger-like legal strip |
| **Aleph + Omega** | Branding | Favicon branding concept — Alpha and Omega symbols representing Jesus as the beginning and the end |
