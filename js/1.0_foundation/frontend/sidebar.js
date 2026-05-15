// =============================================================================
//
//   THE JESUS WEBSITE — UNIVERSAL STICKY SIDEBAR
//   File:    js/1.0_foundation/frontend/sidebar.js
//   Version: 1.1.0
//   Purpose: Injects the Universal Sticky Sidebar into all interior pages.
//            Provides contextual navigation, section links, and table-of-
//            contents support. Also handles the mobile off-canvas toggle.
//   Source:  guide_appearance.md §1.5, guide_style.md §6.1
//
//   TRIGGER:  Call injectSidebar(anchorId, activePage) after DOM load.
//             anchorId is the id of the element to insert the sidebar BEFORE.
//   FUNCTION: Builds a <aside class="site-sidebar"> with full nav list and
//             a mobile backdrop overlay, then wires up the toggle button.
//   OUTPUT:   Sidebar rendered as a sticky left panel (fixed off-canvas on mobile).
//
// =============================================================================

/**
 * injectSidebar
 *
 * Builds and inserts the Universal Sticky Sidebar into the page.
 *
 * @param {string} anchorId        - id of the element to insert the sidebar BEFORE
 *                                   (typically the <main> element)
 * @param {string} [activePage]    - Slug of the current section for .is-active
 *                                   e.g. 'records', 'evidence', 'timeline' etc.
 * @param {Array}  [tocItems]      - Optional Table of Contents items for
 *                                   the current page: [{ label, href }]
 */
function injectSidebar(anchorId, activePage, tocItems) {
  // --- 0. Re-injection guard — remove existing sidebar + listeners ----------
  var existingSidebar = document.getElementById('site-sidebar');
  if (existingSidebar) existingSidebar.remove();
  var existingBackdrop = document.getElementById('sidebar-backdrop');
  if (existingBackdrop) existingBackdrop.remove();
  document.removeEventListener('toggleSidebar', _sidebarToggleHandler);
  document.removeEventListener('keydown', _sidebarEscapeHandler);

  // --- 1. Navigation link definitions --------------------------------------
  var navLinks = [
    { label: "Records", href: "/records", id: "records" },
    { label: "Evidence", href: "/evidence", id: "evidence" },
    { label: "Timeline", href: "/timeline", id: "timeline" },
    { label: "Maps", href: "/maps", id: "maps" },
    { label: "Context", href: "/context", id: "context" },
    { label: "Debate & Discussion", href: "/debate", id: "debate" },
    { label: "Resource Lists", href: "/resources", id: "resources" },
    { label: "News", href: "/news_and_blog.html", id: "news" },
    { label: "About", href: "/about", id: "about" },
  ];

  // --- 2. Build main nav HTML ----------------------------------------------
  var navItemsHTML = navLinks
    .map(function(link) {
      var isActive = link.id === activePage ? "is-active" : "";
      var ariaCurrent = link.id === activePage ? 'aria-current="page"' : "";
      return '<li><a href="' + link.href + '" id="sidebar-nav-' + link.id + '" class="' + isActive + '" ' + ariaCurrent + '>' + link.label + '</a></li>';
    })
    .join("");

  // --- 3. Build Table of Contents safely using createElement ----------------
  var tocHTML = "";

  if (tocItems && tocItems.length > 0) {
    var tocList = document.createElement('ul');
    tocList.className = 'site-sidebar__nav';
    tocList.id = 'sidebar-toc';
    tocList.setAttribute('aria-label', 'Table of Contents');

    tocItems.forEach(function(item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = item.href;
      a.className = 'sidebar-toc-link';
      a.textContent = item.label;
      li.appendChild(a);
      tocList.appendChild(li);
    });

    var tocContainer = document.createElement('div');
    tocContainer.innerHTML = '<hr class="site-sidebar__divider" aria-hidden="true" /><p class="site-sidebar__nav-category">On this page</p>';
    tocContainer.appendChild(tocList);
    tocHTML = tocContainer.innerHTML;
  }

  // --- 4. Compose full sidebar HTML ----------------------------------------
  var sidebarHTML = '\
<aside class="site-sidebar" id="site-sidebar" aria-label="Site navigation">\
    <a href="/index.html" class="site-sidebar__brand" id="sidebar-brand" aria-label="The Jesus Website — Home">\
        The Jesus Website\
    </a>\
    <nav aria-label="Main navigation">\
        <ul class="site-sidebar__nav" id="sidebar-main-nav">\
            ' + navItemsHTML + '\
        </ul>\
    </nav>\
    ' + tocHTML + '\
    <div class="site-sidebar__footer">\
        <hr class="site-sidebar__divider" aria-hidden="true" />\
        <a href="/admin/frontend/login.html" id="sidebar-admin-link" class="site-sidebar__admin-link">\
            Admin Portal\
        </a>\
    </div>\
</aside>\
<div class="sidebar-backdrop" id="sidebar-backdrop" aria-hidden="true"></div>';

  // --- 5. Insert before the anchor element ---------------------------------
  var anchorEl = document.getElementById(anchorId);

  if (!anchorEl) {
    console.warn("[sidebar.js] Anchor element not found: #" + anchorId);
    return;
  }

  anchorEl.insertAdjacentHTML("beforebegin", sidebarHTML);

  // --- 6. Wire up mobile off-canvas toggle ---------------------------------
  var sidebar = document.getElementById("site-sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");
  var triggerElement = null;

  function openSidebar() {
    triggerElement = document.activeElement;
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-visible");
    sidebar.setAttribute("aria-expanded", "true");
    var firstLink = sidebar.querySelector('.site-sidebar__nav a');
    if (firstLink) firstLink.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    sidebar.setAttribute("aria-expanded", "false");
    if (triggerElement && triggerElement.focus) triggerElement.focus();
  }

  function toggleSidebar() {
    sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
  }

  _sidebarToggleHandler = toggleSidebar;
  _sidebarEscapeHandler = function(event) {
    if (event.key === "Escape") closeSidebar();
  };

  document.addEventListener("toggleSidebar", _sidebarToggleHandler);
  backdrop.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", _sidebarEscapeHandler);
}

var _sidebarToggleHandler = function() {};
var _sidebarEscapeHandler = function() {};
