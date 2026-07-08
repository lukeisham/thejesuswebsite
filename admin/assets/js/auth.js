// Admin session guard — validates the cookie session against the dedicated
// /api/auth/me endpoint (purpose-built for this check) and handles 401
// redirects. Includes real logout (POST /api/auth/logout + cookie destruction)
// and a single delegated sidebar click listener so "Logout" works on all 44
// admin pages without editing any sidebar HTML (JS-6).
//
// Every fetch-targeting URL MUST go through /api (the nginx proxy strips the
// prefix before forwarding to the Express server). Bare paths will fail in
// production — never add one.
//
// Pure vanilla JS, no framework dependencies (SR-2). Registered as a self-contained
// module (SR-1: separate from admin.js helpers).
//
// Exported as a global "AdminAuth" namespace so every admin page can call the
// same guard before loading data.

window.AdminAuth = {};
const AdminAuth = window.AdminAuth;

/**
 * Validate the sid cookie session by fetching GET /api/auth/me (a dedicated
 * session-status endpoint — JS-2: never rely on a side-effect like /drafts
 * returning 200 for its static fallback page in production).
 * On 401, redirect to the absolute /admin/auth/login.html (relative paths
 * break from nested pages like /admin/essays/).
 * Return a Promise that resolves to true when authenticated, false on network
 * errors or other conditions where we choose not to redirect.
 *
 * Call this at the top of every admin-page inline script.
 *
 * @returns {Promise<boolean>}
 */
AdminAuth.requireSession = async function () {
  try {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      window.location.href = "/admin/auth/login.html";
      return false;
    }
    // Any other error (500, etc.) — log but don't redirect; the session may
    // still be valid and the server is just having trouble.
    if (!res.ok) {
      console.warn("Session check: server returned", res.status);
    }
    return true;
  } catch (err) {
    // Network error — don't redirect, the user may be offline.
    console.error("Session check failed:", err);
    return false;
  }
};

/**
 * Destroy the current session on the server and redirect to the login page
 * with a signed-out confirmation flag. The server deletes the cookie, so a
 * revisit of any admin page will be 401-gated.
 *
 * @returns {Promise<void>}
 */
AdminAuth.logout = async function () {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (_err) {
    // Even if the server is unreachable, redirect — the cookie will expire.
  }
  window.location.href = "/admin/auth/login.html?signedout=1";
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

// ── Delegated logout listener ────────────────────────────────────────────────
// One listener on the document intercepts clicks on the sidebar Logout link
// (.admin-sidebar__bottom a[href$="auth/login.html"]) so all 44 admin pages
// get real logout behaviour without editing any sidebar HTML (JS-6).
document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("click", function (event) {
    const link = event.target.closest(
      '.admin-sidebar__bottom a[href$="auth/login.html"]',
    );
    if (!link) return;

    event.preventDefault();
    AdminAuth.logout();
  });
});
