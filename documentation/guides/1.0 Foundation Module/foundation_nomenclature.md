---
name: foundation_nomenclature.md
purpose: Glossary of terms used throughout the Foundation Module and the broader codebase
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_frontend_appearance.md, guide_function.md]
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
| **`header.js` — `injectPageMetadata(config)`** | JS Function | Injects `<title>`, `<meta>` (including Open Graph, Twitter Card, and AI directives), and `<link rel="canonical">` into `<head>`. Accepts `config.aiSubject` for per-page AI crawler hints |
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
| **`footer.js` — `handlePrint()`** | JS Handler | Click handler for the print button — calls `window.print()` |
| **`footer.js` — `handleCopyUrl()`** | JS Handler | Click handler for copy URL button — uses `navigator.clipboard.writeText(location.href)` |
| **`footer.js` — `handleCopyContents()`** | JS Handler | Click handler for copy contents button — copies text content from `#site-main` or `<main>` |
| **`header.js` — `setMeta(name, content, attr)`** | JS Helper | Internal helper that creates or updates a `<meta>` tag in `<head>` |
| **`header.js` — `setLink(rel, href)`** | JS Helper | Internal helper that creates or updates a `<link>` tag in `<head>` |
| **`search_header.js` — `handleSearchKeydown(event)`** | JS Handler | Keydown handler on global search input — Enter submits search, Escape blurs |
| **`search_header.js` — `handleSearchEscape(event)`** | JS Handler | Escape-key handler that blurs the search input to dismiss focus |
| **`sidebar.js` — `handleSidebarEscape(event)`** | JS Handler | Keyboard handler that closes the off-canvas sidebar when Escape is pressed |
| **`data-sidebar-target`** | HTML Attribute | Body attribute specifying the DOM anchor ID where sidebar is injected (read by `initializer.js`) |
| **`data-search-header-target`** | HTML Attribute | Body attribute specifying the DOM anchor ID where search header is injected (read by `initializer.js`) |
| **`data-footer-target`** | HTML Attribute | Body attribute specifying the DOM anchor ID where footer is injected (read by `initializer.js`) |
| **`#site-main`** | DOM ID | Main content area container — fallback target for `handleCopyContents()` |
| **`#admin-canvas`** | DOM ID | Providence Grid container — CSS Grid with 4 explicit column tracks (sidebar / divider / gap / main) |
| **`#providence-col-main`** | DOM ID | Main content column inside Providence Grid |
| **`#providence-divider`** | DOM ID | Structural 1px vertical divider between Providence sidebar and main |
| **`#providence-drag-handle`** | DOM ID | Draggable resize handle embedded in the Providence divider |
| **`.site-main`** | CSS Class | Main content area grid-area identifier in the Page Shell |
| **`.site-header__search`** | CSS Class | Wrapper element around the search input in the header |
| **`.site-footer__legal-text`** | CSS Class | Text span inside footer legal group containing copyright text |
| **`.site-footer__mark`** | CSS Class | Favicon/branding mark element in the footer legal group |
| **`.landing-page__heading`** | CSS Class | Heading element on internal landing pages |
| **`.layout-landing__title`** | CSS Class | Landing page title within the `layout-landing` flex container |
| **`.layout-landing__subtitle`** | CSS Class | Landing page subtitle within the `layout-landing` flex container |
| **`.layout-landing__picture-block`** | CSS Class | Framed image block within the `layout-landing` flex container |
| **`.layout-landing__links`** | CSS Class | Navigation links row within the `layout-landing` flex container |
| **`.layout-two-col__content`** | CSS Class | Content area within the two-column sub-layout |
| **`.content-wrap--center`** | CSS Modifier | Centered variant of `.content-wrap` (auto left/right margins) |
| **`.grid-list-rows`** | CSS Class | Row-based list layout grid for stacked content items |
| **`.list-row`** | CSS Class | Single row in a list grid — hover transition with inset Oxblood box-shadow accent |
| **`.providence-col`** | CSS Class | Column element inside the Providence Grid |
| **`.providence-divider`** | CSS Class | Structural vertical divider class inside Providence Grid |
| **`.admin-card--centered`** | CSS Modifier | Centered text variant of the dashboard navigation card |
| **`.module-tab__close`** | CSS Class | Close button element inside a dashboard module tab |
| **`.record-picture`** | CSS Class | Image element inside `.record-picture-container` |
| **`.btn-outline`** | CSS Class | Outline-style button — transparent background, 1px border, Oxblood text |
| **`.lead`** | CSS Class | Lead paragraph style — larger size (`--text-lg`), relaxed line-height |
| **`.meta`** | CSS Class | Monospace metadata label — uses `--font-mono`, uppercase, `--tracking-wide` |
| **`.date`** | CSS Class | Monospace date display — `--font-mono`, secondary text colour |
| **`.reference`** | CSS Class | Monospace reference label — `--font-mono`, small text |
| **`.sr-only`** | CSS Class | Screen-reader-only utility — visually hidden but accessible to assistive technology |
| **`.is-success`** | CSS Class | Temporary visual success state applied to buttons (e.g. footer copy confirmation) |
| **`.is-full-bleed`** | CSS Class | Layout modifier that breaks content out of `content-wrap` to span full width |
| **`.text-muted`** | CSS Utility | Text colour utility applying `--color-text-muted` (Warm Ash) |
| **`.text-accent`** | CSS Utility | Text colour utility applying `--color-accent-primary` (Deep Oxblood) |
| **`.text-sm`** | CSS Utility | Font size utility applying `--text-sm` |
| **`.text-mono`** | CSS Utility | Font family utility applying `--font-mono` |
| **`.text-center` / `.text-left` / `.text-right`** | CSS Utilities | Text alignment utility classes |
| **`.font-body`** | CSS Utility | Font family utility applying `--font-body` (EB Garamond) |
| **`.font-serif`** | CSS Utility | Alias for `.font-body` |
| **`.font-essay`** | CSS Utility | Font family utility applying `--font-essay` (Crimson Pro) |
| **`.font-heading`** | CSS Utility | Font family utility applying `--font-heading` (Inter) |
| **`.font-mono`** | CSS Utility | Font family utility applying `--font-mono` (Roboto Mono) |
| **`.font-medium`** | CSS Utility | Font weight utility applying `--weight-medium` (500) |
| **`.font-semibold`** | CSS Utility | Font weight utility applying `--weight-semibold` (600) |
| **`.font-bold`** | CSS Utility | Font weight utility applying `--weight-bold` (700) |
| **`.slider-value`** | CSS Class | Numeric value display adjacent to a toggle or range input |
| **`.toggle-switch__input`** | CSS Class | Hidden checkbox `<input>` inside the toggle switch component |
| **`.state-loading__label`** | CSS Class | Text label inside a `.state-loading` feedback block |
| **`.state-success__label`** | CSS Class | Text label inside a `.state-success` feedback block |
| **`.state-error__label`** | CSS Class | Text label inside a `.state-error` feedback block |
| **`.error-footer__message`** | CSS Class | Status message text container inside `#admin-error-footer` — `overflow: hidden` for text-overflow ellipsis |
| **`--sidebar-width`** | CSS Token | Sidebar fixed width: `280px` |
| **`--content-max-width`** | CSS Token | Content column maximum width: `720px` |
| **`--header-height`** | CSS Token | Header height: `64px` (8 × 8px grid units) |
| **`--footer-height`** | CSS Token | Footer height: `80px` (10 × 8px grid units) |
| **`--reg-mark-size`** | CSS Token | Registration mark L-shape arm length: `8px` |
| **`--reg-mark-gap`** | CSS Token | Gap between element corner and registration mark: `4px` |
| **`--line-height-tight`** | CSS Token | Tight line height for headings: `1.2` |
| **`--line-height-snug`** | CSS Token | Snug line height for sub-headings: `1.4` |
| **`--line-height-base`** | CSS Token | Base line height for body copy: `1.7` |
| **`--line-height-relaxed`** | CSS Token | Relaxed line height for essay/long-form: `1.9` |
| **`--tracking-tight`** | CSS Token | Letter spacing for Inter headings: `-0.02em` |
| **`--tracking-normal`** | CSS Token | Default letter spacing: `0em` |
| **`--tracking-wide`** | CSS Token | Letter spacing for monospace metadata: `0.04em` |
| **`--tracking-widest`** | CSS Token | Letter spacing for small-caps labels: `0.1em` |
| **`--weight-light`** | CSS Token | Light font weight: `300` |
| **`--weight-regular`** | CSS Token | Regular font weight: `400` |
| **`--weight-medium`** | CSS Token | Medium font weight: `500` |
| **`--weight-semibold`** | CSS Token | Semibold font weight: `600` |
| **`--weight-bold`** | CSS Token | Bold font weight: `700` |
| **`--border-width-thin`** | CSS Token | Thin border: `1px` |
| **`--border-width-base`** | CSS Token | Base border: `1.5px` |
| **`--border-width-thick`** | CSS Token | Thick border: `2px` |
| **`--transition-fast`** | CSS Token | Fast transition: `150ms ease` |
| **`--transition-base`** | CSS Token | Base transition: `200ms ease` |
| **`--transition-slow`** | CSS Token | Slow transition: `350ms ease` |
| **`--radius-none`** | CSS Token | No border radius: `0px` |
| **`--radius-sm`** | CSS Token | Subtle rounding: `2px` |
| **`--radius-md`** | CSS Token | Medium rounding: `3px` |
| **`--radius-base`** | CSS Token | Base rounding: `4px` |
| **`--radius-full`** | CSS Token | Pill shape: `9999px` |
| **`--shadow-none`** | CSS Token | No shadow |
| **`--shadow-sm`** | CSS Token | Small shadow: `0 1px 3px rgba(36,36,35,0.08)` |
| **`--shadow-base`** | CSS Token | Base shadow: `0 2px 8px rgba(36,36,35,0.1)` |
| **`--shadow-md`** | CSS Token | Medium shadow: `0 4px 16px rgba(36,36,35,0.12)` |
| **`--shadow-lg`** | CSS Token | Large shadow: `0 8px 24px rgba(36,36,35,0.12)` |
| **`--color-bg-secondary`** | CSS Token | Aged Paper background: `#f4f2ed` |
| **`--color-bg-tertiary`** | CSS Token | Warm Stone background: `#eceae3` |
| **`--color-text-secondary`** | CSS Token | Lead Grey text: `#5b5b5b` |
| **`--color-text-muted`** | CSS Token | Warm Ash text: `#8a8a88` |
| **`--color-text-inverse`** | CSS Token | Parchment-on-dark text: `#f4f2ed` |
| **`--color-accent-hover`** | CSS Token | Dark Oxblood (pressed/active): `#6e2a34` |
| **`--color-accent-muted`** | CSS Token | Rose Stone secondary highlight: `#c19098` |
| **`--color-border-strong`** | CSS Token | Dark Clay border: `#c8c4ba` |
| **`--color-border-accent`** | CSS Token | Oxblood accent border: `#8e3b46` |
| **`--color-border-inverse`** | CSS Token | Night Clay border on dark: `#3a3a38` |
| **`--color-status-success`** | CSS Token | Blueprint Green status colour |
| **`--color-black`** | CSS Token | Pure black: `#000000` |
| **`--color-white`** | CSS Token | Pure white: `#ffffff` |
| **`--color-transparent`** | CSS Token | Fully transparent |
| **`--color-dash-accent`** | CSS Token | Dashboard accent (alias for Deep Oxblood): `#8e3b46` |
| ~~`--color-dash-border-strong`~~ | CSS Token | **Removed** — unused dashboard border token, deleted in plan_foundation_module_hardening |
| **Foundation Bootstrapper** | Concept | The `initializer.js` startup sequence — reads `data-*` body attributes, then calls injectors in order: metadata → sidebar → search header → footer |
