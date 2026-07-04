/**
 * Admin arbor nodes module.
 *
 * Loads evidence nodes from the arbor graph, renders them as draggable SVG
 * circles, supports search-to-add for placing new evidence on the canvas,
 * and persists positions via UpdateRecord.
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
};

/* ── Node loading ──────────────────────────────────────────────────────────── */

/**
 * Fetch the full arbor graph and render nodes and edges.
 *
 * @returns {Promise<void>}
 */
Nodes.loadNodes = async function () {
  try {
    const data = await Admin.api.get("/arbor");
    nodes = data.nodes || [];
    // Restore saved positions
    for (let i = 0; i < nodes.length; i++) {
      const pos = UpdateRecord.loadNodePosition(nodes[i].id);
      if (pos) {
        nodes[i].arbor_x = pos.x;
        nodes[i].arbor_y = pos.y;
      } else {
        // Default layout — spread nodes in a grid
        nodes[i].arbor_x = nodes[i].arbor_x || 100 + (i % 5) * 180;
        nodes[i].arbor_y = nodes[i].arbor_y || 100 + Math.floor(i / 5) * 140;
      }
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

  const cx = node.arbor_x || 0;
  const cy = node.arbor_y || 0;

  const circle = window.AdminArborCanvas.createNodeCircle(
    cx,
    cy,
    24,
    "admin-arbor-node",
  );
  if (node.id === selectedNodeId) {
    circle.classList.add("admin-arbor-node--selected");
  }
  g.appendChild(circle);

  // Short title label below the circle
  let labelText = node.title || "";
  if (labelText.length > 24) labelText = labelText.slice(0, 22) + "\u2026";
  const label = window.AdminArborCanvas.createNodeLabel(
    cx,
    cy + 38,
    labelText,
    "admin-arbor-node-label",
  );
  g.appendChild(label);

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
Nodes.onRemoveNode = function () {
  if (!selectedNodeId) return;

  if (
    !confirm(
      "Remove this node from the canvas? The evidence record will not be deleted.",
    )
  )
    return;

  nodes = nodes.filter(function (n) {
    return n.id !== selectedNodeId;
  });
  UpdateRecord.removeNodePosition(selectedNodeId);
  Nodes.closeEditPanel();
  Nodes.renderNodes();

  // Refresh edges since they may reference the removed node
  if (window.AdminArborEdges && window.AdminArborEdges.renderEdges) {
    window.AdminArborEdges.renderEdges();
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
    const circle = el.querySelector("circle");
    const label = el.querySelector("text");
    if (circle) {
      circle.setAttribute("cx", String(newX));
      circle.setAttribute("cy", String(newY));
    }
    if (label) {
      label.setAttribute("x", String(newX));
      label.setAttribute("y", String(newY + 38));
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
 * Mouse-up during node drag — persist the new position.
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

  const newX = dragState.origX + dx;
  const newY = dragState.origY + dy;

  // Update local state
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === dragState.node.id) {
      nodes[i].arbor_x = newX;
      nodes[i].arbor_y = newY;
      break;
    }
  }

  // Persist position
  UpdateRecord.saveNodePosition(dragState.node.id, newX, newY);

  dragState = null;
  Nodes.renderNodes();
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
 *
 * @param {Object} evidence
 */
Nodes.addNodeToCanvas = function (evidence) {
  // Prevent duplicates
  if (Nodes.getNodeById(evidence.id)) return;

  // Place new node near the centre of the current view
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

  const node = {
    id: evidence.id,
    title: evidence.title,
    slug: evidence.slug,
    primary_verse: evidence.primary_verse,
    description: evidence.description,
    arbor_x: diag.x,
    arbor_y: diag.y,
  };

  nodes.push(node);
  UpdateRecord.saveNodePosition(node.id, node.arbor_x, node.arbor_y);

  Nodes.closeSearchDialog();
  Nodes.renderNodes();
};
