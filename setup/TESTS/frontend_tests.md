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
