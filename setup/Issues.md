# Issues

> Note: this file was found missing on 2026-07-11 and recreated. Earlier plans
> (maps-visual-parity-refactor.md, map-pin-geo-alignment.md,
> accessible-visuals-keyboard.md, and others in `setup/PLANS/Completed/`)
> reference rows 1–29 of the previous copy, whose history is lost. Numbering
> resumes at 30 so those references stay unambiguous.

| # | File | Issue | Rule | Plan | Date | Status |
|---|------|-------|------|------|------|--------|
| 30 | setup/Issues.md | Previous Issues.md (rows 1–29, referenced by multiple completed plans) is missing from disk; history unrecoverable, file recreated | warning | admin-maps-editor-script-includes-fix.md | 2026-07-11 | open |
| 31 | frontend/evidence/maps/[map_key].html | Live Jerusalem map page issues no pin-data fetch; can't distinguish "zero pins in DB" from "frontend never fetches/embeds pins" — verify once first pin exists | warning | maps-pin-content-placement.md | 2026-07-11 | open |
| 32 | deploy/nginx.conf | Maps cache-control rule (1h must-revalidate for /assets/images/maps/) committed but VPS nginx may never have been reloaded; low impact (URL versioning covers it) | warning | maps-robustness-hardening.md | 2026-07-11 | resolved |
| 33 | admin/diagrams/timeline.html, admin/diagrams/arbor.html | Admin panel requires WebAuthn passkey sign-in, which cannot be automated by an agent — live verification of admin/frontend visual alignment fixes must be done manually by the site owner or deferred | warning | timeline-frontend-admin-alignment-fix.md | 2026-07-11 | open |
| 34 | frontend/evidence/arbor.html | Production `/evidence/arbor.html` currently serves 404 content, blocking live verification of the arbor alignment fix; deploy issue tracked separately from this plan | bug | arbor-frontend-admin-alignment-fix.md | 2026-07-11 | resolved |
| 35 | frontend/assets/images/maps/jerusalem.svg | Gethsemane and Golgotha have no visible label/anchor on the re-framed map, though the plan's geographic-plausibility notes assumed both; only Temple Mount, Upper/Lower City, City of David, Mount of Olives, and the two valleys are labeled | warning | jerusalem-map-reframe-central-third.md | 2026-07-11 | resolved |
| 36 | setup/PLANS/Completed/reconcile-evidence-schema-form.md | Plan documented gospel_category CHECK values as `birth, baptism, temptation, ...` but the actual schema.sql and admin form use `theme, events, parables, sayings-and-sermons, people, objects, places, miracles`. Schema and form are internally consistent; the plan document is misleading. | warning | evidence-schema-route-hardening.md | 2026-07-11 | resolved |
| 37 | setup/PLANS/Completed/admin-layout-timeline-mla-fixes.md | Plan intended to restore timeline_era CHECK values to `beginning/middle/end` but the actual schema.sql uses the 8-era system (`PreIncarnation`, `OldTestament`, `EarlyLife`, `Life`, `GalileeMinistry`, `JudeanMinistry`, `PassionWeek`, `Post-Passion`). Schema and form are consistent; the plan document is misleading. | warning | evidence-schema-route-hardening.md | 2026-07-11 | resolved |
| 38 | admin/assets/js/admin-arbor/arbor-edges.js, admin/assets/js/admin-arbor/arbor-nodes.js | Redesigned arbor editor makes connect (right-drag) and disconnect (right-click) pointer-only, with no keyboard equivalent — conflicts with the Website guide's Operable mandate that arbor interactions have keyboard paths. Admin-only tooling; gesture set was explicitly requested. Needs a keyboard-accessible connect/disconnect follow-up. | warning | arbor-editor-click-drag.md | 2026-07-11 | resolved |
| 39 | setup/PLANS/Completed/maps-visual-parity-refactor.md | Plan header says Status `✅ Completed`, but Task Groups 6–8 still contain unchecked `- [ ]` boxes (the side-by-side visual parity check, two Issues.md close-out rows, an nginx reload, and the final live test) — the plan lifecycle rule was not actually followed before marking it done, which is consistent with the missing-`admin.css`/missing-token-bridge bug in `admin/diagrams/maps.html` shipping undetected. | bug | maps-editor-gallery-and-interactions.md | 2026-07-11 | resolved |
| 40 | admin/assets/css/admin-base/variables.css | `--admin-accent` (`#e94560`, a red/pink) and several sibling `--admin-*` tokens diverge from the values documented in setup/Style_guide.md §1 and duplicated in frontend/assets/css/base/variables.css (`--admin-accent: #3d5a78`, slate blue) — a pre-existing inconsistency between the two admin-token definitions, unrelated to this plan's fix. | CSS-2 | maps-editor-gallery-and-interactions.md | 2026-07-11 | resolved |
| 41 | frontend/news-and-blog/blog/[slug].html, frontend/assets/js/blog-detail.js | Blog detail page JS referenced post.author, post.category, post.tags, post.description — none of these have backing DB columns or admin UI; the byline/tag-row feature was never actually implemented, only stubbed in frontend rendering code. | bug | blog-editor-fixes.md | 2026-07-16 | open |
| 42 | frontend/debate/wikipedia.html | Page intro paragraph reads "Reliability is based a variety of factors" — missing the word "on" (commit 5942a75 intended this fix but the live text is still wrong). | bug | wikipedia-stones-refinements.md | 2026-07-16 | open |
| 43 | frontend/assets/js/wikipedia.js, setup/STYLE_GUIDE/content-patterns.md | Wikipedia ranked-list cards never rendered "+/- counts" (wikipedia_rank_pluses/wikipedia_rank_minuses) despite both the module JSDoc and the old §9 style-guide text claiming they did — stubbed-but-never-built, same pattern as issue #41. | bug | wikipedia-stones-refinements.md | 2026-07-17 | open |
| 44 | frontend/debate/wikipedia.html, setup/STYLE_GUIDE/content-patterns.md | Style guide §9 said the page header uses `h1` "Wikipedia Articles"; the live page actually uses `<h2>Wikipedia Rankings</h2>` (with a visually-hidden `h1` "Wikipedia Rankings" earlier in the DOM for SEO/a11y) — pre-existing drift between the guide and the shipped markup, noticed while updating §9 for this plan. | bug | wikipedia-stones-refinements.md | 2026-07-17 | open |
| 45 | database/schema.sql | `database/schema.sql`'s `analytics` table definition is missing `is_bot` and `search_terms` columns (added later by `database/migrations/017_add_analytics_bot_search.sql`). `CLAUDE.local.md` calls `schema.sql` the authoritative source — a pre-existing drift between the canonical schema and the migration history, not something this plan fixes. | warning | analytics-country-referrer-bot-fixes.md | 2026-07-17 | open |
## Error Encoding Review — 2026-07-11

### Missing Category 2 — Transformation Error Codes
- **File**: api/lib/error-codes.js
- **Severity**: High
- **Description**: Category 2 (E-TRANSFORM-001 through E-TRANSFORM-015) was entirely missing from the error code registry. The file header only mentioned Category 1 and Category 3, and the registry only spread those two categories. 15 transformation error codes covering string operations, date parsing, JSON handling, URI encoding, math/numeric operations, type coercion, array/object transformations, and template interpolation were absent.
- **Resolution**: Added CATEGORY_2 with all 15 codes (E-TRANSFORM-001 through E-TRANSFORM-015) spanning string, date, sort, JSON, URI, math, type, array, object, and template transformation failures. Updated JSDoc header and registry.

### Missing Category 4 — Egress Error Codes
- **File**: api/lib/error-codes.js
- **Severity**: High
- **Description**: Category 4 (E-EGRESS-001 through E-EGRESS-018) was entirely missing. 18 egress error codes covering response serialization, template rendering, JSON encoding, content type handling, partial delivery, caching, stream interruption, client-side display fallbacks, HTTP boundary guards, timeouts, compression, redirects, and SSE events were absent. The frontend error-fallback.js already referenced E-EGRESS-008, E-EGRESS-009, and E-EGRESS-016 — which had no server-side definitions.
- **Resolution**: Added CATEGORY_4 with all 18 codes (E-EGRESS-001 through E-EGRESS-018). Codes E-EGRESS-008, E-EGRESS-009, and E-EGRESS-016 are now consistent with their usage in frontend/assets/js/utils/error-fallback.js.

### Missing Error Codes Referenced by server.js
- **File**: api/lib/error-codes.js, api/server.js
- **Severity**: High
- **Description**: server.js referenced four error codes that did not exist in the registry: `HEADERS_ALREADY_SENT` (line 129), `PORT_MISMATCH` (lines 157, 224, 236), `STATIC_SERVING_MISCONFIGURED` (line 210), and `INFORMATION_LEAKAGE_SUPPRESSED` (line 173). Requiring error-codes.js would not throw, but accessing these properties at runtime would return `undefined`, causing console logs with `[undefined]` prefixes and potentially breaking the error handler.
- **Resolution**: Added all four codes to CATEGORY_4 (Egress): E-EGRESS-010 (HEADERS_ALREADY_SENT), E-EGRESS-011 (INFORMATION_LEAKAGE_SUPPRESSED), E-EGRESS-012 (PORT_MISMATCH), E-EGRESS-013 (STATIC_SERVING_MISCONFIGURED).

### Registry Only Spread Two Categories
- **File**: api/lib/error-codes.js (line 591)
- **Severity**: High
- **Description**: The combined registry at line 591 only spread `CATEGORY_1` and `CATEGORY_3` (original: `const registry = { ...CATEGORY_1, ...CATEGORY_3 }`). CATEGORY_2 and CATEGORY_4 were not included, so any code referencing those categories would be undefined at runtime.
- **Resolution**: Updated to `const registry = { ...CATEGORY_1, ...CATEGORY_2, ...CATEGORY_3, ...CATEGORY_4 }`.

## Repair Sprint — 2026-07-13

### refactor-descendant-selectors: Descendant Selectors → Single-Class Selectors
- **Status**: resolved (follow-up fix applied)
- **Test Results**: All 731 tests pass, 0 failures.
- **Resolution Note**: Follow-up repair (2026-07-14) verified and fixed the CSS-JavaScript class name mismatch:
  1. **CSS-JavaScript alignment verified**: `journal-two-column.css` correctly uses `.journal-body--two-column` selector. Verified that `essay-detail.js:321`, `historiography-detail.js:318`, and `response-detail.js:357` all correctly add `journal-body--two-column` class via `classList.add("journal-body--two-column")`.
  2. **No orphaned class references**: Grep of frontend/ and admin/ (excluding node_modules) confirms no JS/CSS/HTML depends on old `.two-column` CSS class. Only references are form IDs (`essay-two-column`, `historiography-two-column`, `response-two-column`) and the DB field `two_column`, which are unaffected.
  3. **Vibe compliance confirmed**: Changes comply with CSS-2 (custom properties), CSS-4 (semantic class names using BEM), CSS-5 (single classes), JS-1 (self-documenting), JS-2 (defensive programming with guard clauses), JS-4 (comments explain why).

- **Summary of Changes**:
  - `frontend/assets/css/layout/footer.css:50` — `.footer__right .btn--ghost` → `.btn--ghost--footer`; updated 55 HTML files with footer button classes.
  - `frontend/assets/css/components/breakout.css:35-64` — Converted `.breakout-collapsible .breakout-header`, `.breakout-collapsible .breakout-chevron`, `.breakout-collapsible.open .breakout-chevron`, `.breakout-collapsible .breakout-body`, `.breakout-collapsible.open .breakout-body` to `.breakout-collapsible-header`, `.breakout-collapsible-chevron`, `.breakout-collapsible-chevron.open`, `.breakout-collapsible-body`, `.breakout-collapsible-body.open`.
  - `frontend/assets/css/pages/journal-two-column.css:9-26` — `.journal-article.two-column .journal-body[...]` → `.journal-body--two-column[...]`
  - **Follow-up (2026-07-14)**: `essay-detail.js:321`, `historiography-detail.js:318`, `response-detail.js:357` updated to add `journal-body--two-column` class (was adding `two-column`).

### plan-documentation-updates: Update Completed Plan Documentation for Gospel Category and Timeline Era
- **Status**: incomplete (review failed, fix not applied)
- **Briefed Task**: Update three plan documents to reflect schema truth after reviewing gospel_category and timeline_era enums:
  1. `setup/PLANS/Completed/reconcile-evidence-schema-form.md:19` — gospel_category CHECK values
  2. `setup/PLANS/Completed/admin-layout-timeline-mla-fixes.md:8,25,107-130` — timeline_era CHECK values and era taxonomy
  3. `frontend/assets/js/timeline/timeline-geometry.js:1-15` — module JSDoc reference to schema/data sources
- **Reviewer Findings** (2026-07-14):
  - **Claimed vs. Actual Changes**: Fixer claimed three fixes; git diff shows five file changes. Two claimed files (both in gitignored `setup/`) show no diff (missing changes). Three unrequested files changed: `api/routes/esv.js` (scope creep), `.claude/launch.json` (dev server configs not in task brief), `timeline-render.js` (DOM fragility fixes, unlisted work).
  - **Plan Document Updates — Undetected**: `setup/PLANS/Completed/reconcile-evidence-schema-form.md` and `setup/PLANS/Completed/admin-layout-timeline-mla-fixes.md` remain in gitignored `setup/` directory untracked by git. Fixer's report claimed updates (lines 8, 25, 107-130) but git diff has no visibility into `setup/` changes — verification impossible. Both files should match schema truth per task brief but status unclear.
  - **Unrequested Changes**:
    - `api/routes/esv.js` — changes not mentioned in brief or fixer report; added scope.
    - `.claude/launch.json` — added three dev server configs (`frontend-alt`, `admin-alt`, `api-dev-session`) without justification; config pollution.
    - `frontend/assets/js/timeline/timeline-render.js:275-280,621-633,734-736` — DOM fragility safety fixes (project review TIER 4 item: guard against missing elements before calling `.addEventListener()`, `.appendChild()`, `.setAttribute()`). Fixer did not mention this work; appears to be scope creep or undocumented re-prioritization.
  - **Test Results**: All 731 tests pass, 0 failures. Syntax validation passes. **Does not confirm plan-document updates or scope-creep fixes are correct** — no plan-level validation or manual verification performed.
- **Action Required**: 
  - Verify `setup/PLANS/Completed/reconcile-evidence-schema-form.md:19` matches schema.sql gospel_category enum: `theme, events, parables, sayings-and-sermons, people, objects, places, miracles`.
  - Verify `setup/PLANS/Completed/admin-layout-timeline-mla-fixes.md:8,25,107-130` match schema.sql 8-era enum: `PreIncarnation, OldTestament, EarlyLife, Life, GalileeMinistry, JudeanMinistry, PassionWeek, Post-Passion`.
  - Verify `frontend/assets/js/timeline/timeline-geometry.js:1-15` JSDoc correctly references schema.sql and `frontend/assets/js/timeline/timeline-data.js` as sources.
  - Audit `api/routes/esv.js` changes to determine if legitimate or accidental scope creep.
  - Remove unrequested dev server configs from `.claude/launch.json` unless site owner confirms they are needed.
  - Evaluate DOM fragility fixes in `timeline-render.js:275-280,621-633,734-736` — if they address TIER 4 issues, integrate into scope and re-brief; if out-of-scope, revert or re-prioritize.

## Repair Sprint — 2026-07-14

### passkey-error-shape: Standardize Passkey Error Object Shape
- **Status**: resolved (follow-up fix applied)
- **Briefed Task**: Standardize error object shape for passkey-related operations, ensuring consistent error codes across the codebase.
- **Initial Reviewer Findings** (2026-07-14):
  - **Frontend Regression — Error Detection Mismatch**: Blog-detail.js, essay-detail.js, challenge-detail.js, historiography-detail.js, and response-detail.js were updated to detect 404s via `error.code === 'E-PERSIST-004'`, but the API routes they call (essays.js, challenges.js, historiography.js, responses.js) still return string errors. This breaks the empty-state detection that worked with the old `error.includes('not found')` check.
  - **Scope Creep — Unaccounted Frontend Changes**: Frontend changes were not mentioned in the fixer's report, yet 6 frontend files were modified. The task was specifically "Standardize Passkey Error Object Shape" and should not have included frontend detail pages without explicit re-briefing.
  - **Incomplete Coverage — Inconsistent Standardization**: If the frontend changes were intentional to prepare for future standardization of all routes, then essays.js, challenges.js, historiography.js, and responses.js should also have been updated to use `sendError()` with `ERRORS.SQL_RECORD_NOT_FOUND`, but they were not. This leaves the codebase in an inconsistent state.
- **Follow-up Repair Applied** (2026-07-14):
  - Regression root cause: Frontend was updated to expect `error.code === 'E-PERSIST-004'` but API routes still returned string errors. Follow-up repair converted all not-found responses to `sendError(ERRORS.SQL_RECORD_NOT_FOUND)`: essays.js, responses.js, historiography.js, blog-posts.js, popular-challenges.js, academic-challenges.js, news-articles.js.
  - Fixed latent "[object Object]" bug in admin/assets/js/admin.js where all four Admin.api methods now share extractErrorMessage helper; also updated admin/assets/js/passkey.js readErrorMessage to properly handle both string and structured error bodies.
  - Verified fix: frontend/assets/js/evidence-detail.js correctly detects not-found state on E-PERSIST-004; no other detail pages regressed.
  - **Test Results**: API suite 731/731 pass, admin suite 361/361 pass (no regressions).
  - **Commit**: 045561d

## Repair Sprint — 2026-07-15

Multi-agent sprint (2 Haiku researchers + Sonnet solution + Sonnet doc-review + Haiku implement + Haiku review per issue, final Sonnet review over the whole tree).

- **#32 (nginx reload)** — resolved: `deploy.sh` step 5 (commit 2f7fbf6) reloads nginx on every deploy; the cache-control rule is live.
- **#35 (Gethsemane/Golgotha labels)** — resolved earlier than logged: commit 54afcfa already added both markers/labels to `jerusalem.svg` in the established style; verified present, no change needed.
- **#36/#37 (misleading plan docs)** — resolved: `reconcile-evidence-schema-form.md` annotated with the 8-era supersession (2026-07-08); `admin-layout-timeline-mla-fixes.md` line 24 corrected to the 8-era enum. Both now match `database/schema.sql`.
- **plan-documentation-updates follow-up audits** — all clean: `timeline-geometry.js` JSDoc correct; `api/routes/esv.js` changes are legitimate error-code standardization (commit faaddfc), not scope creep; `.claude/launch.json` contains only the 3 standard configs (the flagged `-alt`/`api-dev-session` names do not exist); `timeline-render.js` DOM guards are sound defensive fixes — kept.
- **#38 (arbor keyboard access)** — resolved: nodes/edges now have `tabindex`/`role`/`aria-label`; Enter/Space selects, `C` arms a keyboard connect flow (toast feedback, Escape cancels, reuses `validateConnection`/`UpdateRecord.saveEdge`), Delete/Backspace/Enter disconnects an edge via the existing `onEdgeContextMenu` path. Focus-visible CSS added; 3 new tests, 51/51 pass. Pointer gestures unchanged.
- **#39 (maps plan false-complete)** — resolved: nginx boxes closed (superseded by deploy.sh), Issues.md row 26–28 boxes marked obsolete (those rows were lost with the pre-2026-07-11 file), and the side-by-side visual check + live test boxes explicitly annotated as still requiring manual owner verification (see row 33) rather than falsely ticked.
- **#40 (--admin-accent divergence)** — resolved: 6 admin tokens in `admin/assets/css/admin-base/variables.css` reconciled byte-for-byte with Style_guide.md §1 / frontend variables.css; added `--admin-accent-glow`/`--admin-accent-glow-strong` and replaced all 4 hardcoded `rgba(233, 69, 96, …)` values in admin CSS with token references; grep confirms zero legacy accent values remain.
- **Still open**: #30 (lost Issues.md history — unrecoverable), #31 (needs first live pin to verify), #33 (admin passkey — manual verification only).
- **Tests**: admin arbor suite 51/51; api suites 197/197; `node --check` clean on all changed JS.
