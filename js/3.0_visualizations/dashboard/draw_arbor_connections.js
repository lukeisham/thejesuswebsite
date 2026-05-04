// =============================================================================
//   THE JESUS WEBSITE — DRAW ARBOR CONNECTIONS
//   File:    js/3.0_visualizations/dashboard/draw_arbor_connections.js
//   Version: 1.0.0
//   Trigger: Called by dashboard_arbor.js orchestrator after the tree is
//            fully rendered, and again after any drag-and-drop re-parenting
//            that changes the visual structure.
//   Main:    drawArborConnections() — calculates the positions of all parent
//            and child nodes in the DOM, then draws SVG connector paths
//            linking each parent to its immediate children. The SVG paths
//            use curved (cubic bezier) lines that match the frontend Arbor
//            diagram aesthetic.
//   Output:  SVG <path> elements injected into #arbor-connections-svg.
//            If a parent or child element cannot be found in the DOM, logs
//            a warning and skips that connection.
// =============================================================================

function drawArborConnections() {
    const svgEl = document.getElementById("arbor-connections-svg");
    if (!svgEl) {
        console.warn("[draw_arbor_connections] SVG overlay #arbor-connections-svg not found");
        return;
    }

    // Clear previous paths
    svgEl.innerHTML = "";

    const nodesMap = window.__diagramNodes;
    if (!nodesMap || nodesMap.size === 0) {
        return;
    }

    // Collect all parent-child relationships
    const connections = [];
    nodesMap.forEach((nodeData, nodeId) => {
        if (nodeData.children && nodeData.children.length > 0) {
            nodeData.children.forEach((childData) => {
                connections.push({
                    parentId: nodeId,
                    childId: childData.id,
                    parentTitle: nodeData.title || nodeId,
                    childTitle: childData.title || childData.id,
                });
            });
        }
    });

    if (connections.length === 0) {
        return;
    }

    // Build the SVG path definitions
    let pathsHtml = "";

    connections.forEach((conn) => {
        const parentRow = _findNodeRow(conn.parentId);
        const childRow = _findNodeRow(conn.childId);

        // --- Connection Draw Failed ---
        if (!parentRow || !childRow) {
            const missing = !parentRow ? "Parent" : "Child";
            const message =
                `Error: Failed to draw connection for '${conn.childTitle}'. ${missing} record may be missing.`;
            if (typeof window.surfaceError === "function") {
                window.surfaceError(message);
            }
            console.warn(
                "[draw_arbor_connections] Cannot resolve",
                missing.toLowerCase(),
                "element for",
                conn,
            );
            return;
        }

        const parentRect = parentRow.getBoundingClientRect();
        const childRect = childRow.getBoundingClientRect();
        const canvasRect = svgEl.parentElement.getBoundingClientRect();

        // Calculate coordinates relative to the canvas
        const parentX = parentRect.right - canvasRect.left;
        const parentY = (parentRect.top + parentRect.bottom) / 2 - canvasRect.top;
        const childX = childRect.left - canvasRect.left;
        const childY = (childRect.top + childRect.bottom) / 2 - canvasRect.top;

        // Cubic bezier curve from parent right edge to child left edge
        const controlOffset = Math.max(Math.abs(childX - parentX) * 0.5, 20);
        const d = [
            "M", parentX, parentY,
            "C", parentX + controlOffset, parentY,
            childX - controlOffset, childY,
            childX, childY,
        ].join(" ");

        pathsHtml += `<path d="${d}" class="arbor-connection-path" data-parent="${conn.parentId}" data-child="${conn.childId}" />`;
    });

    svgEl.innerHTML = pathsHtml;
}

// =============================================================================
//   INTERNAL: _findNodeRow
//   Locates the .arbor-node-row DOM element for the given node id.
//   Returns the element or null if not found.
// =============================================================================
function _findNodeRow(nodeId) {
    const row = document.querySelector(`.arbor-node-row[data-node-id="${nodeId}"]`);
    return row;
}

// =============================================================================
//   GLOBAL EXPOSURE
// =============================================================================
window.drawArborConnections = drawArborConnections;
