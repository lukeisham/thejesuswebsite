// =============================================================================
//   THE JESUS WEBSITE — DASHBOARD AUTH PAGE GUARD
//   File:    js/7.0_system/dashboard/dashboard_auth.js
//   Version: 1.0.0
//   Purpose: Lightweight page guard — verifies the admin session cookie on
//            dashboard.html load and redirects to admin.html if invalid.
// =============================================================================

// Trigger: DOMContentLoaded on dashboard.html
// Function: Calls window.verifyAdminSession() from load_middleware.js and
//           redirects to admin.html if the session is not valid
// Output: No-op if authenticated; window.location.href redirect if not

document.addEventListener("DOMContentLoaded", function () {
    window.verifyAdminSession().then(function (isValid) {
        if (!isValid) {
            window.location.href = "/admin/frontend/admin.html";
        }
    });
});
