# The Jesus Website — UI/UX & Style Guide

**Purpose**: Consistent, professional, archival-style website for historical evidence about Jesus. Clean, readable, serious, scholarly tone. High information density with excellent readability.

**Target Users**: Curious readers seeking structured historical data.

**Core Principles**:
- Clarity over decoration
- Strong information hierarchy
- Fast, predictable navigation
- Mobile-first responsive
- Accessible (WCAG 2.2 AA)
- Minimal animation (subtle only)

---

## 1. Color Palette

**Primary Background**
`--bg-primary: #F8F5F0` (warm off-white / parchment)

**Surface / Cards**
`--bg-surface: #FFFFFF`
`--bg-surface-alt: #F1EDE4`

**Text**
`--text-primary: #2C2522` (dark charcoal-brown)
`--text-secondary: #5C524A`
`--text-muted: #7A7066`

**Accent**
`--accent: #5C4033` (warm brown)
`--accent-light: #8B5A2B`
`--accent-gold: #B8976A` (subtle highlights)

**Links**
`--link: #5C4033`
`--link-hover: #3D2B1F`

**Status / Highlights**
`--success: #3D5A3D`
`--warning: #8B6F3D`
`--error: #8B3D3D`
`--info: #3D4F6B`

**Borders & Dividers**
`--border: #D4C9B8`
`--border-strong: #B8A48A`

**Admin Panel**
`--admin-bg: #F4F6F8`
`--admin-sidebar-bg: #2C3E50`
`--admin-sidebar-text: #ECF0F1`
`--admin-sidebar-active: #3D5A78`
`--admin-accent: #3D5A78` (slate blue)
`--admin-accent-hover: #2C4A68`
`--admin-border: #DDE1E7`
`--admin-surface: #FFFFFF`
`--admin-text-primary: #2C3340`
`--admin-text-secondary: #5A6472`

**Dark Mode (optional future)**: Invert palette with dark parchment tones.

---

## 2. Typography

**Font Stack**:
- Headings: `Georgia, serif` or system serif
- Body: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Monospace (verses, code): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`

**Scale** (rem):
- `h1`: 2.25rem (36px) — weight 700
- `h2`: 1.75rem (28px) — weight 600
- `h3`: 1.375rem (22px) — weight 600
- `h4`: 1.125rem (18px) — weight 600
- Body: 1rem (16px) — weight 400, line-height 1.65
- Small: 0.875rem (14px) — weight 400, line-height 1.5
- Links: inherit size from context — weight 500

**Admin Typography** (condensed for data-dense UI):
- Headings: same sans-serif as body (`system-ui` stack) — no serif in admin
- Body: 0.9375rem (15px) — weight 400, line-height 1.5
- Small / Labels: 0.8125rem (13px) — weight 500, uppercase tracking for section labels

**Rules**:
- Max line length: 70–75 characters
- Generous line height on long text
- Verse references: bold + small caps or distinct styling

---

## 3. Layout & Spacing

**Container**:
- Max-width: `1280px`
- Padding: `1rem` (mobile), `1.5rem` (tablet), `2rem` (desktop)
- Centered with side margins

**Grid**:
- 12-column CSS Grid or Flexbox
- Gutter: `1.5rem`
- Card gap: `1.5rem`

**Spacing Scale** (use consistently):
- `--space-xs`: 0.25rem
- `--space-sm`: 0.5rem
- `--space-md`: 1rem
- `--space-lg`: 1.5rem
- `--space-xl`: 2rem
- `--space-2xl`: 3rem
- `--space-3xl`: 4rem

**Sections**:
- Generous vertical padding (`3rem`–`4rem`)
- Clear visual separation with subtle borders or background tints

---

## 4. Responsive Breakpoints

Mobile-first: base styles target smallest screens; breakpoints add complexity upward.

```css
/* xs — small phones */
@media (min-width: 360px) { }

/* sm — large phones, landscape phones */
@media (min-width: 480px) { }

/* md — tablets portrait */
@media (min-width: 768px) { }

/* lg — tablets landscape, small laptops */
@media (min-width: 1024px) { }

/* xl — desktops */
@media (min-width: 1280px) { }

/* 2xl — wide / high-res monitors */
@media (min-width: 1536px) { }
```

**Key layout shifts**:
- `< 768px`: single column, hamburger button visible, nav sidebar hidden off-canvas, cards full width
- `768px–1023px`: 2-column cards, nav sidebar collapsed to icon-only rail, content takes remaining width
- `≥ 1024px`: full multi-column, nav sidebar expanded with labels, content flows alongside
- `≥ 1280px`: max-width container kicks in, no further layout changes

**Touch targets**: minimum `44px × 44px` for all interactive elements on touch devices.

---

## 5. Navigation

**Sidebar**:
- **Width**: `260px`
- **Background**: `--bg-surface`
- **Hover state**: `--bg-surface-alt` background on hovered item
- **Active state**: `--accent` left border (`3px`) + `--bg-surface-alt` background
- **Sub-navigation**: Evidence, Timeline, Maps, and Debate expand on click (not hover) to reveal nested sub-pages
- Hamburger menu toggle (default closed on `index.html` and backend, default open everywhere else)
- Sections:
  - The Jesus website (returns to `index.html`)
  - Evidence
  - Search
  - Arbor diagram
  - Timeline
  - Maps
  - Context
  - Debate
  - News
  - About

**Footer** (universal, not present on index.html/home page):
- Left aligned: copyright ©, licence info, date of most recent update
- Right aligned: Print, Copy Contents, Copy URL buttons

**Invisible Header (SEO & Accessibility)**:
There is no visible top header bar. All pages use a visually hidden `<header>` for document structure and accessibility only.
- Styled with `.sr-only` (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap`) — zero visual footprint.
- Contains a **skip-navigation link** (`<a class="skip-link" href="#main-content">Skip to content</a>`): appears at the top-left of the viewport on keyboard focus only, using `--accent` background and white text, `--duration-fast` transition.
- Contains the true `<h1>` for each page. Visible headings begin at `<h2>` so heading hierarchy is correct for SEO without visible duplication.
- Contains **breadcrumb JSON-LD** (`schema.org/BreadcrumbList`) injected by `seo.js` — not visible to sighted users.
- CSS in `base/invisible-header.css`: defines `.sr-only` utility and the skip-link focus state only.

---

## 6. Animation & Transitions

Philosophy: transitions aid perception, never slow the user down. Scholarly content should feel stable and deliberate, not playful.

**Timing values**:
- `--duration-fast: 150ms` — hover states, button feedback, icon swaps
- `--duration-base: 250ms` — modals appearing, drawer sliding, card hover lift
- `--duration-slow: 400ms` — page-level fades, skeleton → content swap

**Easing**:
- `--ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94)` — elements entering (feel natural)
- `--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1)` — toggles, drawers (smooth both ways)
- Never use `linear` for UI transitions; never use bouncy/spring easings

**Rules**:
- Card hover lift: `transform: translateY(-2px)` over `--duration-fast` with `--ease-out`
- Modal open: fade-in + slight scale `0.97 → 1` over `--duration-base`
- Skeleton screen → content: opacity fade over `--duration-slow`
- No animation on text or layout reflows (causes jank)
- `prefers-reduced-motion`: wrap all transitions in a check; serve instant states if set

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Icon System

**Library**: Feather Icons (MIT, SVG-based, clean minimal stroke style)
- Matches the scholarly, uncluttered tone of the site
- Consistent 24px artboard, 2px stroke weight

**Delivery**: Download the Feather icon set and build a single SVG sprite file at `frontend/assets/images/feather-sprite.svg`. Reference icons via `<use href="/assets/images/feather-sprite.svg#icon-name">`. No CDN, no font files, no runtime JS dependency — one HTTP request cached for the session (SR-2, SR-3).

**Sizing**:
- `--icon-sm: 16px` — inline with text, badges, breadcrumb separators
- `--icon-md: 20px` — buttons, nav items, form field icons (default)
- `--icon-lg: 24px` — standalone actions, empty state illustrations
- `--icon-xl: 32px` — feature icons on landing/about page

**Color**:
- Icons inside buttons: inherit button text color
- Standalone icons: `--text-secondary` by default
- Active / hover icons: `--accent`
- Muted / disabled icons: `--text-muted`

**Usage rules**:
- Always pair an icon with a visible text label on public-facing UI (accessibility)
- Icon-only controls must have `aria-label` or `title`
- Never scale icons with `font-size`; use `width` / `height` on the SVG

---

## 8. Core Components

### Buttons
- Primary: `--accent` bg, white text, subtle shadow
- Secondary: outline with `--accent`
- Ghost: text only with hover underline
- Size variants:
  - **sm**: padding `0.375rem 0.75rem`, font-size `0.8125rem`
  - **md** (default): padding `--space-sm --space-md`, font-size `0.875rem`
  - **lg**: padding `--space-md --space-lg`, font-size `1rem`
- Border-radius: `4px` (all sizes)
- Font-weight: `500`
- Disabled: muted colors + `not-allowed` cursor

### Cards (Evidence, Blog, etc.)
- White background
- Subtle shadow: `0 2px 8px rgba(0,0,0,0.08)`
- Rounded corners: `8px`
- Padding: `1.5rem`
- Hover: lift + stronger shadow (subtle, `--duration-fast`)
- Image top (if present) → content below

### Pictures / Figures
- **Border**: `1px solid var(--border)` with `4px` border-radius — matches card/form field styling
- **Caption**: directly below the image with `--space-sm` gap, `0.875rem` italic, `--text-secondary` color — consistent with the Small type scale
- **Figure numbering**: sequential per page, reset per page (not per section), injected by JS at render time so HTML stays clean and numbering remains correct if pictures are added/removed
- **Semantic markup**: `<figure>` / `<figcaption>` required, `alt` attribute required on all images
- **Infinite scroll**: figure numbering must re-run after each new batch of content is inserted into the DOM — call the numbering function from the infinite scroll callback, not just on initial page load
- **Print**: border removed, `9pt` italic, inline at full width — consistent with the academic paper print rules in §12

### Thumbnails (News Articles)
- **Size**: `80px × 80px` (fixed square) — small enough to sit beside text without overwhelming the card, `flex-shrink: 0` prevents squashing
- **Fit**: `object-fit: cover` — fills the square without distortion
- **Border radius**: `var(--radius-sm)` — subtle rounding, sits inside the card row
- **Layout**: side-by-side row — thumbnail on the left, title + description in a `.news-card-body` flex column on the right, badges and date below the row
- **Row wrapper**: `.news-card-row` uses `display: flex; gap: var(--space-md); align-items: flex-start`
- **Empty state**: `var(--bg-surface-alt)` fill with `1px dashed var(--border)` — a visible placeholder square when no thumbnail is uploaded
- **Caption**: none — thumbnails are decorative and never have captions
- **Semantic markup**: `aria-hidden="true"` on empty-placeholder divs; real images use `alt=""` with `loading="lazy"`
- **Admin**: uses the shared `AdminImagePicker` widget (same component as blog hero images, challenge pictures) uploading through the `/uploads` endpoint

### Evidence Card
- Title (h3)
- Short description
- Primary verse (styled)
- Badges: category, timeline period, location (see Content Badges below)
- "View Details" button

### Content Badges (public-facing)
Used on evidence cards and detail pages to label category, timeline period, and map location. Distinct from admin Status Badges.

- Background: `--bg-surface-alt` (`#F1EDE4`)
- Border: `1px solid var(--border)`
- Text: `--text-secondary`, `0.75rem`, weight 500
- Border radius: `4px`
- Padding: `2px 8px`
- No uppercase — use the value as-is from the database (e.g. "Galilee", "beginning", "event")
- Displayed inline, wrapping if multiple badges present
- No hover state — badges are labels, not links

### Timeline
**Linear dot-style timeline with clustered events:**
- **Main axis**: horizontal line (timeline spine) spanning the full viewport width, positioned at vertical center
- **Visual spine**: thin line (`1px solid var(--border)`) representing chronological progression
- **Dots**: event markers positioned along the timeline spine, sized by importance or density
  - Standard dot: `12px` diameter, `var(--bg-surface)` fill, `1px solid var(--border)` stroke
  - Highlighted/root event dot: `14px` diameter, `var(--accent)` fill, `2px solid var(--accent)` stroke
  - Hover state: grows to `18px` with shadow `0 2px 8px rgba(0,0,0,0.12)`
- **Clustering**: when multiple events occur in same era, dots stack vertically above/below the spine in a compact cluster (staggered pattern)
- **Labels**: event title appears above or below the dot (depending on space); smaller secondary text below title shows date range and location
- **Interactions**:
  - Click a dot → open modal or navigate to evidence detail page
  - Hover a dot → show tooltip with full event name, date, and category badge
  - Hover near a cluster → highlight all dots in the cluster together
- **Era markers**: subtle vertical divisions at major era boundaries (e.g., "Birth", "Ministry", "Passion Week") with era label above or below the spine
- **Filter/zoom**: 
  - Era filter chips above the timeline to isolate periods (e.g., "All Eras", "Ministry Begins", "Passion Week")
  - Timeline remains continuous; filtered eras show their dots while others fade to `opacity: 0.3`
  - Draggable scroll on mobile; horizontal scroll bar on desktop if timeline overflows viewport
- **Scrolling**: timeline extends beyond viewport width; use `overflow-x: auto` with momentum scrolling on mobile
- **Empty state**: if no events in selected era, show centered message "No events in this period"

### Map
- Clean base map
- Pins with labels
- Hover: highlight evidence card
- Click pin: navigate to evidence detail page

### Filters
- Filter bar sits at the top of the main content area, below the page heading
- Chips for categories, eras, locations — displayed in a single wrapping row
- Multi-select supported
- Clear filters button (ghost style, only visible when a filter is active)
- Live results count updates as filters change

### Modals / Drawers
- Centered modal for evidence details
- Slide-in drawer for mobile
- Close on backdrop click or ESC
- Open: fade-in + scale `0.97 → 1` over `--duration-base`

### Tables
- Clean borders
- Alternating row colors (subtle)
- Sticky header on scroll
- Responsive: horizontal scroll or card conversion on mobile

### Forms
- Clean inputs with labels
- Focus ring: `2px solid var(--accent)` with `2px offset`
- Error states: `--error` border + message below field
- Disabled: `0.5` opacity + `not-allowed` cursor
- Placeholder text: `--text-muted`

### Status Badges (Admin only — frontend only shows published content)
Admin-use only — the public frontend never shows draft or publish state.

- **Published**: `--success` green background (light tint), dark green text, `0.75rem` font, `4px` rounded
- **Draft**: `--admin-border` gray background, `--admin-text-secondary` text, same sizing
- Badge padding: `2px 8px`
- Used in: admin tables, draft lists, publish confirmation UI

### Breadcrumbs
- Font size: `0.875rem` (small)
- Text color: `--text-muted` for ancestors, `--text-primary` for current page
- Separator: `/` in `--text-muted`, margin `0 0.5rem`
- Hover on ancestor links: `--link-hover` color, no underline by default → underline on hover
- No truncation on desktop; truncate middle segments on mobile if > 4 levels

### Breakout / Side Content
Used for supplementary information within long-form content (timelines, sidebars, call-outs).

- Background: `--bg-surface-alt` (`#F1EDE4`)
- Left border: `3px solid var(--accent-gold)`
- Border radius: `4px`
- Padding: `var(--space-md) var(--space-lg)`
- Margin: `var(--space-lg) 0`
- Title: `h4` sizing, `--accent` color
- Body text: standard body, `--text-secondary`
- Collapsible variant: chevron icon right-aligned, `--duration-base` expand animation

### Infinite Scroll
Used on all long list pages (resources, challenges, blog, news, evidence list).

- Load next page automatically when user scrolls within `300px` of bottom
- Show a single centered loading spinner (`--text-muted` color, 24px Feather `loader` icon, spinning)
- When all items are loaded: show "All [N] items loaded" in `--text-muted` small text, centered
- No numbered pagination anywhere on the public site
- Maintain scroll position on browser back (use `sessionStorage` to cache loaded items + position)

### Toasts / Notifications
- **Position**: bottom-center of viewport, `24px` above bottom edge
- **Width**: `min(360px, calc(100vw - 2rem))` — fits mobile and desktop
- **Stacking**: new toasts appear above older ones (stack upward), max 3 visible at once; oldest auto-dismissed when limit exceeded
- **Auto-dismiss**: 4 seconds for success/info; 7 seconds for warning/error (longer because action may be needed)
- **Animation**: slide up from bottom + fade in on appear (`--duration-base`); fade out on dismiss (`--duration-fast`)
- **Manual dismiss**: ✕ button (Feather `x` icon, 16px) on every toast
- **Variants**:
  - Success: `--success` left border (4px), `--bg-surface` background
  - Error: `--error` left border, `--bg-surface` background
  - Warning: `--warning` left border, `--bg-surface` background
  - Info: `--info` left border, `--bg-surface` background
- Shadow: `0 4px 16px rgba(0,0,0,0.12)`
- Border radius: `8px`
- Padding: `var(--space-md) var(--space-lg)`

---

## 9. Content-Specific Patterns

**Home / index.html**:
- Single column, centre-aligned text throughout
- Hero image at the top (full-width, no border-radius, image fills the width)
- Below hero: site title and tagline in large serif, centred
- Content sections stack vertically with generous vertical spacing (`--space-3xl` between sections)
- No footer on this page; nav sidebar is closed by default
- No breadcrumbs

**Evidence Detail Page**:
- Hero: title + primary verse
- Main content column (wide), single column layout
- Sections in order: Description, Timeline Context, Pictures, Sources
- **Page info row**: a full-width row above the footer containing metadata panels — related evidence, identifiers, map location, timeline period, categories. Uses a multi-column horizontal layout on desktop, stacked on mobile. Background: `--bg-surface-alt`, top border: `1px solid var(--border)`, padding: `var(--space-xl) var(--space-lg)`.
- Arbor diagram rendered inline within the content column where relevant

**Contextual Essays (Journal Article Format)**:
Essays render as professional peer-reviewed journal articles. Every essay page uses `<article>` as its root element (HTML-1) with `schema.org/ScholarlyArticle` markup for SEO and structured data (see §11).

**Shared stylesheet**: Contextual Essays, Response Pages, and Historiography Pages all share a single `journal.css` stylesheet. The sections for Response Pages and Historiography Pages below note only what differs from Essays.

- **Page header — title block**: centred, no hero image. Contains, in order:
  - **Title**: `h1`, serif (`Georgia` stack), `--text-primary`, centred. No subtitle.
  - **Byline**: `--text-secondary`, `0.9375rem`, centred. Format: "Luke Isham" on its own line, line-height `1.4`. If an author bio exists in the essay row, render it below the name in `0.8125rem`, `--text-muted`, italic, up to 2 lines then truncate with ellipsis.
  - **Publication date**: `--text-muted`, `0.8125rem`, centred. Format: "Published 15 June 2025" (long-form date, localised). If the essay has a `version_update` column, append " · Revised 22 March 2026" in the same style.
  - **DOI / citation line** (optional): `0.75rem`, `--text-muted`, centred, above the abstract. Format: "DOI: 10.xxxx/xxxx" or a suggested citation string. Rendered only if the essay row supplies this data.
  - **Abstract**: visually distinct block after the byline/DOI. Full-width, `--bg-surface-alt` background, `1px solid var(--border)`, `8px` border-radius, padding `var(--space-lg)`. Label "Abstract" as `h4`, weight `600`, `--text-primary`. Abstract body in `0.9375rem`, `--text-secondary`, line-height `1.65`. Max-width matches the reading column. No italics — read like the journal itself.
  - **Keywords**: below the abstract. Label "Keywords:" in `0.75rem`, weight `600`, `--text-secondary`, followed by comma-separated keyword badges using the Content Badge component (see §8). Keywords come from the essay's `metadata_keywords` column (semicolon-delimited in the database — split and render each as a badge). Displayed inline on one line, wrapping if needed. No row displayed if `metadata_keywords` is empty.

- **Reading column**: single-column, max-width `680px` (72–78 characters per line), centred on the page with auto margins. On screens ≥ `1536px`, the column widens slightly to `720px` to use available space without losing readability. All body content sits within this column.

- **Two-column layout (≥1280px)**: optional upgrade for dense academic text. When enabled (essay row flag `two_column = 1`), the reading area switches to a two-column CSS `column-count: 2` layout with `column-gap: var(--space-2xl)` and `column-rule: 1px solid var(--border)`. Abstract and header remain single-column. Figures and block quotes span both columns (`column-span: all`). Headings stay in the natural column flow. Turned off below `1280px` — reverts to single column.

- **Section headings**: numbered hierarchically. Render numbering via CSS counters, not hardcoded in content:
  - Top-level sections: `h2`, numbered "1", "2", "3"… (`counter-reset` on the article, `counter-increment` on each `h2`). Font: serif (`Georgia`), `1.75rem`, weight `600`, `--text-primary`. Margin-top `var(--space-2xl)`, margin-bottom `var(--space-md)`.
  - Subsections: `h3`, numbered "1.1", "1.2", "2.1"… (nested counter). Font: serif, `1.375rem`, weight `600`, `--text-primary`. Margin-top `var(--space-xl)`, margin-bottom `var(--space-sm)`.
  - Sub-subsections: `h4`, numbered "1.1.1", "1.1.2"… Font: serif, `1.125rem`, weight `600`, `--text-secondary`. Margin-top `var(--space-lg)`, margin-bottom `var(--space-xs)`.
  - A "References" or "Bibliography" heading at the end is never numbered — use the class `.unnumbered` to skip the counter.
  - Numbering appears before the heading text, separated by a tab or en-space, in `--accent` color. Example: "1 Introduction", "2.3 Manuscript Evidence".

- **Body text**: `1rem`, `system-ui` stack, line-height `1.7` (slightly more generous than the default `1.65` for long-form academic reading), `--text-primary`. Paragraphs separated by `margin-bottom: var(--space-md)`. First paragraph after a heading has no indent.

- **Block quotes**: distinct from verse blocks (§9, Verse & Code Blocks). Block quotes use:
  - Left border: `3px solid var(--accent-light)` (not the gold verse border).
  - Italic body text, `--text-secondary`.
  - Padding: `var(--space-md) var(--space-lg)`.
  - Margin: `var(--space-lg) 0`.
  - Background: transparent (no fill — journals rarely fill block quotes).
  - Attribution line below: `— Source Name, Title` in `0.8125rem`, `--text-muted`, not italic, preceded by an em-dash.
  - Semantic markup: `<blockquote>` with an optional `<footer>` or `<cite>` for the attribution.

- **Figures**: use the Pictures / Figures component (§8) with journal-style caption placement. Figure numbering is sequential across the entire essay (not per section), matching the `fig.` counter pattern from the content guide. Figures can optionally float to the side (`--breakout-right` or `--breakout-left`) on screens ≥ `1024px` with a max-width of `320px` — the breakout component (§8, Breakout / Side Content) handles this.

- **Footnotes**: 
  - Inline markers: superscript numbers (`<sup>`) linked via `id`/`href` to the footnote list at the bottom. Rendered by the `templates.js` utility from essay body content containing footnote anchors (e.g., `[^1]` or a custom marker format in the essay text).
  - Footnote list: at the bottom of the article, inside a `<footer>` element before the bibliography. Rendered as an ordered list with `0.8125rem`, `--text-secondary`, line-height `1.5`. Each item is a `<li>` with an `id` matching the superscript link, allowing click-to-return navigation.
  - Divider: a `1px solid var(--border)` horizontal rule separates the essay body from the footnote section, with `var(--space-lg)` margin above and below.

- **Bibliography / References**: 
  - Heading: `h2.unnumbered` — "References" or "Bibliography".
  - Entries: hanging-indent list. Each entry in `0.875rem`, `--text-secondary`, line-height `1.6`. Use `text-indent: -1.5rem` with `padding-left: 1.5rem` on each `<li>` to create the hanging indent. No bullets or numbers.
  - Entry format: MLA-style as stored in the database (`mla_sources` table linked to the essay). Italicise book/journal titles, quote article titles. Separate author, title, publisher, date with periods and spaces as per MLA conventions.
  - If the essay has no linked sources, omit the entire references section.

- **Print** (see §12 for full print rules):
  - Two-column layout preserved if the essay uses it.
  - Abstract loses its background fill — border remains.
  - Figures span full page width.
  - Footnotes become true page-footnotes (CSS `footnote` not widely supported — fall back to endnotes at the article's end).
  - Bibliography entries reduce to `0.75rem` / `9pt`.

- **Empty state**: if the essay body is null or empty, show a centred message: "This essay is forthcoming." in `--text-muted`, centred in the reading column.

**Timeline View**:
- **Page header**: title "Timeline", description explaining the linear visualization
- **Filter section**: era filter chips above the timeline (all eras shown by default; clicking a chip highlights/isolates that era, others fade to 30% opacity)
- **Main timeline container**: 
  - Horizontal scrollable container with `overflow-x: auto` and momentum scrolling on mobile
  - Full height `200px` or `280px` (accounting for label space above/below dots)
  - Background: `var(--bg-primary)` with subtle dot grid (see Arbor Diagram pattern for grid overlay)
  - Vertical center line: `1px solid var(--border)` representing chronological progression
- **Event dots**: positioned along the center line
  - Standard: `12px` diameter, centered on timeline spine
  - Clustered events: dots stack vertically at small offsets (e.g., ±8px, ±16px from center) to avoid overlap
  - Each dot is clickable; cursor becomes pointer on hover
  - Tooltip on hover shows: event title, date range, location badge
- **Era markers**: vertical dividing lines at major era boundaries with era label (`h4` size, `--accent` color) positioned above the spine
- **Bottom detail panel** (optional, revealed on hover or click):
  - Appears below the timeline as a floating card
  - Shows selected event's title, date, location, primary verse, and "View Details" button
  - Positioned fixed at bottom of viewport or inline below timeline depending on available space
  - Dismisses when clicking elsewhere or pressing ESC
- **Responsive**: 
  - Desktop: horizontal timeline with labels above/below dots, full width
  - Tablet (< 1024px): timeline remains horizontal, fonts reduce to `0.85rem`
  - Mobile (< 768px): timeline scrolls horizontally; dots `10px` diameter; labels stack or abbreviate (e.g., "Birth 5 BCE" instead of full text)

**Map View**:
- Full-width map
- Filterable pins
- Linked evidence opens in a new tab

**Popular Challenges & Academic Challenges (Ranked Lists)**:

Two separate ranked list pages (`popular-challenges.html` and `academic-challenges.html`) using the same layout.

- **Page header**: `h1` page title, brief descriptive paragraph in `--text-secondary` below.
- **Filter bar**: category filter chips (§8 Filters) immediately below the header.
- **Ranked list**: single column, max-width `800px`, centred. Each card:
  - **Rank number**: `2rem`, `--text-muted`, `font-weight: 300`, left-aligned
  - **Title** (`h3`, linked to challenge detail), **Summary** (up to 3 lines, `line-clamp: 3`, `--text-secondary`)
  - **Category badge** bottom-left; **response count** bottom-right (`0.8125rem`, `--text-muted`, e.g. "3 responses")
  - **Ranking indicators**: `+` pluses / `−` minuses counts in `--success` / `--error`, `0.8125rem`
- **Infinite scroll**: standard (§8)

*Challenge detail page*: title as `h1`, category badge below, body text in a single reading column (`680px` max-width). A linked list of associated responses appears at the bottom under an `h2` "Responses" heading, each as a compact card (title, author, date, "Read response" link).

*Response Pages (Journal Article Format)*:
Responses share `journal.css` and render identically to Contextual Essays. Every response page uses `<article>` as its root element with `schema.org/ScholarlyArticle` markup. The following rules are **identical** to Contextual Essays and apply in full: reading column, two-column layout option, section headings, body text, block quotes, figures, footnotes, bibliography, and print rules.

- **Page header — title block**: identical to Essays — centred, no hero image. Title (`h1`, serif, centred), byline, publication date, optional DOI/citation line, abstract block, keywords row — all in the same format and sizing as Essays.

- **Challenge reference**: directly below the keywords row (or below the byline if no abstract exists), a labelled inset row reading "In response to:" followed by a linked card showing the challenge title and a brief excerpt. Background: `--bg-surface-alt`, border: `1px solid var(--border)`, `4px` border-radius, padding: `var(--space-sm) var(--space-md)`. The challenge title is a `--link`-colored link. Margin-bottom: `var(--space-xl)` before the article body begins.

- **Strength indicator**: if a scholarly weight or rating score is stored, render it below the challenge reference row — label "Strength:" followed by a 5-point dot indicator (filled dots in `--accent`, unfilled in `--border`). Font: `0.8125rem`, `--text-muted`. Omit the row if no rating data exists.

- **Reading column, headings, body text, block quotes, figures, footnotes, bibliography**: identical to the Contextual Essays specification above — no deviations.

- **Print**: same rules as Essays.

- **Empty state**: "This response is forthcoming." centred in `--text-muted` within the reading column.

**Historiography Pages (Journal Article Format)**:
Historiography pages share `journal.css` and render identically to Contextual Essays in every structural and typographic respect. Apply every rule from the Contextual Essays section in full — page header/title block, reading column, two-column layout option, numbered section headings, body text, block quotes, figures, footnotes, bibliography, and print rules.

- **Listing page**: the historiography index (`frontend/debate/historiography.html`) uses the **ranked-list card pattern** (§10 — same as `popular-challenges.html` and `academic-challenges.html`). The card-based ranked-list layout groups items by rank and renders each as a linked card with title and excerpt; it does **not** use `journal.css`. Only the individual *detail* pages use the journal-article format described below.

- **Page header — title block**: centred, no hero image. Title (`h1`, serif, centred), byline, publication date, optional DOI/citation line, abstract block, keywords row — all in the same format and sizing as Essays.

- **Schema markup**: `schema.org/ScholarlyArticle` with an additional `about` property pointing to the relevant subject (`Person`, `Event`, or `Place`) where schema data is available.

- **Reading column, headings, body text, block quotes, figures, footnotes, bibliography**: identical to the Contextual Essays specification — no deviations. The page is visually indistinguishable from an essay to the reader.

- **Print**: same rules as Essays.

- **Empty state**: "This historiography article is forthcoming." centred in `--text-muted` within the reading column.

**Blog Posts**:
Blog posts use a warmer, magazine-style layout — less formal than Essays, Responses, or Historiography pages. No `schema.org/ScholarlyArticle` markup; use `schema.org/BlogPosting` instead.

- **Page header**: left-aligned (not centred). Contains, in order:
  - **Category tag**: a single Content Badge (§8) above the title, left-aligned.
  - **Title**: `h1`, serif (`Georgia` stack), `--text-primary`, left-aligned, `2.25rem` (same scale as Essays but left-aligned, not centred).
  - **Byline row**: author avatar (24px circle, `border-radius: 50%`, `1px solid var(--border)`) + author name + separator dot + publication date, all on one line. `--text-secondary`, `0.875rem`. No abstract, no DOI, no keywords section.
  - **Hero image**: full-width within the content column, below the byline. `8px` border-radius, max-height `480px`, `object-fit: cover`, `margin-bottom: var(--space-xl)`.

- **Reading column**: `720px` max-width (wider than essay — blog prose is less dense). Centred with auto margins.

- **Section headings**: `h2` and `h3` only — **not numbered**. Same serif font as Essays. Generous top margin (`var(--space-xl)`); no hierarchical counter system.

- **Body text**: `1rem`, `system-ui` stack, line-height `1.7`, `--text-primary`. Same as Essays.

- **Pull quotes**: distinct callout for emphasis — centred text, `1.25rem`, `--accent` color, italic, no border, margin `var(--space-xl) var(--space-md)`. Used sparingly. Distinct from block quotes and not used in Essays.

- **Block quotes**: same as Essays (left border `3px solid var(--accent-light)`, italic, `--text-secondary`, transparent background).

- **Images**: same Figure component (§8); images may appear anywhere in the content, not only as a top hero.

- **No footnotes**: use inline parenthetical references if needed; no superscript footnote system, no footnote list.

- **No bibliography**: if sources are needed, a simple "Further Reading" section at the end — `h3` heading (unnumbered), unordered list, `0.875rem`, `--text-secondary`, no hanging indent, no MLA formatting requirement.

- **Tags row**: below the article body. Label "Tags:" in `0.8125rem`, weight `600`, `--text-muted`, followed by Content Badge components for each tag. Displayed inline, wrapping if needed.

- **Empty state**: "This post is coming soon." centred in `--text-muted`.

**News & Blog Landing**:
The `news-and-blog/index.html` page is a mixed landing page aggregating blog posts and news articles.

- **Page header**: `h1` "News & Blog". Below it, three toggle chips: "All", "Blog", "News" — filtering the list without a page reload. Active chip: `--bg-surface-alt` background, `1px solid var(--accent)` border.
- **Card list**: single column, max-width `760px`, centred, infinite scroll (§8). Each card:
  - **Type badge** — "Blog" or "News" — Content Badge (§8) top-left of the card, before the title
  - Title (`h3`, linked), author/publisher + date row in `--text-muted`, `0.8125rem`
  - First 2 lines of body excerpt (blog) or "from [publisher]" (news), `--text-secondary`
- **Hero promotion**: items with `landing_page_display = 1` render as a full-width hero card at the top of the list — larger title (`h2`), hero image at full card width if present. Maximum one hero at a time.
- **Empty state**: "Nothing here yet." centred

**News Articles**:
News articles are curated external links. The individual `[slug].html` page presents article metadata and routes the reader to the original source — it is not a reading destination itself.

- **Layout**: single-column, `760px` max-width, centred.
- **Page header**: title (`h1`, serif, `--text-primary`), publisher + author + date row in `--text-muted`, `0.875rem`.
- **External link row**: a `--bg-surface-alt` inset block (Breakout component styling, §8) containing the source URL as a prominent link with a Feather `external-link` icon. Label: "Read at [publisher name]". This is the primary action on the page.
- **Summary**: brief description as standard body text, if stored. Omitted if empty.
- **Keywords**: Content badge row (§8) if `metadata_keywords` is present.
- **Back link**: "← Back to News" ghost link above the header.
- **No footnotes, no bibliography, no journal formatting.**

**Wikipedia Ranked List**:
A single ranked list page (`debate/wikipedia.html`) showing Wikipedia articles about Jesus, ranked for quality and relevance.

- **Page header**: `h1` "Wikipedia Articles", brief explanatory paragraph below.
- **Ranked list**: single column, max-width `800px`, centred. Each card:
  - **Rank number**: `2rem`, `--text-muted`, `font-weight: 300`, left-aligned
  - **Article title** (`h3`), linked to the external Wikipedia URL with a Feather `external-link` icon inline
  - **Last revised** date: `0.8125rem`, `--text-muted`, right-aligned on the same row as the title
  - **Ranking indicators**: `+` pluses / `−` minuses counts in `--success` / `--error`, `0.8125rem`
- **Infinite scroll**: standard (§8)
- **No filter bar** — all articles are homogeneous

**Resources Lists**:
Resources pages are curated ranked/sorted lists covering one category each (parables, manuscripts, people, sites, etc.).

- **Landing page** (`resources/index.html`): `h2` "Resources", brief description, then a static card grid (§8 Cards, `.card-grid`) — one card per resource category, title + one-sentence description, whole card linking to that category's dedicated page (`/resources/<key>.html`). No chip row on the landing page and no fetch — the 15 categories are fixed by the schema `CHECK` constraint.
- **Per-category pages** (`/resources/<key>.html`, one per `list_key`): `h1`/`h2` category title (e.g. "Parables", "External Witnesses"), brief description.
- **Category navigation**: a horizontal row of ghost-style chip links above the header, one per resource list page, linking laterally between categories. Active chip: `1px solid var(--accent)` border, `--bg-surface-alt` background. Present only on the per-category pages, not on the landing page.
- **List items**: ordered list (not a card grid). Each item:
  - Subtle ordinal number left of the title (`--text-muted`, `font-weight: 300`, `2rem`) — same visual weight as challenge/Wikipedia rank numbers
  - `resource_title` as primary text (`1rem`, `--text-primary`), linked if `resource_url` is present (Feather `external-link` icon inline for external URLs)
  - `resource_description` below: `0.875rem`, `--text-secondary`, max 3 lines
- **Infinite scroll**: standard (§8)

**Donation Portal**:
The donation portal is a separately-provided widget dropped into `about.html` at a future stage. A `<div id="donation-portal">` placeholder in the HTML reserves the slot. Styles are provided by the widget — no further spec here.

**About Page**:
The About page is a simple, warm informational page — no academic formatting, no article structure.

- **Layout**: single-column, `800px` max-width, centred with auto margins. Page flows directly on `--bg-primary` (no card container).

- **Page header**: centred `h1` title (`--text-primary`), no byline, no abstract, no date.

- **Portrait / image** (optional): centred, `200px × 200px`, `border-radius: 50%`, `2px solid var(--border)`, displayed below the title with `var(--space-lg)` gap.

- **Prose sections**: `h2` headings (not numbered, not serif — use the `system-ui` stack at `1.75rem`, weight `600`, `--text-primary`), standard body text at `1rem` / `1.65` line-height. No footnotes, no bibliography, no abstract.

- **Contact row**: at the bottom of the page, a row of ghost-style button components (§8) for email and/or external links. Centred, `margin-top: var(--space-2xl)`.

- **No print-specific rules** — the About page is not expected to be printed; standard browser print behaviour applies.

**Breakouts / Side Content**:
- Collapsible sections or separate cards
- Clear visual distinction from main content (see Breakout component above)

**Arbor Diagram**:
- Canvas background: `--bg-primary` with a subtle dot grid overlay — dots at `24px` spacing, `--border` color, `1px` diameter, `0.4` opacity. Achieved with a CSS `radial-gradient` background pattern (no canvas API needed for the grid itself).
- Nodes: white (`--bg-surface`) rounded rectangles, `8px` border-radius, `1px solid var(--border)` border, `var(--space-sm) var(--space-md)` padding, subtle shadow `0 2px 6px rgba(0,0,0,0.08)`. Each node shows the evidence **title** (h4 size, `--text-primary`) and **primary verse** (small, `--text-muted`, italic) below it.
- Node types:
  - **Root**: border `2px solid var(--accent)`, background `--bg-surface-alt`
  - **Supports / leads_to**: standard white node, `1px solid var(--border)`
  - **Related**: standard white node, border dashed `1px solid var(--border-strong)`
- Edges (connecting lines): SVG `<line>` or `<path>`, `1.5px` stroke, `--border-strong` color. Drawn behind nodes using SVG `z-index` layering.
- Flow direction: top-to-bottom and left-to-right. Root node at top-centre; child nodes arranged below and to the right.
- **Bottom bar**: fixed strip at the bottom of the diagram canvas (above the page footer). Contains zoom in (`+`), zoom out (`−`), and reset buttons. Background `--bg-surface`, top border `1px solid var(--border)`, padding `var(--space-sm) var(--space-md)`. Buttons use the secondary button style.
- Zoom: transform `scale()` on the diagram container; min `0.25×`, max `3×`, step `0.25`. Pan via mouse drag or touch drag on the canvas.
- Hover on a node: shadow strengthens, cursor changes to `pointer`; tooltip shows full description.
- Click a node: navigates to that evidence detail page.

**Verse & Code Blocks**:
- Verse references: monospace font stack, `--bg-surface-alt` background, `--border` border (1px), `8px` border-radius, `0.75rem 1rem` padding, `--accent-gold` left border (3px)
- Code (if any): same treatment as verse, additionally `--text-secondary` color, no line numbers (content is short snippets, not multi-line code)

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

---

## 14. Version History

**Version**: 1.4
**Last Updated**: July 2026

**Notes for Agents**: Reference this guide for every UI element. Maintain visual consistency across all sections. Prioritize scholarly clarity and ease of navigation through large historical datasets. Use vanilla HTML + CSS + JS only — no frameworks or build tools, except for the visual displays: maps, timeline, and arbor diagram. Journal-format pages (essays, responses, historiography) share `journal.css`.

