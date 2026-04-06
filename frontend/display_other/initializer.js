// =============================================================================
//
//   THE JESUS WEBSITE — PAGE INITIALIZER
//   File:    frontend/display_other/initializer.js
//   Version: 1.0.0
//   Purpose: Central bootstrapper to initialize page-wide UI components
//            and SEO metadata based on data-attributes in the body.
//            Allows removing all inline script triggers from HTML files.
//
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    
    // 1. Initialize SEO Metadata
    if (typeof injectPageMetadata === 'function') {
        const title = body.getAttribute('data-page-title') || 'Home';
        const description = body.getAttribute('data-page-description') || '';
        const canonical = body.getAttribute('data-page-canonical') || window.location.href;
        const ogType = body.getAttribute('data-og-type') || 'website';
        const ogImage = body.getAttribute('data-og-image') || '/assets/jesus_portrait.png';
        
        injectPageMetadata({
            title: title,
            description: description,
            canonical: canonical,
            ogType: ogType,
            ogImage: ogImage
        });
    }

    // 2. Initialize Sidebar
    const sidebarTargetId = body.getAttribute('data-sidebar-target') || 'site-main';
    const sidebarActiveNav = body.getAttribute('data-sidebar-active-nav');
    if (sidebarActiveNav && typeof injectSidebar === 'function') {
        injectSidebar(sidebarTargetId, sidebarActiveNav);
    }

    // 3. Initialize Search Header
    const searchHeaderTargetId = body.getAttribute('data-search-header-target') || 'site-sidebar';
    const searchHeaderActiveNav = body.getAttribute('data-search-header-active-nav');
    if (searchHeaderActiveNav && typeof injectSearchHeader === 'function') {
        injectSearchHeader(searchHeaderTargetId, searchHeaderActiveNav);
    }

    // 4. Initialize Footer
    const footerTargetId = body.getAttribute('data-footer-target') || 'page-shell';
    if (footerTargetId && typeof injectFooter === 'function') {
        injectFooter(footerTargetId);
    }
});
