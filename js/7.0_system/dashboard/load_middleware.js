/* =============================================================================
   THE JESUS WEBSITE — DASHBOARD SESSION MIDDLEWARE
   File:    js/7.0_system/dashboard/load_middleware.js
   Version: 1.0.0
   Trigger: Called by dashboard_orchestrator.js as the first action on page load.
   Main:    verifyAdminSession() — calls GET /api/admin/verify to check the
            HttpOnly JWT cookie. If valid, resolves silently. If invalid or
            expired, redirects the browser to admin.html for re-authentication.
   Output:  Guard pass (dashboard loads) or redirect to login.
   Security: per guide_security.md §3 — session verified once at page load.
             Individual module loads do not re-check the session.
============================================================================= */

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: verifyAdminSession
   Calls the verify endpoint. Redirects to login on failure.
----------------------------------------------------------------------------- */
async function verifyAdminSession() {
    try {
        const response = await fetch("/api/admin/verify", {
            method: "GET",
            credentials: "same-origin",
        });

        if (response.ok) {
            // Session is valid — dashboard can proceed
            return true;
        }

        // Session invalid — redirect to login
        console.warn("[load_middleware] Session invalid — redirecting to login.");
        window.location.href = "/admin/login.html";
        return false;
    } catch (err) {
        // Network error or API unreachable — redirect to login for safety
        console.error("[load_middleware] Session verification failed:", err);
        window.location.href = "/admin/login.html";
        return false;
    }
}
