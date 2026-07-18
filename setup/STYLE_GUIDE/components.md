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
- **Era markers**: subtle vertical divisions at major era boundaries (e.g., "Birth", "Ministry", "Passion Week") with era label above or below the spine
- **Filter/zoom**: 
  - Era filter chips above the timeline to isolate periods (e.g., "All Eras", "Ministry Begins", "Passion Week")
  - Timeline remains continuous; filtered eras show their dots while others fade to `opacity: 0.3`
  - Draggable scroll on mobile; horizontal scroll bar on desktop if timeline overflows viewport
- **Scrolling**: timeline extends beyond viewport width; use `overflow-x: auto` with momentum scrolling on mobile
- **Empty state**: if no events in selected era, show centered message "No events in this period"

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
