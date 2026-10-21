_Part of the [Style Guide](INDEX.md) — §10–13: UX patterns, accessibility & technical notes, print styles, admin page layouts._

---

## §10 UX Patterns & Interactions

### §10.1 Search

`/evidence/search.html`, linked in the sidebar.

| Part | Rule |
|---|---|
| Input | Full width, `--text-h3` text, `56px` high, takes focus on load |
| Updates | Results update as the reader types, `300ms` after the last key. A hint below the input explains quotation marks for exact phrases |
| Type chips | One chip per result type: All, Evidence, Essays, Responses, Blog, News, Bible Verses. `?type=<type>` in the URL preselects a chip |
| Results | Group by type under a heading "Type (count)". Each row has a `64px` thumbnail, the title, a snippet and a type badge |
| Match highlight | `<mark>`: `--accent-gold` background, inherited text colour, `2px` radius |
| States | Separate states for loading, empty input, no results and a failed request |

### §10.2 Filtering

The Evidence list writes its active filter to the URL query, so a filtered view can be shared (§8.9).

### §10.3 Loading states

| Surface | Loading state |
|---|---|
| Detail pages | A shimmering `.skeleton` until data arrives |
| Lists, the Timeline and Maps | A spinner |

### §10.4 Empty states

`.empty-state`: a centered, `--text-muted` message in a block at least `240px` high.

### §10.5 Error states

| Case | Behaviour |
|---|---|
| A failed list load | An error message with a "Try again" button, plus an error toast (§8.18) |
| The 404 page | "404 — Page Not Found" with a "Home" button (primary) and a "Browse Evidence" button (secondary) |

### §10.6 Anchors

The page scrolls smoothly to in-page anchors.

---

## §11 Accessibility & Technical Notes

### §11.1 Accessibility

- Landmarks: `<nav>`, `<main id="main-content">`, `<article>`. Headings follow §5.3: one hidden `h1`, visible headings from `h2`.
- Every `<img>` has an `alt` attribute. A decorative thumbnail beside a title uses `alt=""` (HTML-2).
- Icon-only controls have an `aria-label` (§7.4).
- Keyboard focus shows a `2px solid var(--accent)` outline with a `2px` offset on every element. A few components use a different outline colour for contrast on their own surface.
- Colour is never the only signal. Era tints have labels, grid cells show numbers, and score bands show the score.
- Motion follows the reduced-motion rule in §6.4.

### §11.2 Performance

- Images use `loading="lazy"` or the `data-src` lazy loader.
- Upload WebP where possible.
- Inline critical CSS only when necessary for above-the-fold content (HTML-4).
- No external font requests. The site uses system font stacks only.
- **Upload size**: the server (`POST /uploads`, the single upload route) resizes every image to fit inside a `1440 × 960` box. That is 2× the `720 × 480` standard figure box (§8.3.1), so images stay sharp on retina screens. A smaller image is never enlarged.

### §11.3 Content structure

- Essays, responses and historiography pages carry `schema.org/ScholarlyArticle` JSON-LD. Blog posts carry `schema.org/BlogPosting`.
- Detail pages use slug URLs: `/<section>/<slug>`.

### §11.4 PWA / manifest

`frontend/assets/images/site.webmanifest`, linked from each page head.

| Property | Value |
|---|---|
| `theme_color`, `background_color` | `#F8F5F0` (`--bg-primary`) |
| `display` | `browser`. The site is a reference resource, not an app |
| `apple-touch-icon.png` | `180 × 180px` |
| Service worker, offline mode | None |

### §11.5 Technical notes

- Vanilla HTML, CSS and JS only: no frameworks, no build tools (SR-2, SR-3).
- Pages fetch data through the helpers in `api.js`.

---

## §12 Print Styles

The footer's Print button calls `window.print()`.

### §12.1 What prints

| Prints | Never prints |
|---|---|
| The main content column: article body, headings, verses, citations, pictures | The sidebar and its toggle, the footer, the skip link, the page info row, filters, buttons, search bars, toasts, modals, drawers and any `nav` |

### §12.2 Visual treatment

Academic research paper style.

| Element | Rule |
|---|---|
| Colour | White background, black text (`--color-black`) throughout. No colour accents |
| Font | `Georgia, serif` |
| Sizes | Body 11pt, `h1` 14pt, `h2` / `h3` 12pt. Headings black and bold |
| Spacing | Line height 1.5. Page margin `2cm` |
| Verse blocks | Indented `1.5cm`, no fill, `2px solid var(--border-strong)` left border |
| Images | Inline, at most the page width. Captions 9pt italic |
| Links | Plain black text with no underline and no URL |
| Decoration | No shadows, no border-radius, no background fills |
| Breakout blocks | Inline, no fill, `3px solid var(--border-strong)` left border |
| Body tables | Solid black cell borders |
| Response pages | Strength dots print as black circles: filled solid, empty outlined. Footnote return arrows (`↩`) do not print |
| Timeline, Arbor and Maps | Controls hidden; dots, nodes and pins print in black |

### §12.3 Page breaks

- `page-break-inside: avoid` on cards, verse blocks, figures and diagram canvases.
- Two utility classes, `.page-break-before` and `.page-break-inside-avoid`, work on any element.

---

## §13 Admin Page Layouts

The admin uses its own colour tokens (§1.7) and typography (§2.5). Every page shares one shell. The admin stylesheets are separate from the frontend's (D-017).

### §13.1 Global admin shell

`.admin-shell`, a grid of `220px` and `1fr`.

| Part | Rule |
|---|---|
| Sidebar | `220px`, fixed, full height, `--admin-sidebar-bg`. Links use `--admin-sidebar-text`. Hover: `--admin-sidebar-hover` background. Active: `--admin-sidebar-active` background and a `3px` left border in `--admin-accent`. Group titles are 11px uppercase labels. The sidebar is always visible and has no toggle. A Logout link sits at the bottom |
| Top bar | `--admin-surface` with a `1px solid var(--admin-border)` bottom edge, at least `56px` high. Page title (`1.1rem`, weight 600) on the left; action links on the right |
| Main area | `--space-lg` (24px) padding, scrolls |
| Edit pages | `.admin-form-grid` has a flexible left column and a `320px` right column, with a `24px` gap. Left: the content fields. Right: classification and metadata cards, then the actions "Save Changes", "Publish" or "Unpublish", and "Cancel" |

### §13.2 Pages

Paths under `admin/`.

| Path | Layout |
|---|---|
| `index.html` | Dashboard. A filter bar (Search, Type, Status) over a table of all content: Type badge, Title (links to its edit page), Status badge, Updated. The top bar has an "Open Site" link |
| `auth/login.html` | Centered card on `--admin-bg`: `max-width: 400px`, `--admin-surface`, `1px solid var(--admin-border)` with a `4px` `--admin-accent` left edge, `16px` radius, `--space-2xl` padding. Title "Admin Sign In" and one "Sign in with Passkey" button. A status line sits below it. `login.html?signedout=1` shows a signed-out message |
| `auth/register.html` | The same card. "Register Passkey" needs `?setupToken=` in the URL |
| `evidence/index.html` | Table: Title, Category, Era, Period, Map Location, Status, Edit. Filters above it |
| `evidence/new.html`, `evidence/edit-[id].html` | Edit-page grid (§13.1) |
| `evidence/bulk.html` | Checkbox table (Title, Category, Era, Status) with "Publish Selected", "Unpublish Selected" and "Delete Selected". Each action asks for confirmation in a browser dialog first |
| `essays/`, `debate/`, `blog/`, `historiography/` | `index.html` is a table with a "+ New …" button (for example "+ New Essay"). Columns: Essays and Blog show Title, Created, Status, Edit. Debate (responses) shows Title, Challenge, Created, Status, Edit. Historiography shows Title, Period, Created, Status, Edit. `new.html` and `edit-[id].html` use the edit-page grid. Essays, responses and historiography forms have a two-column checkbox (§9.4.2) |
| `debate/popular-challenges/`, `debate/academic-challenges/` | The same pattern as above, one folder per challenge type |
| `collections/index.html`, `identifiers/index.html` | Table with a "+ New …" button. Identifiers columns: ID, Title, External URL, Type, Published, Actions |
| `resources/index.html`, `resources/<key>.html` | One page per category. A drag-to-reorder list: drag handle, title (editable), URL (editable), description, delete. "+ Add Item" adds a row. "+ Add Subheading" adds a section row (dashed border, `--admin-surface-hover` fill, title only) that groups the items below it on the public page. "Save All Changes" saves the list |
| `wikipedia/index.html` | Drag-to-reorder rank list: handle, rank position, article title, URL, plus and minus counts |
| `news/index.html` | Table of link entries. "+ Add Article" opens a modal form |
| `diagrams/arbor.html`, `timeline.html`, `maps.html` | Canvas editors, each with its own toolbar and side panel and its own stylesheets in `assets/css/admin-diagrams/`. In the timeline editor a dot follows the pointer while you drag it, at any zoom, and stays inside its own period. Titles move out of each other's way as you drag and keep a leader line from the start of the name to the dot. The editor always shows exact dots, never stacks. The Save button shows the number of staged moves. A click on a dot opens its panel, a drag does not. Headings sit in the same band as on the public timeline (§8.7.1) |
| `settings/index.html` | One column, at most `600px` wide: site metadata fields, then a passkey list |
| `analytics.html` | A row of chips: Last 7, 30 (default) or 90 days. Below: stat cards, then sections for Page Views (Page, Views, Unique, Trend sparkline), External Referrers, Top Countries, Devices, Search Terms and Bot Traffic. Sparklines are inline SVG `<polyline>`s with no chart library. Read-only. Data from `GET /analytics` |
