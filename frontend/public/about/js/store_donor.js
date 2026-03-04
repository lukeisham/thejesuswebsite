/**
 * store_donor.js
 * ──────────────
 * Handles the donation form on the About page.
 * Captures the donor name and selected amount,
 * then sends it to the donation API.
 */
(function initStoreDonor() {
    "use strict";

    var form = document.getElementById("donation-form");

    if (!form) return;

    var selectedAmount = 0;

    // Amount buttons
    var amountBtns = form.querySelectorAll("[data-amount]");
    amountBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            // Deselect others
            amountBtns.forEach(function (b) {
                b.style.outline = "";
            });

            selectedAmount = parseInt(this.getAttribute("data-amount"), 10);
            this.style.outline = "2px solid var(--accent-color)";
        });
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!selectedAmount) {
            alert("Please select a donation amount.");
            return;
        }

        var donorName = document.getElementById("donor-name").value.trim();

        var submitBtn = document.getElementById("donate-submit");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Processing…";
        }

        fetch("/api/donate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                donor_name: donorName || "Anonymous",
                amount: selectedAmount,
            }),
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Donation failed");
                return res.json();
            })
            .then(function () {
                if (submitBtn) {
                    submitBtn.textContent = "Thank you ✓";
                    setTimeout(function () {
                        submitBtn.textContent = "Donate";
                        submitBtn.disabled = false;
                    }, 4000);
                }
                selectedAmount = 0;
                amountBtns.forEach(function (b) { b.style.outline = ""; });
            })
            .catch(function (err) {
                alert("Error: " + err.message);
                if (submitBtn) {
                    submitBtn.textContent = "Donate";
                    submitBtn.disabled = false;
                }
            });
    });
})();
