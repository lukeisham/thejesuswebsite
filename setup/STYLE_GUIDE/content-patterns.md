_Part of the [Style Guide](INDEX.md) — §9: content-specific patterns._

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
  - Numbering appears before the heading text, separated by a tab or en-space, in `--accent` color. Example: "1 Introduction", "2.3 Manuscript Evidence".

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

- **Listing page**: the historiography index (`frontend/debate/historiography/index.html`) matches the Contextual Essays listing pattern exactly — a `journal-header` page header, then a flat `.card-grid.essays-card-grid` of cards (no rank numbers, no period sections), each card carrying a "Historiography" type badge (same pattern as the Essays "Essay" badge). It does **not** use `journal.css`. Only the individual *detail* pages use the journal-article format described below.

- **Page header — title block**: centred, no hero image. Title (`h1`, serif, centred), byline, publication date, optional DOI/citation line, abstract block, keywords row — all in the same format and sizing as Essays.

- **Schema markup**: `schema.org/ScholarlyArticle` with an additional `about` property pointing to the relevant subject (`Person`, `Event`, or `Place`) where schema data is available.

- **Reading column, headings, body text, block quotes, figures, footnotes, bibliography**: identical to the Contextual Essays specification — no deviations. The page is visually indistinguishable from an essay to the reader.

- **Print**: same rules as Essays.

- **Empty state**: "This historiography article is forthcoming." centred in `--text-muted` within the reading column.

**Blog Posts**:
Blog posts use a warmer, magazine-style layout — less formal than Essays, Responses, or Historiography pages. No `schema.org/ScholarlyArticle` markup; use `schema.org/BlogPosting` instead.

- **Page header**: left-aligned (not centred). Contains, in order:
  - **Title**: `h1`, serif (`Georgia` stack), `--text-primary`, left-aligned, `2.25rem` (same scale as Essays but left-aligned, not centred).
  - **Date row**: publication date below the title. `--text-secondary`, `0.875rem`.

- **Reading column**: `720px` max-width (wider than essay — blog prose is less dense). Centred with auto margins.

- **Section headings**: `h2` and `h3` only — **not numbered**. Same serif font as Essays. Generous top margin (`var(--space-xl)`); no hierarchical counter system.

- **Body text**: `1rem`, `system-ui` stack, line-height `1.7`, `--text-primary`. Same as Essays.

- **Pull quotes**: distinct callout for emphasis — centred text, `1.25rem`, `--accent` color, italic, no border, margin `var(--space-xl) var(--space-md)`. Used sparingly. Distinct from block quotes and not used in Essays.

- **Block quotes**: same as Essays (left border `3px solid var(--accent-light)`, italic, `--text-secondary`, transparent background).

- **Images**: same Figure component (§8); images may appear anywhere in the content, not only as a top hero.

- **No footnotes**: use inline parenthetical references if needed; no superscript footnote system, no footnote list.

- **Bibliography / References**: 
  - Heading: `h2.unnumbered` — "Bibliography".
  - Entries: hanging-indent ordered list. Each entry in `0.875rem`, `--text-secondary`, line-height `1.6`. Uses `.journal-references` styling (shared with Essays/Responses/Historiography). Use `text-indent: -1.5rem` with `padding-left: 1.5rem` on each `<li>` to create the hanging indent.
  - Entry format: MLA-style as produced by `formatMlaCitation()` from `mla.js` — same formatter as Essays. Italicise book/journal titles, quote article titles. Separate author, title, publisher, date with periods and spaces as per MLA conventions.
  - If the blog post has no linked mla_sources, omit the entire bibliography section.
  - Further Reading: a separate `h2` "Further Reading" section with a simple unordered list for non-MLA source links — `0.875rem`, `--text-secondary`, no hanging indent. Omit if empty.

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

- **Page header**: heading "Wikipedia Rankings", then a single **page-level** "Last revised: <date>" line (`.wikipedia-revised-line`, `--text-xs`, `--text-muted`) showing the most recent revision date across the whole dataset — hidden entirely if no article has a valid date. Brief explanatory paragraph follows.
- **Ranked list**: single column, max-width `800px`, centred. Each card:
  - **Rank number**: `2rem`, `--text-muted`, `font-weight: 300`, left-aligned
  - **Article title** (`h3`), linked to the external Wikipedia URL with a Feather `external-link` icon inline, followed by the two reliability-stones glyph buttons (§6, "Inline Wikipedia Reliability Stones") for articles that have signal data
  - No per-article date is shown — see the page-level line above
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
