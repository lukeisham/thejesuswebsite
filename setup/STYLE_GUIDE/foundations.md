_Part of the [Style Guide](INDEX.md) — §1–5, §7: color palette, typography, layout & spacing, responsive breakpoints, navigation, icon system._

---

## 1. Color Palette

Source of truth for the values: `frontend/assets/css/base/variables.css`. Admin values: `admin/assets/css/admin-base/variables.css`.

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

**Wikipedia quality grid — blue intensity ramp** (all derived from `--info`; see content-patterns.md §9.1)
`--grid-blue-1: #50617A` (dimmest, 5.39:1 against `--bg-surface-alt`)
`--grid-blue-2: #3D4F6B` (= `--info`, 7.11:1)
`--grid-blue-3: #364760` (8.07:1)
`--grid-blue-4: #314158` (brightest/boldest, 8.86:1)

**Borders & Dividers**
`--border: #D4C9B8`
`--border-strong: #B8A48A`

**Era tints** (timeline dots, map pins, era chips, era headings; a label always carries the meaning too)
`--era-pre-incarnation: #C4ACD4`
`--era-old-testament: #D0BC94`
`--era-early-life: #A8C8B4`
`--era-life: #9CBCCC`
`--era-galilee-ministry: #9CCCC0`
`--era-judean-ministry: #D4A8A8`
`--era-passion-week: #D4A0A0`
`--era-post-passion: #D4C0A0`

**Fixed colors**
`--color-white: #FFFFFF`, `--color-black: #000000` (roundel dots, print, text on dark fills).

**Shadows**
`--shadow-card: 0 2px 8px rgba(0,0,0,0.08)`, `--shadow-card-hover: 0 4px 16px rgba(0,0,0,0.12)`, `--shadow-toast: 0 4px 16px rgba(0,0,0,0.12)`, `--shadow-sm`, `--shadow-md`.

**Admin Panel**
`--admin-bg: #F4F6F8`
`--admin-sidebar-bg: #2C3E50`
`--admin-sidebar-hover: #16213E`
`--admin-sidebar-text: #ECF0F1`
`--admin-sidebar-active: #3D5A78`
`--admin-accent: #3D5A78` (slate blue)
`--admin-accent-hover: #2C4A68`
`--admin-border: #DDE1E7`
`--admin-surface: #FFFFFF`
`--admin-text-primary: #2C3340`
`--admin-text-secondary: #5A6472`

---

## 2. Typography

**Font Stack** (tokens `--font-heading`, `--font-body`, `--font-mono`):
- Headings: `Georgia, serif`
- Body: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Monospace (verses, code): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Scale** (tokens `--text-*`):

| Token | Size | Weight | Line height |
|---|---|---|---|
| `--text-h1` | 2.25rem (36px) | 700 | 1.25 |
| `--text-h2` | 1.75rem (28px) | 600 | 1.3 |
| `--text-h3` | 1.375rem (22px) | 600 | 1.35 |
| `--text-h4` | 1.125rem (18px) | 600 | 1.4 |
| `--text-body` | 1rem (16px) | 400 | `--leading-body` 1.65 |
| `--text-small` | 0.875rem (14px) | 400 | `--leading-small` 1.5 |
| `--text-xs` | 0.8125rem (13px) | — | — |
| `--text-2xs` | 0.75rem (12px) | — | — |

- Long-form reading text (essays, blog, evidence) uses `--leading-long` (1.7).
- Links: colour `--link`, weight 500, underline on hover (colour `--link-hover`).
- Reading widths (tokens `--measure-*`): `--measure-reading` 680px, `--measure-reading-wide` 720px, `--measure-narrow` 760px, `--measure-list` 800px, `--measure-list-wide` 1100px.
- Verse references (`.verse-ref`): monospace, weight 600, small caps.

**Admin Typography** (the admin root is `14px`; admin tokens are in px):
- Headings use the same `system-ui` stack as body, never serif. Weight 600. `h1` 1.5rem, `h2` 1.25rem, `h3` 1.1rem, `h4` 1rem.
- Body: 14px, line-height 1.5.
- `--text-small` 12px, `--text-xs` 11px, `--text-2xs` 9px.
- Section labels in the admin sidebar: 11px, weight 600, uppercase, `letter-spacing: 0.05em`.

---

## 3. Layout & Spacing

**Container** (`.container`):
- Max-width `--container-max` (`1280px`), centered.
- Side padding: `1rem` below `768px`, `1.5rem` from `768px`, `2rem` from `1280px`.

**Grid**:
- `.grid`: 12 columns. Gutter `--grid-gutter` (`1.5rem`). Columns span 12 below `768px`.
- `.card-grid`: 1 column, 2 columns from `768px`, 3 columns from `1024px`. Gap `--card-gap` (`1.5rem`).

**Spacing Scale**:
- `--space-xs`: 0.25rem
- `--space-sm`: 0.5rem
- `--space-md`: 1rem
- `--space-lg`: 1.5rem
- `--space-xl`: 2rem
- `--space-2xl`: 3rem
- `--space-3xl`: 4rem

**Radii**: `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 16px, `--radius-round` 50%.

---

## 4. Responsive Breakpoints

Mobile-first: base styles target the smallest screen. Each `@media` rule adds layout upward.

| Name | Min width | Token | Role |
|---|---|---|---|
| xs | 360px | none | Guideline only. No media query uses it. |
| sm | 480px | `--bp-sm` | Large and landscape phones |
| md | 768px | `--bp-md` | Tablets portrait. The sidebar opens by default from here. |
| lg | 1024px | `--bp-lg` | Multi-column layouts. Side-floated figures start here. |
| xl | 1280px | `--bp-xl` | Desktop. Container side padding becomes `2rem`. |
| 2xl | 1536px | `--bp-2xl` | Wide monitors |

- Max-width tokens: `--bp-sm-max` (480px), `--bp-md-max` (767px), `--bp-admin-sm` (600px).
- CSS cannot use custom properties inside `@media`. Each `@media` rule writes the literal number from `variables.css` (D-005).

**Key layout shifts**:
- `< 768px`: single column. The sidebar is closed on load. When open, it stacks above the page content in normal flow (no overlay, no backdrop). Timeline and Arbor drop zoom controls and flow with page scroll.
- `≥ 768px`: the sidebar is open on load and pushes `main` and the footer right by `--sidebar-width` + `1.5rem`.

**Touch targets**: buttons and nav links have `min-height: 44px`. `.btn--sm` and `.filter-chip` are `36px`. Small visual targets (timeline dots, map pins) get a transparent 44px hit area.

---

## 5. Navigation

**Sidebar** (`.sidebar`):
- **Width**: `--sidebar-width` (`260px`). Fixed to the left edge, `--bg-surface`, `1px solid var(--border)` right edge.
- **Toggle button** (`#sidebar-toggle`): fixed top-left (`--space-md` inset), `44px × 44px`, visible at every width. `Esc` closes the sidebar and returns focus to the button.
- **Default state**: open from `768px`, closed below. This holds on every page, including the home page.
- **Motion**: slides in over `--duration-base` / `--ease-in-out`.
- **Hover**: `--bg-surface-alt` background on the hovered item.
- **Active** (current page or its parent path): `--accent` text, weight 500, `3px solid var(--accent)` left border, `--bg-surface-alt` background.
- **Home link**: on hover or focus it scales to `0.985` and shows a 1px `--accent-gold` underline.
- **Items, in order**: The Jesus Website (`/`), Evidence, Search, Arbor Diagram, Timeline, Maps, Context, Debate, Resources, News, About, then Admin. Admin is pinned to the bottom behind a top border.

**Footer** (`<footer class="site-footer">`; not on `index.html`):
- Left: 20px favicon, "© year The Jesus Website.", link "CC BY-NC".
- Right: Print, Copy Contents, Copy URL ghost buttons. Copy Contents and Copy URL show a toast.
- Essay, response, blog and About pages also show an italic `--text-xs` `--text-muted` line directly above the footer: `Created: <date>[, Edited: <date>]`. "Edited" appears only when the update day is later than the creation day.

**Invisible Header (SEO & Accessibility)**:
Every page has a visually hidden `<header class="sr-only">`. No visible top header bar exists.
- It holds the page's only `h1` and the skip link. Visible headings start at `h2`.
- Skip link (`<a class="skip-link" href="#main-content">Skip to content</a>`): off-screen until keyboard focus. Then it shows top-left on `--accent` with white text. It slides in over `--duration-fast`.
- Both rules live in `base/invisible-header.css`.

---

## 7. Icon System

**Library**: Feather Icons (MIT, SVG-based, 24px artboard, 2px stroke).

**Delivery**: All icons come from one SVG sprite at `frontend/assets/images/feather-sprite.svg`. Reference icons via `<use href="/assets/images/feather-sprite.svg#icon-name">`. No CDN, no font files, no runtime JS dependency — one HTTP request cached for the session (SR-2, SR-3).

**Sizing** (tokens, classes `.icon-sm` … `.icon-xl`):
- `--icon-sm: 16px` — inline with text, badges
- `--icon-md: 20px` — buttons, nav items (default)
- `--icon-lg: 24px` — standalone actions
- `--icon-xl: 32px` — feature icons

**Color**:
- Icons inside buttons: inherit button text color
- Standalone icons: `--text-secondary` by default
- Active / hover icons: `--accent`
- Muted / disabled icons: `--text-muted`

**Usage rules**:
- Icon-only controls must have `aria-label` or `title`.
- Never scale icons with `font-size`; use `width` / `height` on the SVG.

**Custom glyphs**: when no Feather icon fits, use a bespoke inline-SVG line-art glyph with the same stroke weight, sizing tokens and colour rules.
