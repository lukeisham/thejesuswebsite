/* =============================================================================
   THE JESUS WEBSITE — DASHBOARD SESSION MIDDLEWARE
   File:    js/7.0_system/dashboard/load_middleware.js
   Version: 1.1.0
   Trigger: Called by dashboard_orchestrator.js as the first action on page load.
   Main:    verifyAdminSession() — calls GET /api/admin/verify to check the
            HttpOnly JWT cookie. If valid, resolves silently. If invalid or
            expired, redirects the browser to admin.html for re-authentication.
            Also installs a global fetch interceptor that attaches the CSRF
            token header to all mutating requests on /api/admin/* paths.
   Output:  Guard pass (dashboard loads) or redirect to login.
   Security: per guide_security.md §3 — session verified once at page load.
             Individual module loads do not re-check the session.
============================================================================= */

/* -----------------------------------------------------------------------------
   CSRF FETCH INTERCEPTOR
   Patches window.fetch so every POST/PUT/DELETE/PATCH to /api/admin/*
   automatically carries the X-CSRF-Token header read from the csrf_token cookie.
----------------------------------------------------------------------------- */
(function () {
  var SAFE_METHODS = { GET: 1, HEAD: 1, OPTIONS: 1 };
  var originalFetch = window.fetch;

  window.fetch = function (input, init) {
    init = init || {};
    var method = (init.method || 'GET').toUpperCase();

    if (!SAFE_METHODS[method]) {
      var url = (typeof input === 'string') ? input : (input && input.url) || '';
      if (url.indexOf('/api/admin/') === 0 || url.indexOf(window.location.origin + '/api/admin/') === 0) {
        var match = document.cookie.match(/(^|;\s*)csrf_token=([^;]*)/);
        var token = match ? match[2] : '';
        if (token) {
          if (init.headers instanceof Headers) {
            if (!init.headers.has('X-CSRF-Token')) {
              init.headers.set('X-CSRF-Token', token);
            }
          } else {
            init.headers = Object.assign({}, init.headers || {});
            if (!init.headers['X-CSRF-Token']) {
              init.headers['X-CSRF-Token'] = token;
            }
          }
        }
      }
    }

    return originalFetch.call(window, input, init);
  };
})();

/* -----------------------------------------------------------------------------
   CSRF TOKEN READER
   Exposes window.getCSRFToken() for scripts that build headers manually.
----------------------------------------------------------------------------- */
function getCSRFToken() {
  var match = document.cookie.match(/(^|;\s*)csrf_token=([^;]*)/);
  return match ? match[2] : '';
}
window.getCSRFToken = getCSRFToken;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: verifyAdminSession
   Calls the verify endpoint. Redirects to login on failure.
----------------------------------------------------------------------------- */
window.verifyAdminSession = verifyAdminSession;

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
    window.location.href = "/admin/frontend/login.html";
    return false;
  } catch (err) {
    // Network error or API unreachable — redirect to login for safety
    console.error("[load_middleware] Session verification failed:", err);
    window.location.href = "/admin/frontend/login.html";
    return false;
  }
}
