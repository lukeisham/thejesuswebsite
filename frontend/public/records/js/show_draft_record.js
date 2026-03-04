/**
 * show_draft_record.js
 * ────────────────────
 * Loads draft (unpublished) records from the server
 * and displays them in the "Draft Records" section.
 * Only visible to authenticated admin users.
 */
(function initShowDrafts() {
    "use strict";

    var draftListEl = document.getElementById("draft-list");

    if (!draftListEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    // Only attempt if admin is authenticated
    if (!token) {
        var section = document.getElementById("draft-records");
        if (section) section.style.display = "none";
        return;
    }

    fetch("/api/records/drafts", {
        headers: { Authorization: "Bearer " + token },
    })
        .then(function (res) {
            if (!res.ok) throw new Error("" + res.status);
            return res.json();
        })
        .then(function (drafts) {
            if (!drafts || drafts.length === 0) {
                draftListEl.innerHTML =
                    '<p style="color:#999; font-size:0.9rem;">No draft records.</p>';
                return;
            }

            var ul = document.createElement("ul");
            ul.className = "record-list";

            drafts.forEach(function (d) {
                var li = document.createElement("li");
                var a = document.createElement("a");
                a.href = "#";
                a.textContent = d.name || "Untitled Draft";
                li.appendChild(a);
                ul.appendChild(li);
            });

            draftListEl.innerHTML = "";
            draftListEl.appendChild(ul);
        })
        .catch(function () {
            draftListEl.innerHTML =
                '<p style="color:#999; font-size:0.9rem;">Could not load drafts.</p>';
        });
})();
