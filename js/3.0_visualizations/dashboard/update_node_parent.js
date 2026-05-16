// =============================================================================
//   THE JESUS WEBSITE — UPDATE NODE PARENT (RELATIONAL UPDATE)
//   File:    js/3.0_visualizations/dashboard/update_node_parent.js
//   Version: 1.0.0
//   Trigger: Called by handle_node_drag.js on successful drop, by
//            render_arbor_node.js when [+Child] or [Remove] is clicked,
//            and by the Publish button in dashboard_arbor.js.
//   Main:    updateNodeParent(childId, newParentId) — records the old
//            parent_id for rollback, sends PUT /api/admin/diagram/tree
//            to persist the new relationship (auto-saved as draft),
//            updates window.__diagramNodes and window.__changedNodes
//            in memory, then triggers a full UI re-render. On failure,
//            restores the previous state and surfaces an error.
//   Output:  The database and in-memory state are synchronised with the
//            new parent-child relationship. The tree UI is refreshed to
//            reflect the change.
// =============================================================================

/**
 * Update the parent_id of a node and auto-save to the backend.
 *
 * Every drag-and-drop re-parenting auto-saves as draft. Only the explicit
 * [Publish] button in the function bar commits changes to the live frontend.
 * This function handles the auto-save step.
 *
 * @param {string} childId — the id of the node being re-parented
 * @param {string|null} newParentId — the new parent id, or null to make root
 * @returns {Promise<boolean>} — true on success, false on failure (rolled back)
 */
async function updateNodeParent(childId, newParentId) {
  const nodesMap = window.__diagramNodes;
  if (!nodesMap) {
    console.error("[update_node_parent] window.__diagramNodes not initialised");
    return false;
  }

  const childData = nodesMap.get(childId);
  if (!childData) {
    console.error(
      "[update_node_parent] Node not found in diagramNodes:",
      childId,
    );
    return false;
  }

  const oldParentId = childData.parent_id;
  const title = childData.title || childId;

  // No-op if parent_id hasn't changed
  if (oldParentId === newParentId) {
    return true;
  }
  // Normalise: treat undefined / empty string as null
  if (!oldParentId && !newParentId) {
    return true;
  }

  // --- Circular reference check (server-side also does this, but we check early) ---
  if (newParentId && _isAncestor(childId, newParentId, nodesMap)) {
    const message = `Error: Cannot re-parent '${title}' — this would create a circular loop in the tree.`;
    if (typeof window.surfaceError === "function") {
      window.surfaceError(message);
    }
    return false;
  }

  // --- Optimistically update in-memory state ---
  childData.parent_id = newParentId;

  // Track the change for Publish
  if (!window.__changedNodes) {
    window.__changedNodes = new Map();
  }
  window.__changedNodes.set(childId, {
    id: childId,
    title: title,
    old_parent_id: oldParentId,
    new_parent_id: newParentId,
  });

  // --- Rebuild the tree structure from the flat map ---
  _rebuildTreeFromMap(nodesMap);

  // --- Re-render the UI immediately (optimistic update) ---
  _rerenderTree();

  // --- Show brief save indicator ---
  _showSaveIndicator();

  // --- Auto-save to backend as draft ---
  try {
    const response = await fetch("/api/admin/diagram/tree", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        updates: [
          {
            id: childId,
            parent_id: newParentId,
          },
        ],
      }),
    });

    if (!response.ok) {
      // --- Relational Update Failed — rollback ---
      const errorBody = await response.json().catch(() => ({}));
      const serverDetail =
        errorBody.detail || `${response.status} ${response.statusText}`;

      // Rollback in-memory state
      childData.parent_id = oldParentId;
      if (window.__changedNodes) {
        window.__changedNodes.delete(childId);
      }
      _rebuildTreeFromMap(nodesMap);
      _rerenderTree();

      const message = `Error: Failed to save new parent for '${title}'. The diagram has been reset to its previous state.`;
      if (typeof window.surfaceError === "function") {
        window.surfaceError(message);
      }
      console.error(
        "[update_node_parent] PUT /api/admin/diagram/tree failed:",
        serverDetail,
      );
      return false;
    }

    // --- Success — change is now persisted as draft ---
    const result = await response.json().catch(() => ({}));
    console.log(
      "[update_node_parent] Auto-saved (draft):",
      title,
      "parent:",
      oldParentId,
      "→",
      newParentId,
    );
    return true;
  } catch (err) {
    // --- Network / unexpected failure — rollback ---
    childData.parent_id = oldParentId;
    if (window.__changedNodes) {
      window.__changedNodes.delete(childId);
    }
    _rebuildTreeFromMap(nodesMap);
    _rerenderTree();

    const message = `Error: Failed to save new parent for '${title}'. The diagram has been reset to its previous state.`;
    if (typeof window.surfaceError === "function") {
      window.surfaceError(message);
    }
    console.error("[update_node_parent] Network error:", err);
    return false;
  }
}

// =============================================================================
//   INTERNAL: _isAncestor
//   Returns true if `ancestorId` is an ancestor of `nodeId` in the tree.
//   Used for client-side circular reference detection before sending the PUT.
// =============================================================================
function _isAncestor(nodeId, ancestorId, nodesMap) {
  let currentId = nodeId;
  const visited = new Set();

  while (currentId) {
    if (currentId === ancestorId) {
      return true;
    }
    if (visited.has(currentId)) {
      return true; // Already a cycle in data
    }
    visited.add(currentId);

    const nodeData = nodesMap.get(currentId);
    if (!nodeData) break;

    currentId = nodeData.parent_id;
  }

  return false;
}

// =============================================================================
//   INTERNAL: _rebuildTreeFromMap
//   Rebuilds the .children arrays on each node in the nodesMap based on
//   current parent_id values. Also rebuilds window.__arborOrphans.
// =============================================================================
function _rebuildTreeFromMap(nodesMap) {
  // Clear children arrays
  nodesMap.forEach((nodeData) => {
    nodeData.children = [];
  });

  // Build children lists
  nodesMap.forEach((nodeData, nodeId) => {
    if (nodeData.parent_id && nodesMap.has(nodeData.parent_id)) {
      const parent = nodesMap.get(nodeData.parent_id);
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(nodeData);
    }
  });

  // Orphan pool: only root nodes (no parent) that also have NO children
  const orphans = [];
  nodesMap.forEach((nodeData, nodeId) => {
    if (!nodeData.parent_id || !nodesMap.has(nodeData.parent_id)) {
      if (nodeData.children.length === 0) {
        orphans.push(nodeId);
      }
    }
  });

  window.__arborOrphans = orphans;
}

// =============================================================================
//   INTERNAL: _rerenderTree
//   Clears and re-renders the entire tree and orphan pool from the current
//   in-memory state (window.__diagramNodes, window.__arborOrphans).
// =============================================================================
function _rerenderTree() {
  const treeRoot = document.getElementById("arbor-tree-root");
  const orphanList = document.getElementById("arbor-orphan-list");
  const treeEmpty = document.getElementById("arbor-tree-empty");
  const orphanEmpty = document.getElementById("arbor-orphan-empty");

  if (!treeRoot) return;

  // Clear tree
  treeRoot.innerHTML = "";

  const orphans = window.__arborOrphans || [];
  const nodesMap = window.__diagramNodes;

  // Render orphan nodes into the tree root (they are top-level roots)
  // Actually, orphans with children should still be rendered as root nodes
  // in the tree, not in the orphan pool. The orphan pool shows root nodes
  // that have no children... wait, let me reconsider.

  // The orphan pool should contain nodes with parent_id = null that are
  // NOT currently serving as root nodes in the tree. But all nodes with
  // parent_id = null ARE root nodes. Let me re-think the UX:

  // Actually, the way this should work:
  // - Root nodes (parent_id = null) are displayed in the tree root
  // - The orphan pool shows all nodes that have parent_id = null
  //   (which is the same set)
  // - This gives the user an easy way to see unparented nodes and
  //   drag them into the tree

  // Let me render root-level nodes in the tree, and also show them in the orphan pool
  if (nodesMap && nodesMap.size > 0) {
    // Find root nodes (parent_id is null or not in map)
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
  } else {
    if (treeEmpty) treeEmpty.hidden = false;
  }

  // --- Render orphan pool ---
  if (orphanList) {
    orphanList.innerHTML = "";

    if (orphans.length > 0) {
      orphans.forEach((orphanId) => {
        const orphanData = nodesMap ? nodesMap.get(orphanId) : null;
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

  // --- Redraw SVG connections ---
  if (typeof window.drawArborConnections === "function") {
    // Small delay to let the DOM settle
    setTimeout(() => {
      window.drawArborConnections();
    }, 50);
  }

  // --- Re-attach drag listeners ---
  if (typeof window.setupNodeDrag === "function") {
    window.setupNodeDrag();
  }
}

// =============================================================================
//   INTERNAL: _showSaveIndicator
//   Brief floating indicator to confirm auto-save occurred after drag-and-drop.
// =============================================================================
function _showSaveIndicator() {
  let indicator = document.getElementById("arbor-save-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "arbor-save-indicator";
    indicator.className = "arbor-save-indicator";
    indicator.textContent = "Saved as draft";
    document.body.appendChild(indicator);
  }

  indicator.classList.add("is-visible");

  // Hide after 1.5 seconds
  clearTimeout(indicator._hideTimeout);
  indicator._hideTimeout = setTimeout(() => {
    indicator.classList.remove("is-visible");
  }, 1500);
}

// =============================================================================
//   FUNCTION: saveArborDraft
//   Batches all pending changed nodes and PUTs them with status: 'draft'.
//   Surfaces result via window.surfaceError().
//   Does NOT change record statuses to published.
// =============================================================================
async function saveArborDraft() {
  if (!window.__changedNodes || window.__changedNodes.size === 0) {
    if (typeof window.surfaceError === "function") {
      window.surfaceError("No changes to save.");
    }
    return false;
  }

  var updates = [];
  window.__changedNodes.forEach(function (change) {
    updates.push({
      id: change.id,
      parent_id: change.new_parent_id,
      status: "draft",
    });
  });

  try {
    var response = await fetch("/api/admin/diagram/tree", {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ updates: updates }),
    });

    if (!response.ok) {
      var errorBody = await response.json().catch(function () {
        return {};
      });
      var serverDetail =
        errorBody.detail || response.status + " " + response.statusText;
      throw new Error(serverDetail);
    }

    // Clear the changed nodes tracking since we've saved them
    window.__changedNodes = new Map();

    if (typeof window.surfaceError === "function") {
      window.surfaceError(updates.length + " node(s) saved as draft.");
    }
    return true;
  } catch (err) {
    console.error("[update_node_parent] saveArborDraft failed:", err);
    if (typeof window.surfaceError === "function") {
      window.surfaceError(
        "Error: Failed to save node changes as draft. Please try again.",
      );
    }
    return false;
  }
}

// =============================================================================
//   GLOBAL EXPOSURE
// =============================================================================
window.updateNodeParent = updateNodeParent;
window.saveArborDraft = saveArborDraft;
