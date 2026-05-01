// =============================================================================
//
//   THE JESUS WEBSITE — EDIT DIAGRAM MODULE
//   File:    js/3.0_visualizations/dashboard/edit_diagram.js
//   Version: 2.1.0
//   Purpose: UI for managing recursive tree structures (like Ardor Graph).
//            Zero inline styles — all CSS classes.
//   Source:  guide_dashboard_appearance.md §3.1
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditDiagram(containerId)
// Function: Fetches tree data from API, renders draggable node hierarchy,
//           and manages re-parenting state for drag-and-drop / search / save
// Output: Dynamic node tree injected into the container with drag-and-drop,
//         search, add/remove, and save-to-API hooks

window.renderEditDiagram = async function (containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ----- Render shell across Providence three-column grid -----
  // COL 1 (actions): Save Graph button
  _clearColumnContent("actions");
  _setColumn(
    "actions",
    '<button class="quick-action-btn btn-save-diagram" id="save-diagram-btn">Save Graph</button>',
  );

  // COL 2 (list): orphan inventory placeholder (populated later by renderOrphanInventory)
  _clearColumnContent("list");
  _setColumn(
    "list",
    '<p class="loading-placeholder">Loading orphan inventory…</p>',
  );

  // COL 3 (editor): search input + diagram tree container + save indicator
  _clearColumnContent("editor");
  _setColumn(
    "editor",
    '<div class="diagram-search-section">' +
      '<input type="text" id="diagram-search-input" class="admin-search-input diagram-search-input" placeholder="Search nodes…">' +
      "</div>" +
      '<div class="admin-diagram-tree" id="diagram-tree-container">' +
      '<p class="loading-placeholder">Loading diagram data…</p>' +
      "</div>" +
      '<div id="diagram-save-indicator" class="diagram-save-indicator"></div>',
  );

  // ----- Fetch flat node list from API -----
  let nodes;
  try {
    const response = await fetch("/api/admin/diagram/tree");
    if (!response.ok) throw new Error("Failed to fetch diagram tree");
    const data = await response.json();
    nodes = data.nodes || [];
  } catch (err) {
    document.getElementById("diagram-tree-container").innerHTML =
      '<p class="error-message">Error loading diagram: ' + err.message + "</p>";
    return;
  }

  // ----- Store node data in module-scoped maps -----
  window.__diagramNodes = {};
  nodes.forEach(function (n) {
    window.__diagramNodes[n.id] = {
      id: n.id,
      title: n.title,
      parent_id: n.parent_id,
    };
  });
  window.__changedNodes = new Map();

  // ----- Track which node is the active parent for orphan attachment -----
  var activeParentId = null;

  // ----- Build and populate COL 2 orphan inventory -----
  function renderOrphanInventory() {
    // Rebuild childrenMap from current __diagramNodes state
    var cm = {};
    var allIds = Object.keys(window.__diagramNodes);
    allIds.forEach(function (id) {
      var n = window.__diagramNodes[id];
      var pid = n.parent_id || "__root__";
      if (!cm[pid]) cm[pid] = [];
      cm[pid].push(n);
    });

    // Collect all node IDs that have no parent (orphans)
    var rootOrphans = allIds
      .map(function (id) {
        return window.__diagramNodes[id];
      })
      .filter(function (n) {
        return (
          n.parent_id === null ||
          n.parent_id === undefined ||
          n.parent_id === ""
        );
      });

    // If a parent is active, exclude its descendants from available orphans
    var availableOrphans = rootOrphans;
    if (activeParentId) {
      var descendants = {};
      function walkKids(id) {
        var kids = cm[id];
        if (kids) {
          kids.forEach(function (k) {
            descendants[k.id] = true;
            walkKids(k.id);
          });
        }
      }
      walkKids(activeParentId);
      descendants[activeParentId] = true;

      availableOrphans = rootOrphans.filter(function (n) {
        return !descendants[n.id];
      });
    }

    var activeNode = activeParentId
      ? window.__diagramNodes[activeParentId]
      : null;

    var html = '<p class="blog-editor-list-heading">Orphan Nodes</p>';

    // Active parent readout
    if (activeNode) {
      html +=
        '<div class="orphan-active-parent">' +
        '<span class="text-sm text-muted">Attaching to:</span>' +
        '<span class="orphan-parent-name">' +
        (activeNode.title || activeNode.id) +
        "</span>" +
        '<span class="text-xs text-muted">(id: ' +
        activeNode.id +
        ")</span>" +
        '<button class="orphan-clear-btn" id="orphan-clear-active">Clear</button>' +
        "</div>";
    } else {
      html +=
        '<p class="text-sm text-muted">Click "+ Child" on a node to attach orphans here.</p>';
    }

    // Orphan list
    if (availableOrphans.length > 0) {
      html += '<ul class="orphan-list">';
      availableOrphans.forEach(function (orphan) {
        html +=
          '<li class="orphan-list-item" data-orphan-id="' +
          orphan.id +
          '">' +
          (orphan.title || orphan.id) +
          '<span class="text-xs text-muted">  id: ' +
          orphan.id +
          "</span>" +
          "</li>";
      });
      html += "</ul>";
    } else {
      html += '<p class="text-sm text-muted">No orphan nodes available.</p>';
    }

    // Inject into COL 2 via Providence grid API
    _clearColumnContent("list");
    _setColumn("list", html);

    // Wire orphan list item clicks (target the column div for querySelectorAll)
    var orphanCol = document.getElementById("canvas-col-list");
    if (orphanCol) {
      orphanCol.querySelectorAll(".orphan-list-item").forEach(function (item) {
        item.addEventListener("click", function () {
          var orphanId = this.getAttribute("data-orphan-id");
          if (!orphanId || !activeParentId) return;
          if (window.__diagramNodes[orphanId]) {
            window.__diagramNodes[orphanId].parent_id = activeParentId;
            window.__changedNodes.set(orphanId, {
              id: orphanId,
              parent_id: activeParentId,
            });
          }
          activeParentId = null;
          renderTree();
          renderOrphanInventory();
        });
      });
    }

    // Wire clear active parent button
    var clearBtn = document.getElementById("orphan-clear-active");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        activeParentId = null;
        renderOrphanInventory();
      });
    }
  }

  // ----- Define renderTree function (reusable after DnD re-parenting) -----
  function renderTree() {
    var treeContainer = document.getElementById("diagram-tree-container");
    if (!treeContainer) return;

    // Rebuild childrenMap from current __diagramNodes state
    var childrenMap = {};
    var allIds = Object.keys(window.__diagramNodes);
    allIds.forEach(function (id) {
      var n = window.__diagramNodes[id];
      var pid = n.parent_id || "__root__";
      if (!childrenMap[pid]) childrenMap[pid] = [];
      childrenMap[pid].push(n);
    });

    function renderNode(node, depth) {
      var kids = childrenMap[node.id];
      var hasKids = kids && kids.length > 0;
      var nodeLabel = node.title || node.id || "Untitled";

      var html =
        '<div class="diagram-node" draggable="true" data-node-id="' +
        node.id +
        '" data-depth="' +
        depth +
        '">' +
        '<span class="diagram-node-label">' +
        nodeLabel +
        "</span>" +
        '<button class="diagram-add-child-btn" data-node-id="' +
        node.id +
        '" title="Add child">+ Child</button>' +
        '<button class="diagram-remove-btn" data-node-id="' +
        node.id +
        '" title="Remove from parent (promote to root)">Remove</button>' +
        "</div>";

      if (hasKids) {
        html += '<div class="diagram-node-children">';
        kids.forEach(function (child) {
          html += renderNode(child, depth + 1);
        });
        html += "</div>";
      }

      return html;
    }

    // Filter root nodes
    var rootNodes = allIds
      .map(function (id) {
        return window.__diagramNodes[id];
      })
      .filter(function (n) {
        return (
          n.parent_id === null ||
          n.parent_id === undefined ||
          n.parent_id === ""
        );
      });

    if (rootNodes.length === 0) {
      treeContainer.innerHTML =
        '<p class="loading-placeholder">No root nodes found. Add records to the database first.</p>';
      return;
    }

    var treeHtml = "";
    rootNodes.forEach(function (node) {
      treeHtml += renderNode(node, 0);
    });
    treeContainer.innerHTML = treeHtml;

    // ----- Wire DnD event handlers (event delegation on tree container) -----
    treeContainer.removeEventListener("dragstart", treeContainer._onDragStart);
    treeContainer.removeEventListener("dragover", treeContainer._onDragOver);
    treeContainer.removeEventListener("dragleave", treeContainer._onDragLeave);
    treeContainer.removeEventListener("drop", treeContainer._onDrop);
    treeContainer.removeEventListener("dragend", treeContainer._onDragEnd);

    treeContainer._onDragStart = function (e) {
      var nodeEl = e.target.closest(".diagram-node");
      if (!nodeEl) return;
      var nodeId = nodeEl.getAttribute("data-node-id");
      e.dataTransfer.setData("text/plain", nodeId);
      nodeEl.classList.add("dragging");
    };

    treeContainer._onDragOver = function (e) {
      var nodeEl = e.target.closest(".diagram-node");
      if (!nodeEl) return;
      e.preventDefault();
      nodeEl.classList.add("drop-target");
    };

    treeContainer._onDragLeave = function (e) {
      var nodeEl = e.target.closest(".diagram-node");
      if (!nodeEl) return;
      nodeEl.classList.remove("drop-target");
    };

    treeContainer._onDrop = function (e) {
      e.preventDefault();
      var targetEl = e.target.closest(".diagram-node");
      if (!targetEl) return;

      var targetNodeId = targetEl.getAttribute("data-node-id");
      var draggedNodeId = e.dataTransfer.getData("text/plain");

      // Prevent dropping on itself
      if (!draggedNodeId || draggedNodeId === targetNodeId) return;

      // Prevent dropping on a descendant (would create a cycle)
      var current = targetNodeId;
      while (current) {
        if (current === draggedNodeId) return; // descendant check fails
        var parent = window.__diagramNodes[current];
        if (!parent || !parent.parent_id) break;
        current = parent.parent_id;
      }

      // Update in-memory parent_id
      if (window.__diagramNodes[draggedNodeId]) {
        window.__diagramNodes[draggedNodeId].parent_id = targetNodeId;
        window.__changedNodes.set(draggedNodeId, {
          id: draggedNodeId,
          parent_id: targetNodeId,
        });
      }

      // Clean up drop-target class
      treeContainer.querySelectorAll(".drop-target").forEach(function (el) {
        el.classList.remove("drop-target");
      });

      // Clear active parent and re-render
      activeParentId = null;
      renderTree();
    };

    treeContainer._onDragEnd = function () {
      treeContainer.querySelectorAll(".dragging").forEach(function (el) {
        el.classList.remove("dragging");
      });
      treeContainer.querySelectorAll(".drop-target").forEach(function (el) {
        el.classList.remove("drop-target");
      });
    };

    treeContainer.addEventListener("dragstart", treeContainer._onDragStart);
    treeContainer.addEventListener("dragover", treeContainer._onDragOver);
    treeContainer.addEventListener("dragleave", treeContainer._onDragLeave);
    treeContainer.addEventListener("drop", treeContainer._onDrop);
    treeContainer.addEventListener("dragend", treeContainer._onDragEnd);

    // ----- Wire add-child event delegation -----
    // Clicking "+ Child" sets the active parent and highlights COL 2 for orphan selection
    treeContainer.removeEventListener("click", treeContainer._onAddChildClick);
    treeContainer._onAddChildClick = function (e) {
      var btn = e.target.closest(".diagram-add-child-btn");
      if (!btn) return;

      var parentId = btn.getAttribute("data-node-id");
      if (!parentId) return;

      // Set active parent so COL 2 shows orphan nodes available to attach
      activeParentId = parentId;
      renderOrphanInventory();
    };
    treeContainer.addEventListener("click", treeContainer._onAddChildClick);

    // ----- Wire remove-node event delegation -----
    treeContainer.removeEventListener("click", treeContainer._onRemoveClick);
    treeContainer._onRemoveClick = function (e) {
      var btn = e.target.closest(".diagram-remove-btn");
      if (!btn) return;

      var nodeId = btn.getAttribute("data-node-id");
      if (!nodeId || !window.__diagramNodes[nodeId]) return;

      // Promote to root: set parent_id to null
      window.__diagramNodes[nodeId].parent_id = null;
      window.__changedNodes.set(nodeId, {
        id: nodeId,
        parent_id: null,
      });

      // Close any open add-child dropdown
      document.querySelectorAll(".diagram-add-dropdown").forEach(function (el) {
        el.remove();
      });

      renderTree();
    };
    treeContainer.addEventListener("click", treeContainer._onRemoveClick);

    // ----- Wire the save button to PUT /api/admin/diagram/tree -----
    var saveBtn = document.getElementById("save-diagram-btn");
    if (saveBtn) {
      var newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener("click", async function () {
        var indicator = document.getElementById("diagram-save-indicator");
        if (window.__changedNodes.size === 0) {
          indicator.textContent = "No changes to save.";
          indicator.className = "diagram-save-indicator is-muted";
          return;
        }

        var updates = Array.from(window.__changedNodes.values());
        try {
          var response = await fetch("/api/admin/diagram/tree", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates: updates }),
          });

          if (response.ok) {
            // Apply changes to the in-memory node map
            updates.forEach(function (u) {
              if (window.__diagramNodes[u.id]) {
                window.__diagramNodes[u.id].parent_id = u.parent_id;
              }
            });
            window.__changedNodes.clear();
            indicator.textContent = "Graph saved successfully.";
            indicator.className = "diagram-save-indicator is-success";
          } else {
            var errData;
            try {
              errData = await response.json();
            } catch (_) {
              errData = {};
            }
            indicator.textContent =
              "Save failed: " + (errData.detail || response.statusText);
            indicator.className = "diagram-save-indicator is-error";
          }
        } catch (err) {
          indicator.textContent = "Save failed: " + err.message;
          indicator.className = "diagram-save-indicator is-error";
        }
      });
    }
    // Update the orphan inventory after every tree re-render
    renderOrphanInventory();
  }

  // ----- Initial render -----
  renderTree();

  // ----- Render top-level section tab bar (Configuration active) -----
  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      containerId,
      [
        { name: "records", label: "Records", module: "records-edit" },
        {
          name: "lists-ranks",
          label: "Lists & Ranks",
          module: "lists-resources",
        },
        { name: "text-content", label: "Text Content", module: "text-blog" },
        {
          name: "configuration",
          label: "Configuration",
          module: "config-diagrams",
        },
      ],
      "configuration",
    );
  }

  // ----- Populate COL 2 orphan inventory -----
  renderOrphanInventory();

  // ----- Wire search (one-time, outside renderTree) -----
  (function wireSearch() {
    var searchInput = document.getElementById("diagram-search-input");
    if (!searchInput) return;

    // Remove any previous listener by cloning
    var newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);

    newInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var allNodes = document.querySelectorAll(
        "#diagram-tree-container .diagram-node",
      );
      allNodes.forEach(function (el) {
        var label = el.querySelector(".diagram-node-label");
        var text = label ? label.textContent.toLowerCase() : "";
        if (!q || text.indexOf(q) !== -1) {
          el.classList.remove("is-hidden");
        } else {
          el.classList.add("is-hidden");
        }
      });
    });
  })();
};
