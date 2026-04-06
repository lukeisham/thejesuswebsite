// =============================================================================
//
//   THE JESUS WEBSITE — UNIVERSAL SEARCH HEADER (Visible Top Bar)
//   File:    frontend/display_other/search_header.js
//   Version: 1.0.0
//   Purpose: Injects the visible top navigation bar (Logo + Search Bar + Nav
//            links) into interior pages that require broad navigation and
//            global search. Not used on index.html (the root landing page).
//   Source:  guide_appearance.md §1.8, guide_style.md §6.3
//
//   TRIGGER:  Call injectSearchHeader(anchorId, activePage) after DOM load.
//             Pass the id of the element to inject before (typically 'site-sidebar').
//   FUNCTION: Builds the <header> HTML with Logo, Search input, and Nav links
//             then inserts it into the .page-shell as the "header" grid area.
//   OUTPUT:   A <header class="site-header"> rendered at the top of the page.
//
// =============================================================================


/**
 * injectSearchHeader
 *
 * Builds and inserts the visible top navigation bar into the page.
 *
 * @param {string} anchorId    - id of the element to insert the header BEFORE
 *                               (typically the sidebar or main element)
 * @param {string} activePage  - Slug of the current section for aria-current
 *                               e.g. 'records', 'context', 'debate', 'about'
 */
function injectSearchHeader(anchorId, activePage) {

    // --- 1. Navigation link definitions --------------------------------------
    //   Each entry: { label, href, id }

    const navLinks = [
        { label: 'Records',  href: '/frontend/pages/records.html',    id: 'records'  },
        { label: 'Context',  href: '/frontend/pages/context.html',      id: 'context'  },
        { label: 'Debate',   href: '/frontend/pages/debate.html',       id: 'debate'   },
        { label: 'About',    href: '/frontend/pages/about.html',        id: 'about'    },
    ];

    // --- 2. Build nav <li> items --------------------------------------------

    const navItemsHTML = navLinks
        .map(link => {
            const isCurrent = (link.id === activePage) ? 'aria-current="page"' : '';
            return `<li><a href="${link.href}" id="search-nav-${link.id}" ${isCurrent}>${link.label}</a></li>`;
        })
        .join('');

    // --- 3. Compose full header HTML ----------------------------------------

    const headerHTML = `
<header class="site-header" id="site-header" role="banner">

    <a href="/index.html" class="site-header__logo" id="site-header-logo" aria-label="The Jesus Website — Home">
        The Jesus Website
    </a>

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

    <nav class="site-header__nav" id="site-header-nav" aria-label="Primary navigation">
        <ul>${navItemsHTML}</ul>
    </nav>

</header>
`;

    // --- 4. Insert before the anchor element --------------------------------

    const anchorEl = document.getElementById(anchorId);

    if (!anchorEl) {
        console.warn('[search_header.js] Anchor element not found: #' + anchorId);
        return;
    }

    anchorEl.insertAdjacentHTML('beforebegin', headerHTML);

    // --- 5. Wire up search input event --------------------------------------
    //   Dispatches a custom 'globalSearch' event on Enter.
    //   Listening components (list_view.js etc.) handle the actual filtering.

    const searchInput = document.getElementById('global-search-input');

    searchInput.addEventListener('keydown', function handleSearchKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const query = event.target.value.trim();
            if (query.length === 0) return;

            document.dispatchEvent(new CustomEvent('globalSearch', {
                detail: { query: query },
                bubbles: true,
            }));
        }
    });

    // Clear search and reset on Escape
    searchInput.addEventListener('keydown', function handleSearchEscape(event) {
        if (event.key === 'Escape') {
            searchInput.value = '';
            document.dispatchEvent(new CustomEvent('globalSearch', {
                detail: { query: '' },
                bubbles: true,
            }));
        }
    });
}
