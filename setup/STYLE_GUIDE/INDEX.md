# The Jesus Website — UI/UX & Style Guide (Index)

This file is the map of the style guide. Read it first for any visual or CSS task, then open only the section file that the table below names. It holds the design aim and the section map. The rules themselves are in the section files.

**Design aim**: An archival site for historical evidence about Jesus. The tone is serious and scholarly. Pages are dense with information and stay readable. The readers are curious people who want structured historical data.

**Core Principles** (each has a rule you can check):
- **Hierarchy**: one hidden `h1` per page, visible headings from `h2` (§5). Essay, response, historiography and blog text stays in a column of 680px to 720px (§9).
- **Navigation**: one sidebar with the same links on every page (§5).
- **Mobile-first**: base CSS targets the smallest screen. `@media (min-width: …)` adds layout (§4).
- **Accessibility (WCAG 2.2 AA)**: `44px` touch targets (`36px` for small buttons and chips), a visible `:focus-visible` ring, colour never the only signal (§4, §11).
- **Motion**: only the tokens and rules in §6, under one global reduced-motion rule.
- **Vanilla HTML, CSS and JS** (JS-8).

---

## How this guide is organized

The guide is split across files in this directory (`setup/STYLE_GUIDE/`). Section numbers (**§1–§14**) are stable across files. A citation like "§9" always means the same section. Use the table below to find the right file. Open only the file whose sections your task touches.

| File | Sections | Covers | Read when... |
|---|---|---|---|
| [foundations.md](foundations.md) | §1–5, §7 | Color palette, typography, layout & spacing, responsive breakpoints, sidebar & footer, icon system | Touching global tokens, page chrome/nav, or icon usage |
| [animation.md](animation.md) | §6 | Animation & transition tokens, per-component motion rules, reduced-motion rule | Adding or changing any hover state, transition, or animation |
| [components.md](components.md) | §8 | Buttons, cards, figures, news/blog and evidence rows, badges, timeline, map, filters and chips, detail panel, tables, forms, toasts, breadcrumbs, breakout, infinite scroll | Building or styling a reusable UI component |
| [content-patterns.md](content-patterns.md) | §9 | Markdown table syntax, and the layout of each page type: home, evidence detail, essays, responses, historiography, challenges, blog, news, Wikipedia list and grid (§9.1), resources, about, arbor diagram, verse blocks | Building or editing a specific page template |
| [content_shortcodes.md](content_shortcodes.md) | §14 | Inline-marker syntax for body text: `[figure]`, `[mla:N]`, `[id:N]`, `[pullquote]` — parser contract, junction tables, rendering per content type | Authoring body content with markers, or changing the shortcode parser |
| [pages-and-admin.md](pages-and-admin.md) | §10–13 | Search and loading/error patterns, accessibility and technical notes, print styles, admin shell and page layouts | Working on UX flows, a11y, print CSS, or any admin page |
