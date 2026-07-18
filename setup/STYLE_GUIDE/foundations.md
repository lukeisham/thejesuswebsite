_Part of the [Style Guide](INDEX.md) — §1–5, §7: color palette, typography, layout & spacing, responsive breakpoints, navigation, icon system._

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

**Custom glyphs**: when no Feather icon fits, a bespoke inline-SVG line-art glyph is allowed — same stroke weight/style as Feather so it reads as part of the set, same sizing tokens and colour rules as above. Current custom glyphs:
- **Stacked ashlar** (3 offset rectangles) — Wikipedia reliability stone-wall toggle (see [§6, animation.md](animation.md))
