_Part of the [Style Guide](INDEX.md) — §6: animation & transitions._

---

## 6. Animation & Transitions

Philosophy: transitions aid perception, never slow the user down. Scholarly content should feel stable and deliberate, not playful.

### Tokens

| Token | Value | Use for |
|---|---|---|
| `--duration-fast` | 150ms | Hover states, button feedback, icon swaps |
| `--duration-base` | 250ms | Modals, drawers, card hover lift |
| `--duration-slow` | 400ms | Page-level fades, skeleton → content |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Elements entering |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Toggles, drawers (smooth both ways) |

Never use `linear` or bouncy/spring easings for UI transitions.

### Rules

- Card hover lift: `translateY(-2px)`, `--duration-fast` / `--ease-out`.
- Modal open: fade-in + scale `0.97 → 1`, `--duration-base`.
- Skeleton → content: opacity fade, `--duration-slow`.
- Never animate text or layout reflows (jank).
- Reduced motion — global rule; all animation specs in this guide are subject to it:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### Wikipedia Quality Grid

**Purpose**: an always-visible per-signal scoring overview on Wikipedia article list items (see [§9](content-patterns.md) / [§9.1](content-patterns.md)). A 5x5 grid of 25 cells — one per §9 signal, in row order — sits inline after each article's title, alongside a colour-banded document score panel and a copy button. An invisible per-article JSON block carries exact data for AI agents.

**Motion is limited to one thing: the tooltip.** There is no expand/collapse, no stagger, no settlement animation — the grid renders complete on first paint.

- **Tooltip fade**: `translateY(4px) → 0`, opacity `0 → 1`, over `--duration-fast` / `--ease-out`. Fires on hover/focus for a single shared tooltip element (JS-6: one delegated listener, not one per cell).
- **Pointer devices only**: gated by `@media (hover: hover) and (pointer: fine)` — touch readers get no tooltip (it would collide with scroll), and no tooltip-showing code path runs outside that media query. Accessible names (`aria-label`) are exposed to screen readers on every device regardless.
- **Reduced motion**: the global rule applies; `wikipedia-quality-grid-reduced-motion.css` additionally forces the tooltip transition to `none`.

#### Cell styling

- Each cell is a plain `26px` (`22px` below 768px) square `<div role="gridcell">` — no per-cell SVG, no inline `style` colour (SR-3, CSS-2): colour comes entirely from a `.wikipedia-cell--*` class.
- **Empty** (`contribution: 0`, fired or not): light `--bg-surface` fill, 1px `--border` outline.
- **Positive, fired**: `--bg-surface-alt` fill, text colour one of four blue intensity tiers (`--grid-blue-1..4`) by fulfilment ratio (`|contribution| / |cap|`) — tier 4 (`≥ 0.95`) is bold.
- **Negative, fired**: `--error` text, bold, contribution shown with its minus sign.

#### Score panel & copy

- `.wikipedia-score-panel` sits right of the grid: solid colour band by `net_score` — green `≥ 50`, yellow `25–49`, red `≤ 24`.
- Copy button (unchanged glyph/behaviour from the prior widget) reads the agent-data `<script>` block at click time and writes the §6 plain-text format via `navigator.clipboard.writeText`, with a `showToast` on failure — never silent (JS-5).

#### Implementation Reference

- **CSS**: `frontend/assets/css/pages/wikipedia-quality-grid.css` — `.wikipedia-grid`, `.wikipedia-cell` (`--empty`, `--blue-1..4`, `--negative`), `.wikipedia-score-panel` (`--green`/`--yellow`/`--red`), `.wikipedia-tooltip`. Token-only values (CSS-2), no `!important` (CSS-5).
- **JS**: `frontend/assets/js/wikipedia.js` + shared `frontend/assets/js/utils/wikipedia-signals.js`:
  - `SIGNAL_DICTIONARY` (25 × `{ key, name, capMagnitude, polarity }`) — single source of truth for §9 ordering, names, tooltips.
  - Per-article data: `/wikipedia` and `/wikipedia/:slug` attach `signals` (`{ signal_key, contribution, cap }`) from the `wikipedia_article_signals` table.
  - `buildAgentData()` emits all 25 signals per article (unfired ones included, `contribution: 0`, `fired: false`).
  - `buildGridWidget(item, articleId)` renders the grid, score panel, copy button, and agent-data JSON; returns `''` when `signals` is empty.
  - Grid keyboard navigation is a roving tabindex (one tab stop in, arrow keys move between cells, one tab stop out).
  - Tooltip and keyboard listeners are both bound via single document-level `delegate()` calls (JS-6) — no per-cell listeners, so infinite scroll never leaks even at the full 255-article / 6,375-cell count.
