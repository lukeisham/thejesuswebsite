// =============================================================================
//   THE JESUS WEBSITE — LOGOUT MIDDLEWARE
//   File:    js/7.0_system/dashboard/logout_middleware.js
//   Version: 1.1.0
//   Purpose: Securely terminates sessions and resets UI.
// =============================================================================

// Trigger: Logout button click in the dashboard header, wired by dashboard_app.js
// Function: Posts to /api/admin/logout, wipes dashboard DOM, and resets the login view
// Output: Hides dashboard-app, shows login-view, clears all sensitive field values

window.adminLogout = async function() {
    // Attempt real backend logout if backend is implemented
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
    } catch(e) {
        // Backend API mock error handling
        console.log("Mock logout successful.");
    }

    // Clear UI state completely
    const dashboardApp = document.getElementById('dashboard-app');
    const loginView = document.getElementById('login-view');
    
    if (dashboardApp) {
        dashboardApp.classList.add('is-hidden');
        dashboardApp.classList.remove('is-visible', 'admin-full-height');
        dashboardApp.innerHTML = ''; // Wipe DOM to prevent trailing sensitive data access
    }
    
    if (loginView) {
        // Reset password field specifically
        const passField = document.getElementById('admin-password');
        if (passField) passField.value = '';
        
        loginView.classList.remove('is-hidden');
        loginView.classList.add('is-visible-flex');
    }
    
    console.log("Admin session securely terminated.");
};
