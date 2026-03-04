/**
 * ardor_tree.js
 * ─────────────
 * Handles interaction with the ardor (branching evidence)
 * tree on the Evidence page. When a tree node is clicked,
 * its details are fetched and displayed in the side panel.
 */
(function initArdorTree() {
    "use strict";

    var treeEl = document.getElementById("ardor-tree");
    var detailEl = document.getElementById("node-detail");

    if (!treeEl || !detailEl) return;

    var nodes = treeEl.querySelectorAll(".tree-node");

    nodes.forEach(function (node) {
        node.addEventListener("click", function (e) {
            e.stopPropagation();

            // Highlight selected node
            nodes.forEach(function (n) {
                n.style.borderColor = "";
                n.style.boxShadow = "";
            });
            this.style.borderColor = "var(--accent-color)";
            this.style.boxShadow = "0 2px 8px rgba(91, 112, 101, 0.2)";

            var nodeId = this.getAttribute("data-node");
            var nodeLabel = this.textContent.trim();

            // Show loading state
            detailEl.innerHTML =
                '<h3 style="margin-top:0;">' + escapeHtml(nodeLabel) + "</h3>" +
                '<p style="font-size:0.9rem;color:#666;">Loading details…</p>';

            // Fetch node details from the API
            fetch("/api/evidence/nodes/" + encodeURIComponent(nodeId))
                .then(function (res) {
                    if (!res.ok) throw new Error("Not found");
                    return res.json();
                })
                .then(function (data) {
                    detailEl.innerHTML =
                        '<h3 style="margin-top:0;">' + escapeHtml(data.title || nodeLabel) + "</h3>" +
                        '<p style="font-size:0.85rem;">' + escapeHtml(data.description || "No description available.") + "</p>" +
                        (data.date ? '<p class="label" style="font-size:0.7rem;">Date: ' + escapeHtml(data.date) + "</p>" : "") +
                        (data.source_text ? '<blockquote style="font-style:italic;border-left:3px solid var(--accent-color);padding-left:12px;color:#555;">' + escapeHtml(data.source_text) + "</blockquote>" : "");
                })
                .catch(function () {
                    detailEl.innerHTML =
                        '<h3 style="margin-top:0;">' + escapeHtml(nodeLabel) + "</h3>" +
                        '<p style="font-size:0.9rem;color:#666;">Details will be available once the evidence API is connected.</p>';
                });
        });
    });

    /** Basic HTML escape. */
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
})();
