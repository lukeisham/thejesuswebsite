// =============================================================================
//
//   THE JESUS WEBSITE — PAGE INITIALIZER
//   File:    js/1.0_foundation/frontend/initializer.js
//   Version: 1.1.0
//   Purpose: Central bootstrapper to initialize page-wide UI components
//            and SEO metadata based on data-attributes in the body.
//            Allows removing all inline script triggers from HTML files.
//
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;

    // 1. Initialize SEO Metadata
    try {
        if (typeof injectPageMetadata === 'function') {
            const title = body.getAttribute('data-page-title') || 'Home';
            const description = body.getAttribute('data-page-description') || '';
            const canonical = body.getAttribute('data-page-canonical') || window.location.href;
            const ogType = body.getAttribute('data-og-type') || 'website';
            const ogImage = body.getAttribute('data-og-image') || '/assets/jesus_portrait.png';
            const aiSubject = body.getAttribute('data-ai-subject') || '';

            injectPageMetadata({
                title: title,
                description: description,
                canonical: canonical,
                ogType: ogType,
                ogImage: ogImage,
                aiSubject: aiSubject
            });
        }
    } catch (err) {
        console.error('[initializer.js] injectPageMetadata failed:', err);
    }

    // 2. Initialize Sidebar
    try {
        const sidebarTargetId = body.getAttribute('data-sidebar-target') || 'site-main';
        const sidebarActiveNav = body.getAttribute('data-sidebar-active-nav');
        if (sidebarActiveNav && typeof injectSidebar === 'function') {
            injectSidebar(sidebarTargetId, sidebarActiveNav);
        }
    } catch (err) {
        console.error('[initializer.js] injectSidebar failed:', err);
    }

    // 3. Initialize Search Header
    try {
        const searchHeaderTargetId = body.getAttribute('data-search-header-target') || 'site-sidebar';
        const searchHeaderActiveNav = body.getAttribute('data-search-header-active-nav');
        if (searchHeaderActiveNav && typeof injectSearchHeader === 'function') {
            injectSearchHeader(searchHeaderTargetId, searchHeaderActiveNav);
        }
    } catch (err) {
        console.error('[initializer.js] injectSearchHeader failed:', err);
    }

    // 4. Initialize Footer
    try {
        const footerTargetId = body.getAttribute('data-footer-target') || 'page-shell';
        if (footerTargetId && typeof injectFooter === 'function') {
            injectFooter(footerTargetId);
        }
    } catch (err) {
        console.error('[initializer.js] injectFooter failed:', err);
    }
});
