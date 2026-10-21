# The Jesus Website — UI/UX & Style Guide (Index)

Someone styling or building part of the site gets the shared values and the layout rules for each kind of page and component, so the result looks and behaves like the rest of the site.

This file is the map of the style guide. Read it first for any visual or CSS task, then open only the section file that the table below names. It holds the design aim and the section map. The rules themselves are in the section files.

**Design aim**: An archival site for historical evidence about Jesus. The tone is serious and scholarly. Pages are dense with information and stay readable. The readers are curious people who want structured historical data.

## Core principles

Each principle has a rule you can check.

| Principle | Rule | § |
|---|---|---|
| Hierarchy | One hidden `h1` per page, visible headings from `h2`. Essay, response, historiography and blog text stays in a column of 680px to 720px | 5.3, 9 |
| Navigation | One sidebar with the same links on every page | 5.1 |
| Mobile-first | Base CSS targets the smallest screen. `@media (min-width: …)` adds layout | 4 |
| Accessibility (WCAG 2.2 AA) | `44px` touch targets (`36px` for small buttons and chips), a visible `:focus-visible` ring, colour never the only signal | 4.3, 11.1 |
| Motion | Only the tokens and rules in §6, under one global reduced-motion rule | 6 |
| Vanilla HTML, CSS and JS | No framework, no build step (JS-8) | 11.5 |

---

## How this guide is organized

The guide is split across files in this directory (`setup/STYLE_GUIDE/`). Top-level section numbers (**§1–§14**) are stable across files. A citation like "§9" always means the same section, and "§9.14" is the fourteenth subsection of §9. Numbers do not run in file order: `foundations.md` holds §1–5 and §7, `animation.md` holds §6, and the shortcodes file holds §14. Use the table below to find the right file. Open only the file whose sections your task touches.

| File | Sections | Covers | Read when... |
|---|---|---|---|
| [foundations.md](foundations.md) | §1–5, §7 | Color palette, typography, layout & spacing, responsive breakpoints, sidebar & footer, icon system | Touching global tokens, page chrome/nav, or icon usage |
| [animation.md](animation.md) | §6 | Animation & transition tokens, per-component motion rules, reduced-motion rule | Adding or changing any hover state, transition, or animation |
| [components.md](components.md) | §8 | Buttons, cards, figures, news/blog and evidence rows, badges, timeline, map, filters and chips, detail panel, tables, forms, status badges, breadcrumbs, breakout, infinite scroll, toasts | Building or styling a reusable UI component |
| [content-patterns.md](content-patterns.md) | §9 | Markdown table syntax, and the layout of each page type: home, evidence detail, essays, responses, historiography, challenges, blog, news, Wikipedia list and grid (§9.14), resources, about, arbor diagram, verse blocks | Building or editing a specific page template |
| [pages-and-admin.md](pages-and-admin.md) | §10–13 | Search and loading/error patterns, accessibility and technical notes, print styles, admin shell and page layouts | Working on UX flows, a11y, print CSS, or any admin page |
| [content_shortcodes.md](content_shortcodes.md) | §14 | Inline-marker syntax for body text: `[figure]`, `[mla:N]`, `[fn:N]`, `[id:N]`, `[pullquote]` — parser contract, junction tables, rendering per content type | Authoring body content with markers, or changing the shortcode parser |

## Section map

| § | Section | File |
|---|---|---|
| 1 | Color Palette | foundations.md |
| 2 | Typography | foundations.md |
| 3 | Layout & Spacing | foundations.md |
| 4 | Responsive Breakpoints | foundations.md |
| 5 | Navigation | foundations.md |
| 6 | Animation & Transitions | animation.md |
| 7 | Icon System | foundations.md |
| 8 | Core Components | components.md |
| 9 | Content-Specific Patterns | content-patterns.md |
| 10 | UX Patterns & Interactions | pages-and-admin.md |
| 11 | Accessibility & Technical Notes | pages-and-admin.md |
| 12 | Print Styles | pages-and-admin.md |
| 13 | Admin Page Layouts | pages-and-admin.md |
| 14 | Content Shortcodes & Inline Markers | content_shortcodes.md |

## Numbering and heading rules

| Level | Heading | Example |
|---|---|---|
| Section | `## §N Title` | `## §8 Core Components` |
| Subsection | `### §N.M Title` | `### §8.7 Timeline` |
| Sub-subsection | `#### §N.M.K Title` | `#### §8.7.1 Era Headings` |

- Cite a section as `§N`, `§N.M` or `§N.M.K`. Each number names exactly one heading, so a search for the citation finds it.
- A new subsection takes the next free number in its section. Never reuse or renumber a published number: code comments and guides cite them. Update every citation if you must renumber.
- A section file opens with a table that lists its subsections when it has more than a few.
- Token lists, size scales, state lists and per-part rules go in tables. Use bullets for short ordered rules and for prose that a table cell would hold badly.
