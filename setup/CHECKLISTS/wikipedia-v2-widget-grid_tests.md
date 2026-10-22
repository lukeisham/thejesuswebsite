## Validation: Wikipedia Widget Grid Redesign

**Plan:** wikipedia-v2-07-widget-and-page-layout.md  
**Date:** 2026-07-27

## Manual checks

### Visual rendering

- [ ] Grid renders as 5×5 (25 cells) for every scored article
- [ ] Grid never reflows to a different column count at any viewport (≥1024px, 768–1023px, <768px)
- [ ] Cell order follows §9 row order (strongest positive top-left, strongest negative bottom-right)
- [ ] Positive cells show contribution number with correct blue intensity (4 tiers based on fulfilment)
- [ ] Negative cells show minus sign + number in error red at single intensity
- [ ] Empty cells (contribution = 0) show no number but have outline + tooltip
- [ ] Document score panel appears right of grid, colour-coded by band (green ≥50, yellow 25–49, red ≤24)
- [ ] All three score bands visible in the 255 articles (at least one article in each band)

### Layout at breakpoints

- [ ] **≥1024px**: rank number (2.5rem), title (1fr), grid, score, copy button — all in one row, vertically centred
- [ ] **768–1023px**: same five columns; title absorbs loss; rank reduces to 1.5rem; grid uses 22px cells
- [ ] **<768px**: two-line row (title full-width top, grid/score/copy bottom); rank spans both lines; no horizontal scroll at 320px

### Column header row

- [ ] Header row renders at ≥768px with labels RANK | ARTICLE | SIGNALS | SCORE
- [ ] Header row hidden (<768px display: none)
- [ ] Header row is outside the `<ol>` element, not an `<li>`
- [ ] Header row has `aria-hidden="true"`
- [ ] Header row columns align perfectly with data rows (grid values match)

### Tooltips

- [ ] Tooltips appear on hover (mouse) over any cell
- [ ] Tooltips appear on keyboard focus (:focus-visible) on any cell
- [ ] Tooltip content is signal name only (no weight, no count, no "not triggered" text)
- [ ] Tooltip style: dark background, light text, rounded corners, fade-in animation
- [ ] **Touch devices**: no tooltips visible on touch events (gate: `@media (hover: hover) and (pointer: fine)`)
- [ ] Top-row tooltips do not clip — containing row does not have `overflow: hidden`

### Copy button

- [ ] Copy button appears on every article row (right of score panel)
- [ ] Click produces plain text in §6 format: title, blank line, "Scored signals:" with aligned contributions, blank line, "Not scored:" list, blank line, "Net score: X of possible Y", blank line, "Source: thejesuswebsite.org/debate/wikipedia"
- [ ] All 25 signals appear in either scored or not-scored section
- [ ] Unfired signals appear in "Not scored:" section
- [ ] Category maximum matches scoring spec §10 (Teaching 84, Book 79, Location 81, Parable 79, Other 75)
- [ ] Success state: checkmark + `.is-copied` class for 1.5s, then reverts
- [ ] Error on failure: toast `"Failed to copy reliability data"`

### Infinite scroll

- [ ] Articles load on scroll (no regression)
- [ ] Batch cadence reasonable at new row height (~142px desktop, ~118px mobile <768px); if scroll fires too often, note for tuning

### Agent JSON

- [ ] Agent JSON payload present as `<script type="application/json" class="agent-data">` per article
- [ ] Array contains exactly 25 signals (no more, no fewer)
- [ ] All signals present in §9 row order, regardless of which fired
- [ ] Unfired signals have `"fired": false`, `"contribution": 0`
- [ ] Contributions in JSON sum exactly to `net_score` (invariant check)
- [ ] `score_band` field present and correct (`"green"` / `"yellow"` / `"red"`)
- [ ] `grid_position` field present with `row` and `column` (1-indexed or 0-indexed, consistent)

### Accessibility

- [ ] Grid exposed to screen reader as table structure (`role="table"` or `<table>`)
- [ ] Each cell has accessible name: `"<signal name>: <contribution>"` or `"<signal name>: not scored"`
- [ ] Keyboard navigation: one tab stop to enter grid, arrow keys move between cells, one tab to leave
- [ ] Focus outline visible on keyboard-focused cells
- [ ] Column header not announced as list item (no `<li>` wrapper)
- [ ] Rank order announced correctly by screen readers (implicit from `<ol>` semantics)
- [ ] Colour is never the sole carrier of meaning (numbers always present, minus sign on negatives)
- [ ] Contrast: all cell numbers clear WCAG AA 4.5:1 (dimmest blue tier included)

### Responsive mobile

- [ ] 5×5 grid fits within 320px viewport at <768px without horizontal scroll
- [ ] Touch devices do not receive tooltips
- [ ] Row stacking functional: title line wraps normally, grid/score/copy line does not
- [ ] Grid cells legible at 22px size

### Console & errors

- [ ] No console errors related to grid, cells, or agent-data JSON
- [ ] No `undefined` or `null` in agent-data payload
- [ ] No 404s on CSS files or script files
- [ ] No uncaught exceptions in wikipedia.js

---

## Code-review checks

- [ ] **JS-1** — Function names are clear and self-documenting (`buildAgentData`, `buildStoneWidget`, `renderGrid`); no unclear abbreviations
- [ ] **JS-2** — All 25 cells render; guard against missing elements; no silent failures; every grid always renders
- [ ] **JS-6** — Single delegated tooltip listener at page level, not per-cell; listeners cleaned up on page unload
- [ ] **CSS-2** — No hardcoded colour values; all use `--grid-blue-*`, `--success`, `--warning`, `--error`, `--bg-surface-alt`, `--border*`
- [ ] **CSS-4** — Class names semantic (`.wikipedia-grid`, `.wikipedia-cell`, `.wikipedia-cell--blue-1`, `.wikipedia-score-panel`, `.wikipedia-score--green`)
- [ ] **CSS-5** — Single-class selectors only; no nested selectors; no `!important`
- [ ] **HTML-1** — List remains `<ol>` / `<li>`; header row is `<div>` outside list; rank order preserved for screen readers
- [ ] **SR-3** — No per-cell SVG; colours as classes, not inline styles; ~6,375 cells at 255 articles
- [ ] SIGNAL_DICTIONARY rewritten to exactly 25 entries in §9 row order (manuscripts, Bible verses, data/interpretation, commentaries, balanced debate, ante-Nicene, archaeology, Jewish context, non-Christian, literary analysis, primary quotes, journal/book, maps/diagrams, Wikipedia quality, religious art, gnostic, confessional balance, other-religion, Jesus Seminar, OT–NT continuity, mythicist, supernatural, secular-materialist, referencing quality, no Bible verse)
- [ ] Four blue intensity tokens added to `variables.css` (`--grid-blue-1` through `--grid-blue-4`); dimmest clears 4.5:1 contrast
- [ ] `buildAgentData()` emits all 25 signals including unfired; sum invariant holds
- [ ] `buildStoneWidget()` replaced: grid markup, not stone SVG; no expand/collapse; returns grid, score panel, copy button, agent JSON
- [ ] `buildClipboardText()` matches §6 format exactly; all 25 signals in one section or the other; category max correct
- [ ] Stone-building functions deleted: `hashToUnit`, `hexToRgb`, `mixColors`, `fulfilmentTier`, `ashlarSvgMarkup`, `buildStoneMarkup`
- [ ] Expand/collapse functions deleted: `settleWrapAfterOpen`, `openStoneWrap`, `closeStoneWrap`, `bindStoneToggle`
- [ ] Retained functions (`fulfilmentRatio`, `buildStatement`) unchanged and reused in new grid
- [ ] `renderArticles()` restructured for CSS Grid row layout (rank, title, grid, score, copy columns)
- [ ] Infinite scroll batch size verified reasonable (no excessive loads at taller rows)
- [ ] Tooltip listener gated on `@media (hover: hover) and (pointer: fine)` (no touch tooltips)
- [ ] Reduced-motion CSS simplified: only tooltip fade rule, no stone/expand/settle rules
- [ ] Style guide edits all present: foundations.md §1 (blue tokens), animation.md §6 (new grid section), content-patterns.md §9 (row layout), history.md §14 (version bump)
- [ ] Tests present: dictionary integrity, fulfilment-to-tier mapping, score-band boundaries, agent-JSON invariant, grid cell rendering, copy format

---

## Known limitations & deferred checks

- **Infinite scroll batch size tuning**: new row height (~142px desktop) may require batch-size adjustment post-launch. Monitor scroll cadence and adjust if needed.
- **Production data**: this plan is verified on local dev server without real signal data. Live site verification (Tier 3) deferred — not needed since no login/production data required.

---

## Completion steps

1. Run all manual checks above against local dev server (`http://localhost:4179/debate/wikipedia`)
2. Run all code-review checks against files in "Files touched"
3. Run automated test suite (`npm test` in `frontend/` directory)
4. Verify no console errors in browser dev tools
5. Verify copy-to-clipboard format by clicking copy button and pasting into a text editor
6. Verify grid renders at all three breakpoints (1024px, 768px, 320px viewport widths)
7. Document any failures in this checklist and create Issues.md rows for regressions
8. Once all checks pass, plan is ready to move to `PLANS/Completed/`
