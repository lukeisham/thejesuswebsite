/**
 * Sidebar active-highlight script.
 *
 * On DOMContentLoaded, matches the current path to a nav item and applies
 * the active class (3px accent left-border + surface-alt background).
 *
 * @module sidebar
 */

const ACTIVE_CLASS = "nav-item--active";
const NAV_ITEM_SELECTOR = ".nav-item, .sidebar a[href]";

/**
 * Initialise sidebar active-state highlighting.
 */
export function initSidebar() {
  const currentPath = window.location.pathname;

  const navItems = document.querySelectorAll(NAV_ITEM_SELECTOR);

  let bestMatch = null;
  let bestLength = 0;

  navItems.forEach((item) => {
    const href = item.getAttribute("href");
    if (!href) return;

    const fullPath = resolvePath(href);

    if (currentPath === fullPath) {
      bestMatch = item;
      bestLength = fullPath.length;
    } else if (
      fullPath !== "/" &&
      currentPath.startsWith(fullPath) &&
      fullPath.length > bestLength
    ) {
      // Parent nav match (e.g. /evidence/ matches /evidence/slug)
      bestMatch = item;
      bestLength = fullPath.length;
    }
  });

  if (bestMatch) {
    bestMatch.classList.add(ACTIVE_CLASS);
  }
}

/**
 * Resolve a nav item's href to an absolute path.
 *
 * @param {string} href - The raw href attribute value.
 * @returns {string} Absolute pathname.
 */
function resolvePath(href) {
  try {
    // Build a full URL to resolve relative paths
    const url = new URL(href, window.location.origin);
    return url.pathname;
  } catch {
    return href;
  }
}

// Auto-init on DOMContentLoaded so pages that import this file get it for free.
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initSidebar);
}
