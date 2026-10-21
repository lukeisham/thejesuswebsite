# Wikipedia quality grid

The grid shows, for each ranked Wikipedia article, which scoring signals earned or lost points, and the score. A reader sees why the article ranks where it does. AI agents and the clipboard get the same data.

On `/debate/wikipedia/`, each article has one cell per signal, a colour-banded score, a tooltip, a copy button and an invisible JSON block. This guide covers what the page, the script and the style sheets must agree on. The scoring is in `wikipedia-ranking-pipeline.md`.

**Source of truth:** `frontend/assets/js/wikipedia.js` — wins any disagreement with this doc.
**Spans:** `frontend/assets/js/wikipedia.js`, `frontend/assets/js/utils/wikipedia-signals.js`, `frontend/assets/css/pages/wikipedia-quality-grid.css`, `frontend/assets/css/base/animations.css`, `frontend/debate/wikipedia.html`, `api/routes/wikipedia.js`, `api/models/wikipedia.model.js`, `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| `SIGNAL_DICTIONARY` keeps the signal row order of `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md` | The grid reads as a gradient: the first cells earn score, the last cells lose it. Position carries the meaning | A re-sorted dictionary draws correct numbers in the wrong cells. No test fails and every score is still right |
| Every class name that `wikipedia.js` builds exists in `wikipedia-quality-grid.css` (`wikipedia-cell--*`, `wikipedia-score--*`) | The script picks the class, the style sheet owns the colour. There is no inline colour | A renamed class on one side leaves cells or the score panel with no colour. Nothing errors |
| The grid column count in `wikipedia-quality-grid.css` equals `GRID_COLUMNS` in `wikipedia.js` | Arrow-key movement steps by the column count | Arrow keys land on the wrong cell. The grid still looks right |
| `frontend/debate/wikipedia.html` links `animations.css` | The tooltip has no reduced-motion rule of its own. The global rule in `animations.css` removes its motion (D-021) | Readers who turned motion off still see the tooltip slide. Nothing errors |
| The tier and band thresholds in `wikipedia.js` equal the values in `setup/STYLE_GUIDE/content-patterns.md` §9.14 | The style guide is the spec that a designer reads | A changed threshold in the script leaves the spec wrong, and the next edit "fixes" the code back |

## Shape

- **Data:** `api/routes/wikipedia.js` and `api/models/wikipedia.model.js` return each article with its signal rows. A signal with no row is an unfired signal, not a missing one.
- **Dictionary:** `wikipedia-signals.js` holds the signal order, names and statement text. It is the one source for the order of the grid and of the clipboard text.
- **Page script:** `wikipedia.js` renders the grid, the score panel and the JSON block for each article. The copy button reads the JSON block of its own article.
- **Styling:** `wikipedia-quality-grid.css` owns colour and size. Values are in `setup/STYLE_GUIDE/content-patterns.md` §9.14.

## Extending it

1. To add or remove a signal, follow "Adding a new scoring signal" in `wikipedia-ranking-pipeline.md`.
2. Add the entry to `SIGNAL_DICTIONARY` at the position that matches the row order in `ALGORITHM_GUIDE_the_what.md`.
3. If the grid shape changes, change `GRID_COLUMNS` in `wikipedia.js` and the column count in `wikipedia-quality-grid.css` in the same commit.
4. If a threshold changes, update `setup/STYLE_GUIDE/content-patterns.md` §9.14 in the same commit.
5. Run `node --test frontend/assets/js/utils/wikipedia-signals.test.js`.

## Not documented here

Cell and gap sizes, colours and tooltip timing are in `setup/STYLE_GUIDE/content-patterns.md` §9.14
and `setup/STYLE_GUIDE/animation.md`. Signal weights and caps are in `Wikipedia algorithm/ALGORITHM_GUIDE_the_what.md`. The clipboard
text layout is in `buildClipboardText()` in `frontend/assets/js/wikipedia.js`.
