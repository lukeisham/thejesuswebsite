// =============================================================================
//   THE JESUS WEBSITE — ADMIN LOGIN LOGIC
//   File:    js/7.0_system/dashboard/admin_login.js
//   Version: 2.0.0
//   Purpose: Handles login form submission, authentication, and redirect to
//            dashboard.html on success.
// =============================================================================

// Trigger: DOMContentLoaded on admin.html login page
// Function: Auto-checks for existing valid session, or intercepts login form
//           submission, posts credentials to /api/admin/login, and redirects
//           to dashboard.html on success
// Output: window.location.href redirect to dashboard.html on authentication;
//         error message displayed in #login-error on failure

document.addEventListener("DOMContentLoaded", async function () {
    var loginForm = document.getElementById("admin-login-form");
    var errorDiv = document.getElementById("login-error");
    var passwordInput = document.getElementById("admin-password");
    var submitBtn = document.getElementById("login-submit-btn");

    // --- Auto-Session Check on Load ---
    if (typeof window.verifyAdminSession === "function") {
        var isValid = await window.verifyAdminSession();
        if (isValid) {
            window.location.href = "/admin/frontend/dashboard.html";
            return;
        }
    }

    if (!loginForm) return;

    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        errorDiv.classList.remove("is-visible");
        errorDiv.classList.add("is-hidden");
        submitBtn.disabled = true;
        submitBtn.textContent = "Authenticating...";

        var password = passwordInput.value;

        try {
            var response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: password })
            });

            if (response.ok) {
                window.location.href = "/admin/frontend/dashboard.html";
            } else {
                var errData;
                try {
                    errData = await response.json();
                } catch (jsonErr) {
                    errData = { detail: "Authentication failed." };
                }
                throw new Error(errData.detail || "Invalid credentials.");
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove("is-hidden");
            errorDiv.classList.add("is-visible");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
            passwordInput.value = "";
        }
    });
});
