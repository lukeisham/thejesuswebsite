/**
 * Timeline navigation module.
 *
 * Exports `jumpToEra(eraKey)` — called when a user clicks an era filter
 * chip to both filter events AND jump the viewport to centre that era at
 * normal zoom (scale 1.0).
 *
 * Desktop behaviour (> 768px):
 *   1. Resolve the era's world-pixel bounds.
 *   2. Compute the pan offset to centre the era in the viewport.
 *   3. Call timeline-zoom.setTransform() with scale=1.0.
 *   4. Respects prefers-reduced-motion: if the user has requested reduced
 *      motion, the transform is applied instantly (no CSS transition).
 *
 * Mobile behaviour (< 768px):
 *   Zoom/pan is disabled on mobile (transform: none in responsive CSS).
 *   Instead, scroll the first dot of the target era horizontally into
 *   view via Element.scrollIntoView().
 *
 * "All" / "all" behaves as a reset: scale=1.0, pan=(0,0), full timeline
 * centred.
 *
 * @module timeline/timeline-nav
 */

import { computePanForEra, getEraWorldBounds } from "./timeline-transform.js";
import { setTransform } from "./timeline-zoom.js";

/** Mobile breakpoint — matching timeline-zoom.js and timeline-responsive.css. */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Whether the viewport is currently in mobile vertical-mode range.
 * @returns {boolean}
 */
function isMobile() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_QUERY).matches
  );
}

/**
 * Whether the user has requested reduced motion at the OS/browser level.
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Jump the viewport to centre an era at normal zoom (scale 1.0).
 *
 * On desktop: pans/zooms via timeline-zoom.setTransform().
 * On mobile:  scrolls the first era dot into horizontal view.
 *
 * "All" / "all" resets to default: scale=1.0, pan=(0,0).
 *
 * If the era has no data or is unrecognised, logs a warning and bails
 * gracefully — the chip's filter action has already succeeded
 * independently, so a failed jump is a no-op from the user's perspective.
 *
 * @param {string} eraKey — canonical era key, "all", or "All"
 */
export function jumpToEra(eraKey) {
  if (!eraKey) {
    console.warn("timeline-nav: jumpToEra called without an era key");
    return;
  }

  // ── Mobile: scroll first dot into view ──────────────────────────────────
  if (isMobile()) {
    // "All" — scroll to the first dot overall
    var selector = eraKey === "all" || eraKey === "All"
      ? ".timeline-dot"
      : '.timeline-dot[data-era="' + eraKey + '"]';

    var firstDot = document.querySelector(selector);
    if (!firstDot) {
      console.warn(
        "timeline-nav: no dots found for era, cannot scroll into view",
        { eraKey },
      );
      return;
    }

    firstDot.scrollIntoView({ block: "nearest", inline: "center" });
    return;
  }

  // ── Desktop: compute pan + zoom ─────────────────────────────────────────

  // "All" / "all" resets to default view
  if (eraKey === "all" || eraKey === "All") {
    setTransform(0, 0, 1.0, eraKey);
    handleReducedMotion();
    return;
  }

  // Validate era exists
  var bounds = getEraWorldBounds(eraKey);
  if (!bounds) {
    console.warn("timeline-nav: unrecognised or empty era, bailing", {
      eraKey,
    });
    return;
  }

  var viewportWidth = window.innerWidth;
  var pan = computePanForEra(eraKey, viewportWidth, 1.0);
  if (!pan) {
    console.warn("timeline-nav: could not compute pan for era", { eraKey });
    return;
  }

  setTransform(pan.panX, pan.panY, 1.0, eraKey);
  handleReducedMotion();
}

/**
 * If the user prefers reduced motion, suppress the CSS transition on
 * .timeline-world so the transform takes effect instantly (the
 * setTransform call above will have applied a transform that the
 * browser would otherwise animate via the transition rule).
 *
 * We remove the transition class after a short rAF delay so future
 * button-zoom interactions still animate normally.
 */
function handleReducedMotion() {
  if (!prefersReducedMotion()) return;

  var worldEl = document.querySelector(".timeline-world");
  if (!worldEl) return;

  // Temporarily suppress the transition
  worldEl.style.transition = "none";

  // Force a reflow so the suppressed transition takes effect immediately
  // eslint-disable-next-line no-unused-expressions
  worldEl.offsetHeight;

  // Restore the transition after the next frame — by then the transform
  // will have been painted, and future zoom operations will animate again.
  requestAnimationFrame(function () {
    if (worldEl) {
      worldEl.style.transition = "";
    }
  });
}
