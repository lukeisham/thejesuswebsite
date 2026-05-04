/* =============================================================================
   THE JESUS WEBSITE — DASHBOARD ORCHESTRATOR
   File:    js/7.0_system/dashboard/dashboard_orchestrator.js
   Version: 1.0.0
   Trigger: DOMContentLoaded — runs after all dashboard scripts have loaded.
   Main:    initDashboard() — performs session check via verifyAdminSession(),
            then wires up the universal header, dashboard cards, and error
            footer. Loads the default module (records-all) into the canvas.
   Output:  Fully initialised dashboard shell: header, card grid, error footer,
            and the default module loaded in the Providence canvas.
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: initDashboard
   Session-guarded dashboard initialisation sequence.
----------------------------------------------------------------------------- */
async function initDashboard() {
    /* -------------------------------------------------------------------------
       STEP 1: Session Guard
       Verify the JWT cookie is valid before rendering anything.
       If invalid, verifyAdminSession() redirects to admin.html — execution stops.
    ------------------------------------------------------------------------- */
    const sessionValid = await verifyAdminSession();
    if (!sessionValid) {
        // Guard redirected — do not continue initialisation
        return;
    }

    /* -------------------------------------------------------------------------
       STEP 2: Inject Universal Header
       Renders branding, Return to Frontend, Dashboard, and Logout buttons.
    ------------------------------------------------------------------------- */
    injectUniversalHeader();

    /* -------------------------------------------------------------------------
       STEP 3: Render Dashboard Cards
       10 module navigation cards in a 3×3 + 1 centered grid.
    ------------------------------------------------------------------------- */
    renderDashboardCards();

    /* -------------------------------------------------------------------------
       STEP 4: Initialise Error Footer
       Sets the default "System running normally" status message.
    ------------------------------------------------------------------------- */
    injectErrorFooter();

    /* -------------------------------------------------------------------------
       STEP 5: Load Default Module
       The dashboard landing page shows the card grid by default.
       No module is auto-loaded — the user clicks a card to begin.
       The canvas remains hidden behind the card grid.
    ------------------------------------------------------------------------- */

    // Signal readiness
    console.log("[dashboard_orchestrator] Dashboard shell initialised successfully.");
    if (typeof window.surfaceError === "function") {
        window.surfaceError("Dashboard ready");
    }
}

/* -----------------------------------------------------------------------------
   INITIALISATION: Run on DOMContentLoaded
----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", initDashboard);
