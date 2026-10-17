# Image display

Two patterns cover every image on the site: `<figure>` for content images, and
the `buildRow()` thumbnail for list rows. There is deliberately no third
pattern, and no per-page image styling.

**Source of truth:** `frontend/assets/css/components/figures.css` and `frontend/assets/js/news-and-blog.js` — win any disagreement with this doc.
**Spans:** `frontend/assets/css/components/figures.css`, `frontend/assets/css/pages/news-and-blog.css`, `frontend/assets/js/news-and-blog.js`, `frontend/assets/js/utils/figures.js`, every page template carrying an image.

## Invariants

| Must hold | Why | Breaks silently if violated |
|---|---|---|
| Content `<img>` carries explicit `width` and `height` | Reserves space before load | Cumulative Layout Shift — invisible locally on a fast disk, punishing on real connections and in Lighthouse |
| Every `<img>` gets `loading="lazy"` unless it is an above-fold hero | Bandwidth on a content-heavy site | Every image on a long page downloads at once; page still "works", just slowly |
| Alt text for uploaded images is stored data, not hardcoded | The image is chosen in the admin; the alt must travel with it | Screen readers get a generic or stale description that no one sees in visual QA |
| Decorative thumbnails use `alt=""`, content images never do | The row title already conveys the content; duplicating it is noise | Screen readers announce the same text twice per row |

## Shape

- **Figures** — `<figure>` + `<figcaption>`, styled entirely by `figures.css`. Used wherever the image is part of the content (about, evidence detail). Figure numbering is authored by hand in the caption; there is no auto-numbering. `figures.css` also carries the full-bleed and side-breakout variants.
- **Thumbnails** — rendered only by `buildRow()` in `news-and-blog.js`, used by the news and blog feeds. It takes a nullable thumbnail URL and branches: URL → `<img>`, null → placeholder `<div>`.
- The API exposes thumbnails as nullable URL strings into `/uploads/`; the field name differs per entity, so `buildRow()` is the normalising layer.
- Page-level containers (`.about-page`, `.evidence-detail`) set the reading-column width; figures inherit it rather than setting their own.

## Extending it

Adding images to a new page or feed:

1. Decide which pattern it is — content image or list thumbnail. If neither fits, that is a design question, not a new CSS file.
2. Figures: write the `<figure>` markup, add `width`/`height`/`alt`/`loading`, and let `figures.css` style it. Add a page container only if the reading width differs.
3. Thumbnails: call `buildRow()` with `thumbnail: entity.<field> || null`. Do not hand-roll the `<img>`.
4. New uploaded-image field: make it nullable, store alt text alongside it, and confirm the admin form captures both.

## Not documented here

Thumbnail dimensions, border radii, placeholder styling, breakout breakpoints,
and the exact API field names — read `figures.css`, `news-and-blog.css`, and
`buildRow()` in `news-and-blog.js`. Visual conventions generally live in
`setup/STYLE_GUIDE/`.
