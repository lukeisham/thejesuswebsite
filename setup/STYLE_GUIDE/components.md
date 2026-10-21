_Part of the [Style Guide](INDEX.md) — §8: core components._

---

## §8 Core Components

The frontend and the admin keep separate stylesheets (D-017). Where a component exists in both, each side writes the same look in its own tokens.

| § | Component | § | Component |
|---|---|---|---|
| 8.1 | Buttons | 8.10 | Filter Chips |
| 8.2 | Cards | 8.11 | Detail Panel |
| 8.3 | Pictures / Figures | 8.12 | Tables |
| 8.4 | News & Blog Row Layout | 8.13 | Forms |
| 8.5 | Evidence List Row | 8.14 | Status Badges |
| 8.6 | Content Badges | 8.15 | Breadcrumbs |
| 8.7 | Timeline | 8.16 | Breakout / Side Content |
| 8.8 | Map | 8.17 | Infinite Scroll |
| 8.9 | Filters | 8.18 | Toasts / Notifications |

### §8.1 Buttons

| Variant | Look | Hover |
|---|---|---|
| Primary | `--accent` background, white text, `--shadow-sm` | `--link-hover` background, `--shadow-md` |
| Secondary | Transparent, `1px solid var(--accent)`, `--accent` text | `--bg-surface-alt` background |
| Ghost | Transparent, `--text-secondary` text | Underline and `--link-hover` text |

| Size | Padding | Font size | Min height |
|---|---|---|---|
| sm | `0.375rem 0.75rem` | `--text-xs` | `36px` |
| md (default) | `--space-sm --space-md` | `--text-small` | `44px` |
| lg | `--space-md --space-lg` | `--text-body` | — |

- Hover lift: `translateY(-1px)` (ghost: none).
- Border-radius `4px`. Font-weight `500`.
- Disabled: `0.5` opacity, `not-allowed` cursor, no shadow, no lift.

### §8.2 Cards

- `--bg-surface` background, `--shadow-card`, `8px` radius, `1.5rem` padding.
- Hover: lift and `--shadow-card-hover` (§6.2).
- Optional top image (`.card-image-top`): the image runs edge to edge. The text sits below it with `1.5rem` padding.

### §8.3 Pictures / Figures

| Part | Rule |
|---|---|
| Image | `1px solid var(--border)` border and `4px` radius. Same look as form fields |
| Caption | `--space-sm` below the image, `--text-small`, italic, `--text-secondary` |
| Figure numbering | JS (`utils/figures.js`) prefixes each caption with a bold `Fig. N — `. It counts every `<figure>` in one container. The count restarts per page, not per section. Lists that load more items (infinite scroll) number again after each batch |
| Markup | `<figure>` / `<figcaption>`. Every `<img>` needs an `alt` attribute |
| Side-floated figures | `.figure-align-left` / `.figure-align-right`, from `[figure align="…"]` (§14.1.1). From `1024px` they float outside the reading column, `320px` wide at most. Below `1024px` they are full width |
| Print | Caption `9pt` italic black. A figure never splits across pages. Side-floated figures become full-width blocks |

#### §8.3.1 Standard figure box (`.figure-standard`)

A predictable display box for a figure's rendered size. The Evidence module uses it (§9.3).

| Part | Rule |
|---|---|
| Tokens | `--figure-standard-width: 720px`, `--figure-standard-height: 480px`, `--figure-mobile-max-height: 70vh` (`variables.css`) |
| The box | `720 × 480` maximum. A 3:2 landscape fills `720 × 480`. A 2:3 portrait is height-bound at `320 × 480`, so both orientations take a similar vertical space |
| Mobile (`≤767px`) | The width cap no longer matters, so portraits and squares get the `70vh` height cap. A tall picture never fills a whole phone screen |
| Side-floats | Never combined. A figure is either a standard box or a side-floated figure, never both |
| Print | The box is screen-only. Printed figures are unconstrained, up to the page width |
| Upload bound | §11.2 |

### §8.4 News & Blog Row Layout

The News & Blog landing page and both feed pages (News, Blog) share one row layout. Each row is a link, not a card.

| Part | Rule |
|---|---|
| Layout | Thumbnail left, text right, `--space-md` gap. The list is one column at every width, centered, `--measure-narrow` (760px) wide |
| Separator | `1px solid var(--border)` between rows. No border under the last row |
| Hover | `--bg-surface-alt` background tint. No lift, no shadow |
| Thumbnail | `80 × 80px`, cropped to fill (`object-fit: cover`), `--radius-sm`. With no image: `--bg-surface-alt` fill and a `1px dashed var(--border)` outline |
| Title | `--text-body`, weight 600 |
| Meta line | `--text-xs`, `--text-muted`, one line with an ellipsis. News: `Author · Publisher · Date`, publisher in italic. Blog: the date only |
| Excerpt (blog only) | `--text-small`, `--text-secondary`. Plain text from the post, at most 150 characters, cut at a word boundary and ended with `…`. Bold and italic from the post stay |
| Back link (feed pages) | `← Back to News & Blog`, `--text-small`, `--text-muted` |

### §8.5 Evidence List Row

The Evidence index is a list of rows, not cards.

| Part | Rule |
|---|---|
| Row | One link per row: thumbnail left, text right, `--space-md` gap, `--space-md` padding |
| Separator | `1px solid var(--border)`, including a line above the first row. Hover: `--bg-surface-alt` |
| Thumbnail | `64 × 64px` (`56px` below `768px`), cropped to fill, `--radius-sm`. With no image: `--bg-surface-alt` fill and a `1px dashed var(--border)` outline |
| Title | `--text-body`, weight 500 (`--text-small` below `768px`) |
| Primary verse | Below the title. Monospace, `--text-small`, `--text-muted` |

### §8.6 Content Badges (public-facing)

Labels for keywords, search result types and the timeline tooltip category. Distinct from admin Status Badges — see §8.14.1.

| Property | Rule |
|---|---|
| Display | `inline-flex`, items centered |
| Background | `--bg-surface-alt` |
| Border | `1px solid var(--border)` |
| Text | `--text-secondary`, `--text-2xs`, weight 500 |
| Border radius | `--radius-sm` |
| Padding | `2px 8px` |
| Case | No uppercase — show the value as stored |
| Hover | None. Badges are labels, not links |
| Era colour | None. Era tints belong to Filter Chips only |

**CSS `[hidden]` rule**: a component class that sets `display` to anything but `none` needs a matching `.component[hidden] { display: none; }`. Otherwise the class overrides the `hidden` attribute. Example: `badges.css`.

### §8.7 Timeline

One horizontal timeline on `/evidence/timeline/`, plus one page per era (`/evidence/timeline/<era>.html`, which starts with that era active). On narrow screens it becomes vertical.

| Part | Rule |
|---|---|
| Canvas | `min-height: 600px`, `--bg-primary` with the Arbor dot grid (`24px` spacing, `--border` dots). The cursor is a grab hand |
| Spine | `2px` line, `--border-strong`, at vertical center |
| Era markers | `1px` vertical lines at each era boundary, `--border` at `0.6` opacity, no label (Era Headings carry the labels). Spine and markers keep their thickness at every zoom level and never go thinner than `1px` |
| Dots | `10px` circles with a `1px solid var(--bg-surface)` ring. Fill: the era token (`era--<kebab>` class); `--accent` when no era. Hover: `scale(1.3)` and a `4px` halo. Every dot of the same period glows with it |
| Labels | Event title (`--text-2xs`, weight 500, two lines at most, at most `100px` wide) starting just right of its dot, with a muted meta line. If that spot is taken the label tries the left side, then moves up or down and gets a **leader line** (1px, `--text-muted`) from the start of its name to the dot. A label never covers a dot or another label. In a dense cluster a label shrinks to one line or hides. The admin editor places titles with the same code |
| Tooltip | After a 200ms hover: title, location, category badge, verse |
| Detail panel | Click, or `Enter` / `Space` on a focused dot: §8.11 |
| Zoom (≥768px) | Two icon buttons, zoom in and zoom out, no reset. Range `0.3×` to `3.0×`, step `1.25×`. Drag with mouse or touch to pan. No scrollbar |
| Stacks (zoomed out) | Events within `44px` on screen along the time axis gather in a column of dots, `13px` apart, at their mean position, with a count badge (`.timeline-stack`, a button) on top. Below `0.6×` events sit in stacks; from `1.0×` (the default) each event sits exactly where the admin put it; in between each moves from its stack spot to its exact spot. Titles of stacked events are hidden. A click, `Enter` or `Space` on a stack zooms to at most `2×`, centres its events and the spine, and the stack dissolves. The admin editor never stacks |
| Era chips | Filter Chips (§8.10) do two things at once. They fade dots and labels outside the era to `0.15` opacity, and they move the view to center that era at `1.0×`. "All Eras" clears the fade and resets to `1.0×`, unpanned |
| Mobile (<768px) | The spine runs top to bottom, labels sit left and right of it, and the page scrolls normally. No zoom controls and no pan. A chip click scrolls the first dot of that era into view |
| Empty state | "No events in this period." |
| Admin | The timeline editor (§13.2) uses the same look in admin tokens, on desktop only |

**Colour scheme** (shared with Map pins):

| Marker | Rule |
|---|---|
| Era | Fill from the `--era-*` tokens. A label or tooltip always carries the meaning too (WCAG) |
| People and places | `gospel_category` of `people` or `places` gives a white roundel (`--color-white` fill, `--color-black` ring) |
| Objects | `--text-muted` fill |

Category rules come after era rules (CSS-5). Keep `timeline/timeline-dots.css` and `maps-pins.css` identical in look.

#### §8.7.1 Era Headings

| Part | Rule |
|---|---|
| Element | `<h3 class="timeline-era-heading">` in a **band** at the top of the timeline canvas (`--timeline-heading-band-height`), outside the zoomed world, so the dots never sit under a heading. Uppercase, `letter-spacing: 0.08em`, `--timeline-heading-font-size`, weight 600, `--text-primary`, no pointer events |
| Size | Fixed at every zoom level. The era colour is on a `--timeline-heading-bar-height` bar under the band that spans the era, not on the text (the era tints are too light to read as text) |
| Lanes | A heading takes the first of three lanes where it fits. A heading that is wider than its era, or that sits in a lower lane, gets a 2px leader line in the era colour down to its bar |
| Mobile (<768px) | Headings sit to the **left** of the vertical spine, at the era's start, and keep the older scaled style |
| Print | Black |

### §8.8 Map

| Part | Rule |
|---|---|
| Overview | A grid of map cards, `repeat(auto-fill, minmax(280px, 1fr))`, gap `--card-gap`. One column below `768px` |
| Detail | The map image sits in a viewport with a `1px solid var(--border)` border, `--radius-md`, and a `--bg-surface-alt` fill |
| Pins | `16px` circle, `2px solid var(--bg-surface)` ring, label chip below (`--text-2xs`, `--bg-surface`, `1px` border, `--radius-sm`). Colouring follows the Timeline scheme (§8.7): era-token fill, people and places as white roundels with a black ring, objects muted (`maps-pins.css`). Hover: `scale(1.3)` and a `4px` halo |
| Zoom | Buttons zoom in, zoom out and reset; keys `+` and `-` also zoom. Range `0.5×` to `3.0×`, step `0.25×`. Drag to pan |
| Tooltip | After a 200ms hover: pin label and the linked evidence title |
| Click a pin | Opens the evidence page in a new tab |

### §8.9 Filters

- The filter bar (`.filter-bar`) sits below the page heading. A "Filters" toggle button, `36px` high, collapses and expands the chip row over `--duration-base`.
- The Evidence list has chips for "All", the eight eras (`timeline_era`) and the gospel categories (`gospel_category`). "All" clears the filter.
- The URL query holds the active filter, so a filtered view can be shared.
- The Search page uses one chip per result type (§10.1).

### §8.10 Filter Chips

Used on the frontend and in the admin to filter lists by category, type or era. Distinct from Content Badges: chips are interactive; badges are static labels.

| Property | Frontend | Admin |
|---|---|---|
| Display | `inline-flex`, items centered, `white-space: nowrap` | same |
| Padding | `0.375rem 0.75rem` | `var(--space-xs) var(--space-sm)` = `4px 8px` |
| Font size | `--text-xs` (`0.8125rem`) | `11px` |
| Font weight | `500`; `600` when active | same |
| Border radius | `999px` (pill) | `999px` (pill) |
| Min height | `36px` | `32px` |
| Border | `1px solid` the neutral border token; the accent colour when active | same |

| State | Look |
|---|---|
| Hover | Background shifts to the surface-alt token (`--duration-fast`) |
| Active | Surface-alt background, accent border and text, weight `600` |
| Focus-visible | `2px solid` accent outline, `2px` offset |

**Era colour** (timeline era chips, both systems):

- Inactive: `3px` left border in the matching `--era-*` token. The rest of the chip stays neutral.
- Active: the whole chip fills with the era token, and the border takes the same colour.
- The `.era--<kebab-era>` class sits next to `.filter-chip` (frontend) / `.admin-timeline-era-filter__chip` (admin). Label text still carries the meaning (WCAG).
- Each system has its own stylesheet (`filters/filter-chips.css`, `admin-diagrams/timeline-era-filter.css`) because the two systems stay separate (D-017).

### §8.11 Detail Panel

The only public overlay. The Timeline uses it.

| Part | Rule |
|---|---|
| Position | Fixed to the bottom-right, `--space-lg` from the edges. `320px` wide (`100vw − --space-2xl` at most). Below `768px` it spans the width with `--space-sm` insets |
| Look | `--bg-surface`, `1px solid var(--border)`, `--radius-md`, `--shadow-card-hover`, `--space-lg` padding |
| Content | Title (`--text-h4`), location, verse (monospace), "View Details" link, ghost close button |
| Closing | The close button, a click outside, `Esc`, or an era chip click. Focus returns to the dot that opened it |

### §8.12 Tables

| Kind | Look |
|---|---|
| Body tables (`.content-table`, from Markdown pipe tables, §9.1) | `1px solid var(--border)` cell borders, `--space-xs --space-sm` cell padding, top-aligned text. Header cells: `--bg-surface-alt` fill, weight 600, `2px solid var(--border-strong)` underline. Below `768px` the table scrolls sideways and each cell is at least `120px` wide. In print the borders are solid black |
| Data tables (`.table`, `components/tables.css`) | Sticky header, even rows tinted `--bg-surface-alt`, row hover tint. With `.table-responsive`, rows become stacked cards below `768px`. No public page uses `.table` today |

### §8.13 Forms

- The only public form control is the Search input (§10.1): `min-height: 56px`, `--text-h3` text, `2px solid var(--border)` border, `--radius-md`. Focus: `--accent` border plus a `2px --accent` ring. Placeholder: `--text-muted`.
- Everywhere else the global focus ring applies: `2px solid var(--accent)`, `2px` offset (`:focus-visible` in `reset.css`).
- Admin forms are in §13.1.

### §8.14 Status Badges (admin only — frontend only shows published content)

One shared colour scheme for every admin surface that shows publish state, including the Arbor holding-pen and canvas badges.

| Status | Background | Text |
|---|---|---|
| Published | `rgba(40, 167, 69, 0.12)` | `--admin-success` |
| Draft | `--admin-draft-bg` | `--admin-draft-color` |

- Font size `--text-xs`. Weight `600`. Radius `6px`. Padding `2px 8px`. No uppercase.
- Classes: `.admin-badge--*` (tables), `.admin-arbor-pen__badge--*` (holding pen).

#### §8.14.1 Chip Type Classification

All four chip and badge variants at a glance. Admin `--text-xs` is `11px`; admin `--text-small` is `12px`.

| Type | Font-size | Padding | Radius | Font-weight | Frontend selector | Admin selector |
|---|---|---|---|---|---|---|
| Content badge | `--text-2xs` (`0.75rem`) | `2px 8px` | `4px` | `500` | `.badge` | — (frontend-only) |
| Filter chip | `--text-xs` | `0.375rem 0.75rem` (frontend) / `4px 8px` (admin) | `999px` (pill) | `500` / `600` active | `.filter-chip` | `.admin-timeline-era-filter__chip` |
| Pen / holding chip | `--text-small` | `4px 8px` | `4px` | — | — (admin-only) | `.admin-arbor-pen__chip`, `.holding-pen__chip`, `.admin-resources-pen__chip` |
| Status badge | `--text-xs` | `2px 8px` | `6px` | `600` | — (admin-only) | `.admin-badge--*`, `.admin-arbor-pen__badge--*` |

### §8.15 Breadcrumbs

Detail pages only (evidence, essay, response, historiography, blog, challenge): `Home / Section / Page title`.

| Part | Rule |
|---|---|
| Size and spacing | Font size `--text-small` (`--text-xs` below `768px`). Padding `--space-md 0`. Items wrap |
| Ancestors | `--text-muted`, no underline. Hover: `--link-hover` and underline |
| Current page | `--text-primary` |
| Separator | `/` in `--text-muted`, margin `0 --space-sm` |

### §8.16 Breakout / Side Content

Supplementary information inside long-form content.

| Part | Rule |
|---|---|
| Background | `--bg-surface-alt` |
| Left border | `3px solid var(--accent-gold)` |
| Border radius | `--radius-sm` |
| Padding | `var(--space-md) var(--space-lg)` |
| Margin | `var(--space-lg) 0` |
| Title | `--text-h4`, weight 600, `--accent` |
| Body text | `--text-body`, `--text-secondary` |
| Collapsible variant | Right-aligned chevron that turns 180° when open. The body expands over `--duration-base` |
| Print | No background; left border `3px solid var(--border-strong)` |

### §8.17 Infinite Scroll

Used on the Evidence, Essays, Responses, Historiography, Challenges, Blog, News, Resources and Wikipedia lists.

- The next batch loads when the reader is within `300px` of the list end.
- A single centered spinner shows while loading.
- When the list ends: "All N items loaded" (the noun fits the list) in `--text-small`, `--text-muted`, centered.
- No numbered pagination on the public site.
- The Evidence, News and Blog lists keep loaded items and scroll position in `sessionStorage`. Back navigation restores them.

### §8.18 Toasts / Notifications

| Property | Rule |
|---|---|
| Position | Bottom-center, `24px` above the bottom edge |
| Width | `min(360px, calc(100vw - 2rem))` |
| Stacking | New toasts appear above older ones. Three show at once; further toasts wait in a queue until a slot frees |
| Animation | §6.2 |
| Manual dismiss | An `x` button (Feather `x` icon) on every toast |
| Look | `--shadow-toast`, `--radius-md`, padding `var(--space-md) var(--space-lg)` |

Each variant has a `4px` left border on a `--bg-surface` background:

| Variant | Border | Auto-dismiss |
|---|---|---|
| Success | `--success` | 4 seconds |
| Info (default) | `--info` | 4 seconds |
| Warning | `--warning` | 7 seconds |
| Error | `--error` | 7 seconds |

#### §8.18.1 Error details and Copy

For errors that carry details a reader can copy. `showToast(message, "error", { details })` shows the details under the message in `--font-mono` and `--text-muted`, and adds a Copy button. Copy puts the message and details on the clipboard, then the button reads "Copied". An error toast without details has no Copy button. Position, width, stacking and the 7-second auto-dismiss are the same as for every toast.
