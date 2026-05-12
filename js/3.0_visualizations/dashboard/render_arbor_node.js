// =============================================================================
//   THE JESUS WEBSITE — RENDER ARBOR NODE
//   File:    js/3.0_visualizations/dashboard/render_arbor_node.js
//   Version: 1.0.0
//   Trigger: Called by dashboard_arbor.js orchestrator for each node in the
//            tree during the recursive render pass. Also called when
//            re-rendering orphan nodes or after a structural change.
//   Main:    renderArborNode(nodeData, containerEl, isOrphan) — creates a
//            single <li> element containing the node row (grip, label, id,
//            [+Child] and [Remove] buttons), appends it to the given
//            container, and returns the <li> DOM element. If the node has
//            children, recursively renders them into a nested <ul>.
//   Output:  The created <li> DOM element with all interactive hooks,
//            appended to the container. Returns null if node data is
//            incomplete.
// =============================================================================

/**
 * Render a single arbor node as a draggable <li> element.
 *
 * @param {Object} nodeData — { id: string, title: string, parent_id: string|null, children: Array }
 * @param {HTMLElement} containerEl — the parent <ul> to append this node into
 * @param {boolean} [isOrphan=false] — true if this node is in the orphan pool
 * @returns {HTMLElement|null} the created <li> element, or null on failure
 */
function renderArborNode(nodeData, containerEl, isOrphan) {
    isOrphan = isOrphan || false;

    // --- Node Render Failed: validate required fields ---
    if (!nodeData || !nodeData.id) {
        const title = (nodeData && nodeData.title) || "(unknown)";
        const message =
            `Error: Failed to render node for record '${title}'. Data may be incomplete.`;
        if (typeof window.surfaceError === "function") {
            window.surfaceError(message);
        }
        console.error(
            "[render_arbor_node] Missing required fields for node:",
            nodeData,
        );
        return null;
    }

    const title = nodeData.title || "(untitled)";

    // --- Create <li> wrapper ---
    const li = document.createElement("li");
    li.className = "arbor-node-item";
    li.setAttribute("data-node-id", nodeData.id);
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-label", title);

    // --- Create node row ---
    const row = document.createElement("div");
    row.className = "arbor-node-row";
    row.setAttribute("draggable", "true");
    row.setAttribute("data-node-id", nodeData.id);

    // --- Grip icon (drag handle) ---
    const grip = document.createElement("span");
    grip.className = "arbor-node-row__grip";
    grip.setAttribute("aria-hidden", "true");
    grip.textContent = "\u2630"; // ☰ trigram for heaven / drag handle
    row.appendChild(grip);

    // --- Title label ---
    const label = document.createElement("span");
    label.className = "arbor-node-row__label";
    label.textContent = title;
    row.appendChild(label);

    // --- Primary verse meta ---
    var verseText = '';
    if (nodeData.primary_verse) {
        try {
            var parsed = typeof nodeData.primary_verse === 'string'
                ? JSON.parse(nodeData.primary_verse)
                : nodeData.primary_verse;
            if (Array.isArray(parsed) && parsed.length > 0) {
                var v = parsed[0];
                verseText = (v.book || '') + ' ' + (v.chapter || '') + ':' + (v.verse || '');
            }
        } catch (e) {
            verseText = nodeData.primary_verse;
        }
    }
    if (verseText) {
        var verseSpan = document.createElement("span");
        verseSpan.className = "arbor-node-row__verse";
        verseSpan.textContent = verseText;
        row.appendChild(verseSpan);
    }

    // --- Action buttons ---
    const actions = document.createElement("span");
    actions.className = "arbor-node-row__actions";

    // [+Child] button — opens dropdown to select from orphan pool
    const addChildBtn = document.createElement("button");
    addChildBtn.className = "arbor-node-row__btn";
    addChildBtn.type = "button";
    addChildBtn.textContent = "+Child";
    addChildBtn.title = "Add a child from the orphan pool";
    addChildBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        _showChildDropdown(nodeData.id, addChildBtn);
    });
    actions.appendChild(addChildBtn);

    // [Remove] button — promotes node to root (parent_id = null)
    const removeBtn = document.createElement("button");
    removeBtn.className = "arbor-node-row__btn arbor-node-row__btn--remove";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.title = "Detach from parent (make root)";
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        _handleRemoveNode(nodeData.id);
    });
    actions.appendChild(removeBtn);

    row.appendChild(actions);
    li.appendChild(row);

    // --- Recursively render children into nested <ul> ---
    if (nodeData.children && nodeData.children.length > 0) {
        const childUl = document.createElement("ul");
        childUl.setAttribute("role", "group");
        childUl.setAttribute("data-parent-id", nodeData.id);
        li.appendChild(childUl);

        nodeData.children.forEach((childData) => {
            renderArborNode(childData, childUl, false);
        });
    }

    // --- Append to container ---
    containerEl.appendChild(li);

    return li;
}

// =============================================================================
//   INTERNAL: _showChildDropdown
//   Displays a dropdown menu of orphan nodes that can be added as children
//   of the given parent node. Selecting an item commits the re-parenting.
// =============================================================================
function _showChildDropdown(parentId, anchorBtn) {
    // Remove any existing dropdown
    _closeChildDropdown();

    const orphans = window.__arborOrphans || [];
    if (orphans.length === 0) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No orphan nodes available to add as children.");
        }
        return;
    }

    const nodesMap = window.__diagramNodes || new Map();

    const dropdown = document.createElement("div");
    dropdown.className = "arbor-child-dropdown";
    dropdown.setAttribute("data-dropdown-for", parentId);

    orphans.forEach((orphanId) => {
        const orphanData = nodesMap.get(orphanId);
        if (!orphanData) return;

        const item = document.createElement("button");
        item.className = "arbor-child-dropdown__item";
        item.type = "button";
        item.textContent = orphanData.title || orphanId;
        item.addEventListener("click", () => {
            _closeChildDropdown();
            if (typeof window.updateNodeParent === "function") {
                window.updateNodeParent(orphanId, parentId);
            }
        });
        dropdown.appendChild(item);
    });

    // Position the dropdown near the button
    const btnRect = anchorBtn.getBoundingClientRect();
    dropdown.style.position = "fixed";
    dropdown.style.top = (btnRect.bottom + 4) + "px";
    dropdown.style.left = btnRect.left + "px";

    document.body.appendChild(dropdown);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener("click", _closeChildDropdown, { once: true });
    }, 0);
}

// =============================================================================
//   INTERNAL: _closeChildDropdown
//   Removes any open child dropdown from the DOM.
// =============================================================================
function _closeChildDropdown() {
    const existing = document.querySelector(".arbor-child-dropdown");
    if (existing) {
        existing.remove();
    }
}

// =============================================================================
//   INTERNAL: _handleRemoveNode
//   Promotes a node to root by setting parent_id = null.
// =============================================================================
function _handleRemoveNode(nodeId) {
    if (typeof window.updateNodeParent === "function") {
        window.updateNodeParent(nodeId, null);
    }
}

// =============================================================================
//   GLOBAL EXPOSURE
// =============================================================================
window.renderArborNode = renderArborNode;
