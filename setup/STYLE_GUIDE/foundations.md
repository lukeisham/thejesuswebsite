_Part of the [Style Guide](INDEX.md) — §1–5, §7: color palette, typography, layout & spacing, responsive breakpoints, navigation, icon system._

---

## §1 Color Palette

Source of truth for the values: `frontend/assets/css/base/variables.css`. Admin values: `admin/assets/css/admin-base/variables.css`.

### §1.1 Surfaces and text

| Token | Value | Use |
|---|---|---|
| `--bg-primary` | `#F8F5F0` | Page background (warm off-white, parchment) |
| `--bg-surface` | `#FFFFFF` | Cards and panels |
| `--bg-surface-alt` | `#F1EDE4` | Hover tint, table headers, abstract and breakout blocks |
| `--text-primary` | `#2C2522` | Body text (dark charcoal-brown) |
| `--text-secondary` | `#5C524A` | Supporting text |
| `--text-muted` | `#7A7066` | Meta lines, placeholders, disabled icons |
| `--border` | `#D4C9B8` | Dividers and component borders |
| `--border-strong` | `#B8A48A` | Timeline spine, Arbor edges, table header underline |

### §1.2 Accent and links

| Token | Value | Use |
|---|---|---|
| `--accent` | `#5C4033` | Primary buttons, active states, focus ring (warm brown) |
| `--accent-light` | `#8B5A2B` | Block-quote rule |
| `--accent-gold` | `#B8976A` | Subtle highlights: breakout and verse rules, search `<mark>` |
| `--link` | `#5C4033` | Link text |
| `--link-hover` | `#3D2B1F` | Link hover, primary button hover |

### §1.3 Status

| Token | Value | Use |
|---|---|---|
| `--success` | `#3D5A3D` | Success toast, high score band |
| `--warning` | `#8B6F3D` | Warning toast, middle score band |
| `--error` | `#8B3D3D` | Error toast, low score band, negative grid cell |
| `--info` | `#3D4F6B` | Info toast (default) |

### §1.4 Wikipedia grid blue ramp

All four derive from `--info`. The ratios are the contrast against `--bg-surface-alt`. Tier thresholds: §9.14.

| Token | Value | Contrast |
|---|---|---|
| `--grid-blue-1` | `#50617A` | 5.39:1 (dimmest) |
| `--grid-blue-2` | `#3D4F6B` (= `--info`) | 7.11:1 |
| `--grid-blue-3` | `#364760` | 8.07:1 |
| `--grid-blue-4` | `#314158` | 8.86:1 (boldest) |

### §1.5 Era tints

For timeline dots, map pins, era chips and era headings. A label always carries the meaning too.

| Token | Value |
|---|---|
| `--era-pre-incarnation` | `#C4ACD4` |
| `--era-old-testament` | `#D0BC94` |
| `--era-early-life` | `#A8C8B4` |
| `--era-life` | `#9CBCCC` |
| `--era-galilee-ministry` | `#9CCCC0` |
| `--era-judean-ministry` | `#D4A8A8` |
| `--era-passion-week` | `#D4A0A0` |
| `--era-post-passion` | `#D4C0A0` |

### §1.6 Fixed colors and shadows

| Token | Value | Use |
|---|---|---|
| `--color-white` | `#FFFFFF` | Roundel dots, text on dark fills |
| `--color-black` | `#000000` | Roundel rings, print |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.08)` | Cards at rest |
| `--shadow-card-hover` | `0 4px 16px rgba(0,0,0,0.12)` | Card hover, detail panel |
| `--shadow-toast` | `0 4px 16px rgba(0,0,0,0.12)` | Toasts |
| `--shadow-sm`, `--shadow-md` | — | Button rest and hover, tooltips |

### §1.7 Admin panel

| Token | Value | Use |
|---|---|---|
| `--admin-bg` | `#F4F6F8` | Page background |
| `--admin-surface` | `#FFFFFF` | Cards, top bar |
| `--admin-border` | `#DDE1E7` | Dividers |
| `--admin-text-primary` | `#2C3340` | Body text |
| `--admin-text-secondary` | `#5A6472` | Supporting text |
| `--admin-accent` | `#3D5A78` | Accent (slate blue) |
| `--admin-accent-hover` | `#2C4A68` | Accent hover |
| `--admin-sidebar-bg` | `#2C3E50` | Sidebar fill |
| `--admin-sidebar-hover` | `#16213E` | Sidebar item hover |
| `--admin-sidebar-text` | `#ECF0F1` | Sidebar text |
| `--admin-sidebar-active` | `#3D5A78` | Active sidebar item |

---

## §2 Typography

### §2.1 Font stacks

| Token | Used for | Stack |
|---|---|---|
| `--font-heading` | Headings | `Georgia, serif` |
| `--font-body` | Body text | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | Verses, code | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` |

### §2.2 Scale

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

### §2.3 Reading widths

| Token | Value | Used by |
|---|---|---|
| `--measure-reading` | 680px | Essay, response, historiography and challenge text |
| `--measure-reading-wide` | 720px | Blog text |
| `--measure-narrow` | 760px | News and blog rows, news article |
| `--measure-list` | 800px | Ranked lists, resources, About |
| `--measure-list-wide` | 1100px | Wikipedia ranked list |

### §2.4 Text rules

| Element | Rule |
|---|---|
| Long-form text (essays, blog, evidence) | `--leading-long` (1.7) |
| Links | Colour `--link`, weight 500, underline on hover (colour `--link-hover`) |
| Verse reference (`.verse-ref`) | Monospace, weight 600, small caps |

### §2.5 Admin typography

The admin root is `14px`. Admin tokens are in px.

| Element | Rule |
|---|---|
| Headings | `system-ui` stack as body, never serif. Weight 600. `h1` 1.5rem, `h2` 1.25rem, `h3` 1.1rem, `h4` 1rem |
| Body | 14px, line height 1.5 |
| `--text-small` | 12px |
| `--text-xs` | 11px |
| `--text-2xs` | 9px |
| Sidebar section labels | 11px, weight 600, uppercase, `letter-spacing: 0.05em` |

---

## §3 Layout & Spacing

### §3.1 Container and grid

| Element | Rule |
|---|---|
| `.container` | Max-width `--container-max` (`1280px`), centered. Side padding `1rem` below `768px`, `1.5rem` from `768px`, `2rem` from `1280px` |
| `.grid` | 12 columns, gutter `--grid-gutter` (`1.5rem`). Columns span 12 below `768px` |
| `.card-grid` | 1 column, 2 from `768px`, 3 from `1024px`. Gap `--card-gap` (`1.5rem`) |

### §3.2 Spacing scale

| Token | Value |
|---|---|
| `--space-xs` | 0.25rem |
| `--space-sm` | 0.5rem |
| `--space-md` | 1rem |
| `--space-lg` | 1.5rem |
| `--space-xl` | 2rem |
| `--space-2xl` | 3rem |
| `--space-3xl` | 4rem |

### §3.3 Radii

| Token | Value |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 16px |
| `--radius-round` | 50% |

---

## §4 Responsive Breakpoints

Mobile-first: base styles target the smallest screen. Each `@media` rule adds layout upward.

### §4.1 Breakpoints

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

### §4.2 Key layout shifts

| Width | Layout |
|---|---|
| `< 768px` | Single column. The sidebar is closed on load. When open, it stacks above the page content in normal flow (no overlay, no backdrop). Timeline and Arbor drop zoom controls and flow with page scroll. |
| `≥ 768px` | The sidebar is open on load and pushes `main` and the footer right by `--sidebar-width` + `1.5rem`. |

### §4.3 Touch targets

| Control | Minimum height |
|---|---|
| Buttons and nav links | `44px` |
| `.btn--sm` and `.filter-chip` | `36px` |
| Small visual targets (timeline dots, map pins) | A transparent `44px` hit area |

---

## §5 Navigation

### §5.1 Sidebar

`.sidebar`:

| Property | Rule |
|---|---|
| Width | `--sidebar-width` (`260px`). Fixed to the left edge, `--bg-surface`, `1px solid var(--border)` right edge |
| Toggle button | `#sidebar-toggle`: fixed top-left (`--space-md` inset), `44px × 44px`, visible at every width. `Esc` closes the sidebar and returns focus to the button |
| Default state | Open from `768px`, closed below. This holds on every page, including the home page |
| Motion | Slides in over `--duration-base` / `--ease-in-out` |
| Hover | `--bg-surface-alt` background on the hovered item |
| Active | Current page or its parent path: `--accent` text, weight 500, `3px solid var(--accent)` left border, `--bg-surface-alt` background |
| Home link | On hover or focus it scales to `0.985` and shows a 1px `--accent-gold` underline |

Items, in order: The Jesus Website (`/`), Evidence, Search, Arbor Diagram, Timeline, Maps, Context, Debate, Resources, News, About, then Admin. Admin is pinned to the bottom behind a top border.

### §5.2 Footer

`<footer class="site-footer">`. Not on `index.html`.

| Part | Content |
|---|---|
| Left | 20px favicon, "© year The Jesus Website.", link "CC BY-NC" |
| Right | Print, Copy Contents and Copy URL ghost buttons. Copy Contents and Copy URL show a toast |
| Date line | Essay, response, blog and About pages show an italic `--text-xs` `--text-muted` line directly above the footer: `Created: <date>[, Edited: <date>]`. "Edited" appears only when the update day is later than the creation day |

### §5.3 Invisible header (SEO & accessibility)

Every page has a visually hidden `<header class="sr-only">`. No visible top header bar exists.

- It holds the page's only `h1` and the skip link. Visible headings start at `h2`.
- Skip link (`<a class="skip-link" href="#main-content">Skip to content</a>`): off-screen until keyboard focus. Then it shows top-left on `--accent` with white text. It slides in over `--duration-fast`.
- Both rules live in `base/invisible-header.css`.

---

## §7 Icon System

### §7.1 Library and delivery

Feather Icons (MIT, SVG-based, 24px artboard, 2px stroke).

All icons come from one SVG sprite at `frontend/assets/images/feather-sprite.svg`. Reference icons via `<use href="/assets/images/feather-sprite.svg#icon-name">`. No CDN, no font files, no runtime JS dependency — one HTTP request cached for the session (SR-2, SR-3).

### §7.2 Sizing

Tokens, with classes `.icon-sm` … `.icon-xl`.

| Token | Size | Use |
|---|---|---|
| `--icon-sm` | 16px | Inline with text, badges |
| `--icon-md` | 20px | Buttons, nav items (default) |
| `--icon-lg` | 24px | Standalone actions |
| `--icon-xl` | 32px | Feature icons |

### §7.3 Color

| Icon | Colour |
|---|---|
| Inside a button | Inherits the button text colour |
| Standalone | `--text-secondary` |
| Active or hover | `--accent` |
| Muted or disabled | `--text-muted` |

### §7.4 Usage rules

- Icon-only controls must have `aria-label` or `title`.
- Never scale icons with `font-size`; use `width` / `height` on the SVG.
- When no Feather icon fits, use a bespoke inline-SVG line-art glyph with the same stroke weight, sizing tokens and colour rules.
