# Image display

Two patterns cover every image on the site: `<figure>` for content images, and
a row thumbnail for list rows. There is no third pattern and no per-page image
styling.

**Source of truth:** `frontend/assets/css/components/figures.css` and `frontend/assets/js/utils/figures.js` — win any disagreement with this doc.
**Spans:** `frontend/assets/css/components/figures.css`, `frontend/assets/css/pages/news-and-blog.css`, `frontend/assets/js/utils/figures.js`, `frontend/assets/js/utils/figure-orientation.js`, `frontend/assets/js/utils/content-markers.js`, `frontend/assets/js/utils/lazy-load.js`, `frontend/assets/js/main.js`, `frontend/assets/js/news-and-blog.js`, `frontend/assets/js/blog-list.js`, `frontend/assets/js/news-list.js`, `frontend/assets/js/evidence-list.js`, `frontend/assets/js/search.js`.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Every content `<img>` carries `width` and `height`. Static HTML, `content-markers.js` and the detail-page templates all author them | The browser reserves the space before the image loads | Layout shift. It is invisible on a fast local disk and shows only on real connections |
| An `<img>` has `loading="lazy"` or a `data-src`, unless it is an above-fold hero | `data-src` images load through `initLazyLoad()`, called from `main.js` | A `data-src` image on a page that does not load `main.js` never loads. The thumbnail stays blank. No error appears |
| A row with no thumbnail renders a placeholder `<div>`, never an `<img>` with an empty `src` | Every row renderer repeats this branch, because each maps a different API field | An empty `src` fires a request and shows the broken-image glyph. Only the rows with no thumbnail are wrong |
| Alt text for an uploaded image comes from a stored `*_alt` column that the admin form writes | The admin picks the image, so the alt text must travel with it | Screen readers get a missing or stale description. Visual checks never show it |
| Row thumbnails use `alt=""`. Content images take their alt text from stored data | The row title already names the content | Screen readers read the same text twice per row |
| Every page that renders figures dynamically calls `numberFigures()` over the whole content container, again after each insert of new content | The function restarts at `Fig. 1` on every call. Figures that sit in separate containers each restart at 1 | Figures have no number, or the numbers repeat |

## Shape

- **Figures** — `<figure>` + `<figcaption>`, styled by `figures.css`. Detail-page scripts number them at render time with `numberFigures()` (`utils/figures.js`). The static `index.html` and `about.html` hand-write the `fig-number` span instead.
- **`.figure-standard`** — `[figure]` shortcodes get it from `content-markers.js`. `applyFigureOrientation()` (`utils/figure-orientation.js`, called by `evidence-detail.js`) adds the portrait or landscape class. Aligned figures (`figure-align-*`) never take it.
- **Row thumbnails** — `news-and-blog.js` (`buildRow()`, local to that file), `blog-list.js` and `news-list.js` each build the same `news-blog-row` markup, styled by `news-and-blog.css`. `evidence-list.js` and `search.js` build their own thumbnail markup with their own classes and use `data-src`. Change the markup in all three `news-blog-row` builders together.

## Extending it

1. Decide which pattern the image is: content image or list thumbnail. If neither fits, that is a design question, not a new CSS file.
2. Content image: write the `<figure>` markup with `width`, `height`, `alt` and `loading`. For a dynamic page, call `numberFigures()` on the content container.
3. List thumbnail: copy the `news-blog-row` markup from an existing builder, including the null-thumbnail placeholder branch.
4. New uploaded-image field: make the column nullable, add a `*_alt` column beside it, and make sure the admin form writes both.

## Not documented here

Thumbnail sizes, border radii, placeholder styling and breakout breakpoints are in
`figures.css` and `news-and-blog.css`. Visual conventions are in
`setup/STYLE_GUIDE/`.
