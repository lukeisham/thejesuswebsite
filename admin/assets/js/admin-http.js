/* (JS-5) — this file is the ONLY file in admin/ allowed to call raw fetch(). */

// Admin HTTP wrapper — provides a single, typed fetch facade so error-handling
// and 401-redirect logic are centralized. Every other admin JS file must go
// through AdminHttp.request or AdminHttp.postJson instead of calling
// raw fetch() directly.

window.AdminHttp = {};
const AdminHttp = window.AdminHttp;

/**
 * Low-level request wrapper around fetch(). Catches network errors and throws a
 * typed error with a user-friendly message. Returns the Response unchanged on
 * success so callers can inspect .status, .ok, .json(), etc.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
AdminHttp.request = async function (url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (_networkError) {
    throw new Error(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  // (JS-2) 401 auto-redirect for expired sessions.
  // Guard: don't redirect if we're already on the login page.
  if (
    response.status === 401 &&
    !window.location.pathname.endsWith("/auth/login.html")
  ) {
    window.location.href = "../auth/login.html";
  }

  return response;
};

/**
 * Convenience wrapper that POSTs a JSON body. Sets Content-Type and
 * stringifies the body automatically.
 *
 * @param {string} url
 * @param {object} body
 * @param {object} [extraHeaders]
 * @returns {Promise<Response>}
 */
AdminHttp.postJson = async function (url, body, extraHeaders) {
  return AdminHttp.request(url, {
    method: "POST",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      extraHeaders,
    ),
    body: JSON.stringify(body),
  });
};
