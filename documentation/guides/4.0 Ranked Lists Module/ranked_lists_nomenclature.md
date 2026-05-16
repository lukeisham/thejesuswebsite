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
| **Wikipedia Weights** | Feature (§4.1) | Dashboard sub-module for managing Wikipedia article rankings via configurable multipliers — dual-pane layout with sidebar weights and main ranked list |
| **Challenge Weights** | Feature (§4.2) | Dashboard sub-module for managing challenge rankings — split into two independent single-mode pages (Academic and Popular) with no toggle |
| **Academic Challenge** | Record Type | A scholarly/historical challenge to Christianity ranked by Difficulty, Scholarly Interest, and Historical Significance — type discriminator `challenge_academic` |
| **Popular Challenge** | Record Type | A mainstream/viral challenge to Christianity ranked by Popularity, Virality, and Search Volume — type discriminator `challenge_popular` |
| **Weighting Criteria** | Data Concept | Named label/multiplier pairs (e.g. "Difficulty: 8") stored as JSON Object in `*_weight` columns — used to compute final ranked score |
| **DEFAULT_WEIGHTS** | Code Constant | Starting criteria for a fresh mode with no saved weights — defined in `challenge_weighting_handler.js` with preset arrays for `academic` and `popular` |
| **Base Rank** | Algorithm Term | Raw score computed from external data (Wikipedia wordcount log-scale 1–100, or pipeline output) before weight multipliers are applied |
| **Final Rank** | Algorithm Term | Computed score: Base Rank × Product of all active Multipliers — determines list sort order |
| **Draft/Publish Cycle** | Workflow | All edits auto-save as `status: 'draft'`; "Calculate" re-sorts and reverts all records to draft; only "Publish" commits the final ranked order to the live frontend |
| **Refresh / Calculate** | Action Button | Re-sorts the ranked list using saved weights and sets ALL affected records to `status: 'draft'` (the "default-to-draft" rule) |
| **Gather** | Action Button | Triggers the external data pipeline (Wikipedia API or DeepSeek agent) to discover new articles/challenges |
| **Agent Search** | Action Button | Triggers a DeepSeek agent pipeline run for the selected challenge — discovers external sources using saved search terms |
| **Insert Response** | Action Button | Creates a new draft response record linked to the selected challenge via `challenge_id` FK, then navigates to the §5.2 Response Editor |
| **Search Terms** | Data Concept | JSON Array of query strings stored per record (`*_search_term` columns) — fed to Wikipedia REST API or DeepSeek agent for external data retrieval |
| **`_challengeModuleState`** | JS State Object | Global state singleton for challenge dashboards — caches mode, active record, per-mode weighting criteria, search terms, and challenge lists |
| **`_wikipediaModuleState`** | JS State Object | Global state singleton for the Wikipedia dashboard — caches active record, weights, search terms, and ranked list |
| **`wikipedia_rank`** | DB Column | 64-bit integer storing the computed rank position for a Wikipedia record |
| **`wikipedia_weight`** | DB Column | JSON Object storing label/multiplier pairs for the Wikipedia ranking algorithm |
| **`wikipedia_search_term`** | DB Column | JSON Array of search terms fed to `pipeline_wikipedia.py` for Wikipedia API queries |
| **`sub_type = 'ranked_weight'`** | Record Variant | Secondary row in the records table that stores weight JSON for a parent record — grouped by `id` on the frontend to merge main entry with its weight data |
| **Endless Scroll** | UI Pattern | Paginated ranked list in the dashboard main area that loads additional records on scroll rather than using page navigation |
| **Status Legend** | UI Element | Dashboard legend mapping `○D` (Draft) and `●P` (Published) symbols shown in ranked list rows |
| **Saved Search Terms Overview** | UI Element | Read-only list section between the Add Weight form and the Search Terms textarea — displays active search terms for the selected record |
| **pipeline_wikipedia.py** | Backend Pipeline | Python script that queries Wikipedia REST API with saved search terms, filters non-article pages, computes base score from wordcount, and writes results as draft |
| **pipeline_academic_challenges.py** | Backend Pipeline | Python pipeline for Academic challenges — filters by `WHERE type = 'challenge_academic'` and computes rankings |
| **pipeline_popular_challenges.py** | Backend Pipeline | Python pipeline for Popular challenges — filters by `WHERE type = 'challenge_popular'` and computes rankings |
