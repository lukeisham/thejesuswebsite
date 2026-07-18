_Part of the [Style Guide](INDEX.md) — §10–13: UX patterns, accessibility & technical notes, print styles, admin page layouts._

---

## 10. UX Patterns & Interactions

**Search**:
- Dedicated search page (`/evidence/search.html`), linked from the nav sidebar
- Search input is prominent at the top of the page — full-width, large (h3 scale), auto-focused on load
- Results appear below the input as the user types (debounced, ~300ms)
- Filter chips below the input narrow by entity type (Evidence, Essays, Responses, Blog)
- Highlighted matches use `<mark>` element, styled with `--accent-gold` background, no text color change
- Empty state shown if no results; error state if the API call fails

**Filtering**:
- Instant results (client-side where possible)
- URL sync for shareable filters
- Active filter chips with remove

**Loading States**:
- Skeleton screens for cards/lists
- Spinner for map/data heavy loads

**Empty States**:
- Helpful message + suggested actions

**Error Handling**:
- Friendly 404 / error pages
- Inline validation messages

**Micro-interactions** (minimal):
- Subtle hover lift on cards/buttons (`--duration-fast`)
- Smooth scroll to anchors
- Gentle fade-ins on content load (`--duration-slow`)
- No excessive animations

**Responsiveness**:
- Mobile: stacked layouts, larger tap targets (min 44px)
- Tablet: hybrid
- Desktop: full multi-column where beneficial

---

## 11. Accessibility & Technical Notes

**Accessibility**:
- Semantic HTML (`<nav>`, `<main>`, `<article>`, headings hierarchy)
- ARIA labels where needed
- Keyboard navigation
- Sufficient color contrast (test with tools)
- Alt text on all images
- Focus visible states
- `prefers-reduced-motion` respected (see Animation section)

**Performance**:
- Lazy load images and heavy components
- Optimize images (WebP where possible)
- Inline critical CSS only when necessary for above-the-fold content (HTML-4)
- No external font requests — system font stacks only

**Content Structure**:
- Use schema.org markup where relevant (Article, Event, etc.)
- Clear heading hierarchy
- Consistent slug-based URLs

**PWA / Manifest**:
- Theme color: `#F8F5F0` (`--bg-primary`) — matches the parchment background in browser chrome
- Background color: `#F8F5F0` — used on the splash screen while the PWA loads
- `apple-touch-icon.png`: 180×180px, icon on `--bg-primary` background, no rounded corners (iOS adds them)
- `site.webmanifest` display mode: `browser` (not standalone — the site is a reference resource, not an app)
- No service worker / offline mode in v1

**Technical Notes**:
- Vanilla HTML + CSS + JS only (no frameworks, no build tools — SR-2, SR-3)
- All dynamic data fetched from API via `api.js` fetch helpers
- Evidence cards, filters, map pins, and timeline are the most reused patterns
- Keep visual density balanced — prioritize readability of historical content

---

## 12. Print Styles

Triggered by "Print / Save as PDF" action in the footer.

**What prints**:
- Main content column only (article body, headings, verses, citations, pictures)
- Page title as the document heading

**What never prints**:
- Site header and sidebar navigation
- Footer
- Page info row (metadata panels: related evidence, identifiers, map location, timeline period, categories)
- Filters, related items, metadata panel
- Toasts, modals, drawers
- Any interactive controls (buttons, search bars, filters)

**Visual treatment** — academic research paper style:
- White background, black text (`#000`) throughout — no parchment tones, no colored accents
- Font: `Georgia, serif` for all text (consistent with academic print conventions)
- Font size: 11pt body, 14pt h1, 12pt h2/h3
- Line height: 1.5
- Max width: none — use full page width
- Margins: `2cm` on all sides (standard academic paper margin)
- Headings: black, bold, no color
- Verse blocks: indented `1.5cm` left, no background, border-left `2px solid #888`
- Images: display inline, max-width 100%, with caption below in 9pt italic
- Links: printed as plain text, no underline, no color (`color: #000`). Suppress URL printing with `a[href]::after { content: none; }`.
- No shadows, no border-radius, no background colors
- Breakout/side content: displayed inline as indented block, no background tint

**Page breaks**:
- `page-break-before: always` before major sections on long evidence pages
- `page-break-inside: avoid` on cards, verse blocks, figures

---

## 13. Admin Page Layouts

The admin panel uses its own color tokens (§1 Admin Panel) and typography (§2 Admin Typography). Every admin page shares a fixed two-panel shell.

**Global Admin Shell**:
- **Sidebar**: `220px` wide, fixed, `--admin-sidebar-bg` background. Navigation items: `--admin-sidebar-text`, hover: `--admin-sidebar-active` background, active: `--admin-sidebar-active` + `3px left border var(--admin-accent)`. No hamburger — sidebar is always visible.
- **Main content area**: fills remaining viewport width, `--admin-bg`, `1.5rem` padding, scrollable.
- **Top bar** (within main content area): page title (`h1`, `1.25rem`, `--admin-text-primary`) left; action buttons (e.g. "New Evidence", "Save") right.

---

**Dashboard** (`admin/index.html`):
- **Stats row**: 4 stat cards in a horizontal row (`--admin-surface`, `1px solid var(--admin-border)`, `8px` border-radius). Each card: large number (`2rem`, `--admin-text-primary`), label below (`0.8125rem`, `--admin-text-secondary`). Suggested stats: total published evidence, total drafts, blog posts, page views (last 7 days).
- **Recent drafts table**: admin table (§8) below the stats row — columns: Title, Type, Created, Status badge, Edit link.
- **Quick actions**: "New Evidence Draft", "New Blog Post" — primary button style, top-right of the drafts table.

**Auth** (`admin/auth/`):
- `login.html`: centred card (`400px` max-width, `--admin-surface`, `16px` border-radius, `2px solid var(--admin-border)`, `2rem` padding) on a full-screen `--admin-bg` page. Site name in `h1` above the card. Sole action: full-width "Sign in with Passkey" primary button. Error state: `--error` message below the button.
- Sign-out confirmation: `login.html?signedout=1` — the same login card with a "You have been signed out" message above the button (no separate `logout.html` page).

**Drafts** (`admin/drafts/`):
- `index.html`: full-width table — columns: Type (badge), Title, Created, Updated, Status badge, Edit link. "New Draft" button top-right.
- `new.html` / `edit-[id].html`: two-column layout. Left (~65%): title field, content textarea, headings field, author/date/publisher. Right (~35%): keywords, publish status toggle, related links. "Save Draft" and "Publish" buttons fixed at the bottom of the right column.

**Evidence Management** (`admin/evidence/`):
- `index.html`: filterable table — columns: Title, Category badge, Timeline Period, Map Location, Status, Edit link. Filter dropdowns above for category, timeline era, status.
- `edit-[id].html`: two-column form as Drafts, plus right-column fields for gospel category (dropdown), timeline era + period (cascading dropdowns), map X/Y coordinates, related evidence links, MLA sources.
- `bulk.html`: checkbox list of items; bulk publish/unpublish/delete actions. Destructive actions require a confirmation modal.

**Diagram Editors** (`admin/diagrams/`):
Canvas-based visual editing interfaces. Each reuses the corresponding public render engine with an admin overlay.

- `arbor.html`: full-height canvas (`calc(100vh - top-bar)`). Node CRUD panel slides in from the right on node selection. "Add Node" in the top bar opens a search-to-add dialog. Edge creation: click-drag between nodes. Zoom controls in the bottom bar (identical to public arbor).
- `timeline.html`: horizontal timeline canvas. Events are draggable along the axis. Click an event to open an edit panel (title, date, era). "Add Event" in the top bar opens an evidence-search dialog.
- `maps.html`: map image canvas. Pins are draggable. Click to edit (label, linked evidence). "Add Pin" button + click-on-map to place. Map selector dropdown in the top bar to switch between map levels.

**Resources** (`admin/resources/`):
Per-category pages: drag-to-reorder list (`admin-ranking.js`). Each row: title (inline-editable), URL (inline-editable), description, drag handle left, delete button right. "Add Item" appends a blank row.

**Wikipedia** (`admin/wikipedia/index.html`):
Drag-to-reorder ranked list. Columns: rank position, article title, URL, last revised date, plus/minus counts. Drag handle for reordering.

**Essays / Debate / Blog** (`admin/essays/`, `admin/debate/`, `admin/blog/`):
All three share the same pattern:
- `index.html`: table — Title, Date, Status, Edit link. "New" button top-right.
- `edit-[id].html` / `new.html`: two-column form — content textarea left, metadata right (keywords, publish toggle, linked evidence/sources).

**News** (`admin/news/index.html`):
Table of link entries — Title, URL, Publisher, Date, Status. "Add Article" opens a modal form (simpler than a full edit page; news articles have few fields).

**Settings** (`admin/settings/index.html`):
Single-column form, `600px` max-width: site metadata fields (title, description, default OG image), global config. Standard admin form styling.

**Analytics** (`admin/analytics.html`):
- **Date range toggle**: "Last 7 days", "Last 30 days", "Last 90 days" chips at the top. Updates all panels on selection.
- **Stats row**: 4 stat cards — Total page views, Unique sessions, Top page, Top referrer.
- **Page views table**: sortable — Page URL, View count, % of total. Paginated (50 rows).
- **Sparklines**: small inline SVG trend lines (`<polyline>`, no charting library) next to the top 5 pages, showing view trend over the selected period.
- **Referrers table**: Domain, count, % of total.
- All data from `GET /analytics`. Read-only display.
