// =============================================================================
//   THE JESUS WEBSITE — HANDLE NODE DRAG-AND-DROP
//   File:    js/3.0_visualizations/dashboard/handle_node_drag.js
//   Version: 1.0.0
//   Trigger: Called by dashboard_arbor.js orchestrator after the full tree
//            has been rendered into the DOM. Attaches HTML5 Drag and Drop
//            event listeners to every draggable node row and to the orphan
//            pool drop zone.
//   Main:    setupNodeDrag() — finds all .arbor-node-row elements, attaches
//            dragstart, dragend, dragover, dragleave, and drop handlers.
//            Also attaches drop handlers to the orphan pool so nodes can
//            be detached (parent_id = null). Validates against circular
//            references before allowing a drop.
//   Output:  All node rows and drop zones have live event listeners.
//            On successful drop, calls window.updateNodeParent() to
//            auto-save the new relationship.
// =============================================================================

/** @type {string|null} — id of the node currently being dragged */
let _draggedNodeId = null;

/** @type {HTMLElement|null} — reference to the source row being dragged */
let _draggedRowEl = null;

function setupNodeDrag() {
    // --- Attach dragstart / dragend to all draggable node rows ---
    const allRows = document.querySelectorAll(".arbor-node-row[draggable=\"true\"]");
    allRows.forEach((row) => {
        // Remove old listeners (safe to call even if none exist)
        row.removeEventListener("dragstart", _onDragStart);
        row.removeEventListener("dragend", _onDragEnd);
        row.removeEventListener("dragover", _onDragOver);
        row.removeEventListener("dragleave", _onDragLeave);
        row.removeEventListener("drop", _onDrop);

        // Attach fresh listeners
        row.addEventListener("dragstart", _onDragStart);
        row.addEventListener("dragend", _onDragEnd);
        row.addEventListener("dragover", _onDragOver);
        row.addEventListener("dragleave", _onDragLeave);
        row.addEventListener("drop", _onDrop);
    });

    // --- Attach drop zone to orphan pool ---
    const orphanPool = document.getElementById("arbor-orphan-pool");
    if (orphanPool) {
        orphanPool.removeEventListener("dragover", _onOrphanDragOver);
        orphanPool.removeEventListener("dragleave", _onOrphanDragLeave);
        orphanPool.removeEventListener("drop", _onOrphanDrop);
        orphanPool.addEventListener("dragover", _onOrphanDragOver);
        orphanPool.addEventListener("dragleave", _onOrphanDragLeave);
        orphanPool.addEventListener("drop", _onOrphanDrop);
    }
}

// =============================================================================
//   DRAG START — store the dragged node id and add visual class
// =============================================================================
function _onDragStart(e) {
    const row = e.currentTarget;
    const nodeId = row.getAttribute("data-node-id");
    if (!nodeId) return;

    _draggedNodeId = nodeId;
    _draggedRowEl = row;

    // Set drag data (required for Firefox)
    e.dataTransfer.setData("text/plain", nodeId);
    e.dataTransfer.effectAllowed = "move";

    // Visual feedback
    row.classList.add("is-dragging");

    // Allow drop on the orphan pool
    e.dataTransfer.setData("application/x-arbor-node-id", nodeId);
}

// =============================================================================
//   DRAG END — clean up visual state
// =============================================================================
function _onDragEnd(e) {
    const row = e.currentTarget;
    row.classList.remove("is-dragging");

    // Clear all drop-target highlights
    document.querySelectorAll(".is-drop-target").forEach((el) => {
        el.classList.remove("is-drop-target");
    });
    document.querySelectorAll(".is-drop-invalid").forEach((el) => {
        el.classList.remove("is-drop-invalid");
    });

    _draggedNodeId = null;
    _draggedRowEl = null;
}

// =============================================================================
//   DRAG OVER — validate whether this node is a valid drop target
// =============================================================================
function _onDragOver(e) {
    e.preventDefault(); // Required to allow drop

    if (!_draggedNodeId) return;

    const targetRow = e.currentTarget;
    const targetNodeId = targetRow.getAttribute("data-node-id");
    if (!targetNodeId) return;

    // Cannot drop on itself
    if (targetNodeId === _draggedNodeId) {
        e.dataTransfer.dropEffect = "none";
        return;
    }

    // --- Drag Conflict: detect circular reference ---
    if (_wouldCreateCircularReference(_draggedNodeId, targetNodeId)) {
        e.dataTransfer.dropEffect = "none";
        // Clear previous drop-target on other elements
        document.querySelectorAll(".is-drop-target").forEach((el) => {
            if (el !== targetRow) el.classList.remove("is-drop-target");
        });
        targetRow.classList.add("is-drop-invalid");

        const nodesMap = window.__diagramNodes;
        const draggedData = nodesMap ? nodesMap.get(_draggedNodeId) : null;
        const draggedTitle = (draggedData && draggedData.title) || _draggedNodeId;

        const message =
            `Error: Cannot re-parent '${draggedTitle}' — this would create a circular loop in the tree.`;
        if (typeof window.surfaceError === "function") {
            window.surfaceError(message);
        }
        return;
    }

    // Valid target
    e.dataTransfer.dropEffect = "move";
    targetRow.classList.remove("is-drop-invalid");
    targetRow.classList.add("is-drop-target");
}

// =============================================================================
//   DRAG LEAVE — remove drop-target highlight
// =============================================================================
function _onDragLeave(e) {
    const targetRow = e.currentTarget;
    targetRow.classList.remove("is-drop-target");
    targetRow.classList.remove("is-drop-invalid");
}

// =============================================================================
//   DROP — commit the re-parenting
// =============================================================================
function _onDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetRow = e.currentTarget;
    const targetNodeId = targetRow.getAttribute("data-node-id");

    targetRow.classList.remove("is-drop-target");
    targetRow.classList.remove("is-drop-invalid");

    if (!_draggedNodeId || !targetNodeId) return;
    if (targetNodeId === _draggedNodeId) return;

    // Final circular reference check
    if (_wouldCreateCircularReference(_draggedNodeId, targetNodeId)) {
        return;
    }

    // Commit the re-parenting via update_node_parent.js (auto-saves as draft)
    if (typeof window.updateNodeParent === "function") {
        window.updateNodeParent(_draggedNodeId, targetNodeId);
    }
}

// =============================================================================
//   ORPHAN POOL — dragover handler
// =============================================================================
function _onOrphanDragOver(e) {
    e.preventDefault();
    if (!_draggedNodeId) return;

    // Any node can be dropped into the orphan pool (becoming a root)
    e.dataTransfer.dropEffect = "move";
    const pool = e.currentTarget;
    pool.classList.add("is-drop-target");
}

// =============================================================================
//   ORPHAN POOL — dragleave handler
// =============================================================================
function _onOrphanDragLeave(e) {
    const pool = e.currentTarget;
    pool.classList.remove("is-drop-target");
}

// =============================================================================
//   ORPHAN POOL — drop handler (detach node: parent_id = null)
// =============================================================================
function _onOrphanDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const pool = e.currentTarget;
    pool.classList.remove("is-drop-target");

    if (!_draggedNodeId) return;

    // Detach node — set parent_id to null
    if (typeof window.updateNodeParent === "function") {
        window.updateNodeParent(_draggedNodeId, null);
    }
}

// =============================================================================
//   CIRCULAR REFERENCE DETECTION
//   Walks up the ancestor chain from `candidateParentId` to check if
//   `draggedId` appears anywhere above it. If so, assigning `draggedId`
//   as a child of `candidateParentId` would create a cycle.
// =============================================================================
function _wouldCreateCircularReference(draggedId, candidateParentId) {
    const nodesMap = window.__diagramNodes;
    if (!nodesMap) return false;

    // Walk up from the candidate parent to see if we ever reach the dragged node
    let currentId = candidateParentId;
    const visited = new Set();

    while (currentId) {
        if (currentId === draggedId) {
            return true; // Circular reference detected
        }
        if (visited.has(currentId)) {
            // Already-visited means there's already a cycle in the data — break out
            return true;
        }
        visited.add(currentId);

        const nodeData = nodesMap.get(currentId);
        if (!nodeData) break;

        currentId = nodeData.parent_id;
    }

    return false;
}

// =============================================================================
//   GLOBAL EXPOSURE
// =============================================================================
window.setupNodeDrag = setupNodeDrag;
