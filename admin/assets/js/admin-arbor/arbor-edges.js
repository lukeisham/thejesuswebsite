/**
 * Admin arbor edges module.
 *
 * Handles edge creation via click-drag between nodes, edge deletion, and
 * connection validation (no self-edge, no duplicate, valid relationship_type).
 * Persists edges through UpdateRecord (JS-5: async/await + try/catch).
 *
 * Depends on AdminArborCanvas for rendering and AdminArborNodes for node data.
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

/** @type {boolean} */
let edgeMode = false;

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
 * Wire DOM events for edge mode toggle and relationship-type selector.
 */
Edges.init = function () {
  var edgeBtn = document.getElementById("add-arbor-edge-btn");
  if (edgeBtn) edgeBtn.addEventListener("click", Edges.toggleEdgeMode);

  var typeSelect = document.getElementById("arbor-edge-type-select");
  if (typeSelect) {
    for (var i = 0; i < VALID_TYPES.length; i++) {
      var option = document.createElement("option");
      option.value = VALID_TYPES[i];
      option.textContent = VALID_TYPES[i].replace(/_/g, " ");
      if (i === 1) option.selected = true; // default to "supports"
      typeSelect.appendChild(option);
    }
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
    var data = await Admin.api.get("/arbor");
    edges = data.edges || [];
  } catch (err) {
    console.error("Failed to load arbor edges:", err);
    edges = [];
  }
  Edges.renderEdges();
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

  var x1 = sourceNode.arbor_x || 0;
  var y1 = sourceNode.arbor_y || 0;
  var x2 = targetNode.arbor_x || 0;
  var y2 = targetNode.arbor_y || 0;

  var line = window.AdminArborCanvas.createEdgeLine(
    x1,
    y1,
    x2,
    y2,
    "admin-arbor-edge",
  );

  // Per-relationship_type styling matching the public page
  if (edge.relationship_type === "related") {
    line.setAttribute("stroke-dasharray", "6 4");
    line.setAttribute("stroke", "var(--border-strong)");
  } else if (edge.relationship_type === "root") {
    line.setAttribute("stroke", "var(--accent)");
    line.setAttribute("stroke-width", "2");
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

  // Click to select/delete
  g.addEventListener("click", function (e) {
    e.stopPropagation();
    Edges.onEdgeClick(edge);
  });

  return g;
};

/* ── Edge click / delete ───────────────────────────────────────────────────── */

/**
 * Handle click on an edge — show delete confirmation.
 *
 * @param {Object} edge
 */
Edges.onEdgeClick = function (edge) {
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
  }
};

/* ── Edge creation via drag ────────────────────────────────────────────────── */

/**
 * Toggle edge-drawing mode. When active, mousedown on a node starts an edge drag.
 */
Edges.toggleEdgeMode = function () {
  edgeMode = !edgeMode;
  var btn = document.getElementById("add-arbor-edge-btn");
  var canvas = document.getElementById("arbor-canvas");
  if (btn) {
    btn.classList.toggle("admin-arbor-toolbar__btn--active", edgeMode);
    btn.textContent = edgeMode ? "Cancel Edge" : "Add Edge";
  }
  if (canvas) {
    canvas.classList.toggle("admin-arbor-canvas--edging", edgeMode);
  }
};

/**
 * Called by arbor-nodes.js when a node mousedown happens in edge mode.
 * Begins drawing a temporary edge line from this node to the cursor.
 *
 * @param {MouseEvent} e
 * @param {Object} sourceNode
 */
Edges.startEdgeDrag = function (e, sourceNode) {
  if (!edgeMode) return;
  e.preventDefault();
  e.stopPropagation();

  var tx = window.AdminArborCanvas.getTransform();
  var svgEl = document.querySelector(".admin-arbor-svg");
  var rect = svgEl ? svgEl.getBoundingClientRect() : null;
  var screenX = rect ? e.clientX - rect.left : e.clientX;
  var screenY = rect ? e.clientY - rect.top : e.clientY;
  var diag = window.AdminArborCanvas.screenToDiagram(screenX, screenY, tx);

  edgeDrag = {
    sourceNode: sourceNode,
    startX: diag.x,
    startY: diag.y,
    tempLine: null,
  };

  // Create a temporary line
  var ns = "http://www.w3.org/2000/svg";
  var line = document.createElementNS(ns, "line");
  line.setAttribute("class", "admin-arbor-edge-temp");
  line.setAttribute("x1", String(diag.x));
  line.setAttribute("y1", String(diag.y));
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
 * Mouse-up during edge creation — validate and persist the edge.
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

  // Determine relationship type from the dropdown
  var typeSelect = document.getElementById("arbor-edge-type-select");
  var relationshipType = typeSelect ? typeSelect.value : "supports";

  // Validate
  var error = Edges.validateConnection(
    sourceNode.id,
    targetNode.id,
    relationshipType,
    edges,
  );
  if (error) {
    var errEl = document.getElementById("arbor-edge-error");
    if (errEl) errEl.textContent = error;
    return;
  }

  // Clear any previous error
  var errEl = document.getElementById("arbor-edge-error");
  if (errEl) errEl.textContent = "";

  // Persist
  try {
    var created = await UpdateRecord.saveEdge({
      source_id: sourceNode.id,
      target_id: targetNode.id,
      relationship_type: relationshipType,
    });
    edges.push(created);
    Edges.renderEdges();
  } catch (err) {
    console.error("Failed to create edge:", err);
    if (errEl) errEl.textContent = err.message;
  }
};

/* ── Reposition edges when a node is dragged ───────────────────────────────── */

/**
 * Update the line endpoints for all edges connected to a specific node.
 * Called by arbor-nodes.js during node drag.
 *
 * @param {number} nodeId
 * @param {number} newX  - new diagram-space x of the node
 * @param {number} newY  - new diagram-space y of the node
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
      ? sourceNode.arbor_x || 0
      : Number(line.getAttribute("x1"));
    var y1 = sourceNode
      ? sourceNode.arbor_y || 0
      : Number(line.getAttribute("y1"));
    var x2 = targetNode
      ? targetNode.arbor_x || 0
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
