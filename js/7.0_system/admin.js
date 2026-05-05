/* =============================================================================
   THE JESUS WEBSITE — ADMIN LOGIN LOGIC
   File:    js/7.0_system/admin.js
   Version: 1.1.0
   Trigger: DOMContentLoaded — checks for existing session first, then attaches
            submit handler to #login-form if no valid session found.
   Main:    checkExistingSession() — calls GET /api/admin/verify. If valid JWT
            cookie exists, redirects straight to dashboard (user already logged
            in). Otherwise, shows the login form.
            handleLogin(event) — sends password to POST /api/admin/login,
            redirects to dashboard.html on success, displays error on failure.
   Output:  On existing session: redirect to dashboard.html (no login prompt).
            On login success: redirect to dashboard.html.
            On login failure: renders error message in #login-error container.
   Security: Password-only auth (guide_security.md §3). Brute-force defense
             (delays + IP lockout after 5 failures) handled server-side by
             auth_utils.py. No credentials stored in client-side code.
============================================================================= */

/* -----------------------------------------------------------------------------
   SESSION CHECK: checkExistingSession
   Runs on page load. If the user already has a valid HttpOnly JWT cookie,
   skip the login form and go straight to the dashboard. This preserves the
   'Return to Frontend → Admin Portal' flow without forcing re-authentication.
----------------------------------------------------------------------------- */
async function checkExistingSession() {
  try {
    const response = await fetch("/api/admin/verify", {
      method: "GET",
      credentials: "same-origin",
    });

    if (response.ok) {
      // Session is valid — skip login, go straight to dashboard
      window.location.href = "/admin/frontend/dashboard.html";
      return;
    }
  } catch (err) {
    // Network error or API unreachable — fall through to login form
    console.warn("[admin.js] Session check failed, showing login form:", err);
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: handleLogin
   Captures form submission, sends password to backend API, handles response.
----------------------------------------------------------------------------- */
async function handleLogin(event) {
  event.preventDefault();

  const passwordInput = document.getElementById("login-password");
  const errorOutput = document.getElementById("login-error");
  const submitButton = document.getElementById("login-submit");

  const password = passwordInput.value.trim();

  // Clear any previous error state
  errorOutput.classList.remove("is-visible");
  errorOutput.textContent = "";

  // Guard: empty password
  if (!password) {
    errorOutput.textContent = "Please enter your password.";
    errorOutput.classList.add("is-visible");
    return;
  }

  // Disable button during request to prevent double-submission
  submitButton.disabled = true;
  submitButton.textContent = "Logging in…";

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: password }),
    });

    if (response.ok) {
      // Success — backend has set the HttpOnly JWT cookie.
      // Redirect to the dashboard shell.
      window.location.href = "/admin/frontend/dashboard.html";
      return;
    }

    // Failure — extract server error message
    const data = await response.json().catch(() => ({}));
    const message = data.detail || "Invalid credentials. Please try again.";

    errorOutput.textContent = message;
    errorOutput.classList.add("is-visible");
  } catch (err) {
    // Network or unexpected error
    errorOutput.textContent = "Unable to reach the server. Please try again.";
    errorOutput.classList.add("is-visible");
    console.error("[admin.js] Login request failed:", err);
  } finally {
    // Re-enable the submit button
    submitButton.disabled = false;
    submitButton.textContent = "Login";
  }
}

/* -----------------------------------------------------------------------------
   INITIALISATION: Run on DOMContentLoaded
   Order matters: check for existing session first. If a valid JWT cookie
   exists, the user is redirected to the dashboard and never sees the login
   form. Only if the session check fails (no cookie or expired) do we attach
   the submit listener to the login form.
----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  // Step 1: Check for an existing valid session (preserves Return to Frontend flow)
  await checkExistingSession();

  // If we're still here, no valid session — attach the login form handler
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", handleLogin);
  }
});
