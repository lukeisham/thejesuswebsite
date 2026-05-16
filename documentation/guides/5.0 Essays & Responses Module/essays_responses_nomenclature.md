---
name: essays_responses_nomenclature.md
purpose: Glossary of terms used throughout the Essays & Responses Module and the broader codebase
version: 1.1.0
dependencies: [detailed_module_sitemap.md, simple_module_sitemap.md, guide_dashboard_appearance.md, guide_frontend_appearance.md, guide_function.md]
---

# Essays & Responses Nomenclature — 5.0 Essays & Responses Module

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

## Module-Specific Terms (5.0 Essays & Responses Module)

| Term | Type | Definition |
|------|------|------------|
| **Unified WYSIWYG Editor** | Architecture | Shared split-pane markdown editor layout using `wysiwyg-*` BEM namespace, consumed by Essays, Historiography, Challenge Response, and Blog Post dashboards. Standardised under §9.0 Cross-Cutting Standardization |
| **Orchestrator Pattern** | Architecture | Module-entry pattern where `dashboard_essay.js` / `dashboard_historiography.js` inject HTML templates via `_setColumn()`, then initialise sub-modules (list display, markdown editor, document status handler, search) in strict dependency order |
| **Singleton Module** | Architecture | Design pattern used by the Historiography editor — exactly one record with slug locked to `"historiography"`, auto-loaded on mount, no sidebar document list, no "+ New" button |
| **Split-Pane Editor** | Layout | The core editor grid divided into two panes: Markdown input (`#markdown-textarea`, left) and Live HTML Preview (`#markdown-preview`, right), debounced at 300ms |
| **Function Bar** | Layout | `#wysiwyg-function-bar` — top action bar containing Save Draft, Publish, Delete buttons and (for Essay mode) the "+ New Context Essay" button |
| **Sidebar Document List** | Layout | The left sidebar (`#wysiwyg-sidebar`) grouping documents into Published (`#wysiwyg-published-list`) and Drafts (`#wysiwyg-drafts-list`) sections, with real-time title search filtering via `#wysiwyg-search-input` |
| **Markdown Toolbar** | Layout | `#markdown-toolbar` — toolbar with Bold, Italic, Underline, Link, Image, and Code buttons using `data-action` attributes, wired by `markdown_editor.js` |
| **`_essayModuleState`** | State | Global module state object (`window._essayModuleState`) tracking `mode` ("essay" or "historiography"), `activeRecordId`, `activeRecordTitle`, and `isDirty` flag consumed by the document status handler |
| **`recordMainRendered` Event** | Event | `CustomEvent` dispatched after essay/response content is rendered on the frontend. Consumed by `sources_biblio_display.js` and `pictures_display.js` to inject bibliography and picture sections |
| **Context Essay** | Content Type | Thematic long-form essay about the historical world of Jesus, identified by `type: "context_essay"`. Published via the Essay dashboard orchestrator (`dashboard_essay.js`) and rendered by `view_context_essays.js` |
| **Historiography Essay** | Content Type | Singleton long-form essay tracing historical academic trends about Jesus, identified by `type: "historiographical_essay"`. Slug permanently locked to `"historiography"`. Published via `dashboard_historiography.js`, rendered by `view_historiography.js` |
| **Theological Essay** | Content Type | Long-form essay on theological topics, identified by `type: "theological_essay"`. Shares the same Essay dashboard flow as context essays. Has an additional `ordo_salutis` field for order-of-salvation classification |
| **Spiritual Article** | Content Type | Long-form spiritual/religious article, identified by `type: "spiritual_article"`. Shares the same Essay dashboard flow as context essays |
| **Challenge Response** | Content Type | Markdown-authored scholarly response linked to a parent challenge, identified by `type: "challenge_response"`. Has a `challenge_id` foreign key to the parent challenge record. Rendered by `response_display.js` |
| **Challenge Link** | Association | The `challenge_id` foreign key on a response record, linking it to its parent challenge. Managed by `challenge_link_handler.js` on the dashboard side |
| **Academic/Popular Groups** | Layout | Challenge Response sidebar grouping categories — responses are listed under Academic or Popular headers using the unified `wysiwyg-sidebar-group` BEM classes |
| **Table of Contents** | Feature | `#essay-toc` — Auto-generated from `h2` and `h3` headings in the essay body by `generateEssayTOC()` / `generateHistoriographyTOC()`, injected into the left `essay-toc-aside` sidebar |
| **Abstract** | Layout | `.essay-abstract` — Blueprint-style bordered box with left Oxblood accent border, displaying the essay's snippet as an italicised abstract |
| **Drop Cap** | Typography | 3-line-high decorative first letter on the first paragraph of essay body (`.essay-body p:first-of-type::first-letter`), rendered in Oxblood with the heading font family |
| **Bible Verse Flyout** | Feature | `.bible-verse` — dotted Oxblood underline on inline scripture references with a hover tooltip (`.bible-verse-flyout`) showing the full verse text |
| **Response Container** | Layout | `.response-container` — dashed-border wrapper (`1px dashed var(--color-border-strong)`) for challenge response views, with an Oxblood `response-indicator` vertical strip on the left edge and a monospace `response-label` badge |
| **Response Indicator** | Layout | `.response-indicator` — absolute-positioned Oxblood vertical bar on the left edge of response containers, visually signalling the content as a response |
| **Inline MLA Marker** | Feature | `.inline-mla-marker` — clickable superscript citation markers injected into essay/response body text by `mla_snippet_display.js`, styled in Oxblood with pointer cursor (tooltip/modal integration pending Phase 3) |
| **MLA Bibliography Fields** | Data | Structured MLA citation fields in the bibliography JSON: `mla_book`, `mla_article`, `mla_website`, `mla_book_inline`, `mla_article_inline`, `mla_website_inline`. Rendered by `sources_biblio_display.js` which listens for the `recordMainRendered` event |
| **External References** | Data | Three scholarly identifier fields on essay records: `iaa` (IAA Reference), `pledius` (Pledius Reference), `manuscript` (Manuscript Ref). Plus custom identifiers from `metadata_json.identifiers` array. All rendered in a "Unique Identifiers" section on the frontend |
| **`ordo_salutis`** | Data | Order-of-salvation classification enum on theological essays with 8 values: Predestination, Regeneration, Faith, Repentance, Justification, Sanctification, Perseverance, Glorification |
| **`getEssaySlugFromURL`** | Utility | URL parser in `view_context_essays.js` that extracts the essay slug from `?slug=` query parameter or the clean path `/context/{slug}` |
| **Markdown Editor 🔑** | Shared Tool | Core WYSIWYG markdown editing tool (`markdown_editor.js`) — owned by the Essays & Responses Module, consumed by Blog Posts and Challenge Response dashboards via `<script>` tag. Exposes `window.initMarkdownEditor()`, `window.getMarkdownContent()`, `window.setMarkdownContent()` |
| **`.biblio-entry`** | CSS Class | MLA hanging-indent bibliography entry — `padding-left` + negative `text-indent` for standard citation formatting. Defined in `essays.css` and `responses.css` |
| **`.essay-body__link`** | CSS Class | Styled hyperlink within essay body content — Oxblood accent colour with underline, hover darkening. Defined in `essays.css` |
| **`escapeAttr`** | Shared Utility | HTML attribute escaping function from `html_utils.js` — escapes `&`, `"`, `'`, `<`, `>` for safe use inside quoted HTML attributes. Consumed by `view_context_essays.js` and `view_historiography.js` |
| **`_escapeBiblioHtml`** | Utility | File-local HTML escaping in `sources_biblio_display.js` — prevents XSS when rendering bibliography entries via `innerHTML` |
