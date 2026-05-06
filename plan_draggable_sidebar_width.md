---
name: plan_draggable_sidebar_width
version: 1.0.0
module: 7.0 — System
status: draft
created: 2025-07-17
---

# Plan: Draggable Sidebar Width

## Purpose

> Add a draggable resize handle to the dashboard Providence sidebar (7.0 System — shell) so admin users can adjust the sidebar width by clicking and dragging. The resize handle lives on the divider track between the sidebar and main columns and applies to **any module rendered inside the Providence canvas** that chooses to display a sidebar — this includes Modules 4.0 (Ranked Lists), 5.0 (Essays & Responses), 6.0 (News & Blog), and 7.0 (System). A backstop (minimum ~180px, maximum ~40% of viewport width) prevents the sidebar from being made too narrow to read or the main content area from being completely obscured. All content in both columns reflows in real time as the user drags. The chosen width is saved to a cookie so it persists across page reloads and module switches. Modules that hide the sidebar (call `_setLayoutColumns(false)`) are unaffected — the resize handle hides with the sidebar.

---

## Tasks

> Each task is a focused, bite-sized unit of work.
>
> **Instructions for the Agent:**
> 1. **Read `documentation/vibe_coding_rules.md`** at the beginning of every task.
> 2. **Remind yourself** of the project purpose and Section 7 (AI Execution & Drift Control) of the vibe-coding rules.
> 3. **Mark the task as complete** (check the box) ONLY when the specific task requirements are fully met.

> **⚠️ Preference: No existing JS files are modified.** All JavaScript changes in this plan are implemented by creating new `.js` files only. Existing JS files (`dashboard_app.js`, module renderers, etc.) are left untouched. The init wrapper pattern (T3) patches `window` functions after the fact without editing the original source.

### T1 — Create dashboard sidebar resize JS utility

- **File(s):** `js/7.0_system/dashboard/dashboard_sidebar_resize.js`
- **Action:** Create a new JS module that exposes a single function `window.initSidebarResize(containerEl, opts)`. The function attaches a `mousedown` / `touchstart` listener to a drag-handle element (identified by `opts.handleEl`), tracks pointer movement to calculate a new width, clamps it to `opts.minWidth` (default `180px`) and `opts.maxWidth` (default `40vw`), and sets `--sidebar-width` on `containerEl` in real time. On `mouseup` / `touchend`, it removes the move listeners. Include cursor-change logic (`col-resize` on the handle, `grabbing` during drag). Use `document.body.style.cursor` during the drag to keep the resize cursor even when the pointer leaves the handle.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection pattern

- [ ] Task complete

---

### T2 — Add drag handle to dashboard Providence sidebar HTML

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Edit the dashboard HTML to add a `<div id="providence-drag-handle" class="sidebar-resize-handle" aria-hidden="true" title="Drag to resize sidebar"></div>` element directly after the `#providence-col-sidebar` section element and before the `#providence-divider` divider element. This places the drag handle in the 1px divider grid track (the handle visually overlaps it).
- **Vibe Rule(s):** Semantic HTML5 tags · Descriptive `id`/`class` hooks · No inline styles · No inline scripts

- [ ] Task complete

---

### T3 — Create init file to wire resize into the Providence lifecycle

- **File(s):** `js/7.0_system/dashboard/dashboard_sidebar_resize_init.js`
- **Action:** Create a new JS module that wraps `window._setLayoutColumns` and `window._clearColumns` (both defined in `dashboard_app.js`) to add resize-handle initialisation without modifying the originals. On script load, save references to the original functions, then replace them with wrappers:
  - **Wrapped `_setLayoutColumns`**: call the original, then check `canvasEl.classList.contains('no-sidebar')` rather than re-inspecting the width argument — this reliably detects whether the sidebar is collapsed (the original function always sets the class). If the sidebar is visible (`.no-sidebar` absent), call `window.initSidebarResize(canvasEl, { handleEl: document.getElementById('providence-drag-handle'), minWidth: '180px', maxWidth: '40vw' })`. If the sidebar is hidden, set `pointer-events: none` on the handle. Guard with `typeof window.initSidebarResize === 'function'`.
  - **Wrapped `_clearColumns`**: call the original, then clean up the handle's `is-dragging` class and restore `pointer-events`.
- **Vibe Rule(s):** 1 function per JS file · 3-line header comment (trigger/function/output) · Vanilla ES6+ · Component injection pattern

- [ ] Task complete

---

### T4 — Add dashboard resize handle CSS styles

- **File(s):** `css/1.0_foundation/dashboard/admin_components.css`
- **Action:** Add a new section (7) to admin_components.css for `.sidebar-resize-handle`. The handle sits in the grid area between the sidebar column and the divider. Use `grid-column: 2; grid-row: 1; z-index: 1;` to position it in the divider track. Styling: `width: 8px; cursor: col-resize;` with a background that is transparent by default and transitions to a visible gradient on hover. Add a `.is-dragging` state class that paints the handle using `var(--color-accent-primary)` to give visual feedback. Ensure the handle's wider hit target (8px) does not push the divider line off-centre — the handle's visual indicator can be centred within the 8px via a centred `::after` pseudo-element (1px wide, `var(--color-border)` colour). Add a subtle hover transition. **Also add a companion no-sidebar rule:** `#admin-canvas.no-sidebar #providence-drag-handle { display: none; }` so the drag handle is reliably hidden when the sidebar is collapsed (matching the existing pattern for `#providence-col-sidebar` in `admin_shell.css`).
- **Vibe Rule(s):** CSS Grid / Flexbox hierarchy · CSS variables · Section comments · No frameworks

- [ ] Task complete

---

### T5 — Load resize JS files in dashboard.html

- **File(s):** `admin/frontend/dashboard.html`
- **Action:** Add two `<script>` tags in the deferred script block of dashboard.html after `dashboard_app.js`: first `<script src="../../js/7.0_system/dashboard/dashboard_sidebar_resize.js"></script>`, then `<script src="../../js/7.0_system/dashboard/dashboard_sidebar_resize_init.js"></script>`. The ordering matters: `dashboard_app.js` must define the original functions first, then the utility, then the init wrapper that patches them.
- **Vibe Rule(s):** No inline scripts · Deferred external `<script>` tags · Semantic HTML

- [ ] Task complete

---

### T6 — Add cookie persistence for sidebar width

- **File(s):** `js/7.0_system/dashboard/dashboard_sidebar_resize.js`
- **Action:** Extend `window.initSidebarResize()` to accept an optional `opts.cookieName` parameter (default: `"dashboard-sidebar-width"`). On `mouseup` / `touchend` (when the drag finishes), save the final clamped width value to a cookie with a 90-day expiry. On initialisation, before attaching drag listeners, read the cookie and apply the saved width immediately by setting `--sidebar-width` on `containerEl`. Use `document.cookie` with `path=/` so the preference applies across the entire dashboard. If the cookie is absent or unparseable, fall back to the CSS-defined default by reading `getComputedStyle(containerEl).getPropertyValue('--sidebar-width')`, which respects whatever `:root` value is set in `shell.css` (currently `280px`). This avoids duplicating the magic number in JS.
- **Vibe Rule(s):** 1 function per JS file · Vanilla ES6+ · Explicit readable logic · No external dependencies

- [ ] Task complete

---

## Final Tasks

### T7 — Vibe-Coding Audit

> Verify every file created or modified in this plan against `documentation/vibe_coding_rules.md`.

#### HTML
- [ ] Semantic tags used — no `<div>` soup
- [ ] No inline `style="..."` attributes
- [ ] No inline `<script>` blocks
- [ ] Descriptive `id` hooks for JS, modular `class` names for CSS

#### CSS
- [ ] CSS Grid used for macro layout; Flexbox for micro alignment
- [ ] All colours, fonts, and spacing reference CSS variables from `typography_colors.css`
- [ ] Section headings and subheadings present as comments
- [ ] No third-party utility frameworks (Tailwind, Bootstrap, etc.)

#### JavaScript
- [ ] One function per file
- [ ] File opens with three comment lines: trigger, main function, output
- [ ] Vanilla ES6+ only — no React, Vue, or heavy frameworks
- [ ] Repeating UI elements injected via component injection pattern

#### Python
- [ ] Logic is explicit and self-documenting — no overly clever tricks
- [ ] Scripts are stateless and safe to run repeatedly
- [ ] API quirks or data anomalies documented inline

#### SQL / Database
- [ ] All field names in `snake_case`
- [ ] Queries are explicit — no deeply nested frontend WASM logic

---

### T8 — Purpose Check

> Verify that the plan has achieved its stated goals without exceeding its scope. This checklist maps directly to the opening purpose summary (what it achieves, why it is needed, and which part of the site it affects).

- [ ] **Achievement**: A draggable resize handle exists on the dashboard Providence sidebar
- [ ] **Achievement**: Admin user can click-and-drag the handle to resize the sidebar width in real time
- [ ] **Achievement**: All content (sidebar nav, main work area) reflows fluidly during the drag
- [ ] **Achievement**: Backstop limits prevent the sidebar from going below ~180px or above ~40vw
- [ ] **Achievement**: The chosen sidebar width is saved to a cookie and restored across page reloads and module switches
- [ ] **Necessity**: The underlying user need for adjustable dashboard sidebar width has been resolved
- [ ] **Targeted Impact**: The resize handle is a structural feature of the Providence grid — it is present whenever the sidebar column is visible. All dashboard modules currently render full-width with `_setLayoutColumns(false)`, so no module is practically affected today; the handle activates automatically if any future module chooses to display the sidebar. Modules that call `_setLayoutColumns(false)` are unaffected — the handle hides with the sidebar.
- [ ] **Scope Control**: No scope creep — only files listed in §Tasks were created or modified

---

## Documentation Update

> Update every document in `documentation/` whose scope overlaps with the work done in this plan.
> Only update documents that are genuinely affected — do not touch unrelated files.

| Document | Update Required | Change Description |
|----------|-----------------|--------------------|
| `documentation/detailed_module_sitemap.md` | Yes | Add new files `js/7.0_system/dashboard/dashboard_sidebar_resize.js` and `js/7.0_system/dashboard/dashboard_sidebar_resize_init.js` under Module 7.0 Dashboard JS Files. Note `dashboard.html` was edited to add the drag handle element and new script tags. |
| `documentation/simple_module_sitemap.md` | Yes | Reflect that Module 7.0 now includes a draggable dashboard sidebar resize feature. |
| `documentation/site_map.md` | Yes | Run `/sync_sitemap` to register the new `dashboard_sidebar_resize.js` and `dashboard_sidebar_resize_init.js` files. |
| `documentation/data_schema.md` | No | No database tables, columns, or relationships were introduced or changed. |
| `documentation/vibe_coding_rules.md` | No | No existing rules were ambiguous or needed clarification for this plan; the plan operates within established conventions. |
| `documentation/style_mockup.html` | No | Only the admin dashboard is affected; no public-facing layout changes. |
| `documentation/git_vps.md` | No | No deployment workflow, Git branching strategy, or VPS config was changed. |
| `documentation/guides/guide_appearance.md` | No | Only the admin dashboard sidebar is changed; no public-facing appearance is modified. |
| `documentation/guides/guide_dashboard_appearance.md` | Yes | Document the new drag-handle interaction on the dashboard Providence sidebar (inside the `#admin-canvas` grid). Describe when the handle is visible vs. hidden (no-sidebar modules). |
| `documentation/guides/guide_function.md` | Yes | Document the drag-to-resize interaction flow: mousedown/touchstart on handle → mousemove/touchmove with clamped width → mouseup/touchend to finalise. Reference `initSidebarResize()` as the dashboard utility. |
| `documentation/guides/guide_security.md` | No | No authentication, session handling, rate limiting, or input validation changes were made. |
| `documentation/guides/guide_style.md` | Yes | Document the new `.sidebar-resize-handle` CSS pattern (dashboard context only), including hover/dragging states, width (8px hit target), cursor treatment, and the `--sidebar-width` variable it modifies in real time. |
| `documentation/guides/guide_maps.md` | No | No map display or data logic was changed. |
| `documentation/guides/guide_timeline.md` | No | No timeline display or data logic was changed. |
| `documentation/guides/guide_donations.md` | No | No external support integrations or donation flows were changed. |
| `documentation/guides/guide_welcoming_robots.md` | No | No SEO, sitemap, robots.txt, or AI-accessibility standards were changed. |

### Documentation Checklist
- [ ] All affected documents identified in the table above
- [ ] Each "Yes" row has been updated with accurate, current information
- [ ] No document contains stale references to files or logic changed by this plan
- [ ] Version numbers incremented where frontmatter versioning is present
