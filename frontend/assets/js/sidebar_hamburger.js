/**
 * Sidebar hamburger menu: toggle and ESC close.
 *
 * On mobile the sidebar stacks in document flow (no overlay, no backdrop).
 * On desktop the sidebar slides in from the left and content shifts right.
 *
 * @module sidebar_hamburger
 */

const SIDEBAR_ID = "sidebar";
const TOGGLE_ID = "sidebar-toggle";
const OPEN_CLASS = "sidebar--open";

let isOpen = false;

/**
 * Whether the viewport is mobile-sized.
 */
function isMobile() {
  return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Initialise the hamburger toggle for the off-canvas sidebar.
 *
 * Default state: closed on mobile (off-canvas overlay), open elsewhere —
 * including the home page.
 */
export function initHamburger() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  const toggle = document.getElementById(TOGGLE_ID);

  if (!sidebar || !toggle) return;

  // Set initial state
  if (isMobile()) {
    closeSidebar(sidebar, toggle);
  } else {
    openSidebar(sidebar, toggle);
  }

  toggle.addEventListener("click", () => {
    if (isOpen) {
      closeSidebar(sidebar, toggle);
    } else {
      openSidebar(sidebar, toggle);
    }
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeSidebar(sidebar, toggle);
      toggle.focus();
    }
  });
}

/**
 * Open the sidebar.
 */
function openSidebar(sidebar, toggle) {
  sidebar.classList.add(OPEN_CLASS);
  toggle.setAttribute("aria-expanded", "true");
  isOpen = true;
  // No backdrop or focus trap — the sidebar stacks in flow on mobile
  // and content shifts aside on desktop; neither mode overlays content.
}

/**
 * Close the sidebar.
 */
function closeSidebar(sidebar, toggle) {
  sidebar.classList.remove(OPEN_CLASS);
  toggle.setAttribute("aria-expanded", "false");
  isOpen = false;
}
