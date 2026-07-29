_Part of the [Style Guide](INDEX.md) — §14: version history._

---

## 14. Version History

**Version**: 1.10
**Last Updated**: 29 July 2026

**Notes for Agents**: Reference this guide for every UI element. Maintain visual consistency across all sections. Prioritize scholarly clarity and ease of navigation through large historical datasets. Use vanilla HTML + CSS + JS only — no frameworks or build tools, except for the visual displays: maps, timeline, and arbor diagram. Journal-format pages (essays, responses, historiography) share `journal.css`.

**1.10**: Widget replacement: 28-stone expand/collapse replaced with always-visible 5×5 grid of 25 cells (§9 row order) showing per-signal contributions and four-tier colour intensity; document score panel colour-coded by band; page layout restructured from single-column list (800px) to five-column row layout (1100px) with responsive stacking <768px; reduced-motion rules simplified to tooltip only. Date: 2026-07-27.

**1.9**: §9 Resources Lists — the per-category chip row (`.resources-categories`/`.resources-category-link`) is removed; the landing page's card grid already navigates between categories. Resource lists can now contain subheading rows (`item_type: 'subheading'`) that render as `<section>` + `<h3 class="resource-subheading">` groups, each with its own `<ol>` restarting item numbering at 1; subheadings are never numbered and an empty section renders no heading. Admin gains a "+ Add Subheading" action alongside "+ Add Item" (`.draggable-row--subheading` treatment: dashed border, muted background, title-only).

**1.8**: §8 gains the standard figure box (`.figure-standard`): a 720×480 display box for Evidence-module pictures, orientation-aware via a CSS min/max constraint pair with no JS required, refined by `figure-orientation.js`'s explicit `figure--portrait`/`figure--landscape`/`figure--square` classes for the mobile `70vh` portrait cap. §9 notes the Evidence Detail Page's Pictures-section and inline description figures use this box. §11 documents that `/uploads` now standardises every accepted image to a `1440 × 960` bounding box with EXIF rotation baked in (GIFs excepted), site-wide across all content types.

**1.7**: §6 rewritten for concision (token/shading tables, merged expand/collapse, compact signal lists — no normative changes). §8 Timeline/Map now document the shared era-colour + category-roundel scheme: era-token fills, people & places as white roundels (`--color-white` fill, `--color-black` ring), objects muted; timeline dot spec corrected to match the shipped 10px implementation. §7 gains a "Custom glyphs" subsection (stacked-ashlar glyph). Code aligned: place dots changed from black to roundel, map pins gained the category overrides.

**1.6**: §6 "Inline Wikipedia Animations" replaced with "Inline Wikipedia Reliability Stones" — the shipped stone-wall widget (27 flat, limestone-toned ashlar stones per article, fulfilment-driven shading, name-only tooltips, "Copy of the reliability information" + "Reliability calculation" glyph buttons, settle-shuffle reveal, hover outline, tooltip-clipping fix, invisible agent-data JSON layer) supersedes the never-implemented 24-square "Quality Grid" spec. §9 Wikipedia Ranked List updated to reflect the single page-level "Last revised" line (moved out of the per-article row) and the new glyph buttons.
