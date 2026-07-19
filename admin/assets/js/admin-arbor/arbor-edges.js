/**
 * Admin arbor edges module.
 *
 * Handles edge creation via a click-click gesture — right-click a node to
 * arm it as the connection source, then right-click a different node to
 * complete the connection through a relationship-type pop-up menu — plus
 * right-click on a connection line, which opens a small Re-route/Delete
 * action menu (Delete confirms and removes the edge; Re-route hands off to
 * arbor-edge-reroute.js for grid-snapped waypoint editing), and connection
 * validation (no self-edge, no duplicate, valid relationship_type).
 * Persists edges through UpdateRecord (JS-5: async/await + try/catch).
 *
 * Depends on AdminArborCanvas for rendering, AdminArborNodes for node data,
 * AdminArborConnectMenu for the relationship-type picker, AdminArborEdgeMenu
 * for the edge action menu, and AdminArborEdgeReroute for waypoint editing.
 *
 * @module admin-arbor/arbor-edges
 */

window.AdminArborEdges = {};

(function () {
  const Edges = window.AdminArborEdges;

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /** @type {Array<Object>} */
  let edges = [];

  /**
   * Armed connection source — shared by the pointer (right-click) and
   * keyboard (C) connect flows so the two entry points can never diverge
   * or double-arm.
   * @type {{node: Object, el: Element}|null}
   */
  let armedSource = null;

  /** Allowable relationship types (mirrors the CHECK constraint in schema.sql). */
  const VALID_TYPES = ["root", "supports", "leads_to", "related"];

  /* ── Edge path computation ────────────────────────────────────────────────────
     Delegated to the shared canonical module (frontend/assets/js/cluster-logic/
     edge-path.js) via window.AdminArborComputeEdgePath, provided by
     cluster-logic-bridge/edge-path-bridge.js, which must load before this
     script (see admin/diagrams/arbor.html). Kept as a local reference so the
     two call sites below stay unchanged in shape. */
  var computeEdgePath = window.AdminArborComputeEdgePath;

  /* ── Pure validation helpers ───────────────────────────────────────────────── */

  /**
   * Validate an edge connection before persisting.
   * Returns null if valid, or an error string describing the problem.
   *
   * @param {number} sourceId
   * @param {number} targetId
   * @param {string} relationshipType
   * @param {Array<Object>} existingEdges  - current edges on the canvas
   * @returns {string|null}  error message, or null if valid
   */
  Edges.validateConnection = function (
    sourceId,
    targetId,
    relationshipType,
    existingEdges,
  ) {
    if (sourceId === targetId) {
      return "An evidence node cannot connect to itself.";
    }

    if (VALID_TYPES.indexOf(relationshipType) === -1) {
      return (
        "Invalid relationship type. Must be one of: " + VALID_TYPES.join(", ")
      );
    }

    for (var i = 0; i < existingEdges.length; i++) {
      var edge = existingEdges[i];
      if (edge.source_id === sourceId && edge.target_id === targetId) {
        return "A connection between these two nodes already exists.";
      }
    }

    return null;
  };

  /* ── Initialisation ────────────────────────────────────────────────────────── */

  /**
   * Wire the canvas-level right-click handler (cancels an armed connection
   * and suppresses the native context menu over empty canvas). Node and edge
   * right-clicks are wired per-element in createNodeElement/createEdgeElement.
   */
  Edges.init = function () {
    var svgEl = document.querySelector(".admin-arbor-svg");
    if (svgEl) {
      svgEl.addEventListener("contextmenu", Edges.onCanvasContextMenu);
    }
  };

  /**
   * Right-click on empty canvas: suppress the native menu and cancel any
   * armed connection (one of the three required cancel paths).
   *
   * @param {MouseEvent} e
   */
  Edges.onCanvasContextMenu = function (e) {
    e.preventDefault();
    if (armedSource) {
      Edges.disarmConnectionSource("Connection cancelled.");
    }
  };

  /* ── Edge loading ──────────────────────────────────────────────────────────── */

  /**
   * Fetch edges from the arbor API.
   *
   * @returns {Promise<void>}
   */
  Edges.loadEdges = async function () {
    try {
      var data = await Admin.api.get("/arbor/admin");
      edges = data.edges || [];
    } catch (err) {
      console.error("Failed to load arbor edges:", err);
      edges = [];
    }
    Edges.renderEdges();
  };

  /**
   * Return the current edge array (used by nodes module for relationship styling).
   *
   * @returns {Array<Object>}
   */
  Edges.getAllEdges = function () {
    return edges;
  };

  /* ── Rendering ─────────────────────────────────────────────────────────────── */

  /**
   * Clear and re-render all edges into the SVG transform group.
   * If nodes are not yet loaded, edges will be skipped.
   */
  Edges.renderEdges = function () {
    var group = window.AdminArborCanvas.getTransformGroup();
    if (!group) return;

    // Remove existing edge elements
    var existing = group.querySelectorAll(".admin-arbor-edge-group");
    for (var i = 0; i < existing.length; i++) {
      existing[i].remove();
    }

    // Count parallel edges per (source_id, target_id) pair for offsetIndex
    var pairCounts = {};
    for (var j = 0; j < edges.length; j++) {
      var e = edges[j];
      var key = e.source_id + "-" + e.target_id;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
    var pairIndex = {};

    for (var k = 0; k < edges.length; k++) {
      var edge = edges[k];
      var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
      var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);
      if (!sourceNode || !targetNode) continue;

      var pairKey = edge.source_id + "-" + edge.target_id;
      if (!(pairKey in pairIndex)) pairIndex[pairKey] = 0;
      var offsetIdx = pairIndex[pairKey]++;

      var el = Edges.createEdgeElement(edge, sourceNode, targetNode, offsetIdx);
      group.appendChild(el);
    }
  };

  /**
   * Create the SVG element group for a single edge (line + type label).
   *
   * @param {Object} edge
   * @param {Object} sourceNode
   * @param {Object} targetNode
   * @returns {SVGGElement}
   */
  Edges.createEdgeElement = function (edge, sourceNode, targetNode, offsetIndex) {
    var ns = "http://www.w3.org/2000/svg";
    var g = document.createElementNS(ns, "g");
    g.setAttribute("class", "admin-arbor-edge-group");
    g.setAttribute("data-edge-id", String(edge.id));
    g.style.cursor = "pointer";

    // Edge anchors: centre-bottom of source → centre-top of target.
    var sx = (sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
    var sy = (sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT;
    var tx = (targetNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
    var ty = targetNode.arbor_y || 0;

    var d = computeEdgePath(sx, sy, tx, ty, offsetIndex || 0, edge.waypoints);

    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "admin-arbor-edge");

    // Per-relationship_type styling matching the public page (via shared geometry)
    var style =
      window.AdminArborGeometry.EDGE_STYLES[edge.relationship_type] ||
      window.AdminArborGeometry.EDGE_STYLES.default;
    for (var attr in style) {
      if (style.hasOwnProperty(attr)) {
        path.setAttribute(attr, style[attr]);
      }
    }
    g.appendChild(path);

    // Relationship type label at midpoint
    var mx = (sx + tx) / 2;
    var my = (sy + ty) / 2;
    var typeLabel = window.AdminArborCanvas.createNodeLabel(
      mx,
      my - 6,
      edge.relationship_type || "",
      "admin-arbor-edge-label",
    );
    g.appendChild(typeLabel);

    // Right-click: if a connection is armed, right-clicking an edge cancels
    // the arm (one gesture, one meaning); otherwise it opens the Re-route/
    // Delete action menu.
    g.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (armedSource) {
        Edges.disarmConnectionSource("Connection cancelled.");
        return;
      }
      Edges.openEdgeActionMenu(edge, e.clientX, e.clientY);
    });

    // Keyboard support: Delete/Backspace/Enter disconnects, R enters re-route mode.
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", "Connection (" + (edge.relationship_type || "") + ") — press Delete to remove, R to re-route");
    g.addEventListener("keydown", function (e) {
      if (e.key === "Delete" || e.key === "Backspace" || e.key === "Enter") {
        e.preventDefault();
        Edges.onEdgeContextMenu(edge);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        Edges.startEdgeReroute(edge);
      }
    });

    return g;
  };

  /* ── Re-route action menu ─────────────────────────────────────────────────── */

  /**
   * Open the small Re-route/Delete action menu for an edge (right-click
   * entry point). Falls back to the old delete-only confirmation if the menu
   * module isn't loaded.
   *
   * @param {Object} edge
   * @param {number} screenX
   * @param {number} screenY
   */
  Edges.openEdgeActionMenu = async function (edge, screenX, screenY) {
    if (!window.AdminArborEdgeMenu || !window.AdminArborEdgeMenu.open) {
      Edges.onEdgeContextMenu(edge);
      return;
    }

    var choice = await window.AdminArborEdgeMenu.open(screenX, screenY, [
      { label: "Re-route" },
      { label: "Delete", danger: true },
    ]);
    if (!choice) return;

    if (choice.label === "Delete") {
      Edges.onEdgeContextMenu(edge);
    } else if (choice.label === "Re-route") {
      Edges.startEdgeReroute(edge);
    }
  };

  /**
   * Enter re-route mode for an edge (shared by the pointer menu and the R
   * keyboard shortcut).
   *
   * @param {Object} edge
   */
  Edges.startEdgeReroute = function (edge) {
    if (!window.AdminArborEdgeReroute || !window.AdminArborEdgeReroute.enter) return;
    var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
    var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);
    window.AdminArborEdgeReroute.enter(edge, sourceNode, targetNode);
  };

  /**
   * Update a single edge's waypoints in the in-memory array and re-render.
   * Called by arbor-edge-reroute.js after a successful commit.
   *
   * @param {number} edgeId
   * @param {Array<{x:number,y:number}>|null} waypoints
   */
  Edges.setEdgeWaypoints = function (edgeId, waypoints) {
    for (var i = 0; i < edges.length; i++) {
      if (edges[i].id === edgeId) {
        edges[i].waypoints = waypoints;
        break;
      }
    }
    Edges.renderEdges();
  };

  /* ── Edge disconnect via right-click ────────────────────────────────────────── */

  /**
   * Handle right-click on an edge — show delete confirmation.
   *
   * @param {Object} edge
   */
  Edges.onEdgeContextMenu = function (edge) {
    var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
    var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);
    var sourceTitle = sourceNode ? sourceNode.title : "?";
    var targetTitle = targetNode ? targetNode.title : "?";

    if (
      !confirm(
        "Delete the “" +
          edge.relationship_type +
          "” connection from “" +
          sourceTitle +
          "” to “" +
          targetTitle +
          "”?",
      )
    )
      return;

    Edges.deleteEdge(edge.id);
  };

  /**
   * Delete an edge via the API.
   *
   * @param {number} edgeId
   */
  Edges.deleteEdge = async function (edgeId) {
    try {
      await UpdateRecord.deleteEdge(edgeId);
      edges = edges.filter(function (e) {
        return e.id !== edgeId;
      });
      Edges.renderEdges();
    } catch (err) {
      console.error("Failed to delete edge:", err);
      if (typeof window.showToast === "function") {
        window.showToast("Failed to delete connection.", "error");
      }
    }
  };

  /* ── Shared armed-source connect flow (pointer + keyboard) ───────────────────── */

  /**
   * Arm a node as the connection source: apply the gold outline, announce it,
   * and start listening for Escape. Shared by both entry points so there is
   * exactly one way to be "armed".
   *
   * @param {Object} node
   * @param {Element} el
   * @param {string} toastMessage
   */
  Edges.armConnectionSource = function (node, el, toastMessage) {
    armedSource = { node: node, el: el };
    el.classList.add("admin-arbor-node--connect-source");
    if (typeof window.showToast === "function") {
      window.showToast(toastMessage, "info");
    }
    document.addEventListener("keydown", Edges.onArmedSourceEscape);
  };

  /**
   * Disarm the current connection source, clearing its outline and the
   * Escape listener.
   *
   * @param {string} [cancelMessage]  - toast text if this disarm is a cancellation
   */
  Edges.disarmConnectionSource = function (cancelMessage) {
    if (!armedSource) return;
    armedSource.el.classList.remove("admin-arbor-node--connect-source");
    armedSource = null;
    document.removeEventListener("keydown", Edges.onArmedSourceEscape);
    if (cancelMessage && typeof window.showToast === "function") {
      window.showToast(cancelMessage, "info");
    }
  };

  /**
   * Escape key handler: cancels an armed connection from either the pointer
   * or keyboard flow.
   *
   * @param {KeyboardEvent} e
   */
  Edges.onArmedSourceEscape = function (e) {
    if (e.key !== "Escape" || !armedSource) return;
    Edges.disarmConnectionSource("Connection cancelled.");
  };

  /**
   * Complete a connection from an armed source to a target node: opens the
   * relationship-type menu, validates, and persists via UpdateRecord. Shared
   * by the pointer and keyboard flows so the persistence path is identical.
   *
   * @param {Object} sourceNode
   * @param {Object} targetNode
   * @param {number} menuX  - screen x for the connect menu
   * @param {number} menuY  - screen y for the connect menu
   */
  Edges.completeConnection = async function (sourceNode, targetNode, menuX, menuY) {
    if (!window.AdminArborConnectMenu || !window.AdminArborConnectMenu.open) {
      console.error("AdminArborConnectMenu is not available; cannot complete connection.");
      if (typeof window.showToast === "function") {
        window.showToast("Connection menu failed to load — reload the page.", "error");
      }
      return;
    }

    var chosenType = await window.AdminArborConnectMenu.open(menuX, menuY);
    if (!chosenType) return; // user cancelled

    var error = Edges.validateConnection(
      sourceNode.id,
      targetNode.id,
      chosenType,
      edges,
    );
    if (error) {
      if (typeof window.showToast === "function") {
        window.showToast(error, "error");
      }
      return;
    }

    try {
      var created = await UpdateRecord.saveEdge({
        source_id: sourceNode.id,
        target_id: targetNode.id,
        relationship_type: chosenType,
      });
      edges.push(created);
      Edges.renderEdges();
    } catch (err) {
      console.error("Failed to create edge:", err);
      if (typeof window.showToast === "function") {
        window.showToast("Failed to create connection.", "error");
      }
    }
  };

  /* ── Pointer-driven connect: right-click, right-click ─────────────────────────── */

  /**
   * Called by arbor-nodes.js on right-click (contextmenu) over a node.
   * First right-click with nothing armed arms this node as the source.
   * Right-clicking the armed node again cancels. Right-clicking a different
   * node while armed completes the connection at the cursor position.
   *
   * @param {MouseEvent} e
   * @param {Object} node
   * @param {Element} el
   */
  Edges.onNodeContextMenu = async function (e, node, el) {
    e.preventDefault();
    e.stopPropagation();

    if (!armedSource) {
      Edges.armConnectionSource(
        node,
        el,
        "Connecting from \"" + (node.title || "?") +
          "\" — right-click a target node; Esc cancels.",
      );
      return;
    }

    if (armedSource.node.id === node.id) {
      Edges.disarmConnectionSource("Connection cancelled.");
      return;
    }

    var sourceNode = armedSource.node;
    Edges.disarmConnectionSource();
    try {
      await Edges.completeConnection(sourceNode, node, e.clientX, e.clientY);
    } catch (err) {
      console.error("Failed to complete connection:", err);
      if (typeof window.showToast === "function") {
        window.showToast("Failed to complete connection.", "error");
      }
    }
  };

  /* ── Keyboard-driven connect: C, Tab, C ────────────────────────────────────────── */

  /**
   * Keyboard equivalent of the pointer connect flow.
   * First press of "C" on a node arms the source; the user then Tab-navigates
   * to a target node and presses "C" again to complete the connection, or
   * Escape to cancel. Shares armedSource/completeConnection with the pointer
   * flow so keyboard and pointer arming can't diverge or double-arm.
   *
   * @param {Object} node  - the source node
   * @param {SVGGElement} el  - the node's SVG group element
   */
  Edges.startEdgeConnectFromKeyboard = async function (node, el) {
    if (!armedSource) {
      Edges.armConnectionSource(
        node,
        el,
        "Connecting from \"" + (node.title || "?") +
          "\" — Tab to a target node and press C, or Esc to cancel.",
      );
      return;
    }

    var sourceNode = armedSource.node;
    Edges.disarmConnectionSource();

    if (sourceNode.id === node.id) return; // same node re-pressed; no-op

    var rect = el.getBoundingClientRect();
    var menuX = rect.left + rect.width / 2;
    var menuY = rect.top + rect.height / 2;

    return Edges.completeConnection(sourceNode, node, menuX, menuY);
  };

  /* ── Reposition edges when a node is dragged ───────────────────────────────── */

  /**
   * Update the line endpoints for all edges connected to a specific node.
   * Called by arbor-nodes.js during node drag.
   *
   * @param {number} nodeId
   * @param {number} newX  - new x position of node in diagram space (anchored centre-bottom)
   * @param {number} newY  - new y position of node in diagram space (anchored centre-bottom)
   */
  Edges.repositionEdgesForNode = function (nodeId, newX, newY) {
    var edgeGroups = document.querySelectorAll(".admin-arbor-edge-group");
    // Recompute pair counts for offset recalculation
    var pairCounts = {};
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      var key = e.source_id + "-" + e.target_id;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
    var pairIndex = {};

    for (var j = 0; j < edgeGroups.length; j++) {
      var g = edgeGroups[j];
      var path = g.querySelector("path");
      var typeLabel = g.querySelector("text");
      if (!path) continue;

      var edgeId = Number(g.getAttribute("data-edge-id"));
      var edge = null;
      for (var k = 0; k < edges.length; k++) {
        if (edges[k].id === edgeId) {
          edge = edges[k];
          break;
        }
      }
      if (!edge) continue;

      var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
      var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);

      var sx = sourceNode
        ? (sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2
        : null;
      var sy = sourceNode
        ? (sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT
        : null;
      var tx = targetNode
        ? (targetNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2
        : null;
      var ty = targetNode
        ? targetNode.arbor_y || 0
        : null;

      if (edge.source_id === nodeId) {
        sx = newX;
        sy = newY;
      }
      if (edge.target_id === nodeId) {
        tx = newX;
        ty = newY;
      }

      if (sx == null || sy == null || tx == null || ty == null) continue;

      // Recompute offset index
      var pairKey = edge.source_id + "-" + edge.target_id;
      if (!(pairKey in pairIndex)) pairIndex[pairKey] = 0;
      var offsetIdx = pairIndex[pairKey]++;

      var d = computeEdgePath(sx, sy, tx, ty, offsetIdx, edge.waypoints);
      path.setAttribute("d", d);

      if (typeLabel) {
        typeLabel.setAttribute("x", String((sx + tx) / 2));
        typeLabel.setAttribute("y", String((sy + ty) / 2 - 6));
      }
    }
  };

  // Exposed so arbor-edge-reroute.js can render an identical live-preview path
  // without a second implementation (JS-3: one routing algorithm, not two).
  Edges.computeEdgePath = computeEdgePath;
})();
