_Part of the [Style Guide](INDEX.md) — §8: core components._

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

#### Standard figure box (`.figure-standard`)
A predictable display box for a figure's rendered size, currently opted into by the Evidence module only (see §9):

- **Tokens**: `--figure-standard-width: 720px`, `--figure-standard-height: 480px`, `--figure-mobile-max-height: 70vh` (`variables.css`)
- **The box**: `720 × 480` maximum. A 3:2 landscape lands exactly on `720 × 480`; a 2:3 portrait is height-bound and lands on `320 × 480` — both orientations occupy a similar vertical footprint rather than one towering over the other.
- **How orientation is resolved without JS**: `width: auto` + `max-width: 720px` together with `height: auto` + `max-height: 480px` *is* the orientation check. With both dimensions `auto`, the browser picks whichever cap is binding (width or height) and derives the other dimension from the intrinsic ratio, so landscape and portrait both size correctly — before any JS runs, or if JS fails entirely (progressive enhancement, JS-2). This only works because *both* dimensions are `auto`: giving `width` a definite value (e.g. `min(100%, 720px)`) instead of `max-width` breaks it — the browser clips the used height to the cap without recomputing width, and the image's default `object-fit: fill` then stretches it to fit the mismatched box.
- **Explicit orientation classes**: `figure-orientation.js`'s `applyFigureOrientation()` reads the loaded image's `naturalWidth`/`naturalHeight` and stamps `figure--landscape` / `figure--portrait` / `figure--square` on the parent `<figure>`. A square image counts as portrait for sizing (at `720px` wide it would be `720px` tall, violating the height cap, so it is height-bound like a portrait). This class is what the mobile rule below hooks onto.
- **Mobile** (`≤767px`): the `720px` width cap is irrelevant once the column itself is narrower, so portraits (and squares) instead get the `--figure-mobile-max-height: 70vh` viewport-relative cap — a tall picture can never fill an entire phone screen.
- **Mutually exclusive with side-floats**: `.figure-standard` and the breakout/align float classes (`.figure-align-left/-right`, `.figure-breakout-left/-right`) are never combined on the same `<figure>` — a figure is either a standard box or a floated aside, never both.
- **Print**: the standard box is screen-only. Print output uses `width: auto; max-width: 100%; max-height: none` so paged figures are unconstrained by the display box (print.css loads before figures.css, so this rule must target `.figure-standard img` specifically — an unqualified `img` rule would lose the cascade, see Issues.md #108).
- **Upload standard**: see §12 — every image accepted through `/uploads` is standardised server-side to a `1440 × 960` bounding box (2× the display box, for retina sharpness) before it ever reaches this component.

### News & Blog Row Layout
The landing page and both endless-feed pages (News, Blog) share a consistent horizontal row layout. Each row is an `<a>` link containing an 80×80px thumbnail on the left and a text body on the right.

- **Row element**: `.news-blog-row` — `display: flex; flex-direction: row; gap: var(--space-md); align-items: flex-start`
- **Hover**: subtle `var(--bg-surface-alt)` background tint, no lift, no shadow, no border-radius change — rows are not cards
- **Separator**: `border-bottom: 1px solid var(--border)` between rows, no border on last row
- **Container**: `.news-blog-list` — `max-width: var(--measure-narrow); margin: auto` (single column, no grid)
- **Thumbnail**: `.news-blog-row-thumb` — `width: 80px; height: 80px; object-fit: cover; flex-shrink: 0; border-radius: var(--radius-sm)`
- **Empty thumbnail**: `.news-blog-row-thumb--empty` — `var(--bg-surface-alt)` fill with `1px dashed var(--border)`
- **Text body**: `.news-blog-row-body` — `flex: 1; min-width: 0`
- **Title**: `.news-blog-row-title` — `font-size: var(--text-body); font-weight: 600`
- **Meta line**: `.news-blog-row-meta` — `font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — format is `Author · Publisher · Date` (no "By" or "in" prefixes)
- **Excerpt** (blog only): `.news-blog-row-excerpt` — `font-size: var(--text-small); color: var(--text-secondary); margin-top: var(--space-xs)` — first ~150 characters of `blog_content` stripped of HTML
- **Breadcrumb**: `.news-blog-back-link` — inline-flex with `← Back to News & Blog`, present on both feed pages
- **Semantic markup**: `aria-hidden="true"` on empty-placeholder divs; real thumbnails use `alt=""` with `loading="lazy"`
- **Admin**: uses the shared `AdminImagePicker` widget for news thumbnails and blog hero images, uploading through the `/uploads` endpoint

### Evidence Card
- Title (h3)
- Short description
- Primary verse (styled)
- Badges: category, timeline period, location (see Content Badges below)
- "View Details" button

### Content Badges (public-facing)
Used on evidence cards and detail pages to label category, timeline period, and map location. Distinct from admin Status Badges — see the Chip Type Classification table below for how all chip variants compare.

- Display: `inline-flex`, items centered
- Background: `--bg-surface-alt` (`#F1EDE4`)
- Border: `1px solid var(--border)`
- Text: `--text-secondary`, `0.75rem` (`--text-2xs`), weight 500
- Border radius: `4px` (`--radius-sm`)
- Padding: `2px 8px`
- No uppercase — use the value as-is from the database (e.g. "Galilee", "beginning", "event")
- Displayed inline, wrapping if multiple badges present
- No hover state — badges are labels, not links
- No era colour highlight — era tints are reserved for Filter Chips, below

**CSS `[hidden]` conflict warning**: Any component class that sets a non-none `display` value (e.g. `display: flex`, `display: inline-flex`) must include a matching `[hidden]` selector to restore the browser’s native hidden behavior: `.component[hidden] { display: none; }`. This prevents the class’s `display` value from overriding the `hidden` attribute via author-vs-user-agent cascade priority. See `badges.css` line 24 for an example.

### Timeline
**Linear dot-style timeline with clustered events:**
- **Main axis**: horizontal line (timeline spine) spanning the full viewport width, positioned at vertical center
- **Visual spine**: thin line (`1px solid var(--border)`) representing chronological progression
- **Dots**: event markers positioned along the timeline spine, sized by importance or density
  - Standard dot: `10px`, `2px solid var(--bg-surface)` ring, fill per era (below); default fill `var(--accent)` when no era
  - Hover state: `scale(1.3)` with soft `box-shadow` halo
- **Colour coordination (shared with Map pins)** — one scheme across timeline dots and map pins:
  - **Era colour**: fill from the `--era-*` tokens in `variables.css` (e.g. `--era-passion-week`), applied via `era--<kebab>` classes. Never the only signal — labels/tooltips carry the meaning (WCAG).
  - **People & places roundel**: `gospel_category` of `people` or `places` overrides era colour with a white roundel — `var(--color-white)` fill, `var(--color-black)` ring (`dot-cat--person` / `dot-cat--place`). Objects use `var(--text-muted)` fill (`dot-cat--object`). Category overrides come after era rules in the cascade (CSS-5).
  - Implementations: `frontend/assets/css/pages/timeline/timeline-dots.css` and `frontend/assets/css/pages/maps-pins.css` — keep them mirrored.
- **Clustering**: when multiple events occur in same era, dots stack vertically above/below the spine in a compact cluster (staggered pattern)
- **Labels**: event title appears above or below the dot (depending on space); smaller secondary text below title shows date range and location
- **Interactions**:
  - Click a dot → open modal or navigate to evidence detail page
  - Hover a dot → show tooltip with full event name, date, and category badge
  - Hover near a cluster → highlight all dots in the cluster together
- **Era markers**: subtle vertical divisions at major era boundaries (e.g., "Birth", "Ministry", "Passion Week")
- **Era Headings**: prominent `<h3 class="timeline-era-heading">` elements anchored at the **top-left** of each era's spatial region (not centred above the spine, unlike the era markers above). Bold, uppercase, `letter-spacing: 0.08em`, coloured via the era's `--era-*` token, `pointer-events: none`.
  - **Zoom scaling**: font-size scales linearly with zoom from a `--text-h4` (1.125rem) base at 1×, clamped to `[--text-small, --text-h3]` (0.875rem–1.375rem) so headings stay readable at extremes (0.3×–3.0×). Position is computed once in world coordinates and does not recompute on zoom — only the rendering scale changes.
  - **Collision avoidance**: when an event node would overlap a heading's initial position, the heading nudges away — tier 1 shifts left, tier 2 shifts right, alternating per further tier (up to `MAX_TIER`, matching the shared cluster-label-collision escalation). Nudging never leaves the heading's own era's horizontal span; if clamping would undo a left nudge, the heading shifts right instead.
  - **Mobile (vertical mode, <768px)**: headings reposition to the **left of the vertical spine** rather than above it, anchored at the era's start y-coordinate; collision escalation still nudges horizontally (away from the fixed left offset) since the eras are now stacked top-to-bottom.
  - Placement is computed by a pure, DOM-free module (`timeline-era-heading-placement.js`) shared between frontend and the admin timeline diagram editor (SR-4) — admin is desktop-only and always passes `isMobile: false`.
  - Implementations: `frontend/assets/css/components/timeline-era-headings.css`, `admin/assets/css/admin-diagrams/timeline-era-headings.css`. Replaces the old centred `.timeline-era-label` element (removed).
- **Filter/zoom**: 
  - Era filter chips above the timeline to isolate periods (e.g., "All Eras", "Ministry Begins", "Passion Week")
  - Timeline remains continuous; filtered eras show their dots while others fade to `opacity: 0.3`
  - **Chip clicks have a dual effect**: filter/fade (as above) AND navigate — the chip also jumps the viewport to centre that era at normal zoom (`scale=1.0`), via `jumpToEra()` (`timeline-nav.js` / pure math in `timeline-transform.js`). The "All Eras" chip resets to `scale=1.0, pan=(0,0)`. Programmatic navigation uses the same `--duration-fast` / `--ease-out` timing as the manual zoom controls, and respects `prefers-reduced-motion: reduce` (transform applied instantly, no transition, when the user has requested reduced motion). On mobile (<768px), zoom/pan is disabled entirely, so a chip click instead scrolls the era's first dot horizontally into view (`scrollIntoView()`). Mirrored in the admin diagram editor (`admin-timeline/timeline-nav.js`) minus reduced-motion and mobile handling, since admin is desktop-only and transforms are always instantaneous there.
  - Draggable scroll on mobile; horizontal scroll bar on desktop if timeline overflows viewport
- **Scrolling**: timeline extends beyond viewport width; use `overflow-x: auto` with momentum scrolling on mobile
- **Empty state**: if no events in selected era, show centered message "No events in this period"
- **Line stability (desktop only)**: spine and era-marker lines hold a constant apparent thickness (2px spine / 1px marker) across all zoom levels. `.timeline-world`'s `scale()` transform inflates declared thickness along with everything else; `timeline/timeline-line-stability.css` cancels that by dividing declared thickness by a live `--timeline-zoom-scale` custom property that `timeline-zoom.js` sets on every transform update, floored with `max(1px, ...)` so zoomed-out lines never vanish. Drag-pan also adds a `.timeline-world--panning` class that suppresses the 150ms button-zoom transition, so panning tracks the pointer immediately while zoom buttons keep their smooth animation. Mobile (<768px) disables the transform entirely (`timeline-responsive.css`), so this behaviour is desktop-only. Mirrored in the admin diagram editor for era dividers (`admin/assets/js/admin-timeline/timeline-zoom.js`, `admin-diagrams/timeline-canvas.css`); the admin spine is a viewport pseudo-element outside the scaled `.admin-timeline-world` wrapper and needs no counter-scaling. Admin drag-pan now also rounds `panX`/`panY` to a 0.5px grid and suppresses the button-zoom transition during an active drag via `.admin-timeline-world--panning` (both added to the shared `AdminCanvasZoom` module), achieving full parity with the frontend behaviour.

### Map
- Clean base map
- Pins with labels: `16px` circle, `2px solid var(--bg-surface)` ring, label chip below
- Pin colouring mirrors the Timeline scheme above — era-token fill, people/places as white-with-black-ring roundels, objects muted (`maps-pins.css`)
- Hover: highlight evidence card
- Click pin: navigate to evidence detail page

### Filters
- Filter bar sits at the top of the main content area, below the page heading
- Chips for categories, eras, locations — displayed in a single wrapping row
- Multi-select supported
- Clear filters button (ghost style, only visible when a filter is active)
- Live results count updates as filters change

### Filter Chips
Used on both frontend and admin to filter timeline events, evidence, and other lists by category or era. Distinct from Content Badges: chips are interactive (clickable, hoverable, focusable); badges are static labels.

- Display: `inline-flex`, items centered, `white-space: nowrap`
- Padding: `0.375rem 0.75rem` (frontend) / `var(--space-xs) var(--space-sm)` = `4px 8px` (admin)
- Font-size: `--text-xs` (`0.8125rem`)
- Font-weight: `500` normal, `600` active/selected
- Border-radius: `999px` (pill) — both frontend and admin filter chips, including the admin timeline era filter (standardised from admin's prior `6px` convention to match the frontend pill shape)
- Min-height: `36px` (touch-target minimum for keyboard/pointer interaction)
- Border: `1px solid` a neutral border token, changing to the accent colour on active
- **States**:
  - Hover: background shifts to the surface-alt/hover token, `150ms ease-out` transition (admin: `var(--admin-transition)`)
  - Active/selected: background shifts to surface-alt (admin: hover surface), border and text become the accent colour, font-weight `600`
  - Focus-visible: `2px solid` accent-colour outline, `2px` offset
- **Era colour highlight** (timeline era filters only, both systems):
  - Inactive: `3px` left border tinted with the matching `--era-*` token; the rest of the chip stays neutral
  - Active: the full era-token colour fills the chip background, and the border (including the left edge) also becomes the era colour
  - Applied via an `.era--<kebab-era>` class alongside `.filter-chip` (frontend) / `.admin-timeline-era-filter__chip` (admin) — e.g. `.era--passion-week`. Never the sole signal of the era — label text still carries the meaning (WCAG)
  - Implementations: `frontend/assets/css/components/filters/filter-chips.css` and `admin/assets/css/admin-diagrams/timeline-era-filter.css`. Each system hooks the same `.era--*` classes into its own token set — they do not share a stylesheet (see the No Cross-Import rule in the Website Guide)

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
Admin-use only — the public frontend never shows draft or publish state. One shared colour scheme across every admin surface that shows publish state — arbor's holding-pen/canvas badges previously used a separate brown/grey scheme; both now match the table badge below.

- **Published**: green background (light tint, `rgba(40, 167, 69, 0.12)`), `--admin-success` text
- **Draft**: `--admin-draft-bg` background, `--admin-draft-color` text (yellow-grey)
- Font-size: `--text-xs` (`0.8125rem`)
- Font-weight: `600`
- Border radius: `6px`
- Padding: `2px 8px`
- No uppercase text-transform
- Used in: admin tables (`.admin-badge--*`), arbor holding pen (`.admin-arbor-pen__badge--*`), draft lists, publish confirmation UI

#### Chip Type Classification
All four chip/badge variants at a glance — see the individual sections above for full detail.

| Type | Font-size | Padding | Radius | Font-weight | Frontend selector | Admin selector |
|---|---|---|---|---|---|---|
| Content badge | `0.75rem` (`--text-2xs`) | `2px 8px` | `4px` | `500` | `.badge` | — (frontend-only) |
| Filter chip | `0.8125rem` (`--text-xs`) | `0.375rem 0.75rem` (frontend) / `4px 8px` (admin) | `999px` (pill) | `500` / `600` active | `.filter-chip` | `.admin-timeline-era-filter__chip` |
| Pen / holding chip | `0.875rem` (`--text-small`) | `4px 8px` | `4px` | `500` | — (admin-only) | `.admin-arbor-pen__chip`, `.holding-pen__chip`, `.admin-resources-pen__chip` |
| Status badge | `0.8125rem` (`--text-xs`) | `2px 8px` | `6px` | `600` | — (admin-only) | `.admin-badge--*`, `.admin-arbor-pen__badge--*` |

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
