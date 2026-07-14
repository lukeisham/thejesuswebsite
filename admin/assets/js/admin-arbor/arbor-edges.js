/**
 * Admin arbor edges module.
 *
 * Handles edge creation via right-drag between nodes (with a relationship-type
 * pop-up menu), edge deletion via right-click on connection lines, and
 * connection validation (no self-edge, no duplicate, valid relationship_type).
 * Persists edges through UpdateRecord (JS-5: async/await + try/catch).
 *
 * Depends on AdminArborCanvas for rendering, AdminArborNodes for node data,
 * and AdminArborConnectMenu for the relationship-type picker.
 *
 * @module admin-arbor/arbor-edges
 */

window.AdminArborEdges = {};
const Edges = window.AdminArborEdges;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} */
let edges = [];

/** @type {Object|null}  Edge creation drag state. */
let edgeDrag = null;

/** @type {Object|null}  Pending keyboard-initiated connection state. */
let pendingKeySource = null;

/** Allowable relationship types (mirrors the CHECK constraint in schema.sql). */
const VALID_TYPES = ["root", "supports", "leads_to", "related"];

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
 * Wire nothing at init — edge creation is now driven by right-drag gestures
 * from arbor-nodes.js, not a toolbar toggle.
 */
Edges.init = function () {
  // Right-drag connect and right-click disconnect are gesture-driven;
  // no toolbar wiring needed.
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

  for (var j = 0; j < edges.length; j++) {
    var edge = edges[j];
    var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
    var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);
    if (!sourceNode || !targetNode) continue;

    var el = Edges.createEdgeElement(edge, sourceNode, targetNode);
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
Edges.createEdgeElement = function (edge, sourceNode, targetNode) {
  var ns = "http://www.w3.org/2000/svg";
  var g = document.createElementNS(ns, "g");
  g.setAttribute("class", "admin-arbor-edge-group");
  g.setAttribute("data-edge-id", String(edge.id));
  g.style.cursor = "pointer";

  // Edge anchors: centre-bottom of source → centre-top of target.
  var x1 = (sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
  var y1 = (sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT;
  var x2 = (targetNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
  var y2 = targetNode.arbor_y || 0;

  var line = window.AdminArborCanvas.createEdgeLine(
    x1,
    y1,
    x2,
    y2,
    "admin-arbor-edge",
  );

  // Per-relationship_type styling matching the public page (via shared geometry)
  var style =
    window.AdminArborGeometry.EDGE_STYLES[edge.relationship_type] ||
    window.AdminArborGeometry.EDGE_STYLES.default;
  for (var attr in style) {
    if (style.hasOwnProperty(attr)) {
      line.setAttribute(attr, style[attr]);
    }
  }
  g.appendChild(line);

  // Relationship type label at midpoint
  var mx = (x1 + x2) / 2;
  var my = (y1 + y2) / 2;
  var typeLabel = window.AdminArborCanvas.createNodeLabel(
    mx,
    my - 6,
    edge.relationship_type || "",
    "admin-arbor-edge-label",
  );
  g.appendChild(typeLabel);

  // Right-click to disconnect
  g.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    e.stopPropagation();
    Edges.onEdgeContextMenu(edge);
  });

  // Keyboard support for disconnect: Delete, Backspace, or Enter to trigger disconnect
  g.setAttribute("tabindex", "0");
  g.setAttribute("role", "button");
  g.setAttribute("aria-label", "Connection (" + (edge.relationship_type || "") + ") — press Delete to remove");
  g.addEventListener("keydown", function (e) {
    if (e.key === "Delete" || e.key === "Backspace" || e.key === "Enter") {
      e.preventDefault();
      Edges.onEdgeContextMenu(edge);
    }
  });

  return g;
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
      "Delete the \u201C" +
        edge.relationship_type +
        "\u201D connection from \u201C" +
        sourceTitle +
        "\u201D to \u201C" +
        targetTitle +
        "\u201D?",
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

/* ── Right-drag edge creation ──────────────────────────────────────────────── */

/**
 * Called by arbor-nodes.js on right-button mousedown over a node.
 * Begins drawing a temporary edge line from this node to the cursor.
 *
 * @param {MouseEvent} e
 * @param {Object} sourceNode
 */
Edges.startEdgeDrag = function (e, sourceNode) {
  e.preventDefault();
  e.stopPropagation();

  var tx = window.AdminArborCanvas.getTransform();
  var svgEl = document.querySelector(".admin-arbor-svg");
  var rect = svgEl ? svgEl.getBoundingClientRect() : null;
  var screenX = rect ? e.clientX - rect.left : e.clientX;
  var screenY = rect ? e.clientY - rect.top : e.clientY;
  var diag = window.AdminArborCanvas.screenToDiagram(screenX, screenY, tx);

  // Anchor the temp line at centre-bottom of the source node
  var srcX =
    (sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
  var srcY = (sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT;

  edgeDrag = {
    sourceNode: sourceNode,
    startX: srcX,
    startY: srcY,
    tempLine: null,
  };

  // Create a temporary line
  var ns = "http://www.w3.org/2000/svg";
  var line = document.createElementNS(ns, "line");
  line.setAttribute("class", "admin-arbor-edge-temp");
  line.setAttribute("x1", String(srcX));
  line.setAttribute("y1", String(srcY));
  line.setAttribute("x2", String(diag.x));
  line.setAttribute("y2", String(diag.y));
  var group = window.AdminArborCanvas.getTransformGroup();
  if (group) group.appendChild(line);
  edgeDrag.tempLine = line;

  document.addEventListener("mousemove", Edges.onEdgeDragMove);
  document.addEventListener("mouseup", Edges.onEdgeDragUp);
};

/**
 * Mouse-move during edge creation — update the temporary line.
 *
 * @param {MouseEvent} e
 */
Edges.onEdgeDragMove = function (e) {
  if (!edgeDrag || !edgeDrag.tempLine) return;

  var tx = window.AdminArborCanvas.getTransform();
  var svgEl = document.querySelector(".admin-arbor-svg");
  var rect = svgEl ? svgEl.getBoundingClientRect() : null;
  var screenX = rect ? e.clientX - rect.left : e.clientX;
  var screenY = rect ? e.clientY - rect.top : e.clientY;
  var diag = window.AdminArborCanvas.screenToDiagram(screenX, screenY, tx);

  edgeDrag.tempLine.setAttribute("x2", String(diag.x));
  edgeDrag.tempLine.setAttribute("y2", String(diag.y));
};

/**
 * Mouse-up during edge creation — open the connect menu, validate, persist.
 *
 * @param {MouseEvent} e
 */
Edges.onEdgeDragUp = async function (e) {
  document.removeEventListener("mousemove", Edges.onEdgeDragMove);
  document.removeEventListener("mouseup", Edges.onEdgeDragUp);

  if (!edgeDrag) return;

  // Remove the temporary line
  if (edgeDrag.tempLine && edgeDrag.tempLine.parentNode) {
    edgeDrag.tempLine.parentNode.removeChild(edgeDrag.tempLine);
    edgeDrag.tempLine = null;
  }

  // Find which node the cursor ended on, if any
  var targetNode = null;
  var targetEl = document.elementFromPoint(e.clientX, e.clientY);
  if (targetEl) {
    var group = targetEl.closest(".admin-arbor-node-group");
    if (group) {
      var targetId = Number(group.getAttribute("data-node-id"));
      targetNode = window.AdminArborNodes.getNodeById(targetId);
    }
  }

  var sourceNode = edgeDrag.sourceNode;
  edgeDrag = null;

  if (!targetNode || !sourceNode) return;

  // Open the connect menu to choose relationship type
  if (window.AdminArborConnectMenu && window.AdminArborConnectMenu.open) {
    var chosenType = await window.AdminArborConnectMenu.open(
      e.clientX,
      e.clientY,
    );
    if (!chosenType) return; // user cancelled

    // Validate
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

    // Persist
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
  }
};

/* ── Keyboard-driven edge creation ─────────────────────────────────────────── */

/**
 * Keyboard equivalent of the right-drag connect gesture.
 * First press of "C" on a node arms the source; the user then Tab-navigates
 * to a target node and presses "C" again to complete the connection,
 * or Escape to cancel. Mirrors startEdgeDrag/onEdgeDragUp but with no cursor
 * coordinates — the connect menu opens next to the target node's screen rect.
 *
 * @param {Object} node  - the source node
 * @param {SVGGElement} el  - the node's SVG group element
 */
Edges.startEdgeConnectFromKeyboard = async function (node, el) {
  if (!pendingKeySource) {
    pendingKeySource = { node: node, el: el };
    el.classList.add("admin-arbor-node--connect-source");
    if (typeof window.showToast === "function") {
      window.showToast(
        "Connecting from \"" + (node.title || "?") + "\" — Tab to a target node and press C, or Esc to cancel.",
        "info",
      );
    }
    document.addEventListener("keydown", Edges.onKeyboardConnectEscape);
    return;
  }

  var sourceNode = pendingKeySource.node;
  var sourceEl = pendingKeySource.el;
  sourceEl.classList.remove("admin-arbor-node--connect-source");
  document.removeEventListener("keydown", Edges.onKeyboardConnectEscape);
  pendingKeySource = null;

  if (sourceNode.id === node.id) return; // same node re-pressed; no-op

  var rect = el.getBoundingClientRect();
  var menuX = rect.left + rect.width / 2;
  var menuY = rect.top + rect.height / 2;

  if (!window.AdminArborConnectMenu || !window.AdminArborConnectMenu.open) return;

  var chosenType = await window.AdminArborConnectMenu.open(menuX, menuY);
  if (!chosenType) return;

  var error = Edges.validateConnection(sourceNode.id, node.id, chosenType, edges);
  if (error) {
    if (typeof window.showToast === "function") {
      window.showToast(error, "error");
    }
    return;
  }

  try {
    var created = await UpdateRecord.saveEdge({
      source_id: sourceNode.id,
      target_id: node.id,
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

/**
 * Escape key handler: cancels an armed keyboard connection.
 *
 * @param {KeyboardEvent} e
 */
Edges.onKeyboardConnectEscape = function (e) {
  if (e.key !== "Escape" || !pendingKeySource) return;
  pendingKeySource.el.classList.remove("admin-arbor-node--connect-source");
  pendingKeySource = null;
  document.removeEventListener("keydown", Edges.onKeyboardConnectEscape);
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
  for (var i = 0; i < edgeGroups.length; i++) {
    var g = edgeGroups[i];
    var line = g.querySelector("line");
    var typeLabel = g.querySelector("text");
    if (!line) continue;

    var edgeId = Number(g.getAttribute("data-edge-id"));
    var edge = null;
    for (var j = 0; j < edges.length; j++) {
      if (edges[j].id === edgeId) {
        edge = edges[j];
        break;
      }
    }
    if (!edge) continue;

    var sourceNode = window.AdminArborNodes.getNodeById(edge.source_id);
    var targetNode = window.AdminArborNodes.getNodeById(edge.target_id);

    var x1 = sourceNode
      ? (sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2
      : Number(line.getAttribute("x1"));
    var y1 = sourceNode
      ? (sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT
      : Number(line.getAttribute("y1"));
    var x2 = targetNode
      ? (targetNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2
      : Number(line.getAttribute("x2"));
    var y2 = targetNode
      ? targetNode.arbor_y || 0
      : Number(line.getAttribute("y2"));

    if (edge.source_id === nodeId) {
      x1 = newX;
      y1 = newY;
    }
    if (edge.target_id === nodeId) {
      x2 = newX;
      y2 = newY;
    }

    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));

    if (typeLabel) {
      typeLabel.setAttribute("x", String((x1 + x2) / 2));
      typeLabel.setAttribute("y", String((y1 + y2) / 2 - 6));
    }
  }
};
