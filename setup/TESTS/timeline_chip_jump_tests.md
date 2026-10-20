## Validation: Timeline Era Chip Jump Navigation

**Plan:** `setup/PLANS/New/3-timeline-chip-jump-to-era.md`  
**Date:** 2026-08-03

### Manual checks

- [ ] **Desktop — chip click centres era**: On a desktop viewport ≥768px, click an era chip (e.g. "Life" or "Passion Week"). The timeline should pan/zoom to centre that era's vertical midpoint in the viewport's horizontal centre. The movement should animate over 150ms using `--ease-out` easing. Verify via browser inspector that `.timeline-world` has an updated `transform: translate(...)` with the `transition: transform 150ms cubic-bezier(...)` class applied.

- [ ] **Desktop — reduced-motion respected**: Open browser dev tools, simulate `prefers-reduced-motion: reduce`, and click an era chip again. The transform should apply **immediately** with no transition delay or animation — inspect `.timeline-world` and confirm `transition` property is not applied (or is `none`).

- [ ] **Desktop — filter and navigate together**: Click an era chip. Verify both: (1) the era's dots remain visible at full opacity, and all other eras' dots fade to `opacity: 0.3` (filter behaviour is preserved); (2) the viewport pans to centre the clicked era (new jump behaviour).

- [ ] **Desktop — "All Eras" chip resets**: Click the "All Eras" chip. The timeline should reset to its default view: scale=1.0, pan=(0,0), all dots visible at full opacity, and all eras' dots shown. Verify via inspector that `.timeline-world` has `transform: translate(0, 0)` or is removed.

- [ ] **Mobile — chip click scrolls era into view**: On a viewport <768px (use browser responsive mode), click an era chip. The first dot of that era should scroll horizontally into the centre of the `.timeline-world` container. Zoom is disabled on mobile, so the timeline height/width remain unchanged — only horizontal scroll position changes. Verify via inspector that no `transform` is applied to `.timeline-world` (transform/zoom are disabled per `timeline-responsive.css`).

- [ ] **Mobile — scroll behaviour is smooth**: On mobile, scrolling should be momentum-enabled (`scroll-behavior: smooth` or native momentum scrolling). Verify the scroll completes within 1–2 seconds and lands with the era's dots visible.

- [ ] **Accessibility — chip labels are clear**: Inspect the chip elements in DevTools. Each era chip should have an `aria-label` attribute describing dual action (e.g. "Show Passion Week events and jump to era"). The "All" chip should say "Show all eras and reset to default view". Screen reader users should hear the full intent when tabbing to each chip.

- [ ] **Keyboard navigation**: Tab through the chips at the top of the timeline. Each chip should be keyboard-focusable and activatable via Enter/Space. Clicking via keyboard should trigger the same jump-and-filter behaviour as mouse click.

- [ ] **Empty era handling**: If an era exists but has no events in the database, clicking that era's chip should still apply the filter (showing 0 visible dots) and jump to the era's location. No error toast or console errors should appear. A `console.warn` may appear in the inspector's console for diagnostic purposes.

- [ ] **Viewport edge cases**: Test with very narrow viewport (<375px) and very wide viewport (>2400px). The pan calculation should clamp correctly so the era remains visible and the timeline doesn't pan beyond the valid bounds. Inspect the clamped `panX` value and confirm it falls within `[minPan, maxPan]` computed from the world width and viewport width.

### Code-review checks

- [ ] **JS-1** — Function names in `timeline-transform.js` are self-documenting (`computePanForEra`, `clampPan`, `getEraWorldBounds`). No comments needed; the code reads like prose.

- [ ] **JS-2** — Guards in `jumpToEra()` and `computePanForEra()` check for missing eras, null bounds, and out-of-bounds values. Each guard logs `console.warn` with enough context (era key, viewport width, reason for guard) to trace issues. No silent failures.

- [ ] **JS-3** — Each function is small and focused. `timeline-zoom.setTransform()` does one thing (apply transform and fire event); `timeline-nav.jumpToEra()` does one thing (navigate to era). No over-engineering.

- [ ] **JS-5** — No raw `fetch` calls in the timeline modules. Custom event `timeline:transformed` uses native DOM events, not promises or callbacks.

- [ ] **JS-6** — Event delegation in `timeline-interactions.js` does not add per-chip listeners; the existing delegated handler is reused. DOM queries in `timeline-nav.js` are cached where repeated (e.g. `.timeline-world` queried once at the top of `jumpToEra()`).

- [ ] **CSS-2** — Animation timing in `timeline-nav.js` uses only `--duration-fast` and `--ease-out` from `variables.css`, never hardcoded values like `150ms` or `cubic-bezier(0.25, ...)`.

- [ ] **CSS-3** — Mobile query for scroll-into-view (`<768px`) is implemented as a `matchMedia()` check in `timeline-nav.js`, not a separate CSS file. This is acceptable because the behaviour is JS-driven (scroll), not CSS-driven (display/position).

- [ ] **HTML-5** — Each chip is a `<button>` element (semantic), not a `<div role="button">`. Each has a non-empty `aria-label`. No placeholder text or empty labels.

- [ ] **SR-1** — New code lives in new files: `timeline-transform.js` for math, `timeline-nav.js` for navigation logic. Existing files (`timeline-zoom.js`, `timeline-interactions.js`) are extended, not merged with unrelated logic.

- [ ] **TEST-1 & TEST-2** — `timeline-transform.test.js` uses `node:test` + `node:assert/strict`. Tests prove module loads, happy path works, and guards behave correctly. No external test frameworks or mocking libraries.

- [ ] **No new dependencies** — `timeline-transform.js` and `timeline-nav.js` use only existing imports (`ERA_BOUNDARIES` from `timeline-data.js`, native DOM and matchMedia APIs). No npm packages added.

- [ ] **Reduced-motion is respected** — `timeline-nav.js` checks `matchMedia('(prefers-reduced-motion: reduce)').matches` before applying `transition` class. If true, `transform` is set inline without animation.

- [ ] **Custom event `timeline:transformed`** — fired from `timeline-zoom.setTransform()` on `.timeline-world` with `detail: { panX, panY, scale, era }`. Other modules can listen without tight coupling to zoom internals.

- [ ] **Error handling matches plan** — no `sendError`, `sendValidationError`, `showErrorToast`, or `handleApiError` calls needed. Guards use `console.warn` only. No new error codes in `api/lib/error-codes.js`.

- [ ] **Documentation updated** — `setup/Website_guide.md` and `setup/STYLE_GUIDE/components.md` both describe the chip's dual behaviour (filter + navigate) and note reduced-motion handling.
