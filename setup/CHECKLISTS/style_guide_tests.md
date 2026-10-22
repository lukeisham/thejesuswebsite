# Style guide test validation

Manual and code-review checks for the plans that add style guide tests over the frontend and admin stylesheets.

## Validation: Style guide tests — colours, fonts and breakpoints
**Plan:** style-guide-tests-foundations.md
**Date:** 2026-10-22

### Manual checks
- [ ] `cd api && node --test tests/guide-style-foundations.test.js` passes; a literal colour, an off-list `@media` width and an `--admin-` token in a frontend file each make it fail (then revert).
- [ ] Admin login, sidebar, an editor with a validation error, the arbor and maps editors, and the admin Wikipedia list look the same as before (computed styles match the tokens).
- [ ] The public evidence badges, the maps focus ring and the Wikipedia list at 1023px and 1024px wide look the same as before.

### Code-review checks
- [ ] CSS-2 — every replaced literal resolves to the same value through its token.
- [ ] D-017 — no `--admin-` text remains under `frontend/`.
- [ ] CSS-3 — every `@media` width is in the §4.1 list.
- [ ] CORE-4 — the TEST-10 change and any arbor-tokens exception have a decisions-log row.
- [ ] Touch rule + CORE-5 — `setup/Vibe_coding_rules.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/Decisions_log.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/STYLE_GUIDE/foundations.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-base/variables.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/base/variables.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/components/badges.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/maps/maps-canvas.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/base/typography.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/wikipedia-list.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/auth/login.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/auth/register.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-components/forms.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-components/admin-editor-shared-forms.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-components/resources-list.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-components/tables.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/maps-panel-form.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/maps-metadata.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/maps-gallery.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor-edge-menu.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor-connect-menu.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/maps-pin-menu.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor-panel.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/holding-pen-panel.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor-pen-badges.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor-zoom.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/arbor.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/wikipedia.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/news.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-layout/sidebar.css`: comments give the why and the links, the guide matches the file
- [ ] TEST-10 — `api/tests/guide-style-foundations.test.js`: fails with the rule, file, line and style guide section; exceptions are named with a reason

## Validation: Style guide tests — motion and specificity
**Plan:** style-guide-tests-motion-and-specificity.md
**Date:** 2026-10-22

### Manual checks
- [ ] `cd api && node --test tests/guide-style-animation.test.js tests/guide-style-pages-and-admin.test.js` passes; a literal duration, an `!important` and an ID selector each make it fail (then revert).
- [ ] Spinners and skeletons still animate; with reduced motion on, they stop.
- [ ] Evidence and challenge detail pages and the admin published toggle look the same as before.

### Code-review checks
- [ ] CSS-5 — the only `!important` left is the reduced-motion rule; no ID selector remains.
- [ ] The `id`s that `evidence-detail.js` and `challenge-detail.js` read are still in the templates.
- [ ] CSS-2 — `--duration-spin` and `--duration-shimmer` equal the literals they replaced.
- [ ] Touch rule + CORE-5 — `setup/STYLE_GUIDE/animation.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `setup/STYLE_GUIDE/pages-and-admin.md`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/base/variables.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/components/loading.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/components/infinite-scroll.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `admin/assets/css/wikipedia.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/evidence.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/challenge-detail.css`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/evidence/[slug].html`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/debate/academic-challenges/[slug].html`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `frontend/debate/popular-challenges/[slug].html`: comments give the why and the links, the guide matches the file
- [ ] TEST-10 — `api/tests/guide-style-animation.test.js`: fails with the rule, file, line and style guide section; exceptions are named with a reason
- [ ] TEST-10 — `api/tests/guide-style-pages-and-admin.test.js`: fails with the rule, file, line and style guide section; exceptions are named with a reason
