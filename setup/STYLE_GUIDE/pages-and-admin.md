_Part of the [Style Guide](INDEX.md) — §10–13: UX patterns, accessibility & technical notes, print styles, admin page layouts._

---

## 10. UX Patterns & Interactions

**Search** (`/evidence/search.html`, linked in the sidebar):
- The input is full width, `--text-h3` text, `56px` high, and takes focus on load.
- Results update as the reader types, `300ms` after the last key. A hint below the input explains quotation marks for exact phrases.
- One chip per result type: All, Evidence, Essays, Responses, Blog, News, Bible Verses. `?type=<type>` in the URL preselects a chip.
- Results group by type under a heading "Type (count)". Each row has a `64px` thumbnail, the title, a snippet and a type badge.
- Matches use `<mark>`: `--accent-gold` background, inherited text colour, `2px` radius.
- Separate states for loading, empty input, no results and a failed request.

**Filtering**: the Evidence list writes its active filter to the URL query, so a filtered view can be shared (§8 Filters).

**Loading states**: detail pages show a shimmering `.skeleton` until data arrives. Lists, the Timeline and Maps show a spinner.

**Empty states** (`.empty-state`): a centered, `--text-muted` message in a block at least `240px` high.

**Error states**:
- A failed list load shows an error message with a "Try again" button, plus an error toast (§8).
- The 404 page shows "404 — Page Not Found" with a "Home" button (primary) and a "Browse Evidence" button (secondary).

**Anchors**: the page scrolls smoothly to in-page anchors.

---

## 11. Accessibility & Technical Notes

**Accessibility**:
- Landmarks: `<nav>`, `<main id="main-content">`, `<article>`. Headings follow §5: one hidden `h1`, visible headings from `h2`.
- Every `<img>` has an `alt` attribute. A decorative thumbnail beside a title uses `alt=""` (HTML-2).
- Icon-only controls have an `aria-label` (§7).
- Keyboard focus shows a `2px solid var(--accent)` outline with a `2px` offset on every element. A few components use a different outline colour for contrast on their own surface.
- Colour is never the only signal. Era tints have labels, grid cells show numbers, and score bands show the score.
- Motion follows the reduced-motion rule in §6.

**Performance**:
- Images use `loading="lazy"` or the `data-src` lazy loader.
- Upload WebP where possible.
- Inline critical CSS only when necessary for above-the-fold content (HTML-4).
- No external font requests. The site uses system font stacks only.
- **Upload size**: the server (`POST /uploads`, the single upload route) resizes every image to fit inside a `1440 × 960` box. That is 2× the `720 × 480` standard figure box (§8), so images stay sharp on retina screens. A smaller image is never enlarged.

**Content Structure**:
- Essays, responses and historiography pages carry `schema.org/ScholarlyArticle` JSON-LD. Blog posts carry `schema.org/BlogPosting`.
- Detail pages use slug URLs: `/<section>/<slug>`.

**PWA / Manifest** (`frontend/assets/images/site.webmanifest`, linked from each page head):
- `theme_color` and `background_color`: `#F8F5F0` (`--bg-primary`).
- `display`: `browser`. The site is a reference resource, not an app.
- `apple-touch-icon.png`: `180 × 180px`.
- No service worker and no offline mode.

**Technical Notes**:
- Vanilla HTML, CSS and JS only: no frameworks, no build tools (SR-2, SR-3).
- Pages fetch data through the helpers in `api.js`.

---

## 12. Print Styles

The footer's Print button calls `window.print()`.

**What prints**: the main content column (article body, headings, verses, citations, pictures).

**What never prints**: the sidebar and its toggle, the footer, the skip link, the page info row, filters, buttons, search bars, toasts, modals, drawers and any `nav`.

**Visual treatment** — academic research paper style:
- White background, black text (`--color-black`) throughout. No colour accents.
- Font: `Georgia, serif`.
- Body 11pt, `h1` 14pt, `h2` / `h3` 12pt. Headings black and bold.
- Line height 1.5. Page margin `2cm`.
- Verse blocks: indented `1.5cm`, no fill, `2px solid var(--border-strong)` left border.
- Images: inline, at most the page width. Captions 9pt italic.
- Links print as plain black text with no underline and no URL.
- No shadows, no border-radius, no background fills.
- Breakout blocks: inline, no fill, `3px solid var(--border-strong)` left border.
- Body tables: solid black cell borders.
- Timeline, Arbor and Maps: controls hidden; dots, nodes and pins print in black.

**Page breaks**:
- `page-break-inside: avoid` on cards, verse blocks, figures and diagram canvases.
- Two utility classes, `.page-break-before` and `.page-break-inside-avoid`, work on any element.

---

## 13. Admin Page Layouts

The admin uses its own colour tokens (§1 Admin Panel) and typography (§2 Admin Typography). Every page shares one shell. The admin stylesheets are separate from the frontend's (D-017).

**Global Admin Shell** (`.admin-shell`, a grid of `220px` and `1fr`):
- **Sidebar**: `220px`, fixed, full height, `--admin-sidebar-bg`. Links use `--admin-sidebar-text`. Hover: `--admin-sidebar-hover` background. Active: `--admin-sidebar-active` background and a `3px` left border in `--admin-accent`. Group titles are 11px uppercase labels. The sidebar is always visible and has no toggle. A Logout link sits at the bottom.
- **Top bar**: `--admin-surface` with a `1px solid var(--admin-border)` bottom edge, at least `56px` high. Page title (`1.1rem`, weight 600) on the left; action links on the right.
- **Main area**: `--space-lg` (24px) padding, scrolls.
- **Edit pages**: `.admin-form-grid` has a flexible left column and a `320px` right column, with a `24px` gap. Left: the content fields. Right: classification and metadata cards, then the actions "Save Changes", "Publish" or "Unpublish", and "Cancel".

**Pages** (paths under `admin/`):

| Path | Layout |
|---|---|
| `index.html` | Dashboard. A filter bar (Search, Type, Status) over a table of all content: Type badge, Title (links to its edit page), Status badge, Updated. The top bar has an "Open Site" link. |
| `auth/login.html` | Centered card on `--admin-bg`: `max-width: 400px`, `--admin-surface`, `1px solid var(--admin-border)` with a `4px` `--admin-accent` left edge, `16px` radius, `--space-2xl` padding. Title "Admin Sign In" and one "Sign in with Passkey" button. A status line sits below it. `login.html?signedout=1` shows a signed-out message. |
| `auth/register.html` | The same card. "Register Passkey" needs `?setupToken=` in the URL. |
| `evidence/index.html` | Table: Title, Category, Era, Period, Map Location, Status, Edit. Filters above it. |
| `evidence/new.html`, `evidence/edit-[id].html` | Edit-page grid (above). |
| `evidence/bulk.html` | Checkbox table (Title, Category, Era, Status) with "Publish Selected", "Unpublish Selected" and "Delete Selected". Each action asks for confirmation in a browser dialog first. |
| `essays/`, `debate/`, `blog/`, `historiography/` | `index.html` is a table with a "+ New …" button (for example "+ New Essay"). Columns: Essays and Blog show Title, Created, Status, Edit. Debate (responses) shows Title, Challenge, Created, Status, Edit. Historiography shows Title, Period, Created, Status, Edit. `new.html` and `edit-[id].html` use the edit-page grid. Essays, responses and historiography forms have a two-column checkbox (§9). |
| `debate/popular-challenges/`, `debate/academic-challenges/` | The same pattern as above, one folder per challenge type. |
| `collections/index.html`, `identifiers/index.html` | Table with a "+ New …" button. Identifiers columns: ID, Title, External URL, Type, Published, Actions. |
| `resources/index.html`, `resources/<key>.html` | One page per category. A drag-to-reorder list: drag handle, title (editable), URL (editable), description, delete. "+ Add Item" adds a row. "+ Add Subheading" adds a section row (dashed border, `--admin-surface-hover` fill, title only) that groups the items below it on the public page. "Save All Changes" saves the list. |
| `wikipedia/index.html` | Drag-to-reorder rank list: handle, rank position, article title, URL, plus and minus counts. |
| `news/index.html` | Table of link entries. "+ Add Article" opens a modal form. |
| `diagrams/arbor.html`, `timeline.html`, `maps.html` | Canvas editors, each with its own toolbar and side panel and its own stylesheets in `assets/css/admin-diagrams/`. |
| `settings/index.html` | One column, at most `600px` wide: site metadata fields, then a passkey list. |
| `analytics.html` | A row of chips: Last 7, 30 (default) or 90 days. Below: stat cards, then sections for Page Views (Page, Views, Unique, Trend sparkline), External Referrers, Top Countries, Devices, Search Terms and Bot Traffic. Sparklines are inline SVG `<polyline>`s with no chart library. Read-only. Data from `GET /analytics`. |
