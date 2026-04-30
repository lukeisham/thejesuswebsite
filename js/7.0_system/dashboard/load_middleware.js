// =============================================================================
//
//   THE JESUS WEBSITE — JWT/TOKEN MIDDLEWARE
//   File:    js/7.0_system/dashboard/load_middleware.js
//   Version: 1.1.0
//   Purpose: Protects dashboard routes by verifying active sessions.
//
// =============================================================================

// Trigger: Called by dashboard_auth.js on DOMContentLoaded (dashboard.html page
//         guard) — verifies the session once at page load rather than per-module
// Function: Verifies that a valid admin session is active (HttpOnly cookie / JWT check)
// Output: Returns true if session is valid, false if expired or invalid (triggers redirect)

window.verifyAdminSession = async function() {
    /**
     * Verifies that a valid admin session is active by calling the backend.
     * Returns true if session is valid, false if expired/invalid.
     */
    try {
        const response = await fetch('/api/admin/verify');
        
        if (response.ok) {
            const data = await response.json();
            return data.authenticated === true;
        }
        
        // Any non-2xx response (like 401) means session is invalid
        return false;
    } catch (error) {
        console.error("Session verification failed:", error);
        return false;
    }
};
