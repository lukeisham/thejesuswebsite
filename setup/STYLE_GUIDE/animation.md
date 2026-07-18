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

### Inline Wikipedia Reliability Stones

**Purpose**: an inline scoring-overview widget on Wikipedia article list items (see [§9](content-patterns.md)). Two glyph buttons sit after each article's title link: one toggles a "stone wall" — one flat limestone block per reliability signal (27 total), evoking Second Temple ashlar masonry, shaded by how fully that signal fired; the other copies a plain-English rendering of the same data. An invisible per-article JSON block carries exact data for AI agents.

**Trigger glyphs** — both `.btn.btn--ghost` (§8), sized by `.wikipedia-signal-btn` (34px, icon-only), inside `.wikipedia-rank-title`:

| Button | Class | Icon | `title`/`aria-label` | Behaviour |
|---|---|---|---|---|
| Copy | `.wikipedia-signal-copy` | Feather `copy` | "Copy of the reliability information" | On success: checkmark + `.is-copied` for 1.5s, then reverts |
| Toggle | `.wikipedia-signal-toggle` | Custom 3-offset-rectangle "stacked ashlar" line-art glyph (§7, not Feather) | "Reliability calculation" | `aria-expanded`/`aria-controls` point at the wall's `id` |

Articles without signal data (`item.signals` empty) render no buttons — plain title only (JS-2).

#### Expand / Collapse

- **Expand**: `.wikipedia-stone-wrap` opens downward inline via `max-height` transition (`--duration-base` / `--ease-in-out`) — no overlay or absolute positioning. Stones animate in with a staggered settle-shuffle: from `scale(0.5)` plus a small per-stone `translate(--stone-shuffle-x, --stone-shuffle-y)` (a few px, hash-derived from the signal key, stable across renders) to `scale(1) translate(0,0)` at full opacity — `--duration-fast` / `--ease-out`, 30ms stagger, left-to-right in DOM order.
- **Settled state**: after the `max-height` transition ends (`transitionend`, timer fallback) the wrap gains `.is-settled` (`overflow: visible`) so top-row tooltips aren't clipped. Removed the instant collapse starts.
- **Collapse**: remove `.is-settled` immediately, then animate stones out in reverse DOM order (40ms stagger) shrinking toward their shuffle offset and fading out over `--duration-fast`. After the last stone's delay, the wrap loses `.is-open` (`max-height: 0`), `aria-hidden` → `true`, toggle `aria-expanded` → `false`.
- **Reduced motion**: the global rule applies; the stone-wall CSS additionally forces `animation: none` at the settled end-state via doubled-class selectors matching the animation rule's specificity — no `!important` (CSS-5).

#### Wall Layout

- Flexbox row, `flex-wrap: wrap` — stones reflow to the available width at any viewport.
- Stone size: ~48px square (±2–3px per-stone jitter) desktop; 40px fixed below 768px. `2px` gap (mortarless joints).
- Ordering: positives first (highest cap first), a `var(--space-md)` gap (`.wikipedia-stone-gap`), then negatives (largest penalty first). No section headings. Order defined once in `SIGNAL_DICTIONARY` (`frontend/assets/js/utils/wikipedia-signals.js`).
- No visible net-score badge — the net score lives only in the agent-data JSON and clipboard text.

#### Signals (28 stones)

Stones carry no visible label — only a hover/focus tooltip with the signal's official name (no weight, count, or "not triggered" text). Full detail lives in the agent-data JSON.

**Positive** (limestone "dressed ashlar" tones): Bible verses cited +9 · Named manuscripts +6 · Ante-Nicene authors +6 · Journal citations +5 · Book citations +5 · Primary-source quotes +4 · Jewish context terms +4 · Narrative/interpretation section split +3 · Location + archaeology bonus +3 · Commentary citations +3 · Non-Christian ancient historians +3 · Balanced debate +2 · Archaeological site/artefact +2 · Historical/contextual comparanda +2 · Wikipedia Good/Featured Article +1 · Manuscript-article bonus +1 · Niche exposure bonus +1

**Negative** (damaged/cracked tones): No Bible verse cited −10 · Mythicist citations −9 · No references at all −8 · Jesus Seminar citations −6 · OT-NT continuity criticism −6 · Supernatural-worldview criticism −6 · Passion-specific criticism −6 · Miracle-specific criticism −6 · Islamic/Mormon sources −3 · Gnostic source quoted −1 · Poor referencing −1

#### Shading (fulfilment-driven)

Rendering is driven by **polarity** and **fulfilment** = `|contribution| / |cap|`:

| Tier | Fulfilment | Rendering |
|---|---|---|
| 0 (untriggered) | `= 0` | Outline only — faint `#b8a48a` stroke at low opacity, no fill (untriggered signals stay visible in the wall) |
| 1 (minimal) | `< 0.4` | Low-opacity fill (`--stone-target-opacity` ≈ 0.32) |
| 2 (partial) | `< 0.95` | Mid opacity (≈ 0.55–0.78) |
| 3 (full) | `≥ 0.95` | Full opacity, most vivid tone |

- **Positive tones**: interpolated `#F5E6D3` (pale cream) → `#D4AF6A` (weathered gold), occasional `#A89968` (olive); edge tone mixes toward `#C4B5A0`.
- **Negative stones**: same limestone base blended toward `#8b3d3d` (`--error`) proportional to tier, plus 1–2 thin crack `<path>` lines — triggered penalties read as cracked/eroded stone, not flat red.
- **Per-stone variation**: exact size, tone mix, and small SVG rotation are hash-derived from the signal key — hand-hewn look, deterministic across renders.

#### Tooltip & Hover

- Tooltip content: signal name only. Dark background (`--text-primary`), `--bg-primary` text, `var(--radius-sm)`, `var(--space-xs) var(--space-sm)` padding, `var(--text-2xs)`, `--shadow-md`, positioned above the stone; fades in with `translateY(4px) → 0` over `--duration-fast` / `--ease-out`.
- Stones are keyboard-focusable (`tabindex="0"`); tooltip also shows on `:focus-visible`. Top-row clipping handled by `.is-settled` (above).
- Hover/focus outline: `2px solid var(--text-primary)` with small `outline-offset` — outline, not border/box-shadow, so no layout shift.

#### Invisible Agent-Data Layer

Each wall carries a `<script type="application/json" class="agent-data" data-agent-readable="true">` block:

```json
{
  "article": "<title>",
  "net_score": <number>,
  "signals": [
    { "key": "bible_verses", "name": "Bible verses", "weight": "capped +9", "cap": 9,
      "contribution": 9, "fulfilment": 1, "polarity": "positive",
      "statement": "Full credit for bible verses (maximum 9 points)." }
  ]
}
```

The copy button reads this block at click time (never a hand-duplicated string) and writes a plain-text rendering (title, `Net score: <n>`, one `Name: statement` line per signal) via `navigator.clipboard.writeText`, with a `showToast` on failure — never silent (JS-5).

#### Implementation Reference

- **CSS**: `frontend/assets/css/pages/wikipedia-quality-grid.css` — `.wikipedia-signal-btn`, `.wikipedia-stone-wrap` (`.is-open`/`.is-settled`), `.wikipedia-stone-row`, `.wikipedia-stone-gap`, `.wikipedia-stone` (`.is-visible`), `.wikipedia-stone-label`. Token-only values (CSS-2), no `!important` (CSS-5).
- **JS**: `frontend/assets/js/wikipedia.js` + shared `frontend/assets/js/utils/wikipedia-signals.js`:
  - `SIGNAL_DICTIONARY` (28 × `{ key, name, capMagnitude, polarity }`) — single source of truth for ordering, names, tooltips.
  - Per-article data: `/wikipedia` and `/wikipedia/:slug` attach `signals` (`{ signal_key, contribution, cap }`) from the `wikipedia_article_signals` table.
  - `fulfilmentRatio()` / `buildStatement()` compute shading tier and plain-English sentence from the numbers.
  - `buildStoneWidget(item, articleId)` renders buttons, wall, and agent-data JSON; returns `''` when `signals` is empty.
  - `openStoneWrap` / `closeStoneWrap` / `settleWrapAfterOpen` implement the expand/collapse spec above.
  - Both buttons bound via single document-level `delegate()` calls (JS-6) — no per-item listeners, so infinite scroll never leaks.
