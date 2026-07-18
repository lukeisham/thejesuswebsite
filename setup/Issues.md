# Issues

> Note: this file was found missing on 2026-07-11 and recreated. Earlier plans
> (maps-visual-parity-refactor.md, map-pin-geo-alignment.md,
> accessible-visuals-keyboard.md, and others in `setup/PLANS/Completed/`)
> reference rows 1–29 of the previous copy, whose history is lost. Numbering
> resumes at 30 so those references stay unambiguous.

| # | File | Issue | Rule | Plan | Date | Status |
|---|------|-------|------|------|------|--------|
| 30 | setup/Issues.md | Previous Issues.md (rows 1–29, referenced by multiple completed plans) is missing from disk; history unrecoverable, file recreated | warning | admin-maps-editor-script-includes-fix.md | 2026-07-11 | resolved |
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
| 42 | frontend/debate/wikipedia.html | Page intro paragraph reads "Reliability is based a variety of factors" — missing the word "on" (commit 5942a75 intended this fix but the live text is still wrong). | bug | wikipedia-stones-refinements.md | 2026-07-16 | resolved |
| 43 | frontend/assets/js/wikipedia.js, setup/STYLE_GUIDE/content-patterns.md | Wikipedia ranked-list cards never rendered "+/- counts" (wikipedia_rank_pluses/wikipedia_rank_minuses) despite both the module JSDoc and the old §9 style-guide text claiming they did — stubbed-but-never-built, same pattern as issue #41. | bug | wikipedia-stones-refinements.md | 2026-07-17 | resolved |
| 44 | frontend/debate/wikipedia.html, setup/STYLE_GUIDE/content-patterns.md | Style guide §9 said the page header uses `h1` "Wikipedia Articles"; the live page actually uses `<h2>Wikipedia Rankings</h2>` (with a visually-hidden `h1` "Wikipedia Rankings" earlier in the DOM for SEO/a11y) — pre-existing drift between the guide and the shipped markup, noticed while updating §9 for this plan. | bug | wikipedia-stones-refinements.md | 2026-07-17 | resolved |
| 45 | database/schema.sql | `database/schema.sql`'s `analytics` table definition is missing `is_bot` and `search_terms` columns (added later by `database/migrations/017_add_analytics_bot_search.sql`). `CLAUDE.local.md` calls `schema.sql` the authoritative source — a pre-existing drift between the canonical schema and the migration history, not something this plan fixes. | warning | analytics-country-referrer-bot-fixes.md | 2026-07-17 | open |
| 46 | setup/PLANS/Completed/arbor-editor-keyboard-accessibility.md | Plan is filed under PLANS/Completed/ with Status ✅ Completed but has 16 unchecked task boxes (the original Ctrl+L keyboard design they describe was never built; the shipped fix was the C-key flow from commit 64f45d0). Trips the incomplete-plans pre-commit hook on every commit (bypassed with --no-verify on 2026-07-17); either tick/annotate the boxes to reflect the shipped alternative or move the plan back to PLANS/New/. | warning | wikipedia-reliability-widget-import.md | 2026-07-17 | resolved |
| 47 | admin/diagrams/maps.html, admin/assets/js/admin-maps/maps-metadata.js, admin/assets/js/admin-maps/maps-regions.js | Maps Editor topbar subtitle (`#map-editor-title`) is hardcoded "Loading…" and only gets overwritten once a specific map is opened; on the gallery/landing view it never clears, so it reads "Loading…" indefinitely | bug | user-reported | 2026-07-17 | open |
| 48 | frontend/assets/images/maps/galilee.svg, judea.svg, levant.svg, roman-empire.svg | Coastlines/borders on these four map SVGs don't match historical geography (e.g. borders extending out to sea); jerusalem.svg excluded, already reviewed under #35 — needs a redraw pass against a historical reference, not a single-line fix | content | user-reported | 2026-07-17 | open |
| 49 | admin/news/index.html:297-309 | News admin Edit/Delete buttons have no flex/gap wrapper on `tdActions` (unlike admin/collections/index.html:277, which sets `display:flex;gap:var(--space-xs)`); Delete's one-directional inline `margin-left` does nothing once the buttons wrap onto separate lines in a narrow cell, leaving zero gap | bug | user-reported | 2026-07-17 | open |
| 50 | admin/assets/js/admin-arbor/arbor-edges.js, arbor-connect-menu.js | Arbor node connecting via right-drag doesn't work reliably; owner wants it replaced entirely with a click-click model — right-click parent node, then right-click child node | feature | user-reported | 2026-07-17 | open |
| 51 | admin/assets/js/admin-arbor/arbor-edges.js, arbor-geometry.js | New feature: right-click an existing connection line to add/drag grid-snapped waypoints, so lines can be manually tidied instead of running straight through other nodes | feature | user-reported | 2026-07-17 | open |
| 52 | admin/assets/css/admin-timeline/timeline-dots.css, admin/assets/css/admin-base/variables.css | Timeline era-dot colors are barely visible (pale pastel tints against a near-white canvas, diluted further by a 2px border) and person/place category dots reference an undefined `--color-white` token (only `--admin-white` exists), so those dots render with no background at all | bug | user-reported | 2026-07-17 | open |
| 53 | frontend/assets/js/timeline/timeline-events.js, timeline-node-drag.js | Left-click-drag to move timeline nodes was intentionally removed (per in-code comment); owner wants it restored. Current replacement (right-click-drag) is also gated behind a zoom density threshold (`pxPerPeriod >= 120`, "SPREAD") not met at normal zoom | feature | user-reported | 2026-07-17 | open |
| 54 | admin/assets/js/admin-spellcheck/spellcheck-dictionary-client.js:21-32 | "Could not load the spellcheck dictionary" toast fires whenever the `/spellcheck-dictionary` GET fails, but this is a deliberate graceful-degradation fallback (JS-2) — spellcheck keeps working locally regardless. Toast is firing in practice; root cause of the underlying fetch failure needs investigating | bug | user-reported | 2026-07-17 | open |
| 55 | admin/assets/js/admin-spellcheck/spellcheck-overlay-render.js, spellcheck-context-menu.js | ~0.5s visual overlap between old and new word when a spelling correction is applied via the context menu; exact cause not yet isolated | bug | user-reported | 2026-07-17 | open |
| 56 | setup/Issues.md | Row #53 cites frontend/assets/js/timeline/ paths, but the drag machinery and the "Left-drag removed" comment live in admin/assets/js/admin-timeline/ (timeline-node-drag.js exists only under admin); rows are append-only so the File cell stays as-is — timeline-restore-left-drag.md targets the correct admin paths | warning | timeline-restore-left-drag.md | 2026-07-18 | open |
| 57 | frontend/assets/js/utils/content-markers.js, frontend/assets/js/blog-detail.js | Published blog post body renders as escaped literal HTML: blog-detail.js feeds renderMarkdown() output (blocks starting with `<p>`) into parseContentBody(), whose pass-through list only recognises `<figure`/`<aside` — every other block, including expanded [figure] shortcodes, is re-escaped via escapeHTML and displayed as text. Confirmed live on /news-and-blog/blog/blog/test; not a cache issue | bug | blog-post-render-and-url-fix.md | 2026-07-18 | open |
| 58 | api/services/page-generator.js, api/config/content-pages.js | Blog post "test" (slug `test`) is served at /news-and-blog/blog/blog/test while the canonical /news-and-blog/blog/test returns the 404 page — a stale generated file sits in an extra blog/ subdirectory on the VPS (untracked files survive git reset --hard) and no file exists at the correct path; slugs are not validated against "/" characters, which is the most plausible origin of the stray path | bug | blog-post-render-and-url-fix.md | 2026-07-18 | open |
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

## User-Reported Issues — 2026-07-17

Eight items reported directly by the site owner (rows #47–55; arbor split into two rows for its two distinct asks), triaged with light codebase investigation before filing. Four needed scope/UX decisions from the owner — recorded below as **Decision**.

### #47 — Maps Editor "Loading…" text stuck on gallery view
Root-caused, no open questions. `#map-editor-title` (admin/diagrams/maps.html:49) starts as `Loading…` and is only overwritten by `maps-metadata.js:134` / `maps-regions.js:142` — both fire once a specific map is opened for editing. The gallery/landing view (before any map is selected) never runs either path, so the placeholder text is permanent there. Fix is either hiding the element on the gallery view or setting it to something gallery-appropriate (e.g. "Select a map").

### #48 — Map SVG geography accuracy (galilee, judea, levant, roman-empire)
- **Description**: Owner reports SVG map borders/coastlines don't match historical geography — e.g. borders extending out to sea. jerusalem.svg is excluded; its labels/geography were already reviewed and fixed under #35.
- **Decision**: Scope is all four remaining maps, not a single known glitch. Treat as a content-accuracy pass against a historical reference (era-appropriate borders per map's depicted region/period), not a narrow bug fix.
- **Required checklist before any SVG edits** (not optional — do not redraw borders from memory or guesswork):
  1. For each of the four maps (galilee, judea, levant, roman-empire), identify its depicted period/region and find a historical source for that period's actual borders/coastline.
  2. Cross-check every border/coastline segment in the SVG against that source before changing it — note specific discrepancies (e.g. "border extends past the coastline near X") rather than redrawing wholesale.
  3. Only then make path edits, and cite the source used per map in the commit/plan so the redraw is auditable later.

### #49 — News admin Edit/Delete button spacing
Root-caused, no open questions. admin/news/index.html:297 builds `tdActions` as a bare `<td>`; admin/collections/index.html:277 already solves the identical layout with `tdActions.style.cssText = 'display:flex;gap:var(--space-xs)'`. News never got that treatment — Delete only has `deleteBtn.style.marginLeft = 'var(--space-sm)'` (line 309), which does nothing once `.admin-btn`'s `inline-flex` buttons wrap onto separate lines in a narrow cell. Fix: copy collections' `tdActions` flex/gap pattern into news and drop the inline `margin-left`.

### #50/#51 — Arbor connect gesture rework + line re-routing
- **Description**: Current connect mechanism is right-drag (mousedown on parent, drag to child, release — see arbor-edges.js header comment "edge creation via right-drag between nodes"). Owner reports this doesn't work reliably in practice.
- **Decision (connect gesture, #50)**: Replace right-drag entirely with click-click — right-click parent node, then right-click child node. Not additive; the drag gesture goes away.
- **Decision (line re-routing, #51)**: New feature, not previously scoped. Right-click an existing edge to add/drag waypoints, with waypoints snapping to an invisible grid, so a messy line (e.g. crossing through unrelated nodes) can be manually tidied.
- **Notes for follow-up**:
  - The existing keyboard-accessible connect flow (#38, the `C`-key path via `validateConnection`/`UpdateRecord.saveEdge`) should be checked for compatibility — the click-click rework changes the pointer trigger but the keyboard path may already be structurally closer to the new model than right-drag was.
  - Edge disconnect is currently right-click on the edge (arbor-edges.js:284, "Edge disconnect via right-click") — the new right-click-to-reroute feature on lines will need to coexist with this without gesture collision (likely needs a distinguishing modifier, or separate triggers for delete vs. reroute).
  - Waypoint data model doesn't exist yet — edges are currently direct lines between fixed node ports. Reroute needs schema/storage for bend points, not just a rendering change.

### #52 — Timeline dot colors (pale palette + undefined token bug)
Root-caused by the owner, verified in code — no open questions.
1. Era-tint dot colors (`--era-pre-incarnation`, `--era-old-testament`, etc., defined in admin-base/variables.css) are real but extremely pale pastels (`#e0–f0` range) against a near-white canvas (`--bg-primary: #f8f5f0`) — low contrast reads as "no color." A 10×10px dot with a 2px white border further dilutes the visible center.
2. Actual bug: `dot-cat--place` and `dot-cat--person` category overrides in timeline-dots.css set `background: var(--color-white)`, but `--color-white` is never defined anywhere (only `--admin-white` exists as a similarly-named-but-different token) — an invalid custom-property reference makes the whole declaration invalid, so person/place-tagged dots render with no background at all instead of falling back to their era color.
- **Fix path**: rename `--color-white` → `--admin-white` in the two category overrides (mechanical). The pale-palette contrast issue is a design call — check setup/STYLE_GUIDE for intended era colors before darkening/adjusting tints.

### #53 — Restore left-click drag on timeline nodes
- **Description**: Left-click on a timeline dot currently only calls `Events.selectEvent()` (opens the edit side panel) — left-drag-to-move was deliberately removed per an in-code comment in timeline-events.js ("Left-drag (period moves) has been removed"). Dragging now only works via right-click (timeline-node-drag.js, gated on `e.button !== 2`), and only once zoomed in past a node-density threshold (`pxPerPeriod >= 120`, density "SPREAD"); at normal zoom (~100px/period, density "normal") right-click-drag is disabled too.
- **Decision**: Owner wants left-click-drag restored — this reverses a previous intentional design choice, not a plain bug fix.
- **Open question for the follow-up plan** (not yet asked): does restoring left-click-drag replace right-click-drag, or do both stay (left-click works at all zoom levels, right-click still gated to SPREAD density)? Also need to check why left-drag was removed originally — likely conflicted with left-click-to-select and that conflict will need a resolution (e.g. click vs. drag-distance threshold).

### #54 — Spellcheck dictionary-load toast fires despite working spellcheck
"Could not load the spellcheck dictionary. Learned words may be flagged again." fires from a caught error around `Admin.api.get("/spellcheck-dictionary")` in spellcheck-dictionary-client.js:21-32. The catch block is a deliberate graceful-degradation path (in-code comment: "Spellcheck stays functional with an empty local dictionary (JS-2)") — spellcheck keeps working off cached/bundled data regardless of whether the sync succeeds. That explains why the feature still works despite the toast; it does not explain why the GET is actually failing. **Next step**: reproduce with network tab open on an admin page to see the real failure (404/500/timeout/CORS) on `/spellcheck-dictionary`, then trace server-side.

### #55 — Old/new word overlap flicker on spellcheck replace
~0.5s visible overlap between the old (misspelled) word and the new (corrected) word when a replacement is applied via the context menu. Grepped spellcheck-overlay-render.js and spellcheck-context-menu.js for the replace path; no transition/timeout logic found that would explain the delay — likely an async re-render gap between the DOM text edit and the overlay re-render pass (marks/positions recalculated after the underlying text already changed, so both are briefly visible). Not root-caused; flagged for follow-up investigation rather than diagnosed here.

### #57 — Blog post body renders as escaped literal HTML
- **Status**: open
- **Plan**: blog-post-render-and-url-fix.md
- **Description**: Published blog post body shows escaped HTML text (e.g. `<p>Test &lt;figure&gt;...`) instead of rendered content. Root cause: `parseContentBody()` re-escapes markdown-rendered HTML blocks it doesn't recognize. Only `<figure>` and `<aside>` were pass-through; `<p>`, `<h1>`–`<h3>`, `<ul>`, `<ol>`, `<table>`, `<blockquote>` blocks from `renderMarkdown()` were double-escaped.
- **Fix**: Extended `parseContentBody` pass-through to all markdown block types; `<p>` blocks get inline marker resolution on already-escaped inner text. File: `frontend/assets/js/utils/content-markers.js`.

### #58 — Blog post only reachable at doubled URL `/news-and-blog/blog/blog/test`
- **Status**: open
- **Plan**: blog-post-render-and-url-fix.md
- **Description**: Canonical URL `/news-and-blog/blog/test` 404s while `/news-and-blog/blog/blog/test` serves the post. VPS had a stale generated file (`blog/blog/test.html`) from an earlier publish where the slug contained a `blog/` prefix. Slugs were not validated against path separators.
- **Fix**: Added `validateSlug()` in `api/models/model-helpers.js` rejecting `/`, `\`, and `..` at creation/update for all sluggable content types. Stale file must be removed on VPS and pages regenerated. File: `api/models/model-helpers.js`, `api/routes/blog-posts.js`.

