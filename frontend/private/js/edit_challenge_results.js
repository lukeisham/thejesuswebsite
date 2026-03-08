/**
 * edit_challenge_results.js
 * ─────────────────────────
 * Loads and manages the challenge/response pairs in the
 * dashboard Challenges panel. Supports listing, adding and
 * deleting challenge entries.
 */
(function initEditChallenges() {
    "use strict";

    var listEl = document.getElementById("challenge-edit-list");
    var addBtn = document.getElementById("add-challenge");

    if (!listEl) return;

    var token = sessionStorage.getItem("auth_token") || "";

    /** Fetch challenges from the server and render them. */
    function loadChallenges() {
        fetch("/api/v1/agent/challenges", {
            headers: { Authorization: "Bearer " + token },
        })
            .then(function (res) {
                if (!res.ok) throw new Error("Failed to load challenges");
                return res.json();
            })
            .then(function (challenges) {
                renderList(challenges);
            })
            .catch(function (err) {
                listEl.innerHTML =
                    '<li style="color:#999;">' + err.message + "</li>";
            });
    }

    /** Render the challenge list items. */
    function renderList(challenges) {
        listEl.innerHTML = "";

        if (!challenges || challenges.length === 0) {
            listEl.innerHTML =
                '<li style="color:#999;">No challenges found.</li>';
            return;
        }

        challenges.forEach(function (c) {
            var li = document.createElement("li");

            var link = document.createElement("a");
            link.href = "#";
            link.textContent = c.title || "Untitled Challenge";

            // Tab Forwarding Logic
            link.addEventListener("click", function (e) {
                e.preventDefault();

                // 1. Switch tabs to Response Manager
                var tabs = document.querySelectorAll(".dashboard-tab");
                var panels = document.querySelectorAll(".dashboard-tab-panel");
                tabs.forEach(t => t.classList.remove("active"));
                panels.forEach(p => {
                    p.classList.remove("active");
                    p.style.display = "none";
                });

                var rTab = document.querySelector('[data-target="content-responses"]');
                var rPanel = document.getElementById("content-responses");
                if (rTab && rPanel) {
                    rTab.classList.add("active");
                    rPanel.classList.add("active");
                    rPanel.style.display = "block";
                }

                // 2. Prepopulate
                var titleInput = document.getElementById("response-title-input");
                var idInput = document.getElementById("response-challenge-id");
                if (titleInput && idInput) {
                    titleInput.value = c.title || "";
                    idInput.value = c.id || "";
                }
            });

            var badge = document.createElement("span");
            badge.className = "label";
            badge.style.cssFloat = "right";
            badge.textContent = (c.response_count || 0) + " responses";

            link.appendChild(badge);
            li.appendChild(link);
            listEl.appendChild(li);
        });
    }

    /** Add a new challenge via prompt. */
    if (addBtn) {
        addBtn.addEventListener("click", function () {
            var title = prompt("Challenge title:");
            if (!title) return;

            fetch("/api/v1/agent/challenge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + token,
                },
                body: JSON.stringify({ title: title }),
            })
                .then(function (res) {
                    if (!res.ok) throw new Error("Failed to create challenge");
                    loadChallenges();
                })
                .catch(function (err) {
                    alert("Error: " + err.message);
                });
        });
    }

    // Bind generic list action buttons
    var btnPop = document.getElementById("list-pop-challenge");
    if (btnPop) {
        btnPop.addEventListener("click", function () {
            alert("This will query and list new popular challenges in the future.");
        });
    }

    var btnAcad = document.getElementById("list-acad-challenge");
    if (btnAcad) {
        btnAcad.addEventListener("click", function () {
            alert("This will query and list new academic challenges in the future.");
        });
    }

    // Initial load
    loadChallenges();
})();
