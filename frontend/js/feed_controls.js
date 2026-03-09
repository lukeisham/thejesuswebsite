/**
 * feed_controls.js
 * ─────────────────
 * Adds sorting and category filtering to the Records Feed.
 */
(function initFeedControls() {
    "use strict";

    const feedEl = document.getElementById("record-feed");
    const searchSection = document.getElementById("record-search-section");
    const viewTabs = document.querySelector(".record-view-tabs");

    if (!feedEl || !searchSection) return;

    // ── 1. Create UI Elements ──
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "feed-controls";
    controlsDiv.id = "feed-controls";
    // Hidden by default, only shown when Feed tab is active
    controlsDiv.style.display = "none";
    controlsDiv.style.margin = "1rem 0";
    controlsDiv.style.padding = "10px";
    controlsDiv.style.background = "rgba(0,0,0,0.02)";
    controlsDiv.style.borderRadius = "4px";
    controlsDiv.style.alignItems = "center";
    controlsDiv.style.gap = "1rem";
    controlsDiv.style.flexWrap = "wrap";
    controlsDiv.style.border = "1px solid var(--border-color)";

    // Sort Dropdown
    const sortWrapper = document.createElement("div");
    sortWrapper.style.display = "flex";
    sortWrapper.style.alignItems = "center";
    sortWrapper.style.gap = "8px";
    sortWrapper.innerHTML = `<label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Sort By:</label>`;
    const sortSelect = document.createElement("select");
    sortSelect.className = "btn-footer";
    sortSelect.style.textTransform = "none";
    sortSelect.innerHTML = `
        <option value="created_desc">Newest First</option>
        <option value="created_asc">Oldest First</option>
        <option value="name_asc">Name (A-Z)</option>
        <option value="category_asc">Category</option>
    `;
    sortWrapper.appendChild(sortSelect);
    controlsDiv.appendChild(sortWrapper);

    // Filter Chips Container
    const filterWrapper = document.createElement("div");
    filterWrapper.style.display = "flex";
    filterWrapper.style.alignItems = "center";
    filterWrapper.style.gap = "10px";
    filterWrapper.innerHTML = `<label style="font-size: 0.75rem; color: #666; text-transform: uppercase;">Filter:</label>`;

    const chipsDiv = document.createElement("div");
    chipsDiv.className = "feed-filter-chips";
    chipsDiv.style.display = "flex";
    chipsDiv.style.gap = "6px";
    chipsDiv.style.flexWrap = "wrap";
    filterWrapper.appendChild(chipsDiv);
    controlsDiv.appendChild(filterWrapper);

    // Insert after Search Section
    searchSection.after(controlsDiv);

    // ── 2. Logic: Sorting ──
    function getItems() {
        return Array.from(feedEl.querySelectorAll(".record-feed-item"));
    }

    function sortItems() {
        const items = getItems();
        const criteria = sortSelect.value;

        items.sort((a, b) => {
            if (criteria === "name_asc") {
                return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"));
            }
            if (criteria === "created_desc") {
                return new Date(b.getAttribute("data-created")) - new Date(a.getAttribute("data-created"));
            }
            if (criteria === "created_asc") {
                return new Date(a.getAttribute("data-created")) - new Date(b.getAttribute("data-created"));
            }
            if (criteria === "category_asc") {
                return a.getAttribute("data-category").localeCompare(b.getAttribute("data-category"));
            }
            return 0;
        });

        // Re-append items in new order
        items.forEach(item => feedEl.appendChild(item));
    }

    sortSelect.addEventListener("change", sortItems);

    // ── 3. Logic: Filtering ──
    let activeCategory = null;

    function applyFilter() {
        const items = getItems();
        items.forEach(item => {
            const cat = item.getAttribute("data-category");
            if (!activeCategory || cat === activeCategory) {
                // If search is also active, we need to be careful.
                // For now, simplicity: chip filter overrides or combines?
                // Combined: only show if both match.
                // But real-time search hides/shows based on text.
                // Let's just apply the cat filter; search will re-apply on input.
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    function updateChips() {
        const items = getItems();
        const categories = new Set();
        items.forEach(item => {
            const cat = item.getAttribute("data-category");
            if (cat) categories.add(cat);
        });

        chipsDiv.innerHTML = "";

        // "All" chip
        const allChip = createChip("All", !activeCategory);
        allChip.addEventListener("click", () => {
            activeCategory = null;
            updateChips();
            applyFilter();
        });
        chipsDiv.appendChild(allChip);

        categories.forEach(cat => {
            const chip = createChip(cat, activeCategory === cat);
            chip.addEventListener("click", () => {
                activeCategory = (activeCategory === cat) ? null : cat;
                updateChips();
                applyFilter();
            });
            chipsDiv.appendChild(chip);
        });
    }

    function createChip(text, isActive) {
        const chip = document.createElement("button");
        chip.textContent = text;
        chip.className = "btn-footer";
        if (isActive) {
            chip.style.background = "var(--accent-color)";
            chip.style.color = "white";
        }
        return chip;
    }

    // ── 4. View Synchronization ──
    if (viewTabs) {
        viewTabs.addEventListener("click", () => {
            setTimeout(() => {
                const activeTab = viewTabs.querySelector(".tab.active");
                if (activeTab && activeTab.getAttribute("data-view") === "feed") {
                    controlsDiv.style.display = "flex";
                    if (chipsDiv.children.length === 0) updateChips();
                } else {
                    controlsDiv.style.display = "none";
                }
            }, 10);
        });
    }

    // Initial check
    window.addEventListener("load", () => {
        setTimeout(() => {
            const savedView = sessionStorage.getItem("records_view_preference");
            if (savedView === "feed") {
                controlsDiv.style.display = "flex";
                updateChips();
            }
        }, 200);
    });

    // Handle fresh data
    const observer = new MutationObserver((mutations) => {
        // Only update if children changed and it's not our own sorting re-appending
        const childChange = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0);
        if (childChange) {
            updateChips();
        }
    });
    observer.observe(feedEl, { childList: true });

})();
