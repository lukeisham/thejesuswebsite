# Plan: Position a Picture, ID or MLA in Place

**Module(s):** Frontend / API / Setup docs
**Date:** 2026-07-09
**Status:** ✅ Completed

## Goal
Give content authors a single, standard inline-marker system for positioning pictures (`[figure …]`), MLA citations (`[mla:N]`) and unique identifiers (`[id:N]`) at exact points inside the body text of contextual essays, historiography articles, responses and blog posts — replacing today's four duplicated `parseJournalBody` implementations with one shared parser. **Evidence records are explicitly in scope for the inline marker system too**: the evidence pictures grid stays above the description exactly as it is today, but `[mla:N]` and `[id:N]` must work anywhere inside the `evidence.description` text, the same as in the four long-form content types.

## Coding rules to keep in mind
- **SR-1** — the shared parser is one new file with one job; each detail script keeps its own file and only swaps its local parser for the shared import.
- **SR-2 / SR-3** — pure vanilla JS string parsing, no markdown library; parsing happens once per render.
- **JS-2** — unknown or unresolvable markers (e.g. `[mla:99]` with no matching source) must degrade gracefully to nothing, never throw or render raw junk.
- **JS-3** — one small parser function with a marker → renderer map; no class hierarchy.
- **JS-6** — all prose is escaped before insertion; shortcode attribute values are escaped inside the replacement (same pattern as the existing `[figure]` handling). Never `innerHTML` raw content.
- **CSS-1 / CSS-2 / CSS-4** — new inline-citation styles live in their own component file, tokens from `variables.css`, semantic class names (`.inline-citation`, `.inline-identifier`).
- **HTML-2** — every generated `<img>` carries an `alt` attribute (caption text or empty).
- **JS-4** — JSDoc on the shared parser's public API documenting the marker grammar.

## The standard layout mapping (design, agreed before tasks)

All five content types share one body-text convention, so pictures and references are positioned the same way everywhere:

1. **Body text is plain text split into paragraphs on blank lines** (existing behaviour, unchanged).
2. **Block-level markers** occupy their own paragraph (a line surrounded by blank lines) and render as a block at exactly that point in the flow:
   - `[figure src="/assets/images/x.webp" caption="…"]` — existing shortcode, now optionally `[figure src="…" caption="…" align="right"]` (or `left`) to float as a 320px breakout on ≥1024px screens, per Style guide §9 Figures.
3. **Inline markers** may occur anywhere inside a paragraph's text:
   - `[mla:N]` — N is the `mla_sources.id` of a source already linked to the item via its junction table. Renders as a superscript citation link (`<sup class="inline-citation"><a href="#mla-N">…</a></sup>`) jumping to that entry in the bibliography. On blog posts (no footnote system, Style guide §9 Blog) it renders as an inline parenthetical `(Author)` instead of a superscript.
   - `[id:N]` — N is the `identifiers.id` of an identifier linked to the item. Renders as an inline badge-styled reference (`<span class="inline-identifier">…</span>`) showing the identifier's most meaningful label (manuscript number, IAA number, Pleiades name, etc.).
4. **Evidence is a sixth participant in this convention, with one exception**: the evidence pictures grid above the description keeps its current layout unchanged (evidence pictures are not repositioned by `[figure]` markers), but the `evidence.description` field is parsed for inline `[mla:N]` and `[id:N]` markers exactly like the four long-form body fields — an author can write "...as recorded in the Nazareth inscription[id:12], attested by[mla:7] multiple sources..." anywhere inside the description prose.
5. Markers referencing sources/identifiers **not linked** to the item render nothing (JS-2) — the linkage tables (`*_mla_sources`, `*_identifiers`) remain the source of truth for what may be cited. This applies identically to evidence: `[mla:N]`/`[id:N]` in a description only resolve against that evidence row's own `evidence_mla_sources` / `evidence_identifiers` rows.

This convention is documented once in `setup/Content_shortcodes.md` so authors and future agents share one reference.

## Tasks

### API — confirm marker targets are resolvable client-side

- [x] **Extend essay payload with linked sources/identifiers (ids included)** — confirm `GET /context-essays/:slug` returns `mla_sources` and `identifiers` arrays each including the row `id`; add the missing joins/fields if absent. File: `api/models/context-essays.model.js` (or the actual essay model file in `api/models/`)
- [x] **Extend response payload with linked sources/identifiers (ids included)** — same check/extension for responses. File: `api/models/responses.model.js`
- [x] **Extend historiography payload with linked sources/identifiers (ids included)** — same check/extension. File: `api/models/historiography.model.js`
- [x] **Extend blog payload with linked sources/identifiers (ids included)** — same check/extension. File: `api/models/blog-posts.model.js`
- [x] **Extend evidence payload with identifiers ids** — confirm `GET /evidence/:slug` already returns `mla_sources` and `identifiers` with ids (evidence-detail.js suggests it does); patch if not. File: `api/models/evidence.model.js`
- [x] **Add/extend API tests for the payload shape** — assert each by-slug endpoint above includes `mla_sources[].id` and `identifiers[].id`. File: `api/tests/content-marker-payloads.test.js`

### Frontend — shared parser

- [x] **Create the shared content-marker parser** — `parseContentBody(text, { mlaSources, identifiers, citationStyle })` handling paragraphs, `[figure]` (with optional `align`), `[mla:N]` (superscript or parenthetical per `citationStyle`), `[id:N]`; escaping identical to the current implementations; JSDoc documents the grammar. File: `frontend/assets/js/utils/content-markers.js`
- [x] **Create inline-citation component CSS** — styles for `.inline-citation` (superscript link, `--link` colors), `.inline-identifier` (Content Badge styling per Style guide §8), and figure float variants `.figure-align-left/right` (breakout behaviour ≥1024px, full-width below); mobile rules in the same file (CSS-3). File: `frontend/assets/css/components/inline-citation.css`
- [x] **Add print rules for inline markers** — inside the existing `@media print` block, explicitly override `.figure-align-left`/`.figure-align-right` to `float: none; width: 100%;` (the current print rules reset border/shadow/radius on `figure` but do not touch `float`, so a right-floated figure would otherwise still float on the printed page, contradicting Style guide §12's "figures span full page width"); confirm `.inline-citation` renders as a plain black superscript number (already covered by the existing `a { color: black; text-decoration: none }` + `a[href]::after { content: none }` rules — no new selector needed there) and `.inline-identifier` prints as plain inline text with no badge background (covered by the existing `* { background-color: transparent }` catch-all — verify, don't duplicate). File: `frontend/assets/css/base/print.css`

### Frontend — Copy Contents interaction

- [x] **Prevent inline markers from gluing onto adjacent words in "Copy Contents"** — the footer's Copy Contents action (`getStrippedBodyText()` in `frontend/assets/js/footer.js`) copies `document.body.innerText`, which has no notion of inline-element boundaries: a `<sup>` citation or `<span class="inline-identifier">` badge sitting directly against surrounding prose (e.g. `inscription[id:12]`) will copy as `inscription12` with no separating space, silently corrupting the plain-text output. Fix in the shared parser itself (not in `footer.js`, which must stay content-agnostic): wrap each rendered `[mla:N]`/`[id:N]` marker with a single hair-space-width `.sr-only` text node immediately before and after it (same `.sr-only` utility already defined in `frontend/assets/css/base/invisible-header.css` — zero visual footprint, but present in `innerText` because the element isn't `display:none`), so Copy Contents reads "...inscription 12 which shows..." while the on-screen render is visually unaffected. File: `frontend/assets/js/utils/content-markers.js`
- [x] **Confirm floated figures don't duplicate or reorder text in Copy Contents** — since `getStrippedBodyText()` walks `document.body` in DOM order regardless of CSS `float`, a figure marker placed mid-paragraph with `align="right"` must still appear once, at its DOM position, in the copied text (float is visual-only and does not reorder `innerText`) — this is a verification task, not a code change, to confirm the float CSS added in the print/CSS tasks above has no side effect on `innerText` ordering. File: none (manual verification, logged in the validation checklist)

### Frontend — adopt the parser per content type

- [x] **Update essay detail to use the shared parser** — delete the local `parseJournalBody`, call `parseContentBody` with the essay's `mla_sources`/`identifiers` and `citationStyle: "superscript"`; add `id="mla-<id>"` anchors to each bibliography `<li>` in `renderBibliography`. File: `frontend/assets/js/essay-detail.js`
- [x] **Update response detail to use the shared parser** — same swap and bibliography anchors. File: `frontend/assets/js/response-detail.js`
- [x] **Update historiography detail to use the shared parser** — same swap and bibliography anchors. File: `frontend/assets/js/historiography-detail.js`
- [x] **Update blog detail to use the shared parser** — swap parser with `citationStyle: "parenthetical"` (blogs have no footnote/bibliography system — Style guide §9 Blog); `[mla:N]` renders `(Author)` linking to the Further Reading entry if rendered, otherwise plain text; keep pull-quote handling. File: `frontend/assets/js/blog-detail.js`
- [x] **Update evidence detail description parsing** — replace the local `[figure]` regex in `parseDescription` with `parseContentBody` (superscript style), passing the evidence row's `mla_sources` and `identifiers` arrays so `[mla:N]` and `[id:N]` resolve anywhere inside `description`; leave the pictures grid above the description untouched; add `id="mla-<id>"` anchors in `renderSources` so inline citations jump to the matching source row. File: `frontend/assets/js/evidence-detail.js`
- [x] **Verify evidence identifier markers resolve against `renderSources`' identifier list** — `[id:N]` in the description must render the same identifier label style used in the info-row identifiers list (`$infoIdentifiersList`), not a second competing format; reuse one identifier-label formatting helper for both. File: `frontend/assets/js/evidence-detail.js`
- [x] **Link the new stylesheet on the five detail pages** — add `<link>` for `inline-citation.css` to each `[slug].html` template. Files: `frontend/contextual-essays/[slug].html`, `frontend/debate/responses/[slug].html`, `frontend/debate/historiography/[slug].html`, `frontend/news-and-blog/blog/[slug].html`, `frontend/evidence/[slug].html`

### Admin & documentation

- [x] **Write the shortcode/marker reference doc** — the "standard layout mapping" above, with copy-paste examples for each marker and each content type, and the rule that `[mla:N]`/`[id:N]` must reference already-linked rows. File: `setup/Content_shortcodes.md`
- [x] **Add a formatting-reference hint to admin edit pages** — a small collapsible "Formatting reference" panel (marker syntax summary) rendered by a shared helper on the essay/response/historiography/blog/evidence edit forms, attached to `window.Admin`. The panel must show one copy-pasteable example per marker type, including the floated-figure form verbatim: `[figure src="/assets/images/coin.webp" caption="A first-century coin." align="right"]` — alongside a plain (non-floated) `[figure]` example, an `[mla:N]` example, and an `[id:N]` example. Files: `admin/assets/js/admin-shortcode-help.js` plus one `<script>`/container include in each edit page it serves
- [x] **Add live per-row marker hints next to linked MLA sources and identifiers** — on the same essay/response/historiography/blog/evidence edit forms, wherever the form already lists an item's linked MLA sources (right-column sources list) or linked identifiers (right-column identifiers list), render the exact marker text next to each row — e.g. a linked source with `id=5` shows `Marker: [mla:5]`, a linked identifier with `id=12` shows `Marker: [id:12]` — so the author can copy the correct, currently-valid marker for *this* item without guessing an id or cross-referencing another screen. Must update live if a source/identifier is unlinked or newly linked before save. File: `admin/assets/js/admin-shortcode-help.js` (same shared helper as the formatting-reference panel, reusing its rendering, not a second implementation)

### Deploy & verify

- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Position a picture, ID or MLA in place"`, `git push`.
- [x] **Test live** — **only if the implementing agent is Claude.** After VPS deploy, open a published essay, response, historiography article and blog post containing test markers and confirm: figure renders at its marker position (and floats when `align` is set), `[mla:N]` jumps to the right bibliography entry, `[id:N]` shows the identifier badge, unknown markers render nothing; then click the footer's **Print** button and confirm the floated figure prints full-width with no float, and click **Copy Contents** and confirm the citation/identifier markers appear with visible spacing around them in the pasted text, not glued to adjacent words. URL: the live site's `/contextual-essays/<slug>` etc. If the implementing agent is any other LLM (e.g. DeepSeek), skip this task and leave a note that live testing was deferred.

## Files touched
- `frontend/assets/js/utils/content-markers.js` — created
- `frontend/assets/css/components/inline-citation.css` — created
- `frontend/assets/css/base/print.css` — modified
- `frontend/assets/js/essay-detail.js` — modified
- `frontend/assets/js/response-detail.js` — modified
- `frontend/assets/js/historiography-detail.js` — modified
- `frontend/assets/js/blog-detail.js` — modified
- `frontend/assets/js/evidence-detail.js` — modified
- `frontend/contextual-essays/[slug].html` — modified
- `frontend/debate/responses/[slug].html` — modified
- `frontend/debate/historiography/[slug].html` — modified
- `frontend/news-and-blog/blog/[slug].html` — modified
- `frontend/evidence/[slug].html` — modified
- `api/models/context-essays.model.js` — modified (only if payload lacks ids)
- `api/models/responses.model.js` — modified (only if payload lacks ids)
- `api/models/historiography.model.js` — modified (only if payload lacks ids)
- `api/models/blog-posts.model.js` — modified (only if payload lacks ids)
- `api/models/evidence.model.js` — modified (only if payload lacks ids)
- `api/tests/content-marker-payloads.test.js` — created
- `admin/assets/js/admin-shortcode-help.js` — created
- `admin/essays/edit-[id].html`, `admin/debate/edit-[id].html`, `admin/blog/edit-[id].html`, `admin/evidence/edit-[id].html` — modified (hint panel include; exact filenames per existing admin structure)
- `setup/Content_shortcodes.md` — created

## Notes
- **No database changes.** Markers reference existing `mla_sources.id` / `identifiers.id` values, and the existing junction tables (`*_mla_sources`, `*_identifiers`) already scope which rows belong to which item. A marker whose id is not in the item's linked set renders nothing.
- **Marker resolution is client-side at render time.** The stored body text stays plain; ids remain stable even if MLA source text is edited, and `citation_order` still governs bibliography ordering — inline markers do not reorder the bibliography.
- **Blog divergence is deliberate**: blogs use parenthetical citations, not superscripts, per the Style guide's "no footnotes" rule for blog posts.
- **Figure numbering** continues to be injected by `utils/figures.js` after the body renders — unchanged; floated figures still participate in the sequential count.
- **Model file names** in the API tasks are best-guess; the implementer should match the actual filenames in `api/models/` (one model per entity, SR-1) without changing the task's scope.
- **Automated tests**: the frontend has no JS test runner (vanilla, no build step), so parser behaviour is exercised via the manual checklist; API payload shape is covered by the new `api/tests/content-marker-payloads.test.js` (satisfies the code-facing-test rule for the `api/` changes).
- Exact-position figure placement already works via the `[figure]` shortcode; the real deliverables are (a) one shared parser instead of four copies, (b) the two new inline marker types, and (c) a written convention doc so placement is standard across content types.
- **Two distinct admin hints, not one**: the "Formatting reference" panel teaches marker *syntax* in the abstract (generic examples); the per-row marker hints next to the linked sources/identifiers lists tell the author the *actual, currently-valid* marker for the item they're editing right now. Both are needed — the panel alone would still leave the author guessing ids.
- **Print and Copy Contents are both existing footer features (Style guide §5) that this plan must not silently break.** Print already has a working academic-paper stylesheet (§12) that this plan extends narrowly (unfloat figures only — everything else about citations/badges already degrades correctly under the existing black-and-white, no-background, no-shadow print rules). Copy Contents has no CSS to lean on since it copies `innerText`, not rendered styles — the `.sr-only` spacer fix is the only mechanism available to keep copied plain text readable; it must not be skipped just because it doesn't show up visually in a screenshot-based review.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: This plan does not fix any existing `setup/Issues.md` rows, so no Status-cell updates are required.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
