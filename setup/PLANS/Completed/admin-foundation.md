# Plan: Admin Foundation — Shell, Styling, Dashboard, Settings & Analytics

**Module(s):** Admin
**Date:** 2026-06-29
**Status:** ✅ Completed

## Goal
Build the shared admin shell (sidebar + top bar), the full admin CSS system, the session-guard and shared admin scripts, and the three "overview" pages that depend only on the shell: the Dashboard, Settings, and Analytics. This unblocks every other admin page — the content CRUD pages and the diagram editors all assume this shell and stylesheet exist (see Issues.md #5).

## Coding rules to keep in mind
- **HTML-1** — Every admin page uses `<nav>` for the sidebar, `<main>` for the content area, `<header>` for the top bar; `<div>` only as styling hooks.
- **HTML-3** — Exactly one `<h1>` per page (the page title in the top bar).
- **HTML-4** — Admin CSS in `<head>`; admin scripts `defer`red.
- **HTML-5** — The settings form and any inline forms give every control a `<label>`; errors via `aria-describedby`.
- **CSS-1** — One admin CSS file per component/layout/page; keep each under 150 lines; split when they grow.
- **CSS-2** — Reference the admin design tokens from `admin-base/variables.css`; never hardcode the `--admin-*` palette values.
- **CSS-4 / CSS-5** — Semantic, kebab-case class names; single low-specificity selectors; no IDs as style hooks, no `!important`.
- **JS-2** — Validate API responses; redirect to login on 401; never fail silently.
- **JS-5** — All data loads through `async/await` + `try/catch`; show a loading state before fetch and an error state on failure.
- **JS-6** — Cache repeated DOM queries; use event delegation; never `innerHTML` with API data (use `textContent` / element builders).
- **SR-1** — Keep `auth.js` (session guard) separate from `admin.js` (dashboard + shared CRUD helpers) and `analytics.js` (analytics rendering).
- **SR-2 / SR-3** — Vanilla HTML + CSS + JS only; no admin frameworks or build tools.

## Tasks

### Admin base styles

- [x] **Create the admin design tokens** — admin color palette (`--admin-bg`, `--admin-sidebar-*`, `--admin-accent*`, `--admin-surface`, `--admin-text-*`, `--admin-border`), admin typography scale, and reuse of the shared `--space-*` scale. File: `admin/assets/css/admin-base/variables.css`
- [x] **Create the admin reset** — minimal reset/normalize scoped to the admin panel. File: `admin/assets/css/admin-base/reset.css`
- [x] **Create the admin typography** — sans-serif (`system-ui`) headings + body sizing per Style Guide §2 "Admin Typography" (no serif in admin). File: `admin/assets/css/admin-base/typography.css`

### Admin layout

- [x] **Create the admin sidebar layout** — fixed `220px` `--admin-sidebar-bg` sidebar, nav items with hover/active states and the `3px` left-border active indicator (§13 Global Admin Shell). File: `admin/assets/css/admin-layout/sidebar.css`
- [x] **Create the admin grid layout** — two-panel shell (sidebar + scrollable main), the top-bar row (title left, actions right), and the two-column edit-form layout (~65%/~35%) reused by content pages. File: `admin/assets/css/admin-layout/grid.css`

### Admin components

- [x] **Create admin buttons** — primary (`--admin-accent`), secondary, and ghost variants with sm/md/lg sizing. File: `admin/assets/css/admin-components/buttons.css`
- [x] **Create admin forms** — inputs, selects, textareas, focus ring, error and disabled states for admin forms. File: `admin/assets/css/admin-components/forms.css`
- [x] **Create admin tables** — clean bordered data tables, alternating rows, sticky header, plus the published/draft status badge styles (Style Guide §8 Status Badges). File: `admin/assets/css/admin-components/tables.css`
- [x] **Create admin modals** — centred confirmation modal + backdrop (used by bulk destructive actions and the news add-article form). File: `admin/assets/css/admin-components/modals.css`
- [x] **Create admin cards** — dashboard stat cards and the auth-style centred card container. File: `admin/assets/css/admin-components/cards.css`
- [x] **Create the analytics styles** — stat cards, sortable page-views table, inline sparkline sizing, and the date-range chip row (§13 Analytics). File: `admin/assets/css/analytics.css`

### Admin CSS entry point

- [x] **Create the admin stylesheet entry point** — `@import` all admin base, layout, component, and page sheets in cascade order (mirrors the frontend `main.css` pattern). File: `admin/assets/css/admin.css`

### Shared admin scripts

- [x] **Create the admin session guard** — on load, `GET /auth/me` (or equivalent); on 401 redirect to `admin/auth/login.html`; expose a `requireSession()` helper every admin page calls first. File: `admin/assets/js/auth.js`
- [x] **Create the shared admin script** — dashboard stat fetch/render, plus DOM-free helper functions reused across admin pages: a generic CRUD request builder, a number/stat formatter, and a draft/published status-badge builder. Keep the pure helpers exported for tests. File: `admin/assets/js/admin.js`
- [x] **Create the analytics script** — fetch `GET /analytics`, render the stat cards, the page-views table, and build sparkline `<polyline>` point strings from a series (pure point-calc helper exported for tests). File: `admin/assets/js/analytics.js`

### Admin pages

- [x] **Create the admin dashboard** — admin shell with a 4-card stats row (published evidence, drafts, blog posts, 7-day page views), a recent-drafts table, and "New Evidence Draft" / "New Blog Post" quick-action buttons (§13 Dashboard). File: `admin/index.html`
- [x] **Create the settings page** — single-column `600px` form for site metadata (title, description, default OG image) and global config, posting to the settings/about API (§13 Settings). File: `admin/settings/index.html`
- [x] **Create the analytics page** — date-range chip row, stats row, sortable page-views table, sparklines, and referrers table, all read-only from `GET /analytics` (§13 Analytics). File: `admin/analytics.html`

### Automated tests

- [x] **Write admin foundation tests** — `node:test` + `node:assert` unit tests for the pure helpers in `admin.js` (CRUD request builder, stat formatter, status-badge builder) and the sparkline point-calc helper in `analytics.js`. File: `admin/tests/admin.test.js`

## Files touched
- `admin/assets/css/admin-base/variables.css` — created
- `admin/assets/css/admin-base/reset.css` — created
- `admin/assets/css/admin-base/typography.css` — created
- `admin/assets/css/admin-layout/sidebar.css` — created
- `admin/assets/css/admin-layout/grid.css` — created
- `admin/assets/css/admin-components/buttons.css` — created
- `admin/assets/css/admin-components/forms.css` — created
- `admin/assets/css/admin-components/tables.css` — created
- `admin/assets/css/admin-components/modals.css` — created
- `admin/assets/css/admin-components/cards.css` — created
- `admin/assets/css/analytics.css` — created
- `admin/assets/css/admin.css` — created
- `admin/assets/js/auth.js` — created
- `admin/assets/js/admin.js` — created
- `admin/assets/js/analytics.js` — created
- `admin/index.html` — created
- `admin/settings/index.html` — created
- `admin/analytics.html` — created
- `admin/tests/admin.test.js` — created

## Notes
- **Resolves Issues.md #5** — this plan builds the shared admin shell (`admin.css`, `admin-base/variables.css`, sidebar/grid layout) that `admin/diagrams/maps.html` already assumes exists. Once implemented, mark that issue resolved.
- **Dependency order**: base → layout → components → `admin.css` entry point → scripts → pages. Pages must come after the shell CSS and `auth.js` exist.
- **`analytics.js` is an addition beyond the Website_guide.md JS list.** The guide assigns "Dashboard stats" to `admin.js` but provides no analytics script; isolating analytics rendering in its own file honours SR-1 rather than bloating `admin.js`. (`admin/assets/css/analytics.css` and `login.css` are listed at the css/ root in the guide — `login.css` already lives at `admin/auth/login.css`, so it is not recreated here.)
- **Testability**: the DOM-bound rendering (sidebar, tables, page wiring) is validated manually via `setup/TESTS/admin_tests.md`, following the `passkey.js` / `maps.js` precedent. Only the pure helpers are unit-tested.
- The dashboard/analytics stat queries depend on existing API routes (`/evidence`, `/drafts`, `/blog-posts`, `/analytics`) — all already on disk from the completed backend plan.

## Completion Instructions

- **Marking progress**: As each task is implemented, change `- [ ]` to `- [x]` in the checklist above.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
