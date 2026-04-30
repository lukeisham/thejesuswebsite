// =============================================================================
//   THE JESUS WEBSITE — LOGOUT MIDDLEWARE
//   File:    js/7.0_system/dashboard/logout_middleware.js
//   Version: 2.0.0
//   Purpose: Securely terminates sessions and redirects to the login page.
// =============================================================================

// Trigger: Logout button click in the dashboard header, wired by dashboard_app.js
// Function: Posts to /api/admin/logout, then redirects to admin.html
// Output: window.location.href redirect to admin.html after backend logout

window.adminLogout = async function () {
    try {
        await fetch("/api/admin/logout", { method: "POST" });
    } catch (e) {
        console.log("Logout request completed.");
    }

    window.location.href = "/admin/frontend/admin.html";
};
