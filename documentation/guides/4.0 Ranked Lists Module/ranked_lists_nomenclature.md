---
name: ranked_lists_nomenclature.md
purpose: Glossary of terms used throughout the Ranked Lists Module and the broader codebase
version: 1.0.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md]
---

# Ranked Lists Nomenclature — 4.0 Ranked Lists Module

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

## Module-Specific Terms (4.0 Ranked Lists Module)

| Term | Type | Definition |
|------|------|------------|
|      |      |            |
