/**
 * Sidebar hamburger menu: toggle, focus trap, backdrop/ESC close.
 *
 * @module sidebar_hamburger
 */

const SIDEBAR_ID = 'sidebar';
const TOGGLE_ID = 'sidebar-toggle';
const OPEN_CLASS = 'sidebar--open';
const BACKDROP_CLASS = 'sidebar-backdrop';

let isOpen = false;
let backdrop = null;

/**
 * Initialise the hamburger toggle for the off-canvas sidebar.
 *
 * Default state: closed on index.html, open elsewhere.
 */
export function initHamburger() {
  const sidebar = document.getElementById(SIDEBAR_ID);
  const toggle = document.getElementById(TOGGLE_ID);

  if (!sidebar || !toggle) return;

  const isHome = window.location.pathname === '/' ||
    window.location.pathname === '/index.html';

  // Set initial state
  if (isHome) {
    closeSidebar(sidebar, toggle);
  } else {
    openSidebar(sidebar, toggle);
  }

  toggle.addEventListener('click', () => {
    if (isOpen) {
      closeSidebar(sidebar, toggle);
    } else {
      openSidebar(sidebar, toggle);
    }
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
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
  toggle.setAttribute('aria-expanded', 'true');
  isOpen = true;
  showBackdrop(sidebar, toggle);
  trapFocus(sidebar);
}

/**
 * Close the sidebar.
 */
function closeSidebar(sidebar, toggle) {
  sidebar.classList.remove(OPEN_CLASS);
  toggle.setAttribute('aria-expanded', 'false');
  isOpen = false;
  removeBackdrop();
}

/**
 * Show a clickable backdrop behind the sidebar that closes it.
 */
function showBackdrop(sidebar, toggle) {
  if (backdrop) return;

  backdrop = document.createElement('div');
  backdrop.className = BACKDROP_CLASS;
  backdrop.addEventListener('click', () => closeSidebar(sidebar, toggle));
  document.body.appendChild(backdrop);
}

function removeBackdrop() {
  if (backdrop) {
    backdrop.remove();
    backdrop = null;
  }
}

/**
 * Trap focus within the sidebar while it's open.
 */
function trapFocus(sidebar) {
  const focusable = sidebar.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  sidebar.addEventListener('keydown', handler);

  // Focus the first element
  first.focus();

  // Clean up when closed
  const observer = new MutationObserver(() => {
    if (!isOpen) {
      sidebar.removeEventListener('keydown', handler);
      observer.disconnect();
    }
  });

  observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
}
