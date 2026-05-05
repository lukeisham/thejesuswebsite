/* =============================================================================
   THE JESUS WEBSITE — ADMIN LOGIN LOGIC
   File:    js/7.0_system/admin.js
   Version: 1.0.0
   Trigger: DOMContentLoaded — attaches submit handler to #login-form.
   Main:    handleLogin(event) — sends password to POST /api/admin/login,
            redirects to dashboard.html on success, displays error on failure.
   Output:  On success, browser follows backend 200 → redirect to dashboard.html.
            On failure, renders error message in #login-error container.
   Security: Password-only auth (guide_security.md §3). Brute-force defense
             (delays + IP lockout after 5 failures) handled server-side by
             auth_utils.py. No credentials stored in client-side code.
============================================================================= */

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
   INITIALISATION: Attach submit listener on DOMContentLoaded
----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", handleLogin);
  }
});
