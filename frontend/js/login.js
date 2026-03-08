(function () {
    "use strict";
    var form = document.getElementById("login-form");
    var statusEl = document.getElementById("login-status") || { textContent: "", style: {} };
    if (!form) return;

    form.addEventListener("submit", function (e) {
        // 1. STOP the browser from reloading/redirecting
        e.preventDefault();
        e.stopPropagation();

        var passwordInput = document.getElementById("admin-password");
        var password = passwordInput ? passwordInput.value : "";

        statusEl.textContent = "Signing in...";
        statusEl.style.color = "#666";

        // 2. Talk to the Rust backend in the background
        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password }),
        })
            .then(function (res) {
                return res.json().then(function (data) {
                    return { status: res.status, data: data };
                });
            })
            .then(function (obj) {
                if (obj.status === 200 && obj.data.success) {
                    statusEl.textContent = "Success — redirecting...";
                    statusEl.style.color = "green";
                    setTimeout(function () {
                        window.location.href = "/private/dashboard.html";
                    }, 800);
                } else {
                    // This handles "Wrong password" or "Too many attempts"
                    statusEl.textContent = obj.data.error || "Login failed";
                    statusEl.style.color = "red";
                }
            })
            .catch(function (err) {
                statusEl.textContent = "Server connection error.";
                statusEl.style.color = "red";
                console.error("Login Error:", err);
            });
    });
})();
