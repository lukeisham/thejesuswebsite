// =============================================================================
//   THE JESUS WEBSITE — RETURN TO FRONTEND MIDDLEWARE
//   File:    js/7.0_system/dashboard/return_to_site.js
//   Version: 1.0.0
//   Purpose: Verifies the admin session is still valid, then redirects to the
//            public frontend. Unlike logout (which destroys the session), this
//            preserves the cookie so the user can return to the dashboard later
//            without re-authenticating.
// =============================================================================

// Trigger: "Return to Frontend" button click in the dashboard header
// Function: Calls /api/admin/verify to confirm the session cookie is still
//           active, then redirects to the public root URL
// Output: window.location.href redirect to "/" on success; on failure falls
//         back to admin.html (session was invalid/expired)

window.returnToFrontend = async function () {
    try {
        var response = await fetch("/api/admin/verify");

        if (response.ok) {
            var data = await response.json();
            if (data.authenticated === true) {
                // Session is valid — redirect to public frontend, cookie preserved
                window.location.href = "/";
                return;
            }
        }

        // Session invalid or expired — fall back to login page
        window.location.href = "/admin/frontend/admin.html";
    } catch (error) {
        console.error("Return to frontend verification failed:", error);
        // On network error, still try to go to the frontend
        window.location.href = "/";
    }
};
