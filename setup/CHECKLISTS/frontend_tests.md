## Validation: Timeline CSS Tokens
**Plan:** timeline-css-tokens.md
**Date:** 2026-10-21

### Manual checks
- [ ] Public timeline (`/evidence/timeline/`) at desktop width: dots, labels, stacks, era headings and the detail panel look exactly as before the change.
- [ ] Public timeline at 375px width: the vertical layout, the mobile label width and font size, and the era markers look as before.
- [ ] Print preview of the timeline: same result as before the change.
- [ ] Admin timeline editor (`/admin/diagrams/timeline.html`, passkey sign-in): toolbar, controls, panel and form, era filter, dot drag ring and era headings look as before.
- [ ] Computed-value script from Tier 1: every swapped declaration resolves to the literal it replaced.

### Code-review checks
- [ ] CSS-2 — no literal font-weight, z-index, opacity or non-hairline size is left in the timeline stylesheets (guide row 12).
- [ ] CSS-3 — `@media` conditions are unchanged and still equal the documented `--bp-*` values.
- [ ] CSS-5 — no selector changed, no `!important` added.
- [ ] CSS-6 — the new token groups in each `variables.css` sit under section headings.
- [ ] No admin token reuses a frontend name with a different value.
- [ ] Touch rule + CORE-5 — `frontend/assets/css/base/variables.css`: comments give the why and name the JS constant behind each shared token; `timeline.md` matches.
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-base/variables.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-tokens.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline/timeline-dots.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline/timeline-stacks.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline/timeline-labels.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline/timeline-responsive.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/pages/timeline/timeline-detail-panel.css`
- [ ] Touch rule + CORE-5 — `frontend/assets/css/components/timeline-era-headings.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-canvas.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-controls.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-dots.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-era-filter.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-era-headings.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-node-drag.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-panel-form.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-panel.css`
- [ ] Touch rule + CORE-5 — `admin/assets/css/admin-diagrams/timeline-toolbar.css`
- [ ] Touch rule + CORE-5 + CORE-6 — `setup/ARCHITECTURE/timeline.md`: rows 10–12 present, purpose 40 words or fewer, guide test named next to the rows.
- [ ] Touch rule — `setup/STYLE_GUIDE/foundations.md` and `setup/STYLE_GUIDE/components.md`: every new token is named with its value and use.
- [ ] TEST-10 — `api/tests/guide-timeline.test.js`: rows 10–12 fail with the rule, file, line and guide path; the row-12 allowed list names each exception with a reason and fails on a missing file.

## Validation: Page preloads
**Plan:** page-preloads.md
**Date:** 2026-10-23

### Manual checks
- [ ] The spike result is written down: which `crossorigin` and header choice gives one request for a preloaded read.
- [ ] `curl -s https://thejesuswebsite.org/contextual-essays/census-of-quirinius` shows a `<!-- modulepreload -->` block whose addresses end in `?v=<commit>`, and one `rel="preload" as="fetch"` for `/api/essays/census-of-quirinius`.
- [ ] A Lighthouse report of that page lists `/api/essays/census-of-quirinius` once, and it starts before 500 ms.
- [ ] No module address appears twice in that report's network requests.
- [ ] The essay page, an evidence page and a list page look the same as before (text, picture, layout).
- [ ] The `Performance check` workflow reports each page. The essay page LCP is lower than 2970 ms, and the list page is under 2500 ms.
- [ ] A page published after the deploy (admin publish) has the same preload tags.

### Code-review checks
- [ ] JS-8 — no committed HTML holds a `<!-- modulepreload -->` block, and no build tool was added.
- [ ] SR-4 — `preload-modules.js` imports `listFiles`, `isExternal` and `JS_IMPORT_RE` from `version-assets.js`, and copies none of them.
- [ ] JS-2 — a missing import and a page without `</head>` name the file in the message.
- [ ] HTML-6 — the slug in the preload address is passed through `encodeURIComponent` and the shared `escapeHTML()`.
- [ ] TEST-9 — the generator comment and the guide test say that the address mirrors `api.js`.
- [ ] Touch rule + CORE-5 — `api/scripts/version-assets.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/package.json`: the new script follows its neighbours
- [ ] Touch rule + CORE-5 — `deploy.sh`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/services/page-generator.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/tests/page-generator.test.js`: comments give the why and the links
- [ ] Touch rule + CORE-5 — `api/tests/guide-deployment.test.js`, `api/tests/guide-publishing-pipeline.test.js`, `api/tests/guide-performance-and-caching.test.js`: comments give the why and the links
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/deployment.md`, `publishing-pipeline.md`, `performance-and-caching.md`: purpose statement 40 words or fewer, numbered headings, citations of old headings fixed
- [ ] TEST-10 — the three guide test files fail with the rule, file, line and guide path; exceptions are named with a reason
- [ ] CORE-4 — row D-073 exists in `setup/Decisions_log.md`, one table row

## Validation: Module preload scope
**Plan:** module-preload-scope.md
**Date:** 2026-10-23

### Manual checks
- [ ] The measurement table has a median LCP, FCP and score, with and without the preload, for each of the nine pages of `PAGES`.
- [ ] `curl -s https://thejesuswebsite.org/evidence/timeline/` shows no `<!-- modulepreload -->` block.
- [ ] `curl -s https://thejesuswebsite.org/contextual-essays/census-of-quirinius` still shows the block and the `rel="preload" as="fetch"` tag.
- [ ] The `Performance check` run after the deploy: timeline score is 90 or more, no page is more than 150 ms of LCP worse than run `39893165161`, and the essay LCP is not above 2794 ms.
- [ ] The essay, evidence detail and list pages look and behave the same as before.

### Code-review checks
- [ ] CORE-4 — the new row amends D-073, and the D-073 Status cell uses the set wording.
- [ ] TEST-9 — the guide test reads `PRELOAD_PAGES` from the script, and keeps no copy of it.
- [ ] AG-1 — no HTML page was edited.
- [ ] Touch rule + CORE-5 — `api/scripts/preload-modules.js`: comments give the why and the links, the guide matches the file
- [ ] Touch rule + CORE-5 — `api/tests/preload-modules.test.js`: comments give the why and the links
- [ ] Touch rule + CORE-5 — `setup/ARCHITECTURE/performance-and-caching.md`: purpose statement 40 words or fewer, numbered headings, the rows from other plans kept
- [ ] TEST-10 — `api/tests/guide-performance-and-caching.test.js`: fails with the rule, file, line and guide path; exceptions are named with a reason
