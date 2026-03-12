/**
 * ardor_tree.js
 * ────────────────
 * Handles Interactions for the Ardor Tree on the Evidence page.
 */
(function initArdorTree() {
    "use strict";

    var nodes = document.querySelectorAll(".tree-node[data-node]");
    var detailPanel = document.getElementById("node-detail");

    if (!nodes.length || !detailPanel) return;

    nodes.forEach(function (node) {
        node.addEventListener("click", function (e) {
            e.stopPropagation();

            // Highlight selection
            nodes.forEach(function (n) {
                n.style.borderColor = "var(--border-color)";
            });
            this.style.borderColor = "var(--accent-color)";

            var nodeId = this.getAttribute("data-node");
            var nodeName = this.textContent;

            detailPanel.innerHTML = "<p>Loading evidence for <strong>" + nodeName + "</strong>...</p>";

            fetch("/api/v1/records")
                .then(function (res) {
                    if (!res.ok) throw new Error("Failed to fetch records");
                    return res.json();
                })
                .then(function (json) {
                    var records = (json && json.data && json.data.records) ? json.data.records : [];
                    
                    var searchStr = nodeName.toLowerCase();
                    var idStr = nodeId.toLowerCase().replace(/-/g, " ");

                    var related = records.filter(function (r) {
                        var name = (r.name || "").toLowerCase();
                        var cat = (typeof r.category === "object" ? Object.keys(r.category)[0] : String(r.category || "")).toLowerCase();
                        var inKw = false;
                        if (r.metadata && r.metadata.keywords) {
                            inKw = r.metadata.keywords.some(function (k) {
                                return k.toLowerCase().includes(searchStr) || k.toLowerCase().includes(idStr);
                            });
                        }
                        return name.includes(searchStr) || name.includes(idStr) || cat.includes(searchStr) || cat.includes(idStr) || inKw;
                    });

                    if (related.length === 0) {
                        detailPanel.innerHTML = "<p>No specific records found for: <strong>" + nodeName + "</strong>.</p>";
                        return;
                    }

                    var html = '<h4>Evidence Records for ' + nodeName + '</h4>';
                    html += '<ul class="record-list">';
                    
                    related.forEach(function (r) {
                        var verseStr = "";
                        if (r.primary_verse && r.primary_verse.book) {
                            verseStr = r.primary_verse.book + " " + r.primary_verse.chapter + ":" + r.primary_verse.verse;
                        }
                        
                        html += "<li><strong>" + (r.name || "Untitled") + "</strong>";
                        if (verseStr) {
                            html += ' <span class="label" style="font-size: 0.7rem;">' + verseStr + '</span>';
                        }
                        html += "</li>";
                    });

                    html += "</ul>";
                    detailPanel.innerHTML = html;
                })
                .catch(function (err) {
                    detailPanel.innerHTML = '<p style="color:red;">Error loading evidence: ' + err.message + '</p>';
                });
        });
    });
})();
