/**
 * Timeline navigation module.
 *
 * `jumpToEra(eraKey)` is called by the era filter chips in
 * timeline-interactions.js, after the chip has already filtered the dots, so a
 * failed jump never undoes the filter. On desktop it moves the zoomed world
 * through timeline-zoom.js `setTransform`, with the pan from
 * timeline-transform.js. Below the mobile breakpoint the world has no
 * transform (vertical layout), so it scrolls the first dot of the era into
 * view instead. The breakpoint must equal `MOBILE_QUERY` in timeline-zoom.js
 * and timeline-render.js, or a chip drives the wrong mode.
 *
 * @module timeline/timeline-nav
 */

import { computePanForEra, getEraWorldBounds } from "./timeline-transform.js";
import { setTransform } from "./timeline-zoom.js";

/** Same query as timeline-zoom.js, timeline-render.js and the 767px rules in timeline-responsive.css. */
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
 * @returns {void}
 */
export function jumpToEra(eraKey) {
  if (!eraKey) {
    console.warn("timeline-nav: jumpToEra called without an era key");
    return;
  }

  // ── Mobile: scroll first dot into view ──────────────────────────────────
  if (isMobile()) {
    const selector = eraKey === "all" || eraKey === "All"
      ? ".timeline-dot"
      : `.timeline-dot[data-era="${CSS.escape(eraKey)}"]`;

    const firstDot = document.querySelector(selector);
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
    setTransform(0, 0, 1.0);
    handleReducedMotion();
    return;
  }

  const bounds = getEraWorldBounds(eraKey);
  if (!bounds) {
    console.warn("timeline-nav: unrecognised or empty era, bailing", {
      eraKey,
    });
    return;
  }

  const viewportWidth = window.innerWidth;
  const pan = computePanForEra(eraKey, viewportWidth, 1.0);
  if (!pan) {
    console.warn("timeline-nav: could not compute pan for era", { eraKey });
    return;
  }

  setTransform(pan.panX, pan.panY, 1.0);
  handleReducedMotion();
}

/**
 * Under reduced motion, make the transform that `setTransform` just applied
 * take effect instantly, by overriding the CSS transition on .timeline-world
 * for one frame. The override is cleared on the next frame so later zoom
 * button presses still animate.
 */
function handleReducedMotion() {
  if (!prefersReducedMotion()) return;

  const worldEl = document.querySelector(".timeline-world");
  if (!worldEl) return;

  worldEl.style.transition = "none";

  // Reading layout forces a reflow, so the "none" applies before it is cleared.
  void worldEl.offsetHeight;

  requestAnimationFrame(() => {
    worldEl.style.transition = "";
  });
}
