// =============================================================================
//
//   THE JESUS WEBSITE — UNIVERSAL FOOTER
//   File:    frontend/display_other/footer.js
//   Version: 1.1.0
//   Purpose: Injects the Universal Footer into every readable page.
//            Provides Print, Copy URL, and Copy Contents action buttons
//            and a legal/copyright strip.
//   Source:  guide_appearance.md §1.6, guide_style.md §6.2
//
//   TRIGGER:  Call injectFooter(anchorId) at the end of the page body.
//             anchorId is the id of the element to insert the footer AFTER,
//             or it inserts at the end of document.body if omitted.
//   FUNCTION: Builds <footer class="site-footer"> HTML with two rows:
//             - Row 1: action buttons (Print, Copy URL, Copy Contents)
//             - Row 2: copyright, logo mark, licence link
//             Then wires up button click handlers.
//   OUTPUT:   Footer rendered as the bottom bar of every page.
//
// =============================================================================


/**
 * injectFooter
 *
 * Builds and inserts the Universal Footer into the page.
 *
 * @param {string} [anchorId] - Optional id of the element to insert the footer AFTER.
 *                              If omitted, the footer is appended to document.body.
 */
function injectFooter(anchorId) {

    const currentYear = new Date().getFullYear();

    // --- 1. Compose footer HTML -----------------------------------------------

    const footerHTML = `
<footer class="site-footer" id="site-footer" role="contentinfo">

    <!-- Row: Legal / copyright (Left) -->
    <div class="site-footer__legal" id="footer-legal">

        <span class="site-footer__legal-text" id="footer-copyright">
            © ${currentYear} The Jesus Website
        </span>

        <span class="site-footer__mark" id="footer-mark" aria-hidden="true">
            <img src="/assets/favicon.png" alt="Branding" width="24" height="24" style="vertical-align: middle; filter: grayscale(1) contrast(1.2);">
        </span>

        <a
            href="https://creativecommons.org/licenses/by-nc/4.0/"
            class="site-footer__licence-link"
            id="footer-licence"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Creative Commons Attribution Non-Commercial 4.0 licence"
        >
            CC BY-NC 4.0
        </a>

    </div>

    <!-- Row: Action buttons (Right) -->
    <div class="site-footer__actions" id="footer-actions">
        <button class="footer-btn" id="footer-btn-print" type="button" aria-label="Print this page">
            <span class="footer-btn__icon" aria-hidden="true">⎙</span>
            Print contents
        </button>

        <button class="footer-btn" id="footer-btn-copy-url" type="button" aria-label="Copy page URL">
            <span class="footer-btn__icon" aria-hidden="true">⧉</span>
            Copy URL
        </button>

        <button class="footer-btn" id="footer-btn-copy-contents" type="button" aria-label="Copy page text contents">
            <span class="footer-btn__icon" aria-hidden="true">⊕</span>
            Copy contents
        </button>
    </div>


</footer>
`;

    // --- 2. Insert into the DOM -----------------------------------------------

    if (anchorId) {
        const anchorEl = document.getElementById(anchorId);
        if (anchorEl) {
            anchorEl.insertAdjacentHTML('afterend', footerHTML);
        } else {
            console.warn('[footer.js] Anchor element not found: #' + anchorId);
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    }

    // --- 3. Wire up Print button ---------------------------------------------

    document.getElementById('footer-btn-print').addEventListener('click', function handlePrint() {
        window.print();
    });

    // --- 4. Wire up Copy URL button ------------------------------------------

    document.getElementById('footer-btn-copy-url').addEventListener('click', function handleCopyUrl() {
        const btn = document.getElementById('footer-btn-copy-url');
        navigator.clipboard.writeText(window.location.href)
            .then(function onCopyUrlSuccess() {
                flashSuccess(btn, 'Copied!');
            })
            .catch(function onCopyUrlError() {
                console.warn('[footer.js] Could not copy URL to clipboard.');
            });
    });

    // --- 5. Wire up Copy Contents button ------------------------------------
    //   Copies the text content of <main> (excludes sidebar and footer).

    document.getElementById('footer-btn-copy-contents').addEventListener('click', function handleCopyContents() {
        const btn       = document.getElementById('footer-btn-copy-contents');
        const mainEl    = document.getElementById('site-main') || document.querySelector('main');
        const textToCopy = mainEl ? mainEl.innerText.trim() : document.body.innerText.trim();

        navigator.clipboard.writeText(textToCopy)
            .then(function onCopyContentsSuccess() {
                flashSuccess(btn, 'Copied!');
            })
            .catch(function onCopyContentsError() {
                console.warn('[footer.js] Could not copy contents to clipboard.');
            });
    });

    // --- 6. Helper: brief success flash state on a button -------------------

    function flashSuccess(btnElement, label) {
        const originalText = btnElement.textContent.trim();
        btnElement.classList.add('is-success');
        btnElement.textContent = label;

        setTimeout(function resetButton() {
            btnElement.classList.remove('is-success');
            btnElement.textContent = originalText;
        }, 1800);
    }
}
