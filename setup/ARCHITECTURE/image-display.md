# Image display

Every image on the site follows one fixed pattern for its kind, so pages look consistent and nothing jumps while images load. Readers see figures, list thumbnails and map backgrounds the same way on every page.

**Source of truth:** `frontend/assets/css/components/figures.css` and `frontend/assets/js/utils/figures.js` — win any disagreement with this doc.
**Spans:** `frontend/index.html`, `frontend/assets/css/components/figures.css`, `frontend/assets/css/pages/maps/maps-canvas.css`, `frontend/assets/css/pages/news-and-blog.css`, `frontend/assets/js/utils/figures.js`, `frontend/assets/js/utils/figure-orientation.js`, `frontend/assets/js/utils/content-markers.js`, `frontend/assets/js/utils/lazy-load.js`, `frontend/assets/js/main.js`, `frontend/assets/js/maps/maps-render.js`, `frontend/assets/js/challenge-detail.js`, `frontend/assets/js/evidence-detail.js`, `frontend/assets/js/news-and-blog.js`, `frontend/assets/js/blog-list.js`, `frontend/assets/js/news-list.js`, `frontend/assets/js/evidence-list.js`, `frontend/assets/js/search.js`.

## 1. Patterns

Each image on the site is one of these kinds. There is no per-page image styling. A new kind of image is a design question, not a new CSS file.

| Pattern | Markup and where it is built | Size on the tag | Loading | Alt text |
| :--- | :--- | :--- | :--- | :--- |
| Content figure | `<figure>` + `<figcaption>`. Detail pages get it from `[figure]` shortcodes (`content-markers.js`) and `evidence-detail.js`. `about.html` writes it by hand | `width` and `height` (720 by 480 on detail pages; the real size on `about.html`). CSS keeps the real shape | `loading="lazy"` | From stored data |
| Hero figure | The first image on the home page. A hand-written `<figure>` that holds a `<picture>`: AVIF `<source>` files at 480, 768 and 1024 wide, and a JPEG fallback `<img>` | 1024 by 572, the size of the JPEG | Eager with `fetchpriority="high"`, because it is above the fold. A `<link rel="preload">` in `<head>` starts the fetch | Hand-written |
| Challenge picture | A `<figure>` that `challenge-detail.js` builds | None. The file sets its size | `loading="lazy"` | From the stored `challenge_picture_alt` |
| List thumbnail, `news-blog-row` | Built with `createElement` in `news-and-blog.js`, `blog-list.js` and `news-list.js` | None. `news-and-blog.css` sets it | `loading="lazy"` | `alt=""` |
| List thumbnail, with `data-src` | A string template in `evidence-list.js` (80 by 80) and `search.js` (64 by 64) | `width` and `height` | `data-src`, swapped to `src` by `initLazyLoad()` | `alt=""` |
| Map background | One `<img id="map-image">` in each map page. `renderRegion()` in `maps-render.js` fills in `src` and `alt` from the map record | None. `.map-image` is `width: 100%; height: auto` | `loading="lazy"` | Set by `renderRegion()` |
| Footer mark | The 20 by 20 site mark in the page footer | `width` and `height` | Eager | `alt=""` |

These are not images in this sense: interface icons come from the SVG sprite, the arbor and timeline drawings are SVG, and the arbor and timeline backgrounds are CSS gradients.

## 2. Invariants

Guide test: `api/tests/guide-image-display.test.js`. Its row numbers match the rows below.

| # | Must hold | Why | Breaks silently if violated |
|---|---|---|---|
| 1 | Every content `<img>` carries `width` and `height`. Static HTML, `content-markers.js` and the detail-page templates all author them. The map background and the challenge picture are the two named exceptions (Patterns) | The browser reserves the space before the image loads | Layout shift. It is invisible on a fast local disk and shows only on real connections |
| 2 | An `<img>` has `loading="lazy"` or a `data-src`, unless it is the home page hero or the footer mark | `data-src` images load through `initLazyLoad()`, called from `main.js` | A `data-src` image on a page that does not load `main.js` never loads. The thumbnail stays blank. No error appears |
| 3 | A row with no thumbnail renders a placeholder `<div>`, never an `<img>` with an empty `src` | Every row renderer repeats this branch, because each maps a different API field | An empty `src` fires a request and shows the broken-image glyph. Only the rows with no thumbnail are wrong |
| 4 | Alt text for an uploaded image comes from a stored `*_alt` column that the admin form writes | The admin picks the image, so the alt text must travel with it | Screen readers get a missing or stale description. Visual checks never show it |
| 5 | Row thumbnails use `alt=""`. Content images take their alt text from stored data | The row title already names the content | Screen readers read the same text twice per row |
| 6 | Every page that renders figures dynamically calls `numberFigures()` over the whole content container, again after each insert of new content | The function restarts at `Fig. 1` on every call. Figures that sit in separate containers each restart at 1 | Figures have no number, or the numbers repeat |
| 7 | Each map page has one `<img class="map-image" id="map-image">` with an empty `src`. `renderRegion()` sets `src` and `alt`, and `.map-image` stays `width: 100%; height: auto` | One page template serves every map, the maps have different shapes, and the database stores no size. A size on the tag would fit only some maps | A fixed `width` and `height` in the template distorts the other maps. A map page that does not run `renderRegion()` shows an empty box |
| 8 | The hero `<img>` carries the real size of its JPEG file. The `<link rel="preload">` in `<head>` repeats the `srcset` and `sizes` of the hero `<source>` exactly. Every file in that `srcset` exists at the width its descriptor states | The hero is the Largest Contentful Paint element. The tag size reserves its space. A preload that differs from the `<source>` makes the browser fetch two files | The page jumps when the hero loads, or the hero downloads twice. Both are invisible on a fast local disk |

Rows 1, 2, 3, 5, 6, 7 and 8, and the shared `news-blog-row` classes in "Shape", are enforced by `api/tests/guide-image-display.test.js` (TEST-10). Row 4 is not.

## 3. Shape

- **Figures** — `<figure>` + `<figcaption>`, styled by `figures.css`. Detail-page scripts number them at render time with `numberFigures()` (`utils/figures.js`). The static `index.html` and `about.html` hand-write the `fig-number` span instead.
- **`.figure-standard`** — `[figure]` shortcodes get it from `content-markers.js`. `applyFigureOrientation()` (`utils/figure-orientation.js`, called by `evidence-detail.js`) adds the portrait or landscape class. Aligned figures (`figure-align-*`) never take it.
- **Row thumbnails** — `news-and-blog.js` (`buildRow()`, local to that file), `blog-list.js` and `news-list.js` each build the same `news-blog-row` markup, styled by `news-and-blog.css`. `evidence-list.js` and `search.js` build their own thumbnail markup with their own classes and use `data-src`. Change the markup in all three `news-blog-row` builders together.
- **Hero** — `index.html` holds the `<picture>` and the preload. `figures.css` draws the border on the `<img>` only, because a border on the `<picture>` would add a second frame. `sizes` follows the layout: 680px from a 1000px viewport, then the viewport less the open sidebar, then the viewport less the page padding.
- **Map background** — `maps-canvas.css` styles `.map-viewport` and `.map-image`. The pins layer sits on top of the image and uses percentage positions, so it needs no pixel size (`maps.md`).

## 4. Extending it

1. Decide which pattern the image is, using the Patterns table. If none fits, that is a design question, not a new CSS file.
2. Content image: write the `<figure>` markup with `width`, `height`, `alt` and `loading`. For a dynamic page, call `numberFigures()` on the content container.
3. List thumbnail: copy the `news-blog-row` markup from an existing builder, including the null-thumbnail placeholder branch.
4. New uploaded-image field: make the column nullable, add a `*_alt` column beside it, and make sure the admin form writes both.
5. A new map page: copy the map markup from an existing page, so it carries `id="map-image"` and the same `.map-viewport` wrapper.
6. Replace the hero: save the new picture as a JPEG under a new filename, because images are cached for a year at a stable URL (`performance-and-caching.md`). Make the three AVIF files from it with `sharp(jpeg).resize(width).avif({ quality: 50, effort: 9 })` for widths 480, 768 and 1024. Compare a crop of each against the JPEG before you keep it. Then update the preload, the `<source>`, the `<img>` size and the `og:image` and `twitter:image` tags in `index.html` together.

## 5. Not documented here

Thumbnail sizes, border radii, placeholder styling and breakout breakpoints are in
`figures.css` and `news-and-blog.css`. Visual conventions are in
`setup/STYLE_GUIDE/`.
