/**
 * admin_edit_view.js
 * ──────────────────
 * Adds inline edit/delete controls to record cards
 * when the admin is authenticated. Enhances the default
 * read-only record view with admin actions.
 */
(function initAdminEditView() {
    "use strict";

    var token = sessionStorage.getItem("auth_token") || "";

    // Only activate for authenticated admins
    if (!token) return;

    var gridEl = document.getElementById("record-grid");

    if (!gridEl) return;

    // Watch for new cards added to the grid
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === 1 && node.tagName === "ARTICLE") {
                    addEditControls(node);
                }
            });
        });
    });

    observer.observe(gridEl, { childList: true });

    /** Add edit/delete buttons to a record card. */
    function addEditControls(card) {
        var controls = document.createElement("div");
        controls.style.marginTop = "0.75rem";
        controls.style.display = "flex";
        controls.style.gap = "8px";

        var editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.style.fontSize = "0.75rem";
        editBtn.addEventListener("click", function () {
            alert("Edit functionality will be connected to the Records API.");
        });

        var deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.style.fontSize = "0.75rem";
        deleteBtn.style.background = "#c0392b";
        deleteBtn.style.color = "#fff";
        deleteBtn.addEventListener("click", function () {
            if (confirm("Delete this record?")) {
                card.remove();
            }
        });

        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        card.appendChild(controls);
    }

    // Also add controls to any existing cards on load
    var existing = gridEl.querySelectorAll("article");
    existing.forEach(addEditControls);
})();
