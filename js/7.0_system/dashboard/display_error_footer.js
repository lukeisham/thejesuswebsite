/* =============================================================================
   THE JESUS WEBSITE — ERROR FOOTER DISPLAY
   File:    js/7.0_system/dashboard/display_error_footer.js
   Version: 1.0.0
   Trigger: Called by dashboard_orchestrator.js on initial page load.
   Main:    injectErrorFooter() — ensures the #admin-error-footer DOM element
            exists and is ready to receive messages from window.surfaceError().
            Sets an initial "System running normally" status.
   Output:  Ready-to-use error footer element. Messages are written into it
            by the shared error_handler.js via window.surfaceError().
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: injectErrorFooter
   Initialises the error footer with a default status message.
----------------------------------------------------------------------------- */
function injectErrorFooter() {
    const footerEl = document.getElementById("admin-error-footer");
    if (!footerEl) {
        console.warn("[display_error_footer] #admin-error-footer not found — footer injection skipped.");
        return;
    }

    // Set default status message
    footerEl.innerHTML = `<span class="error-footer__message">System running normally</span>`;

    // Signal readiness via surfaceError so any queued messages flush through
    if (typeof window.surfaceError === "function") {
        // No-op call to trigger DOM-ready flush path if handler was already loaded
        window.surfaceError("Dashboard shell initialised");
    }
}
