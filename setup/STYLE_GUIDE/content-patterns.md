_Part of the [Style Guide](INDEX.md) — §9: content-specific patterns._

---

## §9 Content-Specific Patterns

| § | Pattern | § | Pattern |
|---|---|---|---|
| 9.1 | Markdown Pipe Tables | 9.10 | Blog Posts |
| 9.2 | Home | 9.11 | News & Blog Landing |
| 9.3 | Evidence Detail Page | 9.12 | News Articles |
| 9.4 | Contextual Essays | 9.13 | Wikipedia Ranked List |
| 9.5 | Timeline View | 9.14 | Wikipedia Grid Details |
| 9.6 | Map View | 9.15 | Resources Lists |
| 9.7 | Challenges (Ranked Lists) | 9.16 | About Page |
| 9.8 | Response Pages | 9.17 | Arbor Diagram |
| 9.9 | Historiography Pages | 9.18 | Verse & Code Blocks |

### §9.1 Markdown Pipe Tables (body content)

Pipe tables (`| A | B |`) work in blog, essay, response, historiography and challenge bodies. Evidence descriptions are plain text. Tables render as `.content-table` (look: §8.12).

| Feature | Syntax | Rule |
|---|---|---|
| Column alignment | `:---` left, `:---:` center, `---:` right | Standard markdown, in the separator row |
| Column width | `{w:N}` in a separator cell | `N` is a positive number (decimals allowed). A column without a token has weight `1`. Weights become percentages of their sum, so `{w:2}---\|---\|---` gives 50% / 25% / 25%. The token combines with an alignment marker in either order, for example `---:{w:2}` |
| Merged cells | `{colspan:N}` / `{rowspan:N}` on a header or body cell | `N` is a whole number greater than `1`. `{colspan}` merges to the right; `{rowspan}` merges downward in body rows. Every cell that the merge covers holds `{continue}` and nothing else. A cell takes one token, not both |

Column widths:

```
| Era | Years | Notes |
|{w:1}---|{w:1}---|{w:2}---|
| Bronze Age | 3300–1200 BC | Longest era by duration |
```

A full-width section row:

```
| Era | Years | Notes |
|---|---|---|
| {colspan:3}Bronze Age | {continue} | {continue} |
| Early | 3300–2100 BC | Copper-bronze transition |
| Late | 1550–1200 BC | Collapse and migration |
```

A label spanning two rows:

```
| Category | Item |
|---|---|
| {rowspan:2}Metals | Bronze |
| {continue} | Iron |
```

### §9.2 Home (`index.html`)

- One centered column. The sidebar follows the default rule in §5.1 (open from `768px`).
- No footer. No breadcrumbs.

| Part | Rule |
|---|---|
| Hero | A figure at most `--measure-reading` wide, with a numbered caption |
| Title block | Site title (`--text-h1`, serif, 700; `--text-h2` below `768px`) and tagline (`--text-h3`, `--text-secondary`) |
| Sections | Centered title (`--text-h2`), body at most `--measure-reading` wide, justified, `--text-secondary`. Each section has `--space-3xl` vertical padding (`--space-2xl` below `768px`) and a `1px solid var(--border)` rule above it (except the first) |

### §9.3 Evidence Detail Page

- Content column: at most `--container-max`, one column. Breadcrumbs above it.
- Order: hero, Pictures, Description, Bibliography, then a muted `--text-small` dates line. Sections are divided by `1px solid var(--border)`. The Pictures and Description headings are hidden.
- Hero: title in `--text-h1`; primary verse in monospace `--text-h4`, `--text-secondary`.
- Arbor diagram: §9.17.

| Part | Rule |
|---|---|
| Pictures | The primary image and every `[figure]` shortcode in the description render in the Pictures section, above the description. Non-aligned figures use the standard figure box (§8.3.1, `.figure-standard`). Aligned figures (`align="left"` / `"right"`) keep their side float instead. Only this module uses the standard box. Essays, responses, historiography, blog and challenge bodies render figures at their natural size |
| Page info row | A full-width band below the article. `--bg-surface-alt` fill, a `1px solid var(--border)` top edge, `--space-xl --space-lg` padding. Its content aligns with the article column. Panels sit side by side and wrap. Panel headings: `--text-small`, weight 600, `--text-secondary`. The Identifiers panel is the only panel. The whole row is hidden when it is empty |

### §9.4 Contextual Essays (journal article format)

Essays render as journal articles. The root element is `<article class="journal-article">` (HTML-1) with `schema.org/ScholarlyArticle` JSON-LD.

Essays, Responses and Historiography detail pages share the `journal-header.css`, `journal-body.css`, `journal-footer.css` and `journal-two-column.css` style sheets. §9.8 and §9.9 list only what differs from Essays.

#### §9.4.1 Title block

Centered, no hero image, `--space-2xl` top and `--space-xl` bottom padding.

| Part | Rule |
|---|---|
| Title | `h2` (the page `h1` is the hidden header, §5.3), serif, `--text-h1`, weight 700, `--text-primary` (`--text-h2` below `768px`). No subtitle |
| Byline | Author name, `0.9375rem`, `--text-secondary`. An optional author bio sits below it: `--text-xs`, italic, `--text-muted`, at most `400px` wide |
| Date | `--text-xs`, `--text-muted`, long form such as "15 June 2025". It shows the publish date, or the creation date when none exists. No "Published" prefix. No revision date |
| DOI line (optional) | `DOI: <value>`, `--text-2xs`, `--text-muted`. Hidden when the row has no DOI |
| Abstract | A block at most `--measure-reading` wide, `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-md`, `--space-lg` padding. Label "Abstract" at `--text-h4`, weight 600. Body `0.9375rem`, `--text-secondary`, `--leading-body`. The text comes from the `abstract` column (plain text, at most 2000 characters). The block is hidden when the column is empty. The page description uses the abstract when one exists |
| Keywords | Label "Keywords:" (`--text-2xs`, weight 600, `--text-secondary`) followed by Content Badges (§8.6) on one wrapping line. The list comes from the `metadata_keywords` column, split on commas. Hidden when empty |

#### §9.4.2 Body

| Part | Rule |
|---|---|
| Reading column | `--measure-reading` (680px), centered, `--space-md` side padding. Body text `1rem` (`0.9375rem` below `768px`), `--leading-long` (1.7), `--text-primary`, paragraphs spaced by `--space-md` |
| Two-column layout (≥1280px) | Set per row by the `two_column = 1` flag on essays, responses and historiography (admin checkbox). The body gets 2 columns, `--space-2xl` gap and a `1px solid var(--border)` rule between them, and it drops the column width cap. Figures and block quotes span both columns. The title block, abstract and keywords stay single column. Below `1280px` the body is one column |
| Block quotes | Distinct from verse blocks (§9.18). Left border `3px solid var(--accent-light)`; transparent background. Italic, `--text-secondary`. Padding `--space-md --space-lg`. Margin `--space-lg 0`. A `<footer>` or `<cite>` inside the quote shows the attribution: `--text-xs`, `--text-muted`, not italic, on its own line |
| Figures | The Pictures / Figures component (§8.3). Numbering runs through the whole essay |

#### §9.4.3 Section headings

Numbered by CSS counters, never by hand.

| Level | Number | Font | Size | Colour | Margin top / bottom |
|---|---|---|---|---|---|
| `h2` | "1", "2", … | Serif, weight 600 | `--text-h2` | `--text-primary` | `--space-2xl` / `--space-md` |
| `h3` | "1.1", "1.2", … | Serif, weight 600 | `--text-h3` | `--text-primary` | `--space-xl` / `--space-sm` |
| `h4` | "1.1.1", … | Serif, weight 600 | `--text-h4` | `--text-secondary` | `--space-lg` / `--space-xs` |

- The number comes before the text, separated by two non-breaking spaces, in `--accent`. Example: "2.3  Manuscript Evidence".
- `h2.unnumbered` skips the counter. The "References" heading uses it.

#### §9.4.4 Footnotes, references and states

| Part | Rule |
|---|---|
| Footnotes | A `1px solid var(--border)` rule with `--space-lg` margin above and below, then an ordered list in `--text-xs`, `--text-secondary`, `--leading-small`. The items come from the item's footnote table (at most 100, each plain text of at most 1000 characters). The section is hidden when the item has no footnotes. A `[fn:N]` marker in the body (§14.2.2) is a superscript link to item N. Each item has a return arrow (`↩`) to the first marker that cites it, shown only when a marker cites it. Citations use `[mla:N]` markers (§14.2.1) |
| References | `h2.unnumbered` "References". Hanging-indent list: `--text-small`, `--text-secondary`, line height `1.6`, no bullets, `1.5rem` indent. Entries are the linked MLA sources, formatted in MLA style. An `[mla:N]` marker links to its entry. Hidden when no source is linked |
| Empty state | "This essay is forthcoming." in `--text-muted`, centered |
| Listing page | A `journal-header` heading block, then `.card-grid.essays-card-grid` (at most `--measure-reading` wide). Each card shows a type badge |

### §9.5 Timeline View (`/evidence/timeline/`)

Header block (`h2` "Timeline" plus a description at most `--measure-reading` wide), then the era filter chips, then the canvas. The canvas is at least `600px` high. Dots, labels, zoom, chips, era headings and the detail panel are in §8.7.

### §9.6 Map View (`/evidence/maps/`)

An overview grid of map cards links to each map. Pins, zoom and tooltips are in §8.8.

### §9.7 Challenges (ranked lists)

Two ranked list pages (`popular-challenges.html`, `academic-challenges.html`) share one layout.

#### §9.7.1 List pages

| Part | Rule |
|---|---|
| Header | Page title, then a description in `--text-secondary` |
| Filter bar | Category filter chips (§8.9) |
| List | One column, at most `--measure-list` (800px), centered, infinite scroll (§8.17) |

Each row has:

| Part | Rule |
|---|---|
| Rank number | `2rem`, weight 300, `--text-muted`, right-aligned in a `2.5rem` column |
| Title | Link to the challenge, `--text-h3`, weight 600 |
| Summary | Rendered Markdown, `--text-small`, `--text-secondary`, cut at 3 lines |
| Footer | Response count ("3 responses") in `--text-xs`, `--text-muted`, and the category badge |
| Separator | A `1px solid var(--border)` rule under each row |

#### §9.7.2 Challenge detail page

Breadcrumbs, then a column at most `--measure-reading` wide. Title in `--text-h1`, category badge, optional picture, body (Markdown, with `[figure]`, `[mla:N]` and `[id:N]` markers, §14), then "References" as on essays (§9.4.4). Below, a "Responses" section (`h2`, `--text-h2`, `1px` rule above): one entry per response with a bold title link, the date and the author. Empty state: "This challenge is forthcoming."

### §9.8 Response Pages (journal article format)

Responses render exactly like Essays (§9.4), with these additions.

| Part | Rule |
|---|---|
| Challenge reference | A bar below the keywords, at most `--measure-reading` wide: "In response to:" (weight 600) and a `--link` link to the challenge. `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-sm`, `--space-sm --space-md` padding, `--text-small`. Margin below: `--space-xl` |
| Strength indicator | The label "Strength of response:" and 5 dots (`8px`; filled `--accent`, empty `--border`), `--text-xs`, `--text-muted`. The rating comes from the `strength` column on responses (a whole number from 1 to 5). The row is hidden when the column is empty. The dots carry `role="img"` and an `aria-label` such as "Strength of response: 3 of 5", because colour alone shows the value |
| Empty state | "This response is forthcoming." |

### §9.9 Historiography Pages (journal article format)

Detail pages render exactly like Essays (§9.4). The JSON-LD adds an `about` property for the subject.

| Part | Rule |
|---|---|
| Listing page | `debate/historiography/index.html`: the same pattern as the Essays listing. Each card carries a "Historiography" badge |
| Empty state | "This historiography article is forthcoming." |

### §9.10 Blog Posts

A looser, magazine-style layout. Schema type: `schema.org/BlogPosting`.

| Part | Rule |
|---|---|
| Header | Left-aligned. Title in serif `--text-h1` (`--text-h2` below `768px`), then the date in `--text-small`, `--text-secondary` |
| Reading column | `--measure-reading-wide` (720px), centered |
| Section headings | `h2` and `h3`, serif, not numbered. `h2` margin top `--space-xl`; `h3` margin top `--space-lg` |
| Body text | `1rem`, `--leading-long`, `--text-primary` |
| Pull quotes | `[pullquote]` (§14.1.2): centered, `--text-pull-quote`, italic, `--accent`, no border, margin `--space-xl --space-md`. Blog only |
| Citations | `[mla:N]` shows as `(Author)`, not a superscript. No footnotes |
| Bibliography | `h2.unnumbered` "Bibliography", ordered list in the `.journal-references` style (same as Essay References). Hidden when no source is linked |
| Empty state | "This post is coming soon." |

### §9.11 News & Blog Landing (`news-and-blog/index.html`)

- `h2` "News & Blog".
- Two sections, News first, then Blog. Each section heading (`--text-h3`, weight 600, `1px` rule below) links to that section's full feed. The heading turns `--accent` on hover.
- News shows the 5 latest articles. Blog shows the 3 latest posts. Both use the News & Blog Row Layout (§8.4).
- Loading shows a spinner. A failed load shows an error message with a "Try again" button.

### §9.12 News Articles

News articles are curated external links. The `[slug].html` page shows the article's details and sends the reader to the original source. It is not a reading page. It has no footnotes, no bibliography and no journal formatting.

| Part | Rule |
|---|---|
| Layout | One column, `--measure-narrow` (760px), centered |
| Header | `← Back to News & Blog` link above. Title in serif `--text-h1` (`--text-h2` below `768px`). Meta line below: author, publisher and date, `--text-small`, `--text-muted` |
| Source link (the main action) | A bar with `--bg-surface-alt` fill, `1px solid var(--border)`, `--radius-sm`, `--space-md --space-lg` padding. It holds the label "Read the full article:" and a link with the source name and a Feather `external-link` icon. The link opens in a new tab |
| Summary | Body text in `--text-secondary`. Hidden when empty |
| Keywords | Content Badge row (§8.6). Hidden when empty |

### §9.13 Wikipedia Ranked List

A single ranked list page (`debate/wikipedia.html`) of Wikipedia articles about Jesus, ordered by reliability score.

| Part | Rule |
|---|---|
| Page header | `h2` "Wikipedia Rankings", then one line "Scores last updated: <date>" (`.wikipedia-revised-line`, `--text-xs`, italic, `--text-muted`). The date is the newest `scored_at` across the articles, which is when the scoring data last changed on this site. It is not a Wikipedia revision date. The line is hidden when no article has a date. A paragraph follows |
| Column header row | `RANK \| ARTICLE \| SIGNALS \| SCORE`, uppercase, `--text-2xs`, weight 500, `--text-muted`, `1px solid var(--border-strong)` underline. It shows from `768px` and is `aria-hidden`. It sits outside the `<ol>` and shares the row's columns |
| Ranked list | `<ol>` at most `--measure-list-wide` (1100px), centered. Each row is a five-column grid with `--space-lg` gaps and a `1px solid var(--border)` rule below |
| Infinite scroll | Standard (§8.17) |
| Filter bar | None: all articles are alike |

Each row holds:

| Part | Rule |
|---|---|
| Rank number | `--wikipedia-rank-number-size` (2rem), weight 300, `--text-muted`, right-aligned. The column is `--wikipedia-rank-col` (2.5rem), or `--wikipedia-rank-col-sm` (1.5rem) below `1024px` |
| Article title | `--text-h3`, weight 600, `--text-primary`. It links to the Wikipedia article in a new tab, with a 14px Feather `external-link` icon |
| Signal grid, score panel and copy button | §9.14, for scored articles |
| Below `768px` | The row has two lines. The rank spans both. The title is on top. The grid, score and copy button sit below |

### §9.14 Wikipedia Grid Details

The visual spec for the 5×5 signal grid. The tooltip motion is in §6.2. How the page, script and style sheet must agree is in `setup/ARCHITECTURE/wikipedia-quality-grid.md`.

#### §9.14.1 Layout

- Always 5 columns, at every viewport. Only cell and gap size change.
- **Cell order** follows the signal dictionary, row by row. The grid reads as a gradient: top-left cells earn score, bottom-right cells lose it.
- All 25 cells render for every scored article. A signal that did not fire shows as an empty cell, not a missing one.
- Cell: `--radius-sm`, `--text-2xs`, tabular numbers, `--bg-surface-alt` fill. A focused cell gets a `2px solid var(--text-primary)` outline.

| Viewport | Cell size | Gap |
|---|---|---|
| From `768px` | `--grid-cell-size` (26px) | `--grid-cell-gap` (3px) |
| Below `768px` | `--grid-cell-size-sm` (22px) | `--grid-cell-gap-sm` (2px) |

#### §9.14.2 Cell colours

A positive cell that fired shows its contribution number in one of four blue tiers. The tier comes from the fulfilment ratio `|contribution| / |cap|`:

| Tier | Token | Ratio |
|---|---|---|
| 1 | `--grid-blue-1` | below 0.30 |
| 2 | `--grid-blue-2` | 0.30 to 0.59 |
| 3 | `--grid-blue-3` | 0.60 to 0.94 |
| 4 | `--grid-blue-4`, bold | 0.95 and above |

| Cell state | Look |
|---|---|
| Positive, fired | Contribution number in a blue tier (above) |
| Negative, fired | `--error` text, bold, with its minus sign. One treatment at every size |
| Empty (contribution 0) | `--bg-surface` fill with a `1px solid var(--border)` outline, no number |

**Tooltip**: on a cell, `"<signal name>: <contribution>"` or `"<signal name>: not scored"`. On the score panel, `"Document score: <net score>"`. The tooltip is a `--text-primary` box with `--bg-primary` text, `--text-2xs`, `--shadow-md`. It shows on pointer devices only. The same text is each cell's `aria-label`.

#### §9.14.3 Score panel

`.wikipedia-score-panel` sits right of the grid. It shows `net_score` in a solid band with white text, weight 600. No suffix and no "/100".

| Net score | Band colour |
|---|---|
| 50 and above | `--success` |
| 25 to 49 | `--warning` |
| 24 and below | `--error` |

#### §9.14.4 Copy button

A ghost button, `--signal-btn-size` (34px) square, right of the score panel. It copies a plain-text summary of that article. The summary lists the title and score, each scored signal with its contribution, and the signals that did not score. It ends with the net score against the highest possible score, and a source line. The exact layout is in `wikipedia.js`. A failed copy shows an error toast. After a copy, the icon turns into a check in `--success` for 1.5 seconds.

#### §9.14.5 Accessibility

- The grid has `role="table"` and each cell `role="gridcell"` with an `aria-label`.
- `Tab` enters a grid once. The arrow keys move between its cells.

### §9.15 Resources Lists

Curated lists, one page per category (parables, manuscripts, people, sites and others).

| Part | Rule |
|---|---|
| Landing page | `resources/index.html`: `h2` "Resources", a description, then a card grid (`.card-grid`, §8.2). Each card has a title and a one-sentence description and links to that category's page (`/resources/<key>.html`) |
| Category pages | Category title and a short description. There is no chip row. The landing page navigates between categories |
| Sections | A list can hold subheadings that group items. Each subheading is an `h3` (`--text-h3`, weight 600) above its own numbered list. Numbering restarts at 1 under each subheading. Items before the first subheading form an unlabelled section. Sections are `--space-2xl` apart |
| List | Ordered list, at most `--measure-list` (800px), centered |
| Infinite scroll | Standard (§8.17). Later batches continue the numbering |

Each list item:

| Part | Rule |
|---|---|
| Number | `2rem`, weight 300, `--text-muted`, right-aligned in a `2.5rem` column (same as challenge ranks) |
| Title | `--text-body`, weight 500, `--text-primary`. It links to the resource when it has a URL |
| Description | `--text-small`, `--text-secondary`, cut at 3 lines |
| Separator | A `1px solid var(--border)` rule under each item |

### §9.16 About Page

A warm information page with no article structure.

| Part | Rule |
|---|---|
| Layout | One column, `--measure-list` (800px), centered, `--space-2xl --space-md` padding, directly on `--bg-primary` |
| Title | Centered, serif, `--text-h1`, weight 700. No byline, abstract or date |
| Portrait (optional) | Centered `200px` circle, `2px solid var(--border)`, cropped to fill, `--space-lg` below |
| Prose sections | `h2` in the body (`system-ui`) font, `--text-h2`, weight 600. Text in `--text-body`, `--text-secondary`, `--leading-body`. Paragraphs are `--space-lg` apart; sections are `--space-2xl` apart |
| Contact row | Ghost buttons (§8.1) for email and external links, centered, wrapping, `--space-2xl` above |

### §9.17 Arbor Diagram

| Part | Rule |
|---|---|
| Canvas | `--bg-primary` with a dot grid (`24px` spacing, `--border` dots, `1px`), `min-height: 600px` |
| Node | `--bg-surface`, `1px solid var(--border)`, `--radius-md`, `--space-sm --space-md` padding, `--shadow-card`. At most `200px` wide, at least `80px` high, centered text. It shows the evidence **title** (`--text-h4`, weight 600, `--text-primary`) and the **primary verse** below it (`--text-small`, italic, `--text-muted`) |
| Edges | Behind the nodes, `1.5px`, `--border-strong`, round caps |
| Hover | On a node: `--shadow-card-hover` and `scale(1.02)`. After 300ms a tooltip shows title, verse and description |
| Click | Opens the evidence page |
| Zoom | Two icon buttons, zoom in and zoom out, in a bar fixed to the bottom of the canvas (`--bg-surface`, `1px solid var(--border)` top edge, centered). Range `0.05×` to `1.0×`, step `1.25×`. Drag to pan. These bounds differ from the Timeline's (`0.3×`–`3.0×`) |
| Mobile (<768px) | Nodes stack top to bottom at full width. The page scrolls. No zoom bar and no pan |

Node types:

| Type | Node | Edge |
|---|---|---|
| Root | `2px solid var(--accent)` border, `--bg-surface-alt` fill | Root-to-child edges: `2px`, `--accent` |
| Supports / leads_to | The standard node | The standard edge |
| Related | Dashed `--border-strong` border | Dashed (`6 4`) |

### §9.18 Verse & Code Blocks

| Class | Look |
|---|---|
| `.verse-block` | Monospace, `--text-small`, `--bg-surface-alt` fill, `1px solid var(--border)` border, `3px solid var(--accent-gold)` left border, `--radius-md`, padding `0.75rem 1rem`, margin `--space-lg 0` |
| `.verse-block--subtle` | Transparent, no border, `2px solid var(--border)` left border, `--text-secondary`, padding `0.5rem 0.75rem` |
| `.code-block` | The verse block with `--text-secondary` text and wrapped lines. No line numbers |
| `.verse-ref` | Inline reference: monospace, `--text-small`, weight 600, small caps |
