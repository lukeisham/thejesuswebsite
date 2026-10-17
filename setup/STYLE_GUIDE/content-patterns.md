_Part of the [Style Guide](INDEX.md) — §9: content-specific patterns._

---

## 9. Content-Specific Patterns

**Markdown Pipe Tables (Body Content)**:
Pipe tables (`| A | B |`) work in blog, essay, response, historiography and challenge bodies. Evidence descriptions are plain text. Tables render as `.content-table` (look: §8 Tables).

- **Column alignment**: standard markdown in the separator row — `:---` left, `:---:` center, `---:` right.
- **Column widths (`{w:N}`)**: add `{w:N}` to a separator cell, where `N` is a positive number (decimals allowed). A column without a token has weight `1`. Weights become percentages of their sum, so `{w:2}---|---|---` gives 50% / 25% / 25%. The token combines with an alignment marker in either order, for example `---:{w:2}`.
  ```
  | Era | Years | Notes |
  |{w:1}---|{w:1}---|{w:2}---|
  | Bronze Age | 3300–1200 BC | Longest era by duration |
  ```
- **Merged cells (`{colspan:N}` / `{rowspan:N}`)**: put the token on a header or body cell, where `N` is a whole number greater than `1`. `{colspan}` merges to the right; `{rowspan}` merges downward in body rows. Every cell that the merge covers holds `{continue}` and nothing else. A cell takes one token, not both.
  Example — a full-width section row:
  ```
  | Era | Years | Notes |
  |---|---|---|
  | {colspan:3}Bronze Age | {continue} | {continue} |
  | Early | 3300–2100 BC | Copper-bronze transition |
  | Late | 1550–1200 BC | Collapse and migration |
  ```
  Example — a label spanning two rows:
  ```
  | Category | Item |
  |---|---|
  | {rowspan:2}Metals | Bronze |
  | {continue} | Iron |
  ```

**Home / index.html**:
- One centered column. The sidebar follows the default rule in §5 (open from `768px`).
- Hero: a figure at most `--measure-reading` wide, with a numbered caption.
- Title block: site title (`--text-h1`, serif, 700; `--text-h2` below `768px`) and tagline (`--text-h3`, `--text-secondary`).
- Sections: centered title (`--text-h2`), body at most `--measure-reading` wide, justified, `--text-secondary`. Each section has `--space-3xl` vertical padding (`--space-2xl` below `768px`) and a `1px solid var(--border)` rule above it (except the first).
- No footer. No breadcrumbs.

**Evidence Detail Page**:
- Content column: at most `--container-max`, one column. Breadcrumbs above it.
- Order: hero (title in `--text-h1`; primary verse in monospace `--text-h4`, `--text-secondary`), Pictures, Description, Bibliography, then a muted `--text-small` dates line. Sections are divided by `1px solid var(--border)`. The Pictures and Description headings are hidden.
- **Pictures**: the primary image and every `[figure]` shortcode in the description render in the Pictures section, above the description. Non-aligned figures use the §8 standard figure box (`.figure-standard`). Aligned figures (`align="left"` / `"right"`) keep their side float instead. Only this module uses the standard box. Essays, responses, historiography, blog and challenge bodies render figures at their natural size.
- **Page info row**: a full-width band below the article. It has `--bg-surface-alt` fill, a `1px solid var(--border)` top edge, and `--space-xl --space-lg` padding. Its content aligns with the article column. Panels sit side by side and wrap. Panel headings: `--text-small`, weight 600, `--text-secondary`. The Identifiers panel is the only panel. The whole row is hidden when it is empty.
- Arbor diagram: see Arbor Diagram below.

**Contextual Essays (Journal Article Format)**:
Essays render as journal articles. The root element is `<article class="journal-article">` (HTML-1) with `schema.org/ScholarlyArticle` JSON-LD.

**Shared styles**: Essays, Responses and Historiography detail pages share the `journal-header.css`, `journal-body.css`, `journal-footer.css` and `journal-two-column.css` style sheets. The sections for Responses and Historiography list only what differs from Essays.

- **Title block**: centered, no hero image, `--space-2xl` top and `--space-xl` bottom padding.
  - **Title**: `h2` (the page `h1` is the hidden header, §5), serif, `--text-h1`, weight 700, `--text-primary` (`--text-h2` below `768px`). No subtitle.
  - **Byline**: author name, `0.9375rem`, `--text-secondary`. An optional author bio sits below it: `--text-xs`, italic, `--text-muted`, at most `400px` wide.
  - **Date**: `--text-xs`, `--text-muted`, long form such as "15 June 2025". It shows the publish date, or the creation date when none exists. No "Published" prefix. No revision date.
  - **DOI line** (optional): `DOI: <value>`, `--text-2xs`, `--text-muted`. Hidden when the row has no DOI.
  - **Abstract**: a block at most `--measure-reading` wide, `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-md`, `--space-lg` padding. Label "Abstract" at `--text-h4`, weight 600. Body `0.9375rem`, `--text-secondary`, `--leading-body`. No database column feeds the abstract today, so the block stays hidden.
  - **Keywords**: label "Keywords:" (`--text-2xs`, weight 600, `--text-secondary`) followed by Content Badges (§8) on one wrapping line. The list comes from the `metadata_keywords` column, split on commas. Hidden when empty.
- **Reading column**: `--measure-reading` (680px), centered, `--space-md` side padding. Body text `1rem` (`0.9375rem` below `768px`), `--leading-long` (1.7), `--text-primary`, paragraphs spaced by `--space-md`.
- **Two-column layout** (≥1280px): set per row by the `two_column = 1` flag on essays, responses and historiography (admin checkbox). The body gets 2 columns, `--space-2xl` gap and a `1px solid var(--border)` rule between them, and it drops the column width cap. Figures and block quotes span both columns. The title block, abstract and keywords stay single column. Below `1280px` the body is one column.
- **Section headings**: numbered by CSS counters, never by hand:
  - `h2`: "1", "2", … Serif, `--text-h2`, weight 600, `--text-primary`. Margin top `--space-2xl`, bottom `--space-md`.
  - `h3`: "1.1", "1.2", … Serif, `--text-h3`, weight 600. Margin top `--space-xl`, bottom `--space-sm`.
  - `h4`: "1.1.1", … Serif, `--text-h4`, weight 600, `--text-secondary`. Margin top `--space-lg`, bottom `--space-xs`.
  - The number comes before the text, separated by two non-breaking spaces, in `--accent`. Example: "2.3  Manuscript Evidence".
  - `h2.unnumbered` skips the counter. The "References" heading uses it.
- **Block quotes**: distinct from verse blocks (Verse & Code Blocks, below).
  - Left border `3px solid var(--accent-light)`; transparent background.
  - Italic, `--text-secondary`. Padding `--space-md --space-lg`. Margin `--space-lg 0`.
  - A `<footer>` or `<cite>` inside the quote shows the attribution: `--text-xs`, `--text-muted`, not italic, on its own line.
- **Figures**: the Pictures / Figures component (§8). Numbering runs through the whole essay.
- **Footnotes**: a `1px solid var(--border)` rule with `--space-lg` margin above and below, then an ordered list in `--text-xs`, `--text-secondary`, `--leading-small`. No content field supplies footnotes today, so the section stays hidden. Citations use `[mla:N]` markers (§14).
- **References**: `h2.unnumbered` "References". Hanging-indent list: `--text-small`, `--text-secondary`, line height `1.6`, no bullets, `1.5rem` indent. Entries are the linked MLA sources, formatted in MLA style. An `[mla:N]` marker links to its entry. Hidden when no source is linked.
- **Empty state**: "This essay is forthcoming." in `--text-muted`, centered.
- **Listing page**: a `journal-header` heading block, then `.card-grid.essays-card-grid` (at most `--measure-reading` wide). Each card shows a type badge.

**Timeline View** (`/evidence/timeline/`):
Header block (`h2` "Timeline" plus a description at most `--measure-reading` wide), then the era filter chips, then the canvas. The canvas is at least `600px` high. Dots, labels, zoom, chips, era headings and the detail panel are in §8 Timeline.

**Map View** (`/evidence/maps/`):
An overview grid of map cards links to each map. Pins, zoom and tooltips are in §8 Map.

**Popular Challenges & Academic Challenges (Ranked Lists)**:
Two ranked list pages (`popular-challenges.html`, `academic-challenges.html`) share one layout.

- **Header**: page title, then a description in `--text-secondary`.
- **Filter bar**: category filter chips (§8 Filters).
- **List**: one column, at most `--measure-list` (800px), centered, infinite scroll (§8). Each row has:
  - **Rank number**: `2rem`, weight 300, `--text-muted`, right-aligned in a `2.5rem` column.
  - **Title**: link to the challenge, `--text-h3`, weight 600.
  - **Summary**: rendered Markdown, `--text-small`, `--text-secondary`, cut at 3 lines.
  - **Footer**: response count ("3 responses") in `--text-xs`, `--text-muted`, and the category badge.
  - A `1px solid var(--border)` rule under each row.

*Challenge detail page*: breadcrumbs, then a column at most `--measure-reading` wide. Title in `--text-h1`, category badge, optional picture, body (Markdown, with `[figure]`, `[mla:N]` and `[id:N]` markers, §14), then "References" as on essays. Below, a "Responses" section (`h2`, `--text-h2`, `1px` rule above): one entry per response with a bold title link, the date and the author. Empty state: "This challenge is forthcoming."

*Response Pages (Journal Article Format)*:
Responses render exactly like Essays, with these additions.

- **Challenge reference**: a bar below the keywords, at most `--measure-reading` wide: "In response to:" (weight 600) and a `--link` link to the challenge. `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-sm`, `--space-sm --space-md` padding, `--text-small`. Margin below: `--space-xl`.
- **Strength indicator**: the label "Strength of response:" and 5 dots (`8px`; filled `--accent`, empty `--border`), `--text-xs`, `--text-muted`. No database column supplies the rating today, so the row stays hidden.
- **Empty state**: "This response is forthcoming."

**Historiography Pages (Journal Article Format)**:
Detail pages render exactly like Essays. The JSON-LD adds an `about` property for the subject.

- **Listing page** (`debate/historiography/index.html`): the same pattern as the Essays listing. Each card carries a "Historiography" badge.
- **Empty state**: "This historiography article is forthcoming."

**Blog Posts**:
A looser, magazine-style layout. Schema type: `schema.org/BlogPosting`.

- **Header**: left-aligned. Title in serif `--text-h1` (`--text-h2` below `768px`), then the date in `--text-small`, `--text-secondary`.
- **Reading column**: `--measure-reading-wide` (720px), centered.
- **Section headings**: `h2` and `h3`, serif, not numbered. `h2` margin top `--space-xl`; `h3` margin top `--space-lg`.
- **Body text**: `1rem`, `--leading-long`, `--text-primary`.
- **Pull quotes** (`[pullquote]`, §14): centered, `1.25rem`, italic, `--accent`, no border, margin `--space-xl --space-md`. Blog only.
- **Citations**: `[mla:N]` shows as `(Author)`, not a superscript. No footnotes.
- **Bibliography**: `h2.unnumbered` "Bibliography", ordered list in the `.journal-references` style (same as Essay References). Hidden when no source is linked.
- **Empty state**: "This post is coming soon."

**News & Blog Landing** (`news-and-blog/index.html`):
- `h2` "News & Blog".
- Two sections, News first, then Blog. Each section heading (`--text-h3`, weight 600, `1px` rule below) links to that section's full feed. The heading turns `--accent` on hover.
- News shows the 5 latest articles. Blog shows the 3 latest posts. Both use the §8 News & Blog Row Layout.
- Loading shows a spinner. A failed load shows an error message with a "Try again" button.

**News Articles**:
News articles are curated external links. The `[slug].html` page shows the article's details and sends the reader to the original source. It is not a reading page.

- **Layout**: one column, `--measure-narrow` (760px), centered.
- **Header**: `← Back to News & Blog` link above. Title in serif `--text-h1` (`--text-h2` below `768px`). Meta line below: author, publisher and date, `--text-small`, `--text-muted`.
- **Source link** (the main action): a bar with `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-sm`, `--space-md --space-lg` padding. It holds the label "Read the full article:" and a link with the source name and a Feather `external-link` icon. The link opens in a new tab.
- **Summary**: body text in `--text-secondary`. Hidden when empty.
- **Keywords**: Content Badge row (§8). Hidden when empty.
- No footnotes, no bibliography, no journal formatting.

**Wikipedia Ranked List**:
A single ranked list page (`debate/wikipedia.html`) of Wikipedia articles about Jesus, ordered by reliability score.

- **Page header**: `h2` "Wikipedia Rankings", then one line "Scores last updated: <date>" (`.wikipedia-revised-line`, `--text-xs`, italic, `--text-muted`). The date is the newest `scored_at` across the articles, which is when the scoring data last changed on this site. It is not a Wikipedia revision date. The line is hidden when no article has a date. A paragraph follows.
- **Column header row**: `RANK | ARTICLE | SIGNALS | SCORE`, uppercase, `--text-2xs`, weight 500, `--text-muted`, `1px solid var(--border-strong)` underline. It shows from `768px` and is `aria-hidden`. It sits outside the `<ol>` and shares the row's columns.
- **Ranked list**: `<ol>` at most `--measure-list-wide` (1100px), centered. Each row is a five-column grid with `--space-lg` gaps and a `1px solid var(--border)` rule below:
  - **Rank number**: `--wikipedia-rank-number-size` (2rem), weight 300, `--text-muted`, right-aligned. The column is `--wikipedia-rank-col` (2.5rem), or `--wikipedia-rank-col-sm` (1.5rem) below `1024px`.
  - **Article title**: `--text-h3`, weight 600, `--text-primary`. It links to the Wikipedia article in a new tab, with a 14px Feather `external-link` icon.
  - **Signal grid, score panel and copy button** (§9.1) for scored articles.
  - Below `768px` the row has two lines. The rank spans both. The title is on top. The grid, score and copy button sit below.
- **Infinite scroll**: standard (§8). **No filter bar**: all articles are alike.

### 9.1 Wikipedia Grid Details

The visual spec for the 5×5 signal grid. The tooltip motion is in §6. How the page, script and style sheet must agree is in `setup/ARCHITECTURE/wikipedia-quality-grid.md`.

**Layout**

- Always 5 columns, at every viewport. Only cell and gap size change: `--grid-cell-size` (26px) with `--grid-cell-gap` (3px) from `768px`; `--grid-cell-size-sm` (22px) with `--grid-cell-gap-sm` (2px) below.
- **Cell order** follows the signal dictionary, row by row. The grid reads as a gradient: top-left cells earn score, bottom-right cells lose it.
- All 25 cells render for every scored article. A signal that did not fire shows as an empty cell, not a missing one.
- Cell: `--radius-sm`, `--text-2xs`, tabular numbers, `--bg-surface-alt` fill. A focused cell gets a `2px solid var(--text-primary)` outline.

**Cell colours**

- **Positive, fired**: the cell shows its contribution number in one of four blue tiers. The tier comes from the fulfilment ratio `|contribution| / |cap|`:

  | Tier | Token | Ratio |
  |---|---|---|
  | 1 | `--grid-blue-1` | below 0.30 |
  | 2 | `--grid-blue-2` | 0.30 to 0.59 |
  | 3 | `--grid-blue-3` | 0.60 to 0.94 |
  | 4 | `--grid-blue-4`, bold | 0.95 and above |

- **Negative, fired**: `--error` text, bold, with its minus sign. One treatment at every size.
- **Empty** (contribution 0): `--bg-surface` fill with a `1px solid var(--border)` outline, no number.
- **Tooltip**: on a cell, `"<signal name>: <contribution>"` or `"<signal name>: not scored"`. On the score panel, `"Document score: <net score>"`. The tooltip is a `--text-primary` box with `--bg-primary` text, `--text-2xs`, `--shadow-md`. It shows on pointer devices only. The same text is each cell's `aria-label`.

**Score panel**

- `.wikipedia-score-panel` sits right of the grid. It shows `net_score` in a solid band with white text, weight 600. The band colour is `--success` at 50 and above, `--warning` from 25 to 49, `--error` at 24 and below. No suffix and no "/100".

**Copy button**

- A ghost button, `--signal-btn-size` (34px) square, right of the score panel. It copies a plain-text summary of that article. The summary lists the title and score, each scored signal with its contribution, and the signals that did not score. It ends with the net score against the highest possible score, and a source line. The exact layout is in `wikipedia.js`. A failed copy shows an error toast. After a copy, the icon turns into a check in `--success` for 1.5 seconds.

**Accessibility**

- The grid has `role="table"` and each cell `role="gridcell"` with an `aria-label`.
- `Tab` enters a grid once. The arrow keys move between its cells.

**Resources Lists**:
Curated lists, one page per category (parables, manuscripts, people, sites and others).

- **Landing page** (`resources/index.html`): `h2` "Resources", a description, then a card grid (`.card-grid`, §8 Cards). Each card has a title and a one-sentence description and links to that category's page (`/resources/<key>.html`).
- **Category pages**: category title and a short description. There is no chip row. The landing page navigates between categories.
- **Sections**: a list can hold subheadings that group items. Each subheading is an `h3` (`--text-h3`, weight 600) above its own numbered list. Numbering restarts at 1 under each subheading. Items before the first subheading form an unlabelled section. Sections are `--space-2xl` apart.
- **List**: ordered list, at most `--measure-list` (800px), centered. Each item:
  - **Number**: `2rem`, weight 300, `--text-muted`, right-aligned in a `2.5rem` column (same as challenge ranks).
  - **Title**: `--text-body`, weight 500, `--text-primary`. It links to the resource when it has a URL.
  - **Description**: `--text-small`, `--text-secondary`, cut at 3 lines.
  - A `1px solid var(--border)` rule under each item.
- **Infinite scroll**: standard (§8). Later batches continue the numbering.

**About Page**:
A warm information page with no article structure.

- **Layout**: one column, `--measure-list` (800px), centered, `--space-2xl --space-md` padding, directly on `--bg-primary`.
- **Title**: centered, serif, `--text-h1`, weight 700. No byline, abstract or date.
- **Portrait** (optional): centered `200px` circle, `2px solid var(--border)`, cropped to fill, `--space-lg` below.
- **Prose sections**: `h2` in the body (`system-ui`) font, `--text-h2`, weight 600. Text in `--text-body`, `--text-secondary`, `--leading-body`. Paragraphs are `--space-lg` apart; sections are `--space-2xl` apart.
- **Contact row**: ghost buttons (§8) for email and external links, centered, wrapping, `--space-2xl` above.

**Arbor Diagram**:
- **Canvas**: `--bg-primary` with a dot grid (`24px` spacing, `--border` dots, `1px`), `min-height: 600px`.
- **Node**: `--bg-surface`, `1px solid var(--border)`, `--radius-md`, `--space-sm --space-md` padding, `--shadow-card`. At most `200px` wide, at least `80px` high, centered text. It shows the evidence **title** (`--text-h4`, weight 600, `--text-primary`) and the **primary verse** below it (`--text-small`, italic, `--text-muted`).
- **Node types**:
  - **Root**: `2px solid var(--accent)` border, `--bg-surface-alt` fill.
  - **Supports / leads_to**: the standard node.
  - **Related**: dashed `--border-strong` border.
- **Edges**: behind the nodes, `1.5px`, `--border-strong`, round caps. Root-to-child edges are `2px` in `--accent`. Related edges are dashed (`6 4`).
- **Hover** on a node: `--shadow-card-hover` and `scale(1.02)`. After 300ms a tooltip shows title, verse and description. **Click** opens the evidence page.
- **Zoom**: two icon buttons, zoom in and zoom out, in a bar fixed to the bottom of the canvas (`--bg-surface`, `1px solid var(--border)` top edge, centered). Range `0.05×` to `1.0×`, step `1.25×`. Drag to pan. These bounds differ from the Timeline's (`0.3×`–`3.0×`).
- **Mobile** (<768px): nodes stack top to bottom at full width. The page scrolls. No zoom bar and no pan.

**Verse & Code Blocks**:
- **`.verse-block`**: monospace, `--text-small`, `--bg-surface-alt` fill, `1px solid var(--border)` border, `3px solid var(--accent-gold)` left border, `--radius-md`, padding `0.75rem 1rem`, margin `--space-lg 0`.
- **`.verse-block--subtle`**: transparent, no border, `2px solid var(--border)` left border, `--text-secondary`, padding `0.5rem 0.75rem`.
- **`.code-block`**: the verse block with `--text-secondary` text and wrapped lines. No line numbers.
- **`.verse-ref`** (inline reference): monospace, `--text-small`, weight 600, small caps.
