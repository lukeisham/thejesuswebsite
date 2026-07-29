# Supplementary Spec: Wikipedia Reliability Widget Redesign
**Project:** thejesuswebsite – Stage 3 ranking refactor
**Companion to:** `Wikipedia_alogrithm_refractor.md` (the scoring spec)
**Status:** General plan
**Date:** 2026-07-27

## 1. Purpose and Relationship to the Scoring Spec

The scoring spec defines *what* each article scores. This file defines *how that score is displayed* on `debate/wikipedia.html`.

**The two are coupled at exactly one point: the 25 rows of §9.** The widget is a 5×5 grid because the rubric has 25 weights. Any change to the number of weights breaks the grid, and any change to their order re-arranges it. Neither document may change the weight count without the other being updated in the same plan.

This spec **replaces** the existing "reliability stones" widget (Style Guide §6 *Inline Wikipedia Reliability Stones*, §9 *Wikipedia Ranked List*). That widget is retired in full, not extended.

### 1.1 What changes

| | Current (stones) | New (grid) |
|---|---|---|
| Reveal | Click a toggle button to expand a stone wall | **Always visible** — no expand/collapse |
| Layout | Flex-wrap row of ~28 stones, reflows by viewport | **Fixed 5×5 grid** of 25 boxes |
| Content of each cell | No visible content; shading only | **The signal's contribution number** |
| Cell meaning | Opacity tier from fulfilment | Number + colour intensity from fulfilment |
| Net score | Hidden — JSON and clipboard only | **Displayed**, right of the grid, colour-coded |
| Tooltip | Signal name on hover/focus | Signal name on hover/focus (**unchanged**) |
| Copy button | Present | Present (**unchanged in behaviour**) |
| Agent JSON | Present | Present (**extended**, see §7) |

### 1.2 What is retired

- `.wikipedia-stone-*` markup, CSS, and the two CSS files `wikipedia-quality-grid.css` / `wikipedia-quality-grid-reduced-motion.css` are rewritten, not patched — the ashlar/limestone metaphor, the hash-derived per-stone jitter, `ashlarSvgMarkup()`, `hashToUnit()`, the settle-shuffle animation, and the expand/collapse state machine all go.
- The `.wikipedia-signal-toggle` button and its custom stacked-ashlar glyph are removed — with the grid always visible there is nothing to toggle.
- Style Guide §6 "Inline Wikipedia Reliability Stones" is replaced by a new subsection (§10.4 of this file).

## 2. Layout

```
┌─────────────────────────────┐   ┌──────────┐
│  ▢  ▢  ▢  ▢  ▢   rows 1–5   │   │          │
│  ▢  ▢  ▢  ▢  ▢   rows 6–10  │   │    54    │   ← document score
│  ▢  ▢  ▢  ▢  ▢   rows 11–15 │   │          │
│  ▢  ▢  ▢  ▢  ▢   rows 16–20 │   └──────────┘
│  ▢  ▢  ▢  ▢  ▢   rows 21–25 │
└─────────────────────────────┘
        signal grid                document score
```

- The grid and the score sit side by side, grid left, score right, vertically centred against each other.
- Grid, score, and copy button occupy **three dedicated columns of the article row** — they are not inline content trailing the title. The page changes from a narrow list to a row layout to accommodate this; see **§10**.
- The copy button sits last, right of the document score.

### 2.1 Cell order

**Cells are filled in §9 row order: left to right, top to bottom.** Row 1 of the weights table is the top-left cell; row 25 is the bottom-right.

This is deliberate and load-bearing: because §9 is ordered by weight magnitude (strongest positive first, strongest negative last), the grid reads as a gradient — the top-left region is where an article earns its score, the bottom-right region is where it loses it. A reader who learns the layout once can compare two articles at a glance without reading a single number.

The order is defined **once**, in the signal dictionary module, and both the grid and the JSON payload derive from it. No component may re-sort.

### 2.2 Sizing

| Viewport | Cell | Gap | Grid total | Score panel |
|---|---|---|---|---|
| ≥768px | 26px square | 3px | ~142px | ~48px wide |
| <768px | 22px square | 2px | ~118px | ~42px wide |

- Cells are square, `var(--radius-sm)` corners.
- The grid is a CSS Grid: `grid-template-columns: repeat(5, 1fr)`, fixed — it does **not** reflow to viewport width. Five columns at every size; only the cell size changes.
- Numbers inside cells use `--text-2xs`, tabular figures (`font-variant-numeric: tabular-nums`) so digits align across cells and rows.

## 3. Cell Rendering

Each cell shows the **contribution** that signal made to this article — the same integer that enters `net_score` (scoring spec §12.1), after caps, category conditionals, and placement multipliers.

### 3.1 Number display

| Contribution | Shown | Colour |
|---|---|---|
| Positive | The number, no `+` sign | Blue, intensity by fulfilment (§3.2) |
| Negative | The number **with** its minus sign | Red (§3.3) |
| Zero, or signal did not fire | **Nothing — cell is empty** | — (empty-cell treatment, §3.4) |

An empty cell is not a missing cell. All 25 cells always render, always in the same position, always with a tooltip. Only the *number* is omitted.

### 3.2 Positive cells — blue intensity by fulfilment

Blue intensity encodes **how fully the signal fired**, reusing the existing `fulfilmentRatio()` helper:

```
fulfilment = |contribution| / |cap|      // clamped 0..1
```

| Fulfilment | Intensity | Meaning |
|---|---|---|
| `≥ 0.95` | **Brightest blue** — full saturation, `font-weight: 600` | Signal fired at its cap for this article |
| `0.60 – 0.94` | Strong blue | Most of the available credit earned |
| `0.30 – 0.59` | Mid blue | Partial credit |
| `> 0 – 0.29` | Dimmest blue — still clearly legible | Minimal credit |

The brightness ramp is a lightness/alpha ramp on a single hue derived from `--info` (`#3D4F6B`), not four unrelated colours. Define four tokens (`--grid-blue-1` … `--grid-blue-4`, dimmest → brightest) in `variables.css` rather than inlining values.

**Legibility floor:** even the dimmest tier must clear WCAG AA (4.5:1) against the cell background. If the ramp cannot hold that, compress the ramp — never drop below the floor. Intensity is a *secondary* encoding; the number itself is the primary one and must always be readable.

### 3.3 Negative cells

Negative contributions render in `--error` (`#8B3D3D`) at a single intensity — **no fulfilment ramp**. A penalty is a penalty; graduating it by how "fully" it fired would imply a partial penalty is visually milder, which is the wrong reading when the reader is scanning for problems.

The minus sign is always shown. Negative cells carry `font-weight: 600` so they draw the eye at a glance.

### 3.4 Empty cells

- No number.
- Background one step darker than the surrounding surface (`--bg-surface-alt`) with a faint `--border` outline — present, inert, clearly "nothing here".
- **Tooltip still fires on hover and focus**, showing that signal's name. This is the explicit requirement: a reader must be able to discover what a box *would* have measured, even when the article scored nothing for it.

## 4. Document Score Panel

Sits immediately right of the grid, showing `net_score` — the plain sum of all 25 contributions.

### 4.1 Colour bands

| Band | Score | Colour |
|---|---|---|
| **Green** | `≥ 50` | `--success` (`#3D5A3D`) |
| **Yellow** | `25 – 49` | `--warning` (`#8B6F3D`) |
| **Red** | `≤ 24` | `--error` (`#8B3D3D`) |

The bands are contiguous and exhaustive — every integer falls in exactly one, with no boundary ambiguity to resolve at implementation time.

Negative net scores fall in the red band, as does the −19 floor case (scoring spec §8).

**Calibration.** Theoretical maxima by category are 85 / 82 / 80 / 80 / 76 (scoring spec §10). Green at ≥50 sits at roughly 60–67% of what an article of that type can reach — a real, attainable band marking a well-grounded article rather than a near-perfect one, and green will populate meaningfully rather than sitting empty. Red at ≤24 catches articles that are genuinely disconnected: the ≤24 band is where the two heaviest penalties (rows 24 and 25, −19 combined) inevitably land an article regardless of what else it earns.

### 4.2 Presentation

- The number alone, no label, no "/84", no suffix.
- `--text-lg`, `font-weight: 600`, tabular figures.
- Colour applies to the **number**, with a subtle tinted background at low alpha (~8%) of the same hue and a 1px border at ~30% — a quiet chip, not a filled badge. The scholarly tone of the site (Style Guide core principles: "clarity over decoration") rules out a saturated block of colour.
- Tooltip on hover/focus: `"Document score: <n>"`.
- **Colour is never the only signal** (WCAG, Style Guide §11): the number is always present and always legible, so a colour-blind reader loses the band but never the value.

## 5. Tooltips

Unchanged in behaviour and styling from the retired widget — reuse the existing pattern rather than inventing a second one:

- Content: **the signal's official name only.** No weight, no cap, no count, no "not triggered" text. Full detail lives in the copy text and agent JSON.
- Dark background (`--text-primary`), `--bg-primary` text, `var(--radius-sm)`, `var(--space-xs) var(--space-sm)` padding, `var(--text-2xs)`, `--shadow-md`.
- Positioned above the cell; fades in with `translateY(4px) → 0` over `--duration-fast` / `--ease-out`.
- Fires on **hover and keyboard focus** alike.
- Top-row tooltips must not clip. With the widget always visible there is no `overflow` transition to fight (the old `.is-settled` dance is gone), but the containing row must not set `overflow: hidden`.

### 5.1 Mobile: no tooltips

**Touch devices do not get tooltips.** No tap-to-reveal, no long-press, no popover. Hover is a pointer affordance and it is not emulated.

This is a deliberate decision, not an omission:

- Tap-to-reveal would collide with scrolling on a 25-cell grid inside an infinite-scroll list, and would need a dismiss gesture that competes with the page's own.
- **No information is lost.** The copy button (§6) delivers every signal name, every contribution, and the net score as plain text, on one tap. Mobile readers get *more* detail than a desktop tooltip provides, not less.
- The numbers, colours, bands, and grid positions — everything the widget encodes visually — remain fully visible on mobile. Only the name-on-demand affordance is absent.

Gate on `@media (hover: hover) and (pointer: fine)` rather than on viewport width, so the rule follows the input device: a touchscreen laptop behaves like a phone, and a small window on a desktop keeps its tooltips.

Accessible names on cells (§8) are **not** affected — they are exposed to assistive technology on every device, independent of the tooltip layer. A screen-reader user on a phone still hears `"<signal name>: <contribution>"` per cell.

## 6. Copy Version

One click, no menu. Retains `.wikipedia-signal-copy`, the Feather `copy` icon, the `"Copy of the reliability information"` label, and the checkmark + `.is-copied` 1.5s success state.

**Copied text format** — plain text, no markdown, readable when pasted anywhere:

```
Pool of Bethesda — reliability score 54

Scored signals:
  Bible verses cited .................. +12  (full credit, cap +12)
  Data/interpretation split ............ +10  (clear split)
  Archaeological site or artefact ...... +8  (location bonus)
  Jewish context ....................... +6  (full credit, cap +6)
  Balanced debate ...................... +4  (partial, cap +6)
  Literary analysis .................... +4
  Journal/book citations ............... +3
  Manuscripts .......................... +2
  Non-Christian ancient sources ........ +2
  Primary-source quotes ................ +2
  Maps and diagrams .................... +1
  Religious art ........................ +1
  Jesus Seminar bias ................... -1  (interpretation-only placement)

Not scored: Ante-Nicene authors, Scholarly commentary, Wikipedia Good/Featured
Article, Gnostic over-emphasis, Confessional balance, Other-religion sources,
OT-NT continuity criticism, Mythicist bias, Criticism of the supernatural
worldview, Secular-materialist presuppositions, Referencing quality, No Bible
verse cited

Net score: 54 of a possible 82 for this article type.
Source: thejesuswebsite.org/debate/wikipedia
```

Rules:
- Scored signals first, in §9 row order, with contributions aligned.
- Unscored signals listed together at the end by name — the reader learns what *didn't* apply, which the grid shows as empty cells.
- The "possible" figure is the category maximum from scoring spec §10, selected by the article's category flags.
- On failure, the existing error toast (`"Failed to copy reliability data"`) is retained.

## 7. Agent JSON

An invisible `<script type="application/json" class="agent-data" data-agent-readable="true">` block per article, as now. Extended for the new display model.

```json
{
  "article": "Pool of Bethesda",
  "url": "https://en.wikipedia.org/wiki/Pool_of_Bethesda",
  "rank": 12,
  "net_score": 54,
  "score_band": "yellow",
  "category_maximum": 82,
  "category_flags": ["is_location"],
  "grid": { "rows": 5, "columns": 5, "order": "weights_table_row_order" },
  "signals": [
    {
      "row": 1,
      "grid_position": { "row": 1, "column": 1 },
      "key": "manuscripts",
      "name": "Cites/mentions a specific manuscript",
      "contribution": 2,
      "cap": 6,
      "fulfilment": 0.33,
      "polarity": "positive",
      "fired": true,
      "statement": "Partial credit for named manuscripts (2 of 6 points)."
    }
  ]
}
```

Requirements:
- **All 25 signals are present**, including unfired ones (`"fired": false`, `"contribution": 0`). The array length is always 25. An agent must be able to tell "scored zero" from "signal absent", which the grid communicates visually via empty cells.
- `grid_position` lets an agent reconstruct the visual layout without re-deriving it from `row`.
- `score_band` is emitted as a string so an agent never has to re-implement the §4.1 boundary rule.
- Contributions **must sum exactly to `net_score`** — the same invariant as scoring spec §12.1, verified at render time. A mismatch is a bug and should fail loudly in tests, not degrade silently.
- `escapeForScriptTag()` is retained: `<` → `<` so the payload cannot close its own script tag.
- Per scoring spec §12.3 (explainability), vector-derived signals should additionally carry `matched_exemplar_id` and `similarity` where available.

## 8. Accessibility

- The grid is a **table of values, not decoration.** Render as `role="table"` with `role="row"` / `role="gridcell"`, or as a real `<table>` with visually-hidden headers. A screen reader must be able to walk it.
- Each cell exposes an accessible name of the form `"<signal name>: <contribution>"`, or `"<signal name>: not scored"` when empty. The tooltip is a visual affordance; the accessible name carries the same information independently.
- Every cell is **keyboard reachable** and shows its tooltip on focus. With 25 cells per article across a long list, consider a single roving tabindex per grid so keyboard users aren't forced through 25 stops per row — arrow-key navigation within the grid, one tab stop to enter and one to leave.
- Colour is never the sole carrier of meaning: contributions are always printed, the band is always accompanied by its number, and negatives always carry a minus sign.
- Contrast: every number, at every intensity tier, clears WCAG AA 4.5:1 (§3.2).
- `prefers-reduced-motion`: tooltip fades become instant. There is no other motion left in the widget — the removal of expand/collapse eliminates the entire reduced-motion CSS file the stones needed.

## 9. Performance

The list renders every ranked article (currently 255) by infinite scroll. Where the old widget rendered ~28 stones only when a reader expanded one article, the grid renders **25 cells for every article, always** — about 6,375 cells at the current 255-article count.

Constraints:
- Cells must be plain styled elements. **No SVG per cell**, no per-cell generated markup beyond a class and a number.
- Colour tiers are **classes**, not inline styles: `.wq-cell--blue-3`, `.wq-cell--negative`, `.wq-cell--empty`. Inline `style` attributes on thousands of cells bloat the DOM and defeat CSS caching.
- Tooltips use one delegated listener at the list level, not one per cell.
- Build grid markup as a single template string per article, matching the existing `html`/`raw`/`safeJoin` approach in `wikipedia.js`.
- Measure after implementing: if scroll performance regresses on mobile, `content-visibility: auto` on the list item is the first lever, not a redesign.

## 10. Page Layout Change: List → Rows

The current page is a narrow single-column list (`max-width: 800px`, centred) where each card is a rank number beside a title. The widget does not fit that shape — a 142px grid plus a score panel plus a copy button cannot sit inline after a title link inside 800px without wrapping badly at every viewport.

**The page becomes a row-based layout: one row per article, with defined columns.**

### 10.1 Row structure

```
┌──────┬────────────────────────────────┬─────────────┬───────┬────┐
│  12  │  Pool of Bethesda          ↗   │  ▢▢▢▢▢      │  53   │ ⧉  │
│      │                                │  ▢▢▢▢▢ ×5   │       │    │
└──────┴────────────────────────────────┴─────────────┴───────┴────┘
  rank            title                     grid        score  copy
```

| Column | Width | Content |
|---|---|---|
| Rank | `2.5rem` fixed | Rank number — `2rem`, `--text-muted`, `font-weight: 300`, right-aligned. Unchanged from current |
| Title | `1fr`, min-width 0 | Article title, linked, with Feather `external-link` icon. Truncates with ellipsis rather than wrapping to a third line |
| Grid | `auto` fixed | The 5×5 signal grid (§2) |
| Score | `auto` fixed | The document score panel (§4) |
| Copy | `34px` fixed | `.wikipedia-signal-copy` button |

- CSS Grid on the row (`grid-template-columns`), not flex — the columns must align vertically down the whole page so the grids form a continuous visual column. Ragged column edges would destroy the at-a-glance comparison that §2.1's ordering is designed to enable.
- Row height is driven by the grid (5 cells + gaps ≈ 142px desktop). The rank number and title align to the **vertical centre** of the row, not the top.
- Keep the existing `border-bottom: 1px solid var(--border)` row separator and `--space-md` vertical padding.

### 10.2 Container width

`max-width: 800px` no longer fits. Required minimum at desktop: rank 40 + title ~280 + grid 142 + score 48 + copy 34, plus four gaps at `--space-lg` — roughly **620px of fixed content** before the title gets any breathing room.

Set the container to **`max-width: 1100px`**, centred. This keeps the title column at a comfortable ~380px and stays within the site's existing content width conventions rather than going full-bleed.

### 10.3 Responsive behaviour

The five-column row does not survive a phone. Three breakpoints:

**≥1024px — full row.** All five columns as above.

**768–1023px — compressed row.** Same five columns; title column absorbs the loss; grid drops to the 22px cell size early. Rank number reduces to `1.5rem`.

**<768px — stacked row.** The row becomes two lines:

```
┌──────┬───────────────────────────────────────┐
│  12  │  Pool of Bethesda                 ↗   │
│      │  ▢▢▢▢▢ ▢▢▢▢▢ ▢▢▢▢▢ ▢▢▢▢▢ ▢▢▢▢▢   53  ⧉ │
└──────┴───────────────────────────────────────┘
```

- Title on its own line, full width, wrapping allowed (2 lines max, then ellipsis).
- Grid, score, and copy button on a second line beneath it, left-aligned under the title.
- The grid stays **5×5** — it never reflows to a different column count (§2.2). At 22px cells plus 2px gaps it occupies ~118px, which fits alongside the score and copy button on any phone from 320px up.
- Rank number stays in its own left column, spanning both lines, vertically centred.

### 10.4 Column header row

A single header row sits above the first article row, labelling the columns. Its job is first-visit orientation: without it, a reader meeting a 5×5 grid of coloured numbers has no way to know what they are looking at.

```
┌──────┬────────────────────────────────┬─────────────┬───────┬────┐
│ RANK │  ARTICLE                       │  SIGNALS    │ SCORE │    │
├──────┼────────────────────────────────┼─────────────┼───────┼────┤
│  12  │  Pool of Bethesda          ↗   │  ▢▢▢▢▢      │  53   │ ⧉  │
```

**Labels:** `Rank` · `Article` · `Signals` · `Score`. The copy column is left unlabelled — the icon is self-evident and a fifth label would crowd the row.

**Styling — deliberately quiet:**
- `--text-2xs`, `--text-muted`, `font-weight: 500`, uppercase with `letter-spacing: 0.05em`.
- `border-bottom: 1px solid var(--border-strong)` to separate it from the data rows, which use the lighter `--border`.
- `padding-bottom: var(--space-xs)`; no background fill, no vertical rules.
- Column alignment matches the data rows exactly: `Rank` right-aligned, the rest left-aligned.

**It is not sticky.** The header teaches the layout once; after that it is redundant, and a sticky element competing with 255 rows of infinite scroll costs more than it returns. If reader feedback later suggests otherwise this is a small, isolated change.

#### Two implementation traps

**1. The header must not be an `<li>`.** The list is an `<ol>` whose item order carries the ranking. A header row inside it would become list item 1 and shift every article's implicit position, corrupting the semantics that §10.5 requires be preserved. Render it as a sibling `<div>` immediately **above** the `<ol>`, sharing the identical `grid-template-columns` declaration — ideally via a shared CSS custom property or class so the two definitions cannot drift apart.

**2. Hide it from assistive technology.** Mark the header `aria-hidden="true"`. It is a visual affordance only: each cell already carries its own accessible name (§8), and each row announces its rank, title, and score independently. Without this, a screen reader announces a stray "Rank Article Signals Score" fragment that labels nothing, because there is no table relationship for it to bind to.

**Responsive:** the header renders at **≥768px only**. Below that the row stacks to two lines (§10.3) and the columns no longer map to it — a header whose labels don't sit above their content is worse than no header. Hide it with `display: none`, not by unmounting, so there is one markup path at every viewport.

### 10.5 What this affects beyond CSS

- `renderArticles()` in `wikipedia.js` — the `<li>` inner markup changes shape. The rank number moves out of `.wikipedia-rank-content` into its own grid cell, and the widget moves out of `.wikipedia-rank-title`.
- `.wikipedia-rank-card`, `.wikipedia-rank-number`, `.wikipedia-rank-content`, `.wikipedia-rank-title` in `wikipedia-list.css` are all restructured. `.wikipedia-rank-content` likely disappears entirely — with the row itself becoming the grid container, the intermediate flex wrapper has no job.
- Infinite scroll is unaffected in behaviour, but taller rows mean fewer articles per viewport and therefore more frequent batch loads. Confirm the batch size still feels right after the change; a batch tuned for ~72px rows may fire too often at ~142px.
- The list remains `<ol>` / `<li>` with `role="listitem"` — the semantic structure is a ranked list regardless of visual layout, and rank order must survive for screen readers.

## 11. Style Guide Changes Required

This redesign edits the style guide; a plan must include these, not leave them implied.

1. **§6 (`animation.md`)** — replace "Inline Wikipedia Reliability Stones" wholesale. The expand/collapse state machine, settle-shuffle stagger, `.is-settled` overflow handling, and reduced-motion doubled-class rules all describe retired behaviour. The replacement section is short: tooltip fade only, pointer devices only.
2. **§9 (`content-patterns.md`)** — rewrite "Wikipedia Ranked List". Three changes: the "two reliability-stones glyph buttons" line is wrong once the toggle is gone; the "single column, max-width 800px" list description is replaced by the five-column row layout at 1100px (§10); and the column header row (§10.4) is new — the page has never had one, so nothing in the guide currently describes it.
3. **§1 (`foundations.md`)** — add the four `--grid-blue-*` tokens to the Status/Highlights palette.
4. **New subsection** — "Inline Wikipedia Quality Grid", covering layout, cell states, bands, and tooltips as specified above.
5. **§14 (`history.md`)** — version bump recording the widget replacement and the page layout change.

## 12. Acceptance Criteria

1. Exactly 25 cells render per scored article, in §9 row order, at every viewport, in a 5×5 grid that does not reflow to a different column count.
2. Contributions displayed in-cell match `wikipedia_article_signals` exactly, and sum to the displayed document score.
3. Empty cells show no number but do show their tooltip on hover and keyboard focus (pointer devices).
4. Positive cells step through four blue intensities by fulfilment; the dimmest clears 4.5:1 contrast.
5. Negative cells render in `--error` with a visible minus sign, at a single intensity.
6. Document score colour follows §4.1: **≥50 green, 25–49 yellow, ≤24 red**. Verify all three boundary values (24, 25, 49, 50).
7. **Touch devices show no tooltips**, gated on `(hover: hover) and (pointer: fine)`; all other widget information remains visible, and cell accessible names are unaffected.
8. Copy produces the §6 format; success state reverts after 1.5s.
9. Agent JSON contains all 25 signals including unfired ones, and its contributions sum to `net_score`.
10. The grid is screen-reader navigable, and every cell's accessible name carries signal name and value.
11. Rows align into true vertical columns down the page at ≥768px — grids and score panels form continuous columns, not a ragged edge.
12. The stacked layout below 768px keeps the grid at 5×5 and fits within a 320px viewport without horizontal scroll.
13. The column header renders at ≥768px, is hidden below it, aligns exactly with the data columns, sits **outside** the `<ol>`, and is `aria-hidden`.
14. Articles with no signal data render a plain title row and no widget — the existing behaviour (JS-2) is preserved.
15. The list remains semantically an ordered list; rank order is announced correctly by screen readers, and the header row does not appear as a list item or shift article positions.
16. No visual or console regression across the full article set (255) under infinite scroll; batch cadence still reasonable at the taller row height.

## 13. Open Questions

**None.** All decisions are locked.

For the record: **rank 1 receives no visual emphasis.** Every row renders identically regardless of rank — the rank number and the score panel carry that information already, and a highlighted top row would imply an editorial endorsement the rubric does not make. Rank is a computed position, not a badge.
