# Wikipedia quality grid

The signal grid, score panel, tooltip and copy button on the `/debate/wikipedia/` list. Each ranked
article shows one cell per scoring signal, a colour-banded score, and a copy button. The same
data sits in an invisible JSON block for AI agents. This guide covers how the pieces in the
page, the script and the style sheets must agree. The scoring itself is in
`wikipedia-ranking-pipeline.md`.

**Source of truth:** `frontend/assets/js/wikipedia.js` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/wikipedia.js`, `frontend/assets/js/utils/wikipedia-signals.js`, `frontend/assets/css/pages/wikipedia-quality-grid.css`, `frontend/assets/css/base/animations.css`, `frontend/debate/wikipedia.html`, `api/routes/wikipedia.js`, `api/models/wikipedia.model.js`, `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| `SIGNAL_DICTIONARY` keeps the signal row order of `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md` | The grid reads as a gradient: the first cells earn score, the last cells lose it. Position carries the meaning | A re-sorted dictionary draws correct numbers in the wrong cells. No test fails and every score is still right |
| Every class name that `wikipedia.js` builds exists in `wikipedia-quality-grid.css` (`wikipedia-cell--*`, `wikipedia-score--*`) | The script picks the class, the style sheet owns the colour. There is no inline colour | A renamed class on one side leaves cells or the score panel with no colour. Nothing errors |
| The tooltip is gated to pointer devices in two places: the media query in `wikipedia-quality-grid.css` and `pointerFineHover()` in `wikipedia.js` | CSS hides the tooltip off pointer devices, and the script must not create it there | If the script shows it where the CSS does not style it, a plain unstyled text node sits at the end of the page on touch devices |
| The grid column count in `wikipedia-quality-grid.css` equals `GRID_COLUMNS` in `wikipedia.js` | Arrow-key movement steps by the column count | Arrow keys land on the wrong cell. The grid still looks right |
| `frontend/debate/wikipedia.html` links `animations.css` | The tooltip has no reduced-motion rule of its own. The global rule in `animations.css` removes its motion (D-021) | Readers who turned motion off still see the tooltip slide. Nothing errors |
| The tier and band thresholds in `wikipedia.js` equal the values in `setup/STYLE_GUIDE/content-patterns.md` §9.1 | The style guide is the spec that a designer reads | A changed threshold in the script leaves the spec wrong, and the next edit "fixes" the code back |

## Shape

- **Data**: `api/routes/wikipedia.js` and `api/models/wikipedia.model.js` return each article with its signal rows. A signal with no row is an unfired signal, not a missing one.
- **Dictionary**: `wikipedia-signals.js` holds the signal order, names and the statement text. It is the one source for the order of the grid and of the clipboard text.
- **Page script**: `wikipedia.js` renders the grid, the score panel and the JSON block per article, then binds one delegated listener per event type for the tooltip, the keyboard and the copy button.
- **Copy button**: reads the JSON block of its own article when you click, so the copied text always matches what the block says.
- **Styling**: `wikipedia-quality-grid.css` owns colour and size. Values are in `setup/STYLE_GUIDE/content-patterns.md` §9.1.

## Extending it

1. To add or remove a signal, follow "Adding a new scoring signal" in `wikipedia-ranking-pipeline.md`.
2. Add the entry to `SIGNAL_DICTIONARY` at the position that matches the row order in `ALGORITHM_GUIDE_the_what.md`.
3. If the grid shape changes, change `GRID_COLUMNS` in `wikipedia.js` and the column count in `wikipedia-quality-grid.css` in the same commit.
4. If a threshold changes, update `setup/STYLE_GUIDE/content-patterns.md` §9.1 in the same commit.
5. Run `node --test frontend/assets/js/utils/wikipedia-signals.test.js`.

## Not documented here

Cell and gap sizes, colours and tooltip timing are in `setup/STYLE_GUIDE/content-patterns.md` §9.1
and `setup/STYLE_GUIDE/animation.md`. Signal weights and caps are in `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md`. The clipboard
text layout is in `content-patterns.md` §9.1.
