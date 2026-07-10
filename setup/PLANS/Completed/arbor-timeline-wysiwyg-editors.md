# Plan: Arbor Position Mirroring & WYSIWYG Diagram Editors

**Module(s):** Database / API / Admin / Frontend
**Date:** 2026-07-10
**Status:** ✅ Completed

## Goal
Persist arbor node positions server-side so layouts saved in the admin arbor editor mirror onto the public arbor page, and restyle both the admin arbor and timeline editors to visually match their public frontend counterparts (WYSIWYG), verified end-to-end by automated functional tests.

## Background (what exists today)

- **Arbor**: the admin editor (`admin/diagrams/arbor.html`) drags nodes but saves positions only to browser localStorage (`admin/assets/js/update-record.js` says so explicitly). The public page (`frontend/evidence/arbor.html`) ignores positions entirely and computes its own BFS tree layout. Edges are already fully persisted via `arbor_edges` + `api/routes/arbor.js`. Admin nodes render as plain circles; the public page renders styled rounded-rect nodes — not WYSIWYG.
- **Timeline**: the admin editor (`admin/diagrams/timeline.html`) already persists correctly — dragging an event snaps it to a `timeline_period` and saves `timeline_period`/`timeline_era` onto the evidence row, which is exactly what the public timeline reads. Its gap is purely visual: the admin canvas does not match the public spine/dot/era-marker rendering (Style guide §8 Timeline, §9 Timeline View).

## Coding rules to keep in mind
- **SR-1** — one file per concern; keep the data/render/interactions triad decomposition used by both `admin-arbor/` and `admin-timeline/` (Website guide: "Visual editors mirror the triad").
- **SR-2 / SR-3** — no new dependencies; keep canvas rendering hand-rolled SVG/DOM as it is now.
- **JS-2** — validate `x`/`y` as finite numbers in the API route; never fail silently on save (surface toast/console error and revert).
- **JS-5** — all new fetches via `Admin.api.*` (admin) and `frontend/assets/js/api.js` (public); async/await + try/catch.
- **JS-6** — reuse existing event delegation patterns in the editors; no `innerHTML` with record data (node titles come from the DB — build with `createElement`/`textContent`).
- **CSS-1** — admin diagram CSS stays split per component (`arbor-canvas.css`, `timeline-canvas.css`, …), each under 150 lines; split if the WYSIWYG restyle grows a file past that.
- **CSS-2** — the WYSIWYG canvases must reference the *public* design tokens (`--bg-primary`, `--bg-surface`, `--border`, `--accent`, `--border-strong`) rather than hardcoding parchment hex values inside admin CSS.
- **CSS-5** — single-class selectors for node/edge/dot variants (`.admin-arbor-node--root`, not nested selectors).

## Tasks

### Database

- [x] **Create migration for `arbor_nodes`** — new table storing on-canvas membership + position: `id`, `evidence_id INTEGER UNIQUE NOT NULL REFERENCES evidence(id) ON DELETE CASCADE`, `x REAL NOT NULL`, `y REAL NOT NULL`, `created_at`, `updated_at`; plus `idx_arbor_nodes_evidence` index and an `arbor_nodes_updated_at` trigger matching the existing trigger pattern. File: `database/migrations/010_add_arbor_nodes.sql`
- [x] **Add `arbor_nodes` to the authoritative schema** — append the same table, index, and trigger to the ARBOR DIAGRAM section so `schema.sql` stays the source of truth. File: `database/schema.sql`

### API

- [x] **Extend the arbor model with node functions** — add `upsertNodePosition(evidenceId, x, y)` (INSERT … ON CONFLICT(evidence_id) DO UPDATE), `removeNode(evidenceId)`, and rework `getNodesAndEdges()` so nodes come from `arbor_nodes JOIN evidence` (still published-only) with `x`/`y` included; evidence that appears in `arbor_edges` but has no `arbor_nodes` row is still returned (with `x`/`y` null) so existing diagrams keep working. File: `api/models/arbor.model.js`
- [x] **Add node position routes** — `PUT /arbor/nodes/:evidenceId` (auth-guarded; 400 unless `x` and `y` are finite numbers; 404 if the evidence id doesn't exist) and `DELETE /arbor/nodes/:evidenceId` (auth-guarded). Register them **above** the existing `/:id` routes so `/nodes/…` isn't swallowed by the edge-by-id matcher. File: `api/routes/arbor.js`
- [x] **Write API functional tests for node persistence & mirroring** — new test file covering: upsert creates then updates a position; `GET /arbor` (the exact endpoint the public page consumes) returns the saved `x`/`y`; DELETE removes the node but not the evidence; unauthenticated PUT/DELETE are rejected; non-numeric `x`/`y` returns 400; deleting an evidence row cascades its `arbor_nodes` row. This is the code-side proof that an admin save displays on the frontend. File: `api/tests/arbor-nodes.test.js`

### Admin — arbor persistence

- [x] **Replace localStorage position store with API calls** — `UpdateRecord.saveNodePosition` → `PUT /arbor/nodes/:id`, `UpdateRecord.removeNodePosition` → `DELETE /arbor/nodes/:id`; delete `loadNodePosition` (positions now arrive on `GET /arbor`). Add a one-time `migrateLocalPositions()` that PUTs any legacy `localStorage` positions then clears them. Update the module JSDoc that documents the localStorage stopgap. File: `admin/assets/js/update-record.js`
- [x] **Use server positions in the node module** — `Nodes.loadNodes()` reads `x`/`y` from the API payload (grid fallback only for nodes with null positions), `addNodeToCanvas()` awaits the PUT before rendering, `onRemoveNode()` awaits the DELETE, and drag mouse-up awaits `saveNodePosition` with an error toast + revert on failure (JS-2). File: `admin/assets/js/admin-arbor/arbor-nodes.js`

### Admin — arbor WYSIWYG

- [x] **Render public-style nodes in the admin editor** — replace circle+label with the public node markup: rounded-rect (`<rect rx="8">`) sized like the public renderer, title + italic primary-verse text, and border variants by role (root = 2px `--accent` + `--bg-surface-alt`; related-only = dashed `--border-strong`) per Style guide §9 Arbor Diagram, keeping all existing drag/click/selection wiring. File: `admin/assets/js/admin-arbor/arbor-nodes.js`
- [x] **Restyle the admin arbor canvas to match the public page** — parchment `--bg-primary` background with the public 24px dot-grid `radial-gradient`, node fill/shadow/typography tokens identical to `frontend/assets/css/pages/arbor.css`, selection outline kept as an admin-only affordance. File: `admin/assets/css/admin-diagrams/arbor-canvas.css`
- [x] **Match public edge styling in the admin editor** — 1.5px `--border-strong` strokes drawn behind nodes, with the same per-`relationship_type` treatment the public renderer uses; keep the admin-only edge-selection highlight. Files: `admin/assets/js/admin-arbor/arbor-edges.js`, `admin/assets/css/admin-diagrams/arbor-canvas.css`

### Frontend — arbor mirroring

- [x] **Pass saved positions through the data module** — include `x`/`y` on the node objects `arbor-data.js` hands to the renderer. File: `frontend/assets/js/arbor/arbor-data.js`
- [x] **Prefer saved positions in the public renderer** — when every rendered node has non-null `x`/`y`, use them verbatim (same coordinate space as the admin canvas, so the layouts are identical); otherwise fall back to the existing BFS layout for the whole diagram (mixed layouts would overlap unpredictably). Emit the same CSS classes — no `arbor.css` contract change. File: `frontend/assets/js/arbor/arbor-render.js`
- [x] **Write frontend functional tests for the position-vs-fallback decision** — sandbox-load the renderer (same `vm` pattern as `admin/tests/admin-arbor.test.js`): all-positions payload renders nodes at the saved coordinates; any-null payload uses BFS layout; edge endpoints track node positions. File: `frontend/assets/js/arbor/tests/arbor-render.test.js` (new `tests/` dir mirroring the admin test convention; runnable via `node --test`)

### Admin — timeline WYSIWYG

- [x] **Render public-style timeline in the admin editor** — spine as a 1px `--border` horizontal line, events as 12px `--bg-surface` dots with 1px `--border` stroke (root/highlighted: 14px `--accent` fill), vertical cluster stacking at ±8px/±16px offsets, and labels above/below dots, per Style guide §8 Timeline; keep existing drag-snap, tooltip, and edit-panel wiring. File: `admin/assets/js/admin-timeline/timeline-events.js`
- [x] **Render public-style era markers on the admin axis** — era boundary lines and era labels styled as the public page does (`h4`-scale, `--accent`), replacing the current admin-toned axis. File: `admin/assets/js/admin-timeline/timeline-axis.js`
- [x] **Restyle the admin timeline canvas to match the public page** — `--bg-primary` background with the subtle dot grid, public dot/label/era-marker tokens; keep admin-only hover/selection affordances. Files: `admin/assets/css/admin-diagrams/timeline-canvas.css`, `admin/assets/css/admin-diagrams/timeline-controls.css`
- [x] **Write timeline mirror-consistency tests** — extend the existing suite: the admin period ordering used by `periodToX`/`xToPeriod` matches `TIMELINE_PERIODS` in `frontend/assets/js/timeline/timeline-data.js` exactly (same values, same order — this is what guarantees a dragged event lands in the same place on the public timeline); drag-snap round-trip (`periodToX` → `xToPeriod` is identity for every period); era-for-period mapping matches the schema's era CHECK groupings. File: `admin/tests/admin-timeline.test.js`

### Deploy & verify

- [x] **Run all automated tests** — `npm test` in `api/` plus `node --test admin/tests/*.test.js` and `node --test frontend/assets/js/arbor/tests/*.test.js`; all green before pushing. Files: `api/tests/`, `admin/tests/`, `frontend/assets/js/arbor/tests/`
- [x] **Push to GitHub** — stage, commit, and push the completed work. Run `git add -p`, `git commit -m "Arbor position mirroring & WYSIWYG diagram editors"`, `git push`. (Live testing intentionally omitted from this plan at the owner's request — code-side logic and functional tests only. The VPS deploy runs the new migration via `deploy.sh`.)

## Files touched
- `database/migrations/010_add_arbor_nodes.sql` — created
- `database/schema.sql` — modified
- `api/models/arbor.model.js` — modified
- `api/routes/arbor.js` — modified
- `api/tests/arbor-nodes.test.js` — created
- `admin/assets/js/update-record.js` — modified
- `admin/assets/js/admin-arbor/arbor-nodes.js` — modified
- `admin/assets/js/admin-arbor/arbor-edges.js` — modified
- `admin/assets/css/admin-diagrams/arbor-canvas.css` — modified
- `admin/assets/css/admin-diagrams/timeline-canvas.css` — modified
- `admin/assets/css/admin-diagrams/timeline-controls.css` — modified
- `admin/assets/js/admin-timeline/timeline-events.js` — modified
- `admin/assets/js/admin-timeline/timeline-axis.js` — modified
- `admin/tests/admin-timeline.test.js` — modified
- `frontend/assets/js/arbor/arbor-data.js` — modified
- `frontend/assets/js/arbor/arbor-render.js` — modified
- `frontend/assets/js/arbor/tests/arbor-render.test.js` — created

## Notes
- **Route ordering matters** in `api/routes/arbor.js`: Express matches in registration order, so `PUT/DELETE /arbor/nodes/:evidenceId` must be registered before `GET/PUT/DELETE /arbor/:id` or `"nodes"` will be parsed as an edge id (`Number("nodes")` → `NaN`).
- **Coordinate space is the mirror contract.** Admin and public renderers must interpret `x`/`y` in the same untransformed diagram coordinate space (zoom/pan applied on top). The WYSIWYG node restyle task makes admin node dimensions match the public renderer's so anchor points line up.
- **All-or-nothing fallback** on the public renderer: mixing saved positions with BFS-laid-out nodes in one diagram would produce overlaps; if any node lacks a position, the whole diagram uses the legacy BFS layout. The admin editor always writes a position when a node is added, so diagrams converge to fully-positioned quickly.
- **Published-only stays the rule** for `GET /arbor` (it's a public endpoint). Consequence: draft evidence can be searched and placed in the admin editor but won't appear in the editor's node list after reload until published — same behaviour as today, not a regression. If draft visibility in the editor is wanted later, follow the auth-gated admin-list pattern from Issues.md row 14.
- **Timeline needs no schema or API change** — position *is* `timeline_period`, already persisted on the evidence row and already consumed by the public timeline. Only the admin rendering changes.
- **Local DB is empty** (see CLAUDE.local.md): API tests must create their own fixture evidence rows (the existing `api/tests/helpers` pattern) and never assert against real content. The real mirroring payoff is only observable after VPS deploy.
- **`updated_at` trigger pattern**: the new `arbor_nodes` trigger must use the `WHEN NEW.updated_at = OLD.updated_at` guard like every other table, or the upsert-heavy drag traffic will double-write.
- **localStorage migration is best-effort**: run once on editor load, `try/catch` around each PUT, clear keys only on success — a failed migration must not lose the local positions.

---

## Completion Protocol

**For any implementing agent — including LLMs other than Claude that may pick this plan up:**

- **Use a Python script for every markdown edit described here, never manual find/replace.** Hand-edited markdown/HTML is a known source of corruption in this codebase (stray/duplicated tags spliced into files by imprecise edits — see `setup/Issues.md`) — don't repeat that failure mode on this plan's own tracking. Write a short script that parses the file, changes only the intended text, and rewrites it.
- **Marking progress**: As each task is implemented and verified, change `- [ ]` to `- [x]` in the checklist above.
- **Logging issues**: Log to `setup/Issues.md` only issues **discovered during the generation or implementation of this plan** (pre-existing problems found along the way, ambiguities, side effects). Do **not** log the problem this plan was created to fix — that is the plan's Goal, not a new issue.
- **Resolving issues**: This plan does not fix any existing `Issues.md` rows — do not touch that file's existing rows.
- **Plan lifecycle**: Once every task in this plan is complete (all checkboxes ticked), update the **Status** line in the header to `✅ Completed` and move this file to `setup/PLANS/Completed/`.
- **Push everything to GitHub as the final step** — the code changes, any `setup/Issues.md` update, and this plan file's own edits/move all go in the same commit/push as the plan's "Deploy & verify" group. Nothing is considered done until it's pushed.
