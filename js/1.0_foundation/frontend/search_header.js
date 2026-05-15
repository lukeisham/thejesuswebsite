// =============================================================================
//
//   THE JESUS WEBSITE — UNIVERSAL SEARCH HEADER (Visible Top Bar)
//   File:    js/1.0_foundation/frontend/search_header.js
//   Version: 1.2.0
//   Purpose: Injects the visible top search bar into interior pages that
//            require global search. Not used on index.html (root landing page).
//            Displays only its search input — no logo, no nav links.
//   Source:  guide_appearance.md §1.8, §1.8.2, guide_style.md §6.3
//
//   TRIGGER:  Call injectSearchHeader(anchorId) after DOM load.
//             Pass the id of the element to inject before (typically 'site-sidebar').
//   FUNCTION: Builds the <header> HTML with only the Search input, then inserts
//             it into the .page-shell as the "header" grid area.
//   On Enter → redirects to /records?search=<term>
//             On Escape → clears the input field (no navigation).
//   OUTPUT:   A <header class="site-header"> rendered at the top of the page.
//
// =============================================================================

/**
 * injectSearchHeader
 *
 * Builds and inserts the visible top search bar into the page.
 * Renders only the search input — no site logo, no navigation links.
 *
 * @param {string} anchorId - id of the element to insert the header BEFORE
 *                            (typically the sidebar or main element)
 */
function injectSearchHeader(anchorId) {
  // --- 1. Compose header HTML (search bar only) ----------------------------

  const headerHTML = `
<header class="site-header" id="site-header" role="banner">

    <div class="site-header__search" role="search">
        <input
            type="search"
            id="global-search-input"
            class="site-header__search-input"
            placeholder="Search records, people, events…"
            aria-label="Search the Jesus Website"
            autocomplete="off"
        />
    </div>

</header>
`;

  // --- 2. Re-injection guard — remove existing search header ----------------

  var existingHeader = document.getElementById('site-header');
  if (existingHeader) existingHeader.remove();

  // --- 3. Insert before the anchor element --------------------------------

  const anchorEl = document.getElementById(anchorId);

  if (!anchorEl) {
    console.warn("[search_header.js] Anchor element not found: #" + anchorId);
    return;
  }

  anchorEl.insertAdjacentHTML("beforebegin", headerHTML);

  // --- 4. Wire up search input events -------------------------------------

  const searchInput = document.getElementById("global-search-input");

  searchInput.addEventListener("keydown", function handleSearchKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = event.target.value.trim();
      if (query.length === 0) return;
      const encoded = encodeURIComponent(query);
      window.location.href = "/records?search=" + encoded;
    } else if (event.key === "Escape") {
      searchInput.value = "";
    }
  });
}
