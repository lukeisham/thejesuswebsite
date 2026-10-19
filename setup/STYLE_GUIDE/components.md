_Part of the [Style Guide](INDEX.md) — §8: core components._

---

## 8. Core Components

The frontend and the admin keep separate stylesheets (D-017). Where a component exists in both, each side writes the same look in its own tokens.

### Buttons
- Primary: `--accent` background, white text, `--shadow-sm`. Hover: `--link-hover` background, `--shadow-md`.
- Secondary: transparent, `1px solid var(--accent)`, `--accent` text. Hover: `--bg-surface-alt` background.
- Ghost: transparent, `--text-secondary` text. Hover: underline and `--link-hover` text.
- Hover lift: `translateY(-1px)` (ghost: none).
- Sizes:
  - **sm**: padding `0.375rem 0.75rem`, `--text-xs`, `min-height: 36px`
  - **md** (default): padding `--space-sm --space-md`, `--text-small`, `min-height: 44px`
  - **lg**: padding `--space-md --space-lg`, `--text-body`
- Border-radius `4px`. Font-weight `500`.
- Disabled: `0.5` opacity, `not-allowed` cursor, no shadow, no lift.

### Cards
- `--bg-surface` background, `--shadow-card`, `8px` radius, `1.5rem` padding.
- Hover: lift and `--shadow-card-hover` (see §6).
- Optional top image (`.card-image-top`): the image runs edge to edge. The text sits below it with `1.5rem` padding.

### Pictures / Figures
- **Image**: `1px solid var(--border)` border and `4px` radius. Same look as form fields.
- **Caption**: `--space-sm` below the image, `--text-small`, italic, `--text-secondary`.
- **Figure numbering**: JS (`utils/figures.js`) prefixes each caption with a bold `Fig. N — `. It counts every `<figure>` in one container. The count restarts per page, not per section. Lists that load more items (infinite scroll) number again after each batch.
- **Markup**: `<figure>` / `<figcaption>`. Every `<img>` needs an `alt` attribute.
- **Side-floated figures** (`.figure-align-left` / `.figure-align-right`, from `[figure align="…"]`, §14): from `1024px` they float outside the reading column, `320px` wide at most. Below `1024px` they are full width.
- **Print**: caption `9pt` italic black. A figure never splits across pages. Side-floated figures become full-width blocks.

#### Standard figure box (`.figure-standard`)
A predictable display box for a figure's rendered size. The Evidence module uses it (see §9).

- **Tokens**: `--figure-standard-width: 720px`, `--figure-standard-height: 480px`, `--figure-mobile-max-height: 70vh` (`variables.css`)
- **The box**: `720 × 480` maximum. A 3:2 landscape fills `720 × 480`. A 2:3 portrait is height-bound at `320 × 480`, so both orientations take a similar vertical space.
- **Mobile** (`≤767px`): the width cap no longer matters, so portraits and squares get the `70vh` height cap. A tall picture never fills a whole phone screen.
- **Never combined with side-floats**: a figure is either a standard box or a side-floated figure, never both.
- **Print**: the box is screen-only. Printed figures are unconstrained, up to the page width.
- **Upload bound**: see §11.

### News & Blog Row Layout
The News & Blog landing page and both feed pages (News, Blog) share one row layout. Each row is a link, not a card.

- **Layout**: thumbnail left, text right, `--space-md` gap. The list is one column at every width, centered, `--measure-narrow` (760px) wide.
- **Separator**: `1px solid var(--border)` between rows. No border under the last row.
- **Hover**: `--bg-surface-alt` background tint. No lift, no shadow.
- **Thumbnail**: `80 × 80px`, cropped to fill (`object-fit: cover`), `--radius-sm`. With no image: `--bg-surface-alt` fill and a `1px dashed var(--border)` outline.
- **Title**: `--text-body`, weight 600.
- **Meta line**: `--text-xs`, `--text-muted`, one line with an ellipsis. News: `Author · Publisher · Date`, publisher in italic. Blog: the date only.
- **Excerpt** (blog only): `--text-small`, `--text-secondary`. Plain text from the post, at most 150 characters, cut at a word boundary and ended with `…`. Bold and italic from the post stay.
- **Back link** on the feed pages: `← Back to News & Blog`, `--text-small`, `--text-muted`.

### Evidence List Row
The Evidence index is a list of rows, not cards.

- One link per row: thumbnail left, text right, `--space-md` gap, `--space-md` padding.
- Rows are divided by `1px solid var(--border)`, including a line above the first row. Hover: `--bg-surface-alt`.
- Thumbnail: `64 × 64px` (`56px` below `768px`), cropped to fill, `--radius-sm`. With no image: `--bg-surface-alt` fill and a `1px dashed var(--border)` outline.
- Title: `--text-body`, weight 500 (`--text-small` below `768px`). Primary verse below it: monospace, `--text-small`, `--text-muted`.

### Content Badges (public-facing)
Labels for keywords, search result types and the timeline tooltip category. Distinct from admin Status Badges — see the Chip Type Classification table below.

- Display: `inline-flex`, items centered
- Background: `--bg-surface-alt`
- Border: `1px solid var(--border)`
- Text: `--text-secondary`, `--text-2xs`, weight 500
- Border radius: `--radius-sm`
- Padding: `2px 8px`
- No uppercase — show the value as stored.
- No hover state — badges are labels, not links.
- No era colour — era tints belong to Filter Chips only.

**CSS `[hidden]` rule**: a component class that sets `display` to anything but `none` needs a matching `.component[hidden] { display: none; }`. Otherwise the class overrides the `hidden` attribute. Example: `badges.css`.

### Timeline
One horizontal timeline on `/evidence/timeline/`, plus one page per era (`/evidence/timeline/<era>.html`, which starts with that era active). On narrow screens it becomes vertical.

- **Canvas**: `min-height: 600px`, `--bg-primary` with the Arbor dot grid (`24px` spacing, `--border` dots). The cursor is a grab hand.
- **Spine**: `2px` line, `--border-strong`, at vertical center.
- **Era markers**: `1px` vertical lines at each era boundary, `--border` at `0.6` opacity, no label (Era Headings carry the labels). Spine and markers keep their thickness at every zoom level and never go thinner than `1px`.
- **Dots**: `10px` circles with a `1px solid var(--bg-surface)` ring. Fill: the era token (`era--<kebab>` class); `--accent` when no era. Hover: `scale(1.3)` and a `4px` halo. Every dot of the same period glows with it.
- **Colour scheme** (shared with Map pins):
  - Era colour: fill from the `--era-*` tokens. A label or tooltip always carries the meaning too (WCAG).
  - People and places: `gospel_category` of `people` or `places` gives a white roundel (`--color-white` fill, `--color-black` ring). Objects use `--text-muted` fill. Category rules come after era rules (CSS-5).
  - Keep `timeline/timeline-dots.css` and `maps-pins.css` identical in look.
- **Labels**: event title (`--text-2xs`, weight 500, two lines at most, at most `100px` wide) starting just right of its dot, with a muted meta line. If that spot is taken the label tries the left side, then moves up or down and gets a **leader line** (1px, `--text-muted`) from the start of its name to the dot. A label never covers a dot or another label. In a dense cluster a label shrinks to one line or hides. The admin editor places titles with the same code.
- **Tooltip** (after a 200ms hover): title, location, category badge, verse.
- **Detail panel** (click, or `Enter` / `Space` on a focused dot): see Detail Panel below.
- **Zoom** (≥768px): two icon buttons, zoom in and zoom out, no reset. Range `0.3×` to `3.0×`, step `1.25×`. Drag with mouse or touch to pan. No scrollbar.
- **Stacks** (zoomed out): events within `44px` on screen along the time axis gather in a column of dots, `13px` apart, at their mean position, with a count badge (`.timeline-stack`, a button) on top. Below `0.6×` events sit in stacks; from `1.0×` (the default) each event sits exactly where the admin put it; in between each moves from its stack spot to its exact spot. Titles of stacked events are hidden. A click, `Enter` or `Space` on a stack zooms to at most `2×`, centres its events and the spine, and the stack dissolves. The admin editor never stacks.
- **Era chips** (Filter Chips, below) do two things at once. They fade dots and labels outside the era to `0.15` opacity, and they move the view to center that era at `1.0×`. "All Eras" clears the fade and resets to `1.0×`, unpanned.
- **Mobile** (<768px): the spine runs top to bottom, labels sit left and right of it, and the page scrolls normally. No zoom controls and no pan. A chip click scrolls the first dot of that era into view.
- **Empty state**: "No events in this period."
- **Admin**: the timeline editor (§13) uses the same look in admin tokens, on desktop only.

#### Era Headings
- `<h3 class="timeline-era-heading">` in a **band** at the top of the timeline canvas (`--timeline-heading-band-height`), outside the zoomed world, so the dots never sit under a heading. Uppercase, `letter-spacing: 0.08em`, `--timeline-heading-font-size`, weight 600, `--text-primary`, no pointer events.
- **Size**: fixed at every zoom level. The era colour is on a `--timeline-heading-bar-height` bar under the band that spans the era, not on the text (the era tints are too light to read as text).
- **Lanes**: a heading takes the first of three lanes where it fits. A heading that is wider than its era, or that sits in a lower lane, gets a 2px leader line in the era colour down to its bar.
- **Mobile** (<768px): headings sit to the **left** of the vertical spine, at the era's start, and keep the older scaled style.
- **Print**: black.

### Map
- **Overview**: a grid of map cards, `repeat(auto-fill, minmax(280px, 1fr))`, gap `--card-gap`. One column below `768px`.
- **Detail**: the map image sits in a viewport with a `1px solid var(--border)` border, `--radius-md`, and a `--bg-surface-alt` fill.
- **Pins**: `16px` circle, `2px solid var(--bg-surface)` ring, label chip below (`--text-2xs`, `--bg-surface`, `1px` border, `--radius-sm`). Colouring follows the Timeline scheme above: era-token fill, people and places as white roundels with a black ring, objects muted (`maps-pins.css`). Hover: `scale(1.3)` and a `4px` halo.
- **Zoom**: buttons zoom in, zoom out and reset; keys `+` and `-` also zoom. Range `0.5×` to `3.0×`, step `0.25×`. Drag to pan.
- **Tooltip** (after a 200ms hover): pin label and the linked evidence title.
- **Click a pin**: opens the evidence page in a new tab.

### Filters
- The filter bar (`.filter-bar`) sits below the page heading. A "Filters" toggle button, `36px` high, collapses and expands the chip row over `--duration-base`.
- The Evidence list has chips for "All", the eight eras (`timeline_era`) and the gospel categories (`gospel_category`). "All" clears the filter.
- The URL query holds the active filter, so a filtered view can be shared.
- The Search page uses one chip per result type (§10).

### Filter Chips
Used on the frontend and in the admin to filter lists by category, type or era. Distinct from Content Badges: chips are interactive; badges are static labels.

- Display: `inline-flex`, items centered, `white-space: nowrap`
- Padding: `0.375rem 0.75rem` (frontend) / `var(--space-xs) var(--space-sm)` = `4px 8px` (admin)
- Font-size: `--text-xs` (frontend `0.8125rem`; admin `11px`)
- Font-weight: `500`; `600` when active
- Border-radius: `999px` (pill), frontend and admin
- Min-height: `36px` (frontend) / `32px` (admin)
- Border: `1px solid` the neutral border token; the accent colour when active
- **States**:
  - Hover: background shifts to the surface-alt token (`--duration-fast`)
  - Active: surface-alt background, accent border and text, weight `600`
  - Focus-visible: `2px solid` accent outline, `2px` offset
- **Era colour** (timeline era chips, both systems):
  - Inactive: `3px` left border in the matching `--era-*` token. The rest of the chip stays neutral.
  - Active: the whole chip fills with the era token, and the border takes the same colour.
  - The `.era--<kebab-era>` class sits next to `.filter-chip` (frontend) / `.admin-timeline-era-filter__chip` (admin). Label text still carries the meaning (WCAG).
  - Each system has its own stylesheet (`filters/filter-chips.css`, `admin-diagrams/timeline-era-filter.css`) because the two systems stay separate (D-017).

### Detail Panel
The only public overlay. The Timeline uses it.

- Fixed to the bottom-right, `--space-lg` from the edges. `320px` wide (`100vw − --space-2xl` at most). Below `768px` it spans the width with `--space-sm` insets.
- `--bg-surface`, `1px solid var(--border)`, `--radius-md`, `--shadow-card-hover`, `--space-lg` padding.
- Content: title (`--text-h4`), location, verse (monospace), "View Details" link, ghost close button.
- Closes on the close button, a click outside, `Esc`, or an era chip click. Focus returns to the dot that opened it.

### Tables
- **Body tables** (`.content-table`, from Markdown pipe tables, §9): `1px solid var(--border)` cell borders, `--space-xs --space-sm` cell padding, top-aligned text. Header cells: `--bg-surface-alt` fill, weight 600, `2px solid var(--border-strong)` underline. Below `768px` the table scrolls sideways and each cell is at least `120px` wide. In print the borders are solid black.
- **Data tables** (`.table`, `components/tables.css`): sticky header, even rows tinted `--bg-surface-alt`, row hover tint. With `.table-responsive`, rows become stacked cards below `768px`. No public page uses `.table` today.

### Forms
- The only public form control is the Search input (§10): `min-height: 56px`, `--text-h3` text, `2px solid var(--border)` border, `--radius-md`. Focus: `--accent` border plus a `2px --accent` ring. Placeholder: `--text-muted`.
- Everywhere else the global focus ring applies: `2px solid var(--accent)`, `2px` offset (`:focus-visible` in `reset.css`).
- Admin forms are in §13.

### Status Badges (Admin only — frontend only shows published content)
One shared colour scheme for every admin surface that shows publish state, including the Arbor holding-pen and canvas badges.

- **Published**: `rgba(40, 167, 69, 0.12)` background, `--admin-success` text
- **Draft**: `--admin-draft-bg` background, `--admin-draft-color` text
- Font-size: `--text-xs`. Weight `600`. Radius `6px`. Padding `2px 8px`. No uppercase.
- Classes: `.admin-badge--*` (tables), `.admin-arbor-pen__badge--*` (holding pen).

#### Chip Type Classification
All four chip and badge variants at a glance. Admin `--text-xs` is `11px`; admin `--text-small` is `12px`.

| Type | Font-size | Padding | Radius | Font-weight | Frontend selector | Admin selector |
|---|---|---|---|---|---|---|
| Content badge | `--text-2xs` (`0.75rem`) | `2px 8px` | `4px` | `500` | `.badge` | — (frontend-only) |
| Filter chip | `--text-xs` | `0.375rem 0.75rem` (frontend) / `4px 8px` (admin) | `999px` (pill) | `500` / `600` active | `.filter-chip` | `.admin-timeline-era-filter__chip` |
| Pen / holding chip | `--text-small` | `4px 8px` | `4px` | — | — (admin-only) | `.admin-arbor-pen__chip`, `.holding-pen__chip`, `.admin-resources-pen__chip` |
| Status badge | `--text-xs` | `2px 8px` | `6px` | `600` | — (admin-only) | `.admin-badge--*`, `.admin-arbor-pen__badge--*` |

### Breadcrumbs
Detail pages only (evidence, essay, response, historiography, blog, challenge): `Home / Section / Page title`.

- Font size `--text-small` (`--text-xs` below `768px`). Padding `--space-md 0`. Items wrap.
- Ancestors: `--text-muted`, no underline. Hover: `--link-hover` and underline.
- Current page: `--text-primary`.
- Separator: `/` in `--text-muted`, margin `0 --space-sm`.

### Breakout / Side Content
Supplementary information inside long-form content.

- Background: `--bg-surface-alt`
- Left border: `3px solid var(--accent-gold)`
- Border radius: `--radius-sm`
- Padding: `var(--space-md) var(--space-lg)`
- Margin: `var(--space-lg) 0`
- Title: `--text-h4`, weight 600, `--accent`
- Body text: `--text-body`, `--text-secondary`
- Collapsible variant: right-aligned chevron that turns 180° when open. The body expands over `--duration-base`.
- Print: no background; left border `3px solid var(--border-strong)`.

### Infinite Scroll
Used on the Evidence, Essays, Responses, Historiography, Challenges, Blog, News, Resources and Wikipedia lists.

- The next batch loads when the reader is within `300px` of the list end.
- A single centered spinner shows while loading.
- When the list ends: "All N items loaded" (the noun fits the list) in `--text-small`, `--text-muted`, centered.
- No numbered pagination on the public site.
- The Evidence, News and Blog lists keep loaded items and scroll position in `sessionStorage`. Back navigation restores them.

### Toasts / Notifications
- **Position**: bottom-center, `24px` above the bottom edge.
- **Width**: `min(360px, calc(100vw - 2rem))`
- **Stacking**: new toasts appear above older ones. Three show at once; further toasts wait in a queue until a slot frees.
- **Auto-dismiss**: 4 seconds for success and info; 7 seconds for warning and error.
- **Animation**: see §6.
- **Manual dismiss**: an `x` button (Feather `x` icon) on every toast.
- **Variants**: a `4px` left border on a `--bg-surface` background — `--success`, `--error`, `--warning`, `--info` (default).
- `--shadow-toast`, `--radius-md`, padding `var(--space-md) var(--space-lg)`.

#### Error Toast
For errors that carry details a reader can copy.

- Bottom-right, `16px` from the edges (`8px` and full width below `480px`). `min(280px, calc(100vw - 2rem))` wide.
- Background: `--error` mixed 5% into `--bg-surface`. `4px solid var(--error)` left border, `--radius-md`.
- Actions: Copy (message and details to the clipboard), Dismiss, and an `x` in the top-right corner. It never auto-dismisses.
