/**
 * login.js
 * ────────
 * Updated to match the Rust backend route: /login
 */
(function initLogin() {
    "use strict";

    var form = document.getElementById("login-form");
    var statusEl = document.getElementById("login-status");

    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var passwordInput = document.getElementById("admin-password");
        var password = passwordInput ? passwordInput.value : "";

        if (!password) {
            statusEl.textContent = "Please enter your password.";
            return;
        }

        statusEl.textContent = "Signing in...";
        statusEl.style.color = "#666";

        // FIX: Changed URL from "/api/auth/login" to "/login" to match Rust router.rs
        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password }),
        })
            .then(function (res) {
                if (res.status === 429) {
                    throw new Error("Too many attempts. Please try again later.");
                }
                return res.json().then(function (data) {
                    if (!res.ok) {
                        throw new Error(data.error || "Login failed");
                    }
                    return data;
                });
            })
            .then(function (data) {
                statusEl.textContent = "Success — redirecting...";
                statusEl.style.color = "#2e7d32";

                // Redirect to the records page
                setTimeout(function () {
                    window.location.href = "/records.html";
                }, 800);
            })
            .catch(function (err) {
                statusEl.textContent = err.message;
                statusEl.style.color = "#d32f2f";
                if (passwordInput) passwordInput.value = "";
            });
    });
})();