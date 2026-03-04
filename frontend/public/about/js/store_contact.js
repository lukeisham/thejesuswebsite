/**
 * store_contact.js
 * ────────────────
 * Handles the contact form submission on the About page.
 * Sends the name, email and message to the server.
 */
(function initStoreContact() {
    "use strict";

    var form = document.getElementById("contact-form");

    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var name = document.getElementById("contact-name").value.trim();
        var email = document.getElementById("contact-email").value.trim();
        var message = document.getElementById("contact-message").value.trim();

        if (!name || !email || !message) {
            alert("Please fill in all fields.");
            return;
        }

        var submitBtn = document.getElementById("contact-submit");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending…";
        }

        fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                email: email,
                message: message,
            }),
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to send message");
                return res.json();
            })
            .then(function () {
                form.reset();
                if (submitBtn) {
                    submitBtn.textContent = "Sent ✓";
                    setTimeout(function () {
                        submitBtn.textContent = "Send Message";
                        submitBtn.disabled = false;
                    }, 3000);
                }
            })
            .catch(function (err) {
                alert("Error: " + err.message);
                if (submitBtn) {
                    submitBtn.textContent = "Send Message";
                    submitBtn.disabled = false;
                }
            });
    });
})();
