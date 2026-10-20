# Validation Checklist — arbor-node-text-wrap

**Plan:** `setup/PLANS/New/arbor-node-text-wrap.md`

## Code-level checks

- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — `wrapTextToWidth()` function exists at module scope.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — `wrapTextToWidth()` uses a cached offscreen canvas for `measureText`.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — `wrapTextToWidth()` falls back to `maxWidth / 7` char-count when canvas is unavailable.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — title rendering uses `<tspan>` children instead of `textContent` on the `<text>` element.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — title `<tspan>` elements capped at 3 lines, third truncated with `…` if needed.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — verse Y position adjusts based on title line count: `y + 20 + (lineCount * 22)`.
- [ ] `admin/assets/js/admin-arbor/arbor-nodes.js` — verse stays as single `<text>` element (no `<tspan>` needed for short Bible references).

## Behaviour checks

- [ ] **"The Logos"** (short, ~10 chars) — single line, verse at `y + 42` (unchanged from previous `y + 40` approximation).
- [ ] **"Bethlehem Ephrathah, and Micah"** (~33 chars) — wraps to 2 lines, verse pushed below both.
- [ ] **28-char truncated title** — wraps to at most 3 lines, final line truncated with `…`.
- [ ] **Title with single long word** — breaks at character level, not just spaces.
- [ ] **Empty title** — no `<text>` element rendered (existing guard `if (labelText)` unchanged).
- [ ] **Drag node** — wrapped text node still draggable, position updates correctly.
- [ ] **Click node** — wrapped text node still selectable, edit panel opens.
- [ ] **Node with draft badge** — badge position unaffected by title wrapping (badge uses fixed `y + NODE_HEIGHT - 22`).

## Sitemap

- [ ] `frontend/sitemap.xml` — no changes required (admin-only).
