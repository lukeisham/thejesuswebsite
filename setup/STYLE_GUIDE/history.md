_Part of the [Style Guide](INDEX.md) — §14: version history._

---

## 14. Version History

**Version**: 1.7
**Last Updated**: 17 July 2026

**Notes for Agents**: Reference this guide for every UI element. Maintain visual consistency across all sections. Prioritize scholarly clarity and ease of navigation through large historical datasets. Use vanilla HTML + CSS + JS only — no frameworks or build tools, except for the visual displays: maps, timeline, and arbor diagram. Journal-format pages (essays, responses, historiography) share `journal.css`.

**1.7**: §6 rewritten for concision (token/shading tables, merged expand/collapse, compact signal lists — no normative changes). §8 Timeline/Map now document the shared era-colour + category-roundel scheme: era-token fills, people & places as white roundels (`--color-white` fill, `--color-black` ring), objects muted; timeline dot spec corrected to match the shipped 10px implementation. §7 gains a "Custom glyphs" subsection (stacked-ashlar glyph). Code aligned: place dots changed from black to roundel, map pins gained the category overrides.

**1.6**: §6 "Inline Wikipedia Animations" replaced with "Inline Wikipedia Reliability Stones" — the shipped stone-wall widget (27 flat, limestone-toned ashlar stones per article, fulfilment-driven shading, name-only tooltips, "Copy of the reliability information" + "Reliability calculation" glyph buttons, settle-shuffle reveal, hover outline, tooltip-clipping fix, invisible agent-data JSON layer) supersedes the never-implemented 24-square "Quality Grid" spec. §9 Wikipedia Ranked List updated to reflect the single page-level "Last revised" line (moved out of the per-article row) and the new glyph buttons.
