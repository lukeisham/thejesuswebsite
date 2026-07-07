// Admin session guard — validates the cookie session and handles 401 redirects.
// Pure vanilla JS, no framework dependencies (SR-2). Registered as a self-contained
// module (SR-1: separate from admin.js helpers).
//
// Exported as a global "AdminAuth" namespace so every admin page can call the
// same guard before loading data.

window.AdminAuth = {};
const AdminAuth = window.AdminAuth;

/**
 * Validate the sid cookie session by fetching /drafts (an auth-protected route).
 * On 401, redirect to the login page. Return a Promise that resolves to true
 * when authenticated, false on network errors or other conditions where we
 * choose not to redirect.
 *
 * Call this at the top of every admin-page inline script.
 *
 * @returns {Promise<boolean>}
 */
AdminAuth.requireSession = async function () {
  try {
    const res = await fetch('/drafts');
    if (res.status === 401) {
      window.location.href = 'auth/login.html';
      return false;
    }
    // Any other error (500, etc.) — log but don't redirect; the session may
    // still be valid and the server is just having trouble.
    if (!res.ok) {
      console.warn('Session check: server returned', res.status);
    }
    return true;
  } catch (err) {
    // Network error — don't redirect, the user may be offline.
    console.error('Session check failed:', err);
    return false;
  }
};

/**
 * Return the current auth token. Returns null because this admin uses
 * session cookies, not bearer tokens.
 *
 * @returns {null}
 */
AdminAuth.getToken = function () {
  return null;
};
