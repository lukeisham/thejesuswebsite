// =============================================================================
//   THE JESUS WEBSITE — ARBOR DIAGRAM DASHBOARD ORCHESTRATOR
//   File:    js/3.0_visualizations/dashboard/dashboard_arbor.js
//   Version: 1.0.0
//   Trigger: Called by dashboard_app.js loadModule('arbor') which invokes
//            window.renderArbor(). This is the top-level entry point for
//            the Arbor Diagram dashboard module.
//   Main:    renderArbor() — sets the Providence layout to full-width
//            (no sidebar), fetches the dashboard_arbor.html template,
//            injects it into the main work column, fetches the tree data
//            from the backend, builds the recursive hierarchy, renders
//            all nodes into the tree and orphan pool, draws SVG connector
//            lines, and attaches drag-and-drop listeners.
//            Also wires up the [Refresh] and [Publish] buttons.
//   Output:  A fully interactive drag-and-drop arbor tree editor displayed
//            in the Providence main column, with database-backed auto-save
//            on every structural change.
// =============================================================================

/**
 * Primary entry point for the Arbor Diagram dashboard module.
 * Called by dashboard_app.js when the user navigates to the Arbor module.
 */
async function renderArbor() {
    // --- Set layout to full-width (no sidebar needed for the arbor editor) ---
    if (typeof window._setLayoutColumns === "function") {
        window._setLayoutColumns(false, "1fr");
    }

    // --- Show loading state in the main column ---
    if (typeof window._setColumn === "function") {
        window._setColumn(
            "main",
            `<div class="arbor-tree-canvas is-loading">
                <span class="state-loading__label">Loading arbor diagram…</span>
            </div>`,
        );
    }

    // --- Fetch the HTML template ---
    let templateHtml;
    try {
        const resp = await fetch(
            "../../admin/frontend/dashboard_arbor.html",
            { credentials: "same-origin" },
        );
        if (!resp.ok) {
            throw new Error(`Template fetch failed: ${resp.status}`);
        }
        templateHtml = await resp.text();
    } catch (err) {
        console.error("[dashboard_arbor] Failed to load template:", err);
        if (typeof window._setColumn === "function") {
            window._setColumn(
                "main",
                `<p class="state-error">Failed to load the Arbor editor template. Please reload the page.</p>`,
            );
        }
        if (typeof window.surfaceError === "function") {
            window.surfaceError(
                "Error: Failed to load the Arbor editor. Please reload the page.",
            );
        }
        return;
    }

    // --- Inject template into the main column ---
    if (typeof window._setColumn === "function") {
        window._setColumn("main", templateHtml);
    }

    // --- Small delay to allow DOM to settle after injection ---
    await new Promise((resolve) => setTimeout(resolve, 50));

    // --- Wire up the Function Bar buttons ---
    _wireFunctionBar();

    // --- Fetch tree data and render ---
    await _loadAndRenderTree();

    // --- Clear the error footer on successful load ---
    if (typeof window.surfaceError === "function") {
        window.surfaceError("Arbor diagram loaded successfully.");
    }
}

// =============================================================================
//   INTERNAL: _wireFunctionBar
//   Attaches click handlers to the [Refresh] and [Publish] buttons.
// =============================================================================
function _wireFunctionBar() {
    const refreshBtn = document.getElementById("arbor-btn-refresh");
    const publishBtn = document.getElementById("arbor-btn-publish");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", _handleRefresh);
    }

    if (publishBtn) {
        publishBtn.addEventListener("click", _handlePublish);
    }
}

// =============================================================================
//   INTERNAL: _handleRefresh
//   Re-fetches the tree from the backend and re-renders. Discards any
//   in-memory changes that haven't been persisted.
// =============================================================================
async function _handleRefresh() {
    const refreshBtn = document.getElementById("arbor-btn-refresh");
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        await _loadAndRenderTree();
        if (typeof window.surfaceError === "function") {
            window.surfaceError("Arbor diagram refreshed.");
        }
    } catch (err) {
        // --- Refresh Failed ---
        const message =
            "Error: Failed to refresh the arbor diagram. Please reload the page.";
        if (typeof window.surfaceError === "function") {
            window.surfaceError(message);
        }
        console.error("[dashboard_arbor] Refresh failed:", err);
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

// =============================================================================
//   INTERNAL: _handlePublish
//   Commits all accumulated parent_id changes to the live site. Sends
//   the full batch of changes from window.__changedNodes to the backend.
//   This is the explicit "Publish" step — auto-saves during drag-and-drop
//   have already written draft changes; this commits them to live.
// =============================================================================
async function _handlePublish() {
    const publishBtn = document.getElementById("arbor-btn-publish");
    if (publishBtn) publishBtn.disabled = true;

    const changedNodes = window.__changedNodes;
    if (!changedNodes || changedNodes.size === 0) {
        if (typeof window.surfaceError === "function") {
            window.surfaceError("No changes to publish. The tree is up to date.");
        }
        if (publishBtn) publishBtn.disabled = false;
        return;
    }

    // Build updates array from the changes map
    const updates = [];
    changedNodes.forEach((change) => {
        updates.push({
            id: change.id,
            parent_id: change.new_parent_id,
        });
    });

    try {
        const response = await fetch("/api/admin/diagram/tree", {
            method: "PUT",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ updates }),
        });

        if (!response.ok) {
            // --- Publish Failed ---
            const errorBody = await response.json().catch(() => ({}));
            const detail = errorBody.detail || `${response.status} ${response.statusText}`;
            const message =
                "Error: Failed to publish arbor diagram changes. Please try again.";
            if (typeof window.surfaceError === "function") {
                window.surfaceError(message);
            }
            console.error(
                "[dashboard_arbor] Publish failed:",
                detail,
            );
            if (publishBtn) publishBtn.disabled = false;
            return;
        }

        // --- Success — clear the changes map ---
        window.__changedNodes = new Map();

        if (typeof window.surfaceError === "function") {
            window.surfaceError("Arbor diagram published successfully.");
        }
        console.log(
            "[dashboard_arbor] Published",
            updates.length,
            "parent-child changes to live.",
        );

    } catch (err) {
        // --- Publish Failed (network) ---
        const message =
            "Error: Failed to publish arbor diagram changes. Please try again.";
        if (typeof window.surfaceError === "function") {
            window.surfaceError(message);
        }
        console.error("[dashboard_arbor] Publish network error:", err);
    } finally {
        if (publishBtn) publishBtn.disabled = false;
    }
}

// =============================================================================
//   INTERNAL: _loadAndRenderTree
//   Fetches tree data from the backend, builds the recursive hierarchy,
//   stores it in window.__diagramNodes, and renders the full tree UI.
// =============================================================================
async function _loadAndRenderTree() {
    // --- Fetch flat node list ---
    let nodes;
    if (typeof window.fetchArborData === "function") {
        nodes = await window.fetchArborData();
    } else {
        console.error("[dashboard_arbor] fetchArborData not available");
        return;
    }

    if (!nodes || nodes.length === 0) {
        // Show empty state
        const treeRoot = document.getElementById("arbor-tree-root");
        const treeEmpty = document.getElementById("arbor-tree-empty");
        const orphanList = document.getElementById("arbor-orphan-list");
        const orphanEmpty = document.getElementById("arbor-orphan-empty");

        if (treeRoot) treeRoot.innerHTML = "";
        if (orphanList) orphanList.innerHTML = "";
        if (treeEmpty) treeEmpty.hidden = false;
        if (orphanEmpty) orphanEmpty.hidden = true;

        // Clear state
        window.__diagramNodes = new Map();
        window.__arborOrphans = [];
        window.__changedNodes = new Map();
        return;
    }

    // --- Build the nodes map ---
    const nodesMap = new Map();
    nodes.forEach((node) => {
        nodesMap.set(node.id, {
            id: node.id,
            title: node.title || "(untitled)",
            parent_id: node.parent_id || null,
            children: [],
        });
    });

    // --- Build children arrays and orphan list ---
    const orphans = [];
    nodesMap.forEach((nodeData, nodeId) => {
        if (nodeData.parent_id && nodesMap.has(nodeData.parent_id)) {
            const parent = nodesMap.get(nodeData.parent_id);
            parent.children.push(nodeData);
        } else {
            orphans.push(nodeId);
        }
    });

    // --- Store in global state ---
    window.__diagramNodes = nodesMap;
    window.__arborOrphans = orphans;
    window.__changedNodes = new Map();

    // --- Render the tree ---
    const treeRoot = document.getElementById("arbor-tree-root");
    const orphanList = document.getElementById("arbor-orphan-list");
    const treeEmpty = document.getElementById("arbor-tree-empty");
    const orphanEmpty = document.getElementById("arbor-orphan-empty");

    if (treeRoot) {
        treeRoot.innerHTML = "";

        // Render root nodes (those with no parent_id or whose parent is not in the set)
        const rootNodes = [];
        nodesMap.forEach((nodeData, nodeId) => {
            if (!nodeData.parent_id || !nodesMap.has(nodeData.parent_id)) {
                rootNodes.push(nodeData);
            }
        });

        if (rootNodes.length > 0) {
            rootNodes.forEach((rootData) => {
                if (typeof window.renderArborNode === "function") {
                    window.renderArborNode(rootData, treeRoot, false);
                }
            });
            if (treeEmpty) treeEmpty.hidden = true;
        } else {
            if (treeEmpty) treeEmpty.hidden = false;
        }
    }

    // --- Render orphan pool ---
    if (orphanList) {
        orphanList.innerHTML = "";

        if (orphans.length > 0) {
            orphans.forEach((orphanId) => {
                const orphanData = nodesMap.get(orphanId);
                if (!orphanData) return;

                if (typeof window.renderArborNode === "function") {
                    window.renderArborNode(orphanData, orphanList, true);
                }
            });
            if (orphanEmpty) orphanEmpty.hidden = true;
        } else {
            if (orphanEmpty) orphanEmpty.hidden = false;
        }
    }

    // --- Draw SVG connector lines ---
    // Delay to allow DOM to settle after injection
    setTimeout(() => {
        if (typeof window.drawArborConnections === "function") {
            window.drawArborConnections();
        }
    }, 100);

    // --- Attach drag-and-drop listeners ---
    if (typeof window.setupNodeDrag === "function") {
        window.setupNodeDrag();
    }
}

// =============================================================================
//   GLOBAL EXPOSURE
//   Registered in dashboard_app.js MODULE_RENDERERS as 'arbor' → 'renderArbor'
// =============================================================================
window.renderArbor = renderArbor;
