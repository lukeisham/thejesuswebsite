/**
 * Admin arbor nodes module.
 *
 * Loads evidence nodes from the arbor graph, renders them as draggable
 * public-style rounded-rect nodes (WYSIWYG), supports search-to-add,
 * and persists positions server-side via UpdateRecord.
 *
 * Depends on AdminArborCanvas for rendering and coordinate conversion.
 *
 * @module admin-arbor/arbor-nodes
 */

window.AdminArborNodes = {};
const Nodes = window.AdminArborNodes;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} */
let nodes = [];

/** @type {Object|null}  Node currently being dragged. */
let dragState = null;

/** @type {number|null} */
let selectedNodeId = null;

/** @type {boolean} */
let addingMode = false;

/** @type {string} */
let searchQuery = "";

/** Node dimensions from the shared geometry (matches public arbor). */
const NODE_WIDTH = window.AdminArborGeometry.NODE_WIDTH;
const NODE_HEIGHT = window.AdminArborGeometry.NODE_HEIGHT;
const NODE_RX = 8;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire DOM events for the node edit panel and search-to-add dialog.
 */
Nodes.init = function () {
  const saveBtn = document.getElementById("arbor-node-save-btn");
  if (saveBtn) saveBtn.addEventListener("click", Nodes.onSaveNode);

  const cancelBtn = document.getElementById("arbor-node-cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", Nodes.closeEditPanel);

  const closeBtn = document.getElementById("arbor-node-panel-close");
  if (closeBtn) closeBtn.addEventListener("click", Nodes.closeEditPanel);

  const deleteBtn = document.getElementById("arbor-node-delete-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", Nodes.onRemoveNode);

  const addBtn = document.getElementById("add-arbor-node-btn");
  if (addBtn) addBtn.addEventListener("click", Nodes.toggleAddMode);

  const searchInput = document.getElementById("arbor-node-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value.trim();
      Nodes.renderSearchResults();
    });
  }

  const searchClose = document.getElementById("arbor-search-close");
  if (searchClose)
    searchClose.addEventListener("click", Nodes.closeSearchDialog);

  // One-time migration: push any legacy localStorage positions to the server
  if (
    typeof UpdateRecord !== "undefined" &&
    UpdateRecord.migrateLocalPositions
  ) {
    UpdateRecord.migrateLocalPositions();
  }
};

/* ── Node loading ──────────────────────────────────────────────────────────── */

/**
 * Fetch the full arbor graph and render nodes and edges.
 * Positions now come from the API (x/y on each node) — localStorage is legacy.
 *
 * @returns {Promise<void>}
 */
Nodes.loadNodes = async function () {
  try {
    const data = await Admin.api.get("/arbor/admin");
    nodes = data.nodes || [];
    // Use server positions; fall back to grid for nodes with null x/y
    for (let i = 0; i < nodes.length; i++) {
      if (
        nodes[i].x != null &&
        nodes[i].y != null &&
        Number.isFinite(nodes[i].x) &&
        Number.isFinite(nodes[i].y)
      ) {
        nodes[i].arbor_x = nodes[i].x;
        nodes[i].arbor_y = nodes[i].y;
      } else {
        // Default layout — spread nodes in a grid
        nodes[i].arbor_x = 100 + (i % 5) * 220;
        nodes[i].arbor_y = 100 + Math.floor(i / 5) * 160;
      }
      // Carry published_draft for draft badge styling
      nodes[i].published_draft =
        nodes[i].published_draft == null ? 1 : nodes[i].published_draft;
    }
    Nodes.renderNodes();
    // Let the edges module know nodes are ready
    if (window.AdminArborEdges && window.AdminArborEdges.loadEdges) {
      await window.AdminArborEdges.loadEdges();
    }
  } catch (err) {
    console.error("Failed to load arbor nodes:", err);
  }
};

/**
 * Get a node by its evidence id.
 *
 * @param {number} id
 * @returns {Object|undefined}
 */
Nodes.getNodeById = function (id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return nodes[i];
  }
  return undefined;
};

/**
 * Hit-test: find a node under a diagram-space coordinate.
 * Returns the node if the point falls within its bounding rect, or null.
 *
 * @param {number} diagX
 * @param {number} diagY
 * @param {number} [excludeId] - optional node id to exclude from the hit-test
 * @returns {Object|null}
 */
Nodes.getNodeAtDiagramPosition = function (diagX, diagY, excludeId) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (excludeId !== undefined && n.id === excludeId) continue;
    const nx = n.arbor_x || 0;
    const ny = n.arbor_y || 0;
    if (
      diagX >= nx &&
      diagX <= nx + NODE_WIDTH &&
      diagY >= ny &&
      diagY <= ny + NODE_HEIGHT
    ) {
      return n;
    }
  }
  return null;
};

/**
 * Get all nodes currently on the canvas.
 *
 * @returns {Array<Object>}
 */
Nodes.getAllNodes = function () {
  return nodes;
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Clear and re-render all nodes into the SVG transform group.
 */
Nodes.renderNodes = function () {
  const group = window.AdminArborCanvas.getTransformGroup();
  if (!group) return;

  // Remove existing node elements
  const existing = group.querySelectorAll(".admin-arbor-node-group");
  for (let i = 0; i < existing.length; i++) {
    existing[i].remove();
  }

  for (let j = 0; j < nodes.length; j++) {
    const node = nodes[j];
    const el = Nodes.createNodeElement(node);
    group.appendChild(el);
  }
};

/**
 * Create the SVG element group for a single node.
 * Renders a public-style rounded-rect with title + verse, replacing the old
 * circle+label. Drag/click/selection wiring is unchanged.
 *
 * @param {Object} node
 * @returns {SVGGElement}
 */
Nodes.createNodeElement = function (node) {
  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");
  g.setAttribute("class", "admin-arbor-node-group");
  g.setAttribute("data-node-id", String(node.id));
  g.style.cursor = "pointer";

  const x = node.arbor_x || 0;
  const y = node.arbor_y || 0;

  // Determine role (root, related) from edges for border styling
  const edges = window.AdminArborEdges
    ? window.AdminArborEdges.getAllEdges()
    : [];
  let isRoot = false;
  let isRelated = false;
  for (let e = 0; e < edges.length; e++) {
    if (
      edges[e].relationship_type === "root" &&
      edges[e].source_id === node.id
    ) {
      isRoot = true;
    }
    if (
      edges[e].relationship_type === "related" &&
      (edges[e].source_id === node.id || edges[e].target_id === node.id)
    ) {
      isRelated = true;
    }
  }

  // Background rect
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("width", String(NODE_WIDTH));
  rect.setAttribute("height", String(NODE_HEIGHT));
  rect.setAttribute("rx", String(NODE_RX));
  rect.setAttribute("ry", String(NODE_RX));

  let nodeClass = "admin-arbor-node";
  if (isRoot) nodeClass += " admin-arbor-node--root";
  else if (isRelated) nodeClass += " admin-arbor-node--related";
  if (node.id === selectedNodeId) nodeClass += " admin-arbor-node--selected";
  rect.setAttribute("class", nodeClass);
  g.appendChild(rect);

  // Title text (bold, primary)
  let titleText = node.title || "";
  if (titleText.length > 28) titleText = titleText.slice(0, 26) + "\u2026";
  const titleEl = document.createElementNS(ns, "text");
  titleEl.setAttribute("x", String(x + 10));
  titleEl.setAttribute("y", String(y + 20));
  titleEl.setAttribute("class", "admin-arbor-node-title");
  titleEl.textContent = titleText;
  g.appendChild(titleEl);

  // Verse text (italic, muted)
  const verseText = node.primary_verse || "";
  if (verseText) {
    const verseEl = document.createElementNS(ns, "text");
    verseEl.setAttribute("x", String(x + 10));
    verseEl.setAttribute("y", String(y + 40));
    verseEl.setAttribute("class", "admin-arbor-node-verse");
    verseEl.textContent = verseText;
    g.appendChild(verseEl);
  }

  // Draft badge (admin-only affordance — not on the public page)
  if (node.published_draft === 0) {
    const badgeRect = document.createElementNS(ns, "rect");
    badgeRect.setAttribute("x", String(x + NODE_WIDTH - 52));
    badgeRect.setAttribute("y", String(y + NODE_HEIGHT - 22));
    badgeRect.setAttribute("width", "44");
    badgeRect.setAttribute("height", "16");
    badgeRect.setAttribute("rx", "3");
    badgeRect.setAttribute("ry", "3");
    badgeRect.setAttribute("class", "admin-arbor-node-draft-badge");
    g.appendChild(badgeRect);

    const badgeText = document.createElementNS(ns, "text");
    badgeText.setAttribute("x", String(x + NODE_WIDTH - 30));
    badgeText.setAttribute("y", String(y + NODE_HEIGHT - 9));
    badgeText.setAttribute("class", "admin-arbor-node-draft-label");
    badgeText.textContent = "Draft";
    g.appendChild(badgeText);
  }

  // Wire click
  g.addEventListener("click", function (e) {
    e.stopPropagation();
    Nodes.selectNode(node.id);
  });

  // Wire drag
  g.addEventListener("mousedown", function (e) {
    Nodes.onNodeMouseDown(e, node);
  });

  return g;
};

/* ── Selection & edit panel ────────────────────────────────────────────────── */

/**
 * Select a node and open the side panel.
 *
 * @param {number} nodeId
 */
Nodes.selectNode = function (nodeId) {
  selectedNodeId = nodeId;
  Nodes.renderNodes();
  Nodes.openEditPanel(nodeId);
};

/**
 * Open the slide-in node edit panel.
 *
 * @param {number} nodeId
 */
Nodes.openEditPanel = function (nodeId) {
  const panel = document.getElementById("arbor-node-panel");
  if (!panel) return;

  const node = Nodes.getNodeById(nodeId);
  if (!node) return;

  document.getElementById("arbor-node-title-input").value = node.title || "";
  document.getElementById("arbor-node-verse-input").value =
    node.primary_verse || "";
  document.getElementById("arbor-node-slug-display").textContent =
    node.slug || "";

  // Show parent (first incoming non-"related" edge)
  const parentDisplay = document.getElementById("arbor-node-parent-display");
  if (parentDisplay) {
    const allEdges =
      window.AdminArborEdges && window.AdminArborEdges.getAllEdges
        ? window.AdminArborEdges.getAllEdges()
        : [];
    let parentEdge = null;
    for (let i = 0; i < allEdges.length; i++) {
      if (
        allEdges[i].target_id === nodeId &&
        allEdges[i].relationship_type !== "related"
      ) {
        parentEdge = allEdges[i];
        break;
      }
    }
    parentDisplay.textContent = parentEdge
      ? parentEdge.source_title || "(node " + parentEdge.source_id + ")"
      : "—";
  }

  panel.classList.add("admin-arbor-panel--open");
};

/**
 * Close the edit panel and deselect.
 */
Nodes.closeEditPanel = function () {
  const panel = document.getElementById("arbor-node-panel");
  if (panel) panel.classList.remove("admin-arbor-panel--open");
  selectedNodeId = null;
  Nodes.renderNodes();
};

/* ── Save / Remove node ────────────────────────────────────────────────────── */

/**
 * Save node edits (title only, since evidence fields are managed elsewhere).
 */
Nodes.onSaveNode = async function () {
  if (!selectedNodeId) return;

  const title = document.getElementById("arbor-node-title-input").value.trim();
  const errorEl = document.getElementById("arbor-node-error");
  if (errorEl) errorEl.textContent = "";

  if (!title) {
    if (errorEl) errorEl.textContent = "Title is required.";
    return;
  }

  try {
    const updated = await UpdateRecord.saveEvent(selectedNodeId, {
      title: title,
    });

    // Update local state
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === selectedNodeId) {
        nodes[i].title = updated.title;
        break;
      }
    }

    Nodes.closeEditPanel();
    Nodes.renderNodes();
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message;
  }
};

/**
 * Remove a node from the canvas (does not delete the evidence record).
 */
Nodes.onRemoveNode = async function () {
  if (!selectedNodeId) return;

  if (
    !confirm(
      "Remove this node from the canvas? The evidence record will not be deleted.",
    )
  )
    return;

  try {
    await UpdateRecord.removeNodePosition(selectedNodeId);
  } catch (err) {
    console.error("Failed to remove node position:", err);
  }

  nodes = nodes.filter(function (n) {
    return n.id !== selectedNodeId;
  });
  Nodes.closeEditPanel();
  Nodes.renderNodes();

  // Refresh edges since they may reference the removed node
  if (window.AdminArborEdges && window.AdminArborEdges.renderEdges) {
    window.AdminArborEdges.renderEdges();
  }

  // Refresh the pen — the removed evidence may need to reappear there
  if (window.AdminArborPen && window.AdminArborPen.refresh) {
    window.AdminArborPen.refresh();
  }
};

/* ── Auto parent-edge creation ──────────────────────────────────────────────── */

/**
 * Create (or update) a parent edge when a node is dropped onto another node.
 *
 * If the dragged node already has an incoming non-"related" edge, that edge's
 * source_id is re-pointed rather than duplicated. Otherwise a new edge is
 * created with the toolbar's selected relationship type.
 *
 * @param {number} parentId   - the evidence id of the parent node
 * @param {number} childId    - the evidence id of the dragged node
 * @param {Object} childNode  - the dragged node (for error display)
 */
Nodes.createParentEdge = async function (parentId, childId, childNode) {
  const allEdges =
    window.AdminArborEdges && window.AdminArborEdges.getAllEdges
      ? window.AdminArborEdges.getAllEdges()
      : [];

  // Determine relationship type from the toolbar dropdown
  const typeSelect = document.getElementById("arbor-edge-type-select");
  const relationshipType = typeSelect ? typeSelect.value : "supports";

  // Validate the connection
  const error =
    window.AdminArborEdges && window.AdminArborEdges.validateConnection
      ? window.AdminArborEdges.validateConnection(
          parentId,
          childId,
          relationshipType,
          allEdges,
        )
      : null;
  if (error) {
    if (typeof window.showToast === "function") {
      window.showToast(error, "error");
    }
    return;
  }

  // Check for an existing incoming non-"related" edge to update (re-point)
  let existingEdge = null;
  for (let i = 0; i < allEdges.length; i++) {
    if (
      allEdges[i].target_id === childId &&
      allEdges[i].relationship_type !== "related"
    ) {
      existingEdge = allEdges[i];
      break;
    }
  }

  try {
    if (existingEdge) {
      // Re-point the existing edge's source_id
      await UpdateRecord.updateEdge(existingEdge.id, {
        source_id: parentId,
        relationship_type: relationshipType,
      });
      existingEdge.source_id = parentId;
      existingEdge.relationship_type = relationshipType;
    } else {
      // Create a new edge
      const created = await UpdateRecord.saveEdge({
        source_id: parentId,
        target_id: childId,
        relationship_type: relationshipType,
      });
      allEdges.push(created);
    }

    // Refresh edge rendering and the edit panel (parent display)
    if (window.AdminArborEdges && window.AdminArborEdges.renderEdges) {
      window.AdminArborEdges.renderEdges();
    }
    if (selectedNodeId === childId) {
      Nodes.openEditPanel(childId);
    }
  } catch (err) {
    console.error("Failed to create parent edge:", err);
    if (typeof window.showToast === "function") {
      window.showToast("Failed to connect to parent node.", "error");
    }
  }
};

/* ── Drag-to-reposition ────────────────────────────────────────────────────── */

/**
 * Mouse-down on a node — begin drag.
 *
 * @param {MouseEvent} e
 * @param {Object} node
 */
Nodes.onNodeMouseDown = function (e, node) {
  if (addingMode) return;

  // Edge mode: delegate to the edges module for drawing connections
  if (
    window.AdminArborEdges &&
    window.AdminArborEdges.isEdgeMode &&
    window.AdminArborEdges.isEdgeMode()
  ) {
    window.AdminArborEdges.startEdgeDrag(e, node);
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  dragState = {
    node: node,
    startX: e.clientX,
    startY: e.clientY,
    origX: node.arbor_x || 0,
    origY: node.arbor_y || 0,
  };

  document.addEventListener("mousemove", Nodes.onNodeMouseMove);
  document.addEventListener("mouseup", Nodes.onNodeMouseUp);
};

/**
 * Mouse-move during node drag — update position visually.
 *
 * @param {MouseEvent} e
 */
Nodes.onNodeMouseMove = function (e) {
  if (!dragState) return;

  const tx = window.AdminArborCanvas.getTransform();
  const dx = (e.clientX - dragState.startX) / tx.scale;
  const dy = (e.clientY - dragState.startY) / tx.scale;

  const newX = dragState.origX + dx;
  const newY = dragState.origY + dy;

  // Update the node element position
  const el = document.querySelector(
    '[data-node-id="' + dragState.node.id + '"]',
  );
  if (el) {
    const rect = el.querySelector("rect");
    const titleEl = el.querySelector("text.admin-arbor-node-title");
    const verseEl = el.querySelector("text.admin-arbor-node-verse");
    if (rect) {
      rect.setAttribute("x", String(newX));
      rect.setAttribute("y", String(newY));
    }
    if (titleEl) {
      titleEl.setAttribute("x", String(newX + 10));
      titleEl.setAttribute("y", String(newY + 20));
    }
    if (verseEl) {
      verseEl.setAttribute("x", String(newX + 10));
      verseEl.setAttribute("y", String(newY + 40));
    }
  }

  // Update edge lines connected to this node
  if (window.AdminArborEdges && window.AdminArborEdges.repositionEdgesForNode) {
    window.AdminArborEdges.repositionEdgesForNode(
      dragState.node.id,
      newX,
      newY,
    );
  }
};

/**
 * Mouse-up during node drag — persist the new position server-side.
 * If the node was dropped on top of another node (parent), create/update
 * the parent edge automatically.
 * On failure, show an error toast and revert to the original position.
 *
 * @param {MouseEvent} e
 */
Nodes.onNodeMouseUp = function (e) {
  document.removeEventListener("mousemove", Nodes.onNodeMouseMove);
  document.removeEventListener("mouseup", Nodes.onNodeMouseUp);

  if (!dragState) return;

  const tx = window.AdminArborCanvas.getTransform();
  const dx = (e.clientX - dragState.startX) / tx.scale;
  const dy = (e.clientY - dragState.startY) / tx.scale;

  let newX = dragState.origX + dx;
  let newY = dragState.origY + dy;
  const nodeId = dragState.node.id;
  const origX = dragState.origX;
  const origY = dragState.origY;
  const draggedNode = dragState.node;

  dragState = null;

  // Hit-test: was the node dropped on top of another node?
  const centreX = newX + NODE_WIDTH / 2;
  const centreY = newY + NODE_HEIGHT / 2;
  const parentNode = Nodes.getNodeAtDiagramPosition(centreX, centreY, nodeId);
  if (parentNode) {
    // Offset the dragged node just below the parent so they don't overlap
    newX = parentNode.arbor_x || 0;
    newY = (parentNode.arbor_y || 0) + NODE_HEIGHT + 20;
  }

  // Update local state optimistically
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === nodeId) {
      nodes[i].arbor_x = newX;
      nodes[i].arbor_y = newY;
      break;
    }
  }

  // Persist position to server; revert on failure
  UpdateRecord.saveNodePosition(nodeId, newX, newY).catch(function (err) {
    console.error("Failed to save node position:", err);
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        nodes[i].arbor_x = origX;
        nodes[i].arbor_y = origY;
        break;
      }
    }
    Nodes.renderNodes();
    if (typeof window.showToast === "function") {
      window.showToast("Failed to save node position.", "error");
    }
  });

  // Auto-create parent edge if dropped on a parent node
  if (parentNode) {
    Nodes.createParentEdge(parentNode.id, nodeId, draggedNode);
  }

  Nodes.renderNodes();
  if (window.AdminArborEdges && window.AdminArborEdges.renderEdges) {
    window.AdminArborEdges.renderEdges();
  }
};

/* ── Search-to-add ─────────────────────────────────────────────────────────── */

/**
 * Toggle "Add Node" mode — opens the search dialog.
 */
Nodes.toggleAddMode = function () {
  addingMode = !addingMode;
  const dialog = document.getElementById("arbor-search-dialog");
  const btn = document.getElementById("add-arbor-node-btn");

  if (dialog) dialog.hidden = !addingMode;
  if (btn) {
    btn.classList.toggle("admin-arbor-toolbar__btn--active", addingMode);
    btn.textContent = addingMode ? "Cancel" : "Add Node";
  }

  if (addingMode) {
    searchQuery = "";
    const input = document.getElementById("arbor-node-search");
    if (input) {
      input.value = "";
      input.focus();
    }
    Nodes.renderSearchResults();
  }
};

/**
 * Close the search dialog.
 */
Nodes.closeSearchDialog = function () {
  addingMode = false;
  const dialog = document.getElementById("arbor-search-dialog");
  const btn = document.getElementById("add-arbor-node-btn");
  if (dialog) dialog.hidden = true;
  if (btn) {
    btn.classList.remove("admin-arbor-toolbar__btn--active");
    btn.textContent = "Add Node";
  }
};

/**
 * Search evidence and render result list.
 */
Nodes.renderSearchResults = async function () {
  const list = document.getElementById("arbor-search-results");
  if (!list) return;

  if (searchQuery.length < 2) {
    list.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "admin-arbor-search-empty";
    empty.textContent = "Type at least 2 characters to search evidence.";
    list.appendChild(empty);
    return;
  }

  list.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "admin-arbor-search-loading";
  loading.textContent = "Searching\u2026";
  list.appendChild(loading);

  try {
    const results = await Admin.api.get(
      "/search?q=" +
        encodeURIComponent(searchQuery) +
        "&type=evidence&limit=15",
    );
    list.innerHTML = "";

    if (!results || results.length === 0) {
      const none = document.createElement("p");
      none.className = "admin-arbor-search-empty";
      none.textContent = "No evidence found.";
      list.appendChild(none);
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      const row = document.createElement("button");
      row.className = "admin-arbor-search-item";
      row.type = "button";
      row.textContent = item.title || "(untitled)";

      // Don't allow adding nodes already on the canvas
      const alreadyAdded = Nodes.getNodeById(item.id);
      if (alreadyAdded) {
        row.disabled = true;
        row.textContent += " (already on canvas)";
      }

      row.addEventListener(
        "click",
        (function (it) {
          return function () {
            Nodes.addNodeToCanvas(it);
          };
        })(item),
      );

      list.appendChild(row);
    }
  } catch (err) {
    list.innerHTML = "";
    const errEl = document.createElement("p");
    errEl.className = "admin-arbor-search-error";
    errEl.textContent = "Search failed: " + err.message;
    list.appendChild(errEl);
  }
};

/**
 * Add an evidence record as a node on the canvas.
 * Persists the position to the server before rendering.
 *
 * @param {Object} evidence
 * @param {number} [diagX]     - diagram-space x (default: centre of view)
 * @param {number} [diagY]     - diagram-space y (default: centre of view)
 * @param {number} [parentId]  - if set, auto-create parent edge to this evidence id
 */
Nodes.addNodeToCanvas = async function (evidence, diagX, diagY, parentId) {
  // Prevent duplicates
  if (Nodes.getNodeById(evidence.id)) return;

  // Place near centre of current view unless coordinates given
  let nodeX, nodeY;
  if (diagX !== undefined && diagY !== undefined) {
    nodeX = Math.round(diagX);
    nodeY = Math.round(diagY);
  } else {
    const tx = window.AdminArborCanvas.getTransform();
    const svgEl = document.querySelector(".admin-arbor-svg");
    let centreScreenX = 300;
    let centreScreenY = 200;
    if (svgEl) {
      const rect = svgEl.getBoundingClientRect();
      centreScreenX = rect.width / 2;
      centreScreenY = rect.height / 2;
    }
    const diag = window.AdminArborCanvas.screenToDiagram(
      centreScreenX,
      centreScreenY,
      tx,
    );
    nodeX = Math.round(diag.x);
    nodeY = Math.round(diag.y);
  }

  // Persist position to server before rendering
  try {
    await UpdateRecord.saveNodePosition(evidence.id, nodeX, nodeY);
  } catch (err) {
    console.error("Failed to save new node position:", err);
    if (typeof window.showToast === "function") {
      window.showToast("Failed to save node position.", "error");
    }
    return;
  }

  const node = {
    id: evidence.id,
    title: evidence.title,
    slug: evidence.slug,
    primary_verse: evidence.primary_verse,
    description: evidence.description,
    published_draft:
      evidence.published_draft == null ? 1 : evidence.published_draft,
    arbor_x: nodeX,
    arbor_y: nodeY,
  };

  nodes.push(node);
  Nodes.closeSearchDialog();
  Nodes.renderNodes();

  // Auto-create parent edge if a parent was specified
  if (parentId !== undefined && parentId !== null) {
    Nodes.createParentEdge(parentId, evidence.id, node);
  }
};
