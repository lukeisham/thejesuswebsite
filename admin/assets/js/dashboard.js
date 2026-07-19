// Admin dashboard — content overview table with search/type/status filters.
// Extracted from the inline <script> in admin/index.html (SR-1: one file per
// function). TYPE_LABELS and contentItemUrl are exposed on window.AdminDashboard
// for unit testing; everything else runs on DOMContentLoaded exactly as before.

window.AdminDashboard = {};

var TYPE_LABELS = {
    evidence: "Evidence",
    essays: "Essay",
    responses: "Response",
    historiography: "Historiography",
    "blog-posts": "Blog Post",
    collections: "Collection",
    resources: "Resource",
    "popular-challenges": "Popular Challenge",
    "academic-challenges": "Academic Challenge",
};

function contentItemUrl(item) {
    switch (item.type) {
        case "evidence":
            return "evidence/edit-[id].html?id=" + item.id;
        case "essays":
            return "essays/edit-[id].html?id=" + item.id;
        case "responses":
            return "debate/edit-[id].html?id=" + item.id;
        case "historiography":
            return "historiography/edit-[id].html?id=" + item.id;
        case "blog-posts":
            return "blog/edit-[id].html?id=" + item.id;
        case "popular-challenges":
            return (
                "debate/popular-challenges/edit-[id].html?id=" + item.id
            );
        case "academic-challenges":
            return (
                "debate/academic-challenges/edit-[id].html?id=" + item.id
            );
        case "collections":
            return "collections/index.html";
        case "resources":
            return "resources/" + (item.list_key || "") + ".html";
        default:
            return "#";
    }
}

window.AdminDashboard.TYPE_LABELS = TYPE_LABELS;
window.AdminDashboard.contentItemUrl = contentItemUrl;

document.addEventListener("DOMContentLoaded", function () {
    var main = document.getElementById("dashboard-content");

    AdminAuth.requireSession().then(function (ok) {
        if (!ok) {
            main.innerHTML =
                '<div class="admin-error" role="alert">Unable to verify session. Please check your connection and try again.</div>';
            return;
        }

        Admin.api
            .get("/content")
            .then(function (data) {
                main.innerHTML = "";

                if (!Array.isArray(data) || data.length === 0) {
                    var emptyEl = document.createElement("div");
                    emptyEl.className = "admin-empty";
                    emptyEl.setAttribute("role", "status");
                    emptyEl.textContent = "No content records found.";
                    main.appendChild(emptyEl);
                    return;
                }

                // ── Filter bar ────────────────────────────────────────

                var filterBar = document.createElement("div");
                filterBar.className = "admin-dashboard-filters";

                // Text search input
                var searchDiv = document.createElement("div");
                searchDiv.className = "admin-form-group";
                var searchLabel = document.createElement("label");
                searchLabel.className = "admin-form-group__label";
                searchLabel.setAttribute("for", "filter-search");
                searchLabel.textContent = "Search";
                var searchInput = document.createElement("input");
                searchInput.type = "text";
                searchInput.className = "admin-input";
                searchInput.id = "filter-search";
                searchInput.placeholder = "Search by title…";
                searchDiv.appendChild(searchLabel);
                searchDiv.appendChild(searchInput);
                filterBar.appendChild(searchDiv);

                // Type select
                var types = [];
                var seenTypes = {};
                data.forEach(function (item) {
                    if (!seenTypes[item.type]) {
                        seenTypes[item.type] = true;
                        types.push(item.type);
                    }
                });
                types.sort();

                var typeDiv = document.createElement("div");
                typeDiv.className = "admin-form-group";
                var typeLabel = document.createElement("label");
                typeLabel.className = "admin-form-group__label";
                typeLabel.setAttribute("for", "filter-type");
                typeLabel.textContent = "Type";
                var typeSelect = document.createElement("select");
                typeSelect.className = "admin-select";
                typeSelect.id = "filter-type";
                var allTypesOption = document.createElement("option");
                allTypesOption.value = "";
                allTypesOption.textContent = "All Types";
                typeSelect.appendChild(allTypesOption);
                types.forEach(function (t) {
                    var typeOption = document.createElement("option");
                    typeOption.value = t;
                    typeOption.textContent = TYPE_LABELS[t] || t;
                    typeSelect.appendChild(typeOption);
                });
                typeDiv.appendChild(typeLabel);
                typeDiv.appendChild(typeSelect);
                filterBar.appendChild(typeDiv);

                // Status select
                var statusDiv = document.createElement("div");
                statusDiv.className = "admin-form-group";
                var statusLabel = document.createElement("label");
                statusLabel.className = "admin-form-group__label";
                statusLabel.setAttribute("for", "filter-status");
                statusLabel.textContent = "Status";
                var statusSelect = document.createElement("select");
                statusSelect.className = "admin-select";
                statusSelect.id = "filter-status";
                statusSelect.innerHTML =
                    '<option value="">All</option>' +
                    '<option value="1">Published</option>' +
                    '<option value="0">Draft</option>';
                statusDiv.appendChild(statusLabel);
                statusDiv.appendChild(statusSelect);
                filterBar.appendChild(statusDiv);

                main.appendChild(filterBar);

                // ── Table wrapper ────────────────────────────────────

                var wrapper = document.createElement("div");
                wrapper.className = "admin-table-wrapper";

                function renderTable(filteredData) {
                    wrapper.innerHTML = "";

                    if (filteredData.length === 0) {
                        var emptyMsg = document.createElement("div");
                        emptyMsg.className = "admin-empty";
                        emptyMsg.setAttribute("role", "status");
                        emptyMsg.textContent =
                            "No records match the current filters.";
                        wrapper.appendChild(emptyMsg);
                        return;
                    }

                    var table = document.createElement("table");
                    table.className = "admin-table";

                    var thead = document.createElement("thead");
                    var hRow = document.createElement("tr");
                    ["Type", "Title", "Status", "Updated"].forEach(function (
                        label,
                    ) {
                        var th = document.createElement("th");
                        th.textContent = label;
                        hRow.appendChild(th);
                    });
                    thead.appendChild(hRow);
                    table.appendChild(thead);

                    var tbody = document.createElement("tbody");

                    filteredData.forEach(function (item) {
                        var tr = document.createElement("tr");

                        // Type badge
                        var tdType = document.createElement("td");
                        var label = TYPE_LABELS[item.type] || item.type;
                        tdType.appendChild(Admin.typeBadge(label));
                        tr.appendChild(tdType);

                        // Title (link)
                        var tdTitle = document.createElement("td");
                        var link = document.createElement("a");
                        link.href = contentItemUrl(item);
                        link.textContent =
                            item.title || item.slug || "(untitled)";
                        link.style.cssText =
                            "color:var(--admin-accent);text-decoration:none;font-weight:500;";
                        tdTitle.appendChild(link);
                        tr.appendChild(tdTitle);

                        // Status badge
                        var tdStatus = document.createElement("td");
                        tdStatus.appendChild(
                            Admin.statusBadge(item.published_draft),
                        );
                        tr.appendChild(tdStatus);

                        // Updated date
                        var tdUpdated = document.createElement("td");
                        tdUpdated.textContent = Admin.formatDate(
                            item.updated_at,
                        );
                        tr.appendChild(tdUpdated);

                        tbody.appendChild(tr);
                    });

                    table.appendChild(tbody);
                    wrapper.appendChild(table);
                }

                renderTable(data);
                main.appendChild(wrapper);

                // ── Filter logic ──────────────────────────────────────

                function applyFilters() {
                    var searchVal = searchInput.value.toLowerCase().trim();
                    var typeVal = typeSelect.value;
                    var statusVal = statusSelect.value;

                    var filtered = data.filter(function (item) {
                        // Text search on title
                        if (
                            searchVal &&
                            !(item.title || "")
                                .toLowerCase()
                                .includes(searchVal)
                        ) {
                            return false;
                        }
                        // Type filter
                        if (typeVal && item.type !== typeVal) {
                            return false;
                        }
                        // Status filter
                        if (statusVal !== "") {
                            if (
                                Number(item.published_draft) !==
                                Number(statusVal)
                            ) {
                                return false;
                            }
                        }
                        return true;
                    });

                    renderTable(filtered);
                }

                searchInput.addEventListener("input", applyFilters);
                typeSelect.addEventListener("change", applyFilters);
                statusSelect.addEventListener("change", applyFilters);
            })
            .catch(function (err) {
                main.innerHTML =
                    '<div class="admin-error" role="alert">' +
                    err.message +
                    "</div>";
            });
    });
});
