// =============================================================================
//
//   THE JESUS WEBSITE — UNIVERSAL HEADER (SEO Metadata Injector)
//   File:    js/1.0_foundation/frontend/header.js
//   Version: 1.0.0
//   Purpose: Injects invisible SEO metadata tags into <head> on every page.
//            Sets <title>, <meta name="description">, <meta name="robots">,
//            <link rel="canonical">, and agent-specific Open Graph tags.
//   Source:  guide_appearance.md §1.8, module_sitemap.md §1.0
//
//   TRIGGER:  Call injectPageMetadata(config) before the page renders.
//             Typically the first script loaded in each HTML page's <head>.
//   FUNCTION: Builds and inserts <meta> and <link> elements into <head>.
//   OUTPUT:   Populated <head> tag with full SEO metadata. No visible output.
//
// =============================================================================


/**
 * injectPageMetadata
 *
 * Injects SEO and Open Graph <meta> tags into the document <head>.
 * Each HTML page calls this with a page-specific config object.
 *
 * @param {Object} config
 * @param {string} config.title        - Page title (shown in browser tab)
 * @param {string} config.description  - Meta description (max ~160 chars)
 * @param {string} [config.canonical]  - Canonical URL (defaults to window.location.href)
 * @param {string} [config.robots]     - Robots directive (default: "index, follow")
 * @param {string} [config.ogImage]    - Open Graph image URL for social sharing
 * @param {string} [config.ogType]     - Open Graph type (default: "website")
 */
function injectPageMetadata(config) {

    // --- 1. Resolve defaults ---------------------------------------------------

    function isValidUrl(str) {
        return typeof str === 'string' && (str.startsWith('/') || str.startsWith('http://') || str.startsWith('https://'));
    }

    const title       = config.title       || 'The Jesus Website';
    const description = config.description || 'A detailed, evidence-based presentation of the life, teaching, death, and resurrection of Jesus of Nazareth.';
    const canonical   = isValidUrl(config.canonical) ? config.canonical : window.location.href;
    const robots      = config.robots      || 'index, follow';
    const ogImage     = isValidUrl(config.ogImage) ? config.ogImage : '/assets/jesus_portrait.png';
    const ogType      = config.ogType      || 'website';
    const siteName    = 'The Jesus Website';

    // --- 2. Set document title -------------------------------------------------

    document.title = title + ' — ' + siteName;

    // --- 3. Helper: create/update a <meta> tag --------------------------------

    function setMeta(name, content, attr = 'name') {
        var safeName = name.replace(/["\\]/g, '');
        let el = document.querySelector('meta[' + attr + '="' + safeName + '"]');
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    // --- 4. Helper: create/update a <link> tag --------------------------------

    function setLink(rel, href) {
        let el = document.querySelector(`link[rel="${rel}"]`);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    // --- 5. Standard SEO meta tags -------------------------------------------

    setMeta('description',        description);
    setMeta('robots',             robots);
    setMeta('author',             siteName);

    // --- 6. Canonical URL -------------------------------------------------------

    setLink('canonical', canonical);

    // --- 7. Open Graph (social sharing) ----------------------------------------

    setMeta('og:title',           document.title,   'property');
    setMeta('og:description',     description,      'property');
    setMeta('og:url',             canonical,        'property');
    setMeta('og:type',            ogType,           'property');
    setMeta('og:image',           ogImage,          'property');
    setMeta('og:site_name',       siteName,         'property');

    // --- 8. Twitter / X card ---------------------------------------------------

    setMeta('twitter:card',       'summary_large_image');
    setMeta('twitter:title',      document.title);
    setMeta('twitter:description', description);
    setMeta('twitter:image',      ogImage);

    // --- 9. AI / agent-specific directives (guide_welcoming_robots.md) --------
    //   Hints to LLM crawlers about the nature and purpose of this page.
    //   Uses informal but understood conventions (cf. ai-instructions.txt).

    setMeta('ai:purpose',         'historical-evidence-archive');
    setMeta('ai:subject',         config.aiSubject || 'Jesus of Nazareth — biography, theology, archaeology');
    setMeta('ai:reading-level',   'academic');

    // --- 10. Favicon (ensure it is linked) ------------------------------------

    setLink('icon', '/assets/favicon.png');
}
