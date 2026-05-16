---
name: plan_fix_module3_audit_bugs
version: 1.0.0
module: 3.0 — Visualizations
status: draft
created: 2026-05-16
---

# Plan: plan_fix_module3_audit_bugs

## Purpose

> Fix 13 bugs identified in the Module 3.0 audit and redesign the Timeline layout to replace the three-lane system (prophecy/biblical/secular) with a unified single-axis model. Regular nodes stack centered on the main axis; spiritual nodes (map_label='spiritual') scatter in an abstract pattern below the axis; supernatural nodes (map_label='supernatural') form a loose cloud at the top spread horizontally by era. Zoom level changes trigger layout recalculation to fan out stacked nodes. Bugs span all three sub-modules: Ardor public display (viewBox clipping, subtree overlap, entity truncation), Timeline (null crash, non-deterministic positions, duplicate labels, description ellipsis), Maps (JSON description parsing, misleading parseEraYear), and the Dashboard Arbor editor (surfaceError misuse, changedNodes not cleared, duplicate orphan/tree rendering).

---

## Tasks

> Each task is a focused, bite-sized unit of work.
> 
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

### T1 — Fix Ardor public display: dynamic viewBox width

- **File(s):** `js/3.0_visualizations/frontend/ardor_display.js`
- **Action:** Replace the hardcoded `var svgWidth = 900` with a dynamic calculation that measures the maximum X-position of any laid-out node (plus nodeWidth + padding) so the SVG viewBox never clips wide trees.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T2 — Fix Ardor public display: global X-position tracking to prevent subtree overlap

- **File(s):** `js/3.0_visualizations/frontend/ardor_display.js`
- **Action:** Introduce a global X cursor or collision-avoidance mechanism in `layoutTree()` so that leaf nodes across different parent subtrees do not overlap. Each subtree's leaf layout must account for positions already claimed by sibling subtrees at the same depth.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T3 — Fix Ardor public display: truncate before escaping

- **File(s):** `js/3.0_visualizations/frontend/ardor_display.js`
- **Action:** Move the `escapeHtmlAttr()` call to AFTER the truncation check. Truncate the raw title to 26 chars first, append "...", then escape the result. This prevents mid-entity cuts and incorrect length measurement.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T4 — Fix Dashboard Arbor: surfaceError used for success messages

- **File(s):** `js/3.0_visualizations/dashboard/dashboard_arbor.js`
- **Action:** Replace all `window.surfaceError(...)` calls that report success/informational messages (lines 82, 163-166, 196, 269-271) with a neutral status reporting pattern. If a `window.surfaceStatus` or similar function exists in the shared dashboard utilities, use that. If not, create a simple conditional: use `surfaceError` only for actual errors; for success messages, update a DOM element (e.g. the status bar) directly with a non-error class.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T5 — Fix Dashboard Arbor: clear changedNodes after successful Save Draft

- **File(s):** `js/3.0_visualizations/dashboard/dashboard_arbor.js`
- **Action:** In `_handleSaveDraft()`, after a successful PUT response (line ~167), add `window.__changedNodes = new Map();` to clear the tracked changes, preventing duplicate re-saves.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T6 — Fix Dashboard Arbor: duplicate nodes in tree and orphan pool

- **File(s):** `js/3.0_visualizations/dashboard/update_node_parent.js`
- **Action:** In `_rerenderTree()`, fix the logic so that root nodes (parent_id=null) with children are rendered ONLY in the tree root section, NOT in the orphan pool. The orphan pool should only contain root nodes that have NO children (truly unattached leaf nodes). Update `_rebuildTreeFromMap()` to distinguish between "root with children" (tree) and "root without children" (orphan pool).
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T7 — Fix Maps: parse JSON description in showMetadata

- **File(s):** `js/3.0_visualizations/frontend/maps_display.js`
- **Action:** In the Maps `showMetadata()` function, wrap `record.description` in a JSON.parse try/catch (matching the pattern used in Timeline's `showMetadata`). If parsing succeeds and the result is an array, use the first element. Apply the 160-char truncation only if the text exceeds 160 chars.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T8 — Fix Maps: improve parseEraYear to be less misleading

- **File(s):** `js/3.0_visualizations/frontend/maps_display.js`
- **Action:** Improve `parseEraYear()` to extract meaningful year estimates from the `era` field using the TIMELINE_STAGES ordering or era string parsing. At minimum: PreIncarnation → -50, OldTestament → -500, EarlyLife* → 1-12, Life* → 26-30, Galilee* → 28-30, Judean* → 30-33, Passion* → 33, PostResurrection/Ascension → 33, OurResponse/ReturnOfJesus → 100. This makes the era slider actually filter meaningfully even as a placeholder.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T9 — Redesign Timeline: remove lane system, implement single-axis stacking

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** Remove the entire lane assignment system (prophecy/biblical/secular). Replace with new zone classification using the `map_label` field (which contains sub-categories including 'spiritual' and 'supernatural'):
  - `map_label = 'supernatural'` → Y=50-150 range (loose cloud at top, X spread by timeline stage)
  - `map_label = 'spiritual'` → Y=350-500 range (scattered semi-randomly below axis, detached from chronological X-position; use a deterministic seed from record.id for pseudo-random scatter)
  - All other map_label values (or null) → Y centered on axis (Y=300), stacked vertically when multiple nodes share the same timeline stage. Stack centered: if N nodes share a stage, positions are Y=300 - (N-1)*spacing/2, Y=300 - (N-3)*spacing/2, ..., Y=300 + (N-1)*spacing/2.
  
  Update the SQL query to also SELECT `map_label` (add to the existing column list). Remove the `getYForLane()` function. Remove all references to "lane", "prophecy", "secular" from the file. Remove `r.lane` property assignment. Update CSS class names from `lane-{lane}` to `zone-{map_label}` (or `zone-default` when map_label is null/unrecognized).
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T10 — Redesign Timeline: implement zoom-responsive layout recalculation

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** Modify the zoom handlers (zoomIn/zoomOut click listeners) to call `renderTimelineNodes(records)` after changing the scale, passing `currentScale` as a parameter that influences the vertical spacing between stacked same-stage nodes. At zoom 1x, use tight spacing (e.g. 14px between stacked nodes). At zoom 3x, use wider spacing (e.g. 28px). The formula should interpolate linearly: `spacing = baseSpacing + (currentScale - 1) * scaleFactor`. Remove the CSS `transform: scale()` approach and instead recalculate SVG positions directly (more precise, avoids blurriness).
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T11 — Fix Timeline: remove linkLayer references entirely

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** Remove the `linkLayer` variable declaration, the `linkLayer.innerHTML = ""` call, and all code that creates and appends `<line>` elements to the link layer (the vertical lane-connecting lines). Since T16 removes `#link-layer` from the HTML and the lane system is gone, this code is dead. Simplify the guard to just `if (!nodeLayer || !axisLayer) return;`.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T12 — Fix Timeline: deterministic fallback for unknown timeline values

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** In `getXForTimelineStage()`, replace `Math.random() * 1000` fallback with a deterministic hash of the timeline string (e.g. sum of char codes modulo a range). This ensures nodes with unknown timeline values render at the same position on every render.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T13 — Fix Timeline: deduplicate axis labels

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** In `renderTimelineNodes()`, track which timeline stages have already had a label rendered (using a Set). Only create an axis label `<text>` for the first node encountered at each stage, preventing duplicate stacked labels.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T14 — Fix Timeline: conditional "..." in showMetadata

- **File(s):** `js/3.0_visualizations/frontend/timeline_display.js`
- **Action:** Change the description display to only append "..." when the text is actually longer than 200 characters: `descText.length > 200 ? descText.substring(0, 200) + "..." : descText`.
- **Vibe Rule(s):** 1 function per file · ES6+ · 3-line header comment

- [x] Task complete

---

### T15 — Update Timeline CSS: remove lane styles, add category styles

- **File(s):** `css/3.0_visualizations/frontend/timeline.css`
- **Action:** Remove all `.timeline-node[data-category="prophecy"]`, `[data-category="secular"]`, and `[data-category="biblical"]` rules. Remove any `.lane-*` class references. Add new styles:
  - `.timeline-node[data-zone="supernatural"]` — fill with a distinct colour (e.g. `var(--color-dash-accent)` gold)
  - `.timeline-node[data-zone="spiritual"]` — fill with a muted/translucent style (e.g. `var(--color-text-secondary)` with reduced opacity)
  - `.timeline-node` (default) — fill with `var(--color-accent-primary)` (Oxblood, for all regular nodes)
  - Remove the vertical link line styles (`.timeline-link`) since the lane-connecting vertical links no longer exist.
- **Vibe Rule(s):** CSS variables · section comments · no frameworks

- [x] Task complete

---

### T16 — Update Timeline HTML: remove vertical link layer

- **File(s):** `frontend/pages/timeline.html`
- **Action:** Remove the `<g id="link-layer"></g>` SVG group from the timeline HTML since vertical lane links are no longer rendered. Keep `grid-layer`, `axis-markers-layer`, and `node-layer`.
- **Vibe Rule(s):** Semantic tags · no inline styles · descriptive id hooks

- [x] Task complete

---

### T17 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [x] Semantic tags used — no `<div>` soup
- [x] No inline `style="..."` attributes
- [x] No inline `<script>` blocks
- [x] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [x] CSS Grid used for macro layout; Flexbox for micro alignment
- [x] All colours, fonts, and spacing reference CSS variables from `typography.css`
- [x] Section headings and subheadings present as comments
- [x] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [x] One function per file (or tightly-related group for a single widget/component)
- [x] File opens with three comment lines: trigger, main function, output
- [x] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [x] Repeating UI elements injected via component injection pattern

#### Python
- [x] Logic is explicit and self-documenting — no overly clever tricks
- [x] Scripts are stateless and safe to run repeatedly
- [x] API quirks or data anomalies documented inline

#### SQL / Database
- [x] All field names in `snake_case`
- [x] Queries are explicit — no deeply nested frontend WASM logic

---

### T18 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope.

- [x] **Achievement**: All 13 audit bugs fixed (excluding Maps ULID/NaN critical bug)
- [x] **Achievement**: Three-lane system (prophecy/secular/biblical) fully removed from code and documentation
- [x] **Achievement**: New single-axis stacking layout renders correctly with centered vertical stacking for same-stage nodes
- [x] **Achievement**: Spiritual nodes (map_label='spiritual') scatter in abstract pattern below axis
- [x] **Achievement**: Supernatural nodes (map_label='supernatural') form loose cloud at top, spread by era
- [x] **Achievement**: Zoom recalculation fans out stacked nodes at higher zoom levels
- [x] **Necessity**: Module 3.0 bugs resolved, timeline UX improved from confusing lane system to clear visual hierarchy
- [x] **Targeted Impact**: Only Module 3.0 frontend/dashboard JS, CSS, HTML, and documentation files modified
- [x] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

### T19 — Module Guide Update

> Refactor the per-module guide files in `documentation/guides/3.0 Visualizations Module/` to match all changes made by this plan.
> This is a **mandatory task** — the module guides must stay in sync with the source code.

- **File(s):** All guide files in `documentation/guides/3.0 Visualizations Module/`.
- **Action:** For each guide file present in the module subfolder, cross-reference it against the source code and update to reflect this plan's changes:
  - **`guide_dashboard_appearance.md`**: No layout changes needed. Verify the Arbor editor status bar description mentions success vs error message differentiation (T4 fix).
  - **`guide_frontend_appearance.md`**: Replace the Timeline page ASCII diagram — remove the three-lane layout (Prophecy Y=150, Biblical Y=300, Secular Y=450) and replace with the new single-axis model showing: main axis with stacked nodes, supernatural cloud at top, spiritual scatter below. Update the DOM structure section to remove `#link-layer`.
  - **`guide_function.md`**: Rewrite the §3.2 Timeline Life Cycle diagram to reflect: removal of lane assignment, new map_label-based zone classification (spiritual/supernatural/regular), zoom-responsive recalculation, and deterministic X-fallback. Update the functional description paragraph to match.
  - **`visualizations_nomenclature.md`**: Remove terms: "Lane", "Prophecy lane", "Secular lane", "Link Layer" (timeline-specific vertical links). Add terms: "Supernatural Cloud" (top-band zone for map_label='supernatural'), "Spiritual Scatter" (below-axis abstract zone for map_label='spiritual'), "Axis Stacking" (centered vertical distribution of same-stage nodes), "Zoom Recalculation" (re-rendering with increased spacing at higher zoom). Update "Node Layer" to remove lane references. Update "Linear Pulse" to note it is the sole axis (no secondary lanes).

  > **Markdown editing note:** When modifying documentation that contains ASCII box-drawing characters (e.g. ─ ┐ └ ┘) or Unicode symbols, skip `edit_file` and use a Python script via `terminal` instead. `edit_file` cannot reliably match these characters. One-liner pattern:
  > python3 -c "with open('path/file.md','r') as f: c=f.read(); c=c.replace('old','new'); open('path/file.md','w').write(c)"
  > But break it across multiple lines with variables for readability.

- **Vibe Rule(s):** Source-of-Truth Discipline · Cross-reference source files against guide content

- [x] All ASCII diagrams in module guides match current source code
- [x] All lifecycle/flow diagrams reflect current bootstrapping and event logic
- [x] Nomenclature file covers all terms used in module source files
- [x] Version numbers bumped on all modified guide files
- [x] No stale references to files or logic changed by this plan

---

### T20 — Push to GitHub

> Commit all changes and push to `main`.

- **Action:** Stage all modified files, create a descriptive commit message summarising the plan's changes, and push to `main`.
- **Pre-push checks:**
  - Verify no untracked files are being left behind
  - Verify no sensitive files (.env, credentials) are staged
  - Verify the commit message accurately describes the scope of changes

- [ ] All changes committed with descriptive message
- [ ] Pushed to `main` successfully
