/**
 * Collapsible filter-panel toggle module.
 *
 * Shows/hides the filter chips container, persists open/closed state in
 * sessionStorage, and keeps aria-expanded in sync. Defaults open on desktop,
 * closed on mobile (checked once at init).
 *
 * @module utils/filter-panel
 */

const STORAGE_KEY = "filter_panel_open";
const MOBILE_BREAKPOINT = 768;

/**
 * Initialise the filter-panel toggle behaviour.
 *
 * Looks for a toggle button with `data-action="filter-toggle"` and a chip
 * container referenced by its `aria-controls` attribute.
 *
 * @param {Object} [options]
 * @param {string} [options.toggleSelector='[data-action="filter-toggle"]']
 * @param {string} [options.panelSelector] - Optional override; defaults to the value of the toggle's `aria-controls`.
 */
export function initFilterPanel({
  toggleSelector = '[data-action="filter-toggle"]',
  panelSelector,
} = {}) {
  const toggle = document.querySelector(toggleSelector);
  if (!toggle) return;

  const panelId = toggle.getAttribute("aria-controls");
  if (!panelId && !panelSelector) return;

  const panel = document.getElementById(panelId);
  if (!panel) return;

  // ── Determine initial state ───────────────────────────────────────────
  let stored = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    stored = raw !== null ? JSON.parse(raw) : null;
  } catch {
    /* ignore */
  }

  const isMobile = window.matchMedia(
    `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
  ).matches;

  let isOpen;
  if (typeof stored === "boolean") {
    isOpen = stored;
  } else {
    // Default: open on desktop, closed on mobile
    isOpen = !isMobile;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(isOpen));
    } catch {
      /* ignore */
    }
  }

  applyState(toggle, panel, isOpen);

  // ── Toggle on click ───────────────────────────────────────────────────
  toggle.addEventListener("click", () => {
    const current = toggle.getAttribute("aria-expanded") === "true";
    const next = !current;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    applyState(toggle, panel, next);
  });
}

/**
 * Sync DOM attributes and visibility to `isOpen`.
 *
 * @param {HTMLElement} toggle
 * @param {HTMLElement} panel
 * @param {boolean} isOpen
 */
function applyState(toggle, panel, isOpen) {
  toggle.setAttribute("aria-expanded", String(isOpen));
  panel.hidden = !isOpen;
}
