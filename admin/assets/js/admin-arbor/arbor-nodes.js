/**
 * Admin arbor nodes module.
 *
 * Loads evidence nodes from the arbor graph, renders them as draggable
 * public-style rounded-rect nodes (WYSIWYG), and persists positions
 * server-side via UpdateRecord. Left-drag moves, left-click opens the
 * edit panel, right-click delegates to the edges module's click-click
 * connect flow (arm the source, then right-click a target to connect).
 *
 * Depends on AdminArborCanvas for rendering and coordinate conversion.
 *
 * @module admin-arbor/arbor-nodes
 */

window.AdminArborNodes = {};

(function () {
  const Nodes = window.AdminArborNodes;

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /** @type {Array<Object>} */
  let nodes = [];

  /** @type {Object|null}  Node currently being dragged. */
  let dragState = null;

  /** @type {number|null} */
  let selectedNodeId = null;

  /** Node dimensions from the shared geometry (matches public arbor). */
  const NODE_WIDTH = window.AdminArborGeometry.NODE_WIDTH;
  const NODE_HEIGHT = window.AdminArborGeometry.NODE_HEIGHT;
  const NODE_RX = 8;

  /* ── Initialisation ────────────────────────────────────────────────────────── */

  /**
   * Wire DOM events for the node edit panel.
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
      const allNodes = data.nodes || [];
      nodes = [];
      for (let i = 0; i < allNodes.length; i++) {
        const n = allNodes[i];
        if (
          n.x != null &&
          n.y != null &&
          Number.isFinite(n.x) &&
          Number.isFinite(n.y)
        ) {
          n.arbor_x = n.x;
          n.arbor_y = n.y;
          n.published_draft = n.published_draft == null ? 1 : n.published_draft;
          nodes.push(n);
        }
      }
      Nodes.renderNodes();
      if (window.AdminArborEdges && window.AdminArborEdges.loadEdges) {
        await window.AdminArborEdges.loadEdges();
      }
    } catch (err) {
      console.error("Failed to load arbor nodes:", err);
      const canvas = document.getElementById("arbor-canvas");
      if (canvas) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "admin-arbor-error-overlay";
        errorDiv.setAttribute("role", "alert");
        errorDiv.setAttribute("aria-live", "polite");
        if (err?.status === 401 || err?.status === 403) {
          errorDiv.textContent = "Access denied. Please log in again.";
        } else {
          errorDiv.textContent = "Failed to load canvas. Please refresh the page.";
        }
        canvas.appendChild(errorDiv);
      }
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

  /* ── Text wrapping helper ──────────────────────────────────────────────────── */

  // Shared offscreen canvas for measuring text width (SR-3: create once, reuse)
  let _measureCtx = null;

  /**
   * Split text into lines that fit within maxWidth pixels when rendered
   * in the node title font (Georgia 18px bold).  Uses canvas measureText
   * when available, falls back to a char-count estimate otherwise.
   *
   * @param {string}  text
   * @param {number}  maxWidth
   * @param {number}  [maxLines=3]
   * @returns {string[]}
   */
  function wrapTextToWidth(text, maxWidth, maxLines) {
    if (!text) return [];
    maxLines = maxLines || 3;

    // Estimate: Georgia at 18px ≈ 9–10 px/char.  Use 7 for safety margin
    // so we slightly over-wrap rather than overflow.
    var charsPerLine = Math.floor(maxWidth / 7);

    // If canvas is available, use accurate measurement
    var useCanvas = false;
    try {
      if (!_measureCtx) {
        var cvs = document.createElement("canvas");
        _measureCtx = cvs.getContext("2d");
      }
      if (_measureCtx) {
        _measureCtx.font = "600 18px Georgia, serif";
        useCanvas = true;
      }
    } catch (_) { /* canvas unavailable — use char estimate */ }

    var words = text.split(" ");
    var lines = [];
    var current = "";

    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      var test = current ? current + " " + word : word;

      var testWidth;
      if (useCanvas) {
        testWidth = _measureCtx.measureText(test).width;
      } else {
        testWidth = test.length;
        // Convert char count to estimated px (each char ≈ 9px average)
        testWidth = testWidth * 9;
      }

      if (testWidth > maxWidth && current) {
        lines.push(current);
        if (lines.length >= maxLines) break;
        current = word;
      } else {
        current = test;
      }
    }

    if (current && lines.length < maxLines) {
      lines.push(current);
    }

    // If a single word is too long for one line, break by character
    // instead of leaving it to overflow.
    for (var i = 0; i < lines.length; i++) {
      var lineWidth;
      if (useCanvas) {
        lineWidth = _measureCtx.measureText(lines[i]).width;
      } else {
        lineWidth = lines[i].length * 9;
      }
      if (lineWidth > maxWidth && lines[i].indexOf(" ") === -1) {
        // Single long word — character-level split
        var longWord = lines[i];
        var chars = [];
        var chunk = "";
        for (var c = 0; c < longWord.length; c++) {
          var next = chunk + longWord[c];
          var nextWidth;
          if (useCanvas) {
            nextWidth = _measureCtx.measureText(next).width;
          } else {
            nextWidth = next.length * 9;
          }
          if (nextWidth > maxWidth && chunk) {
            chars.push(chunk);
            chunk = longWord[c];
          } else {
            chunk = next;
          }
        }
        if (chunk) chars.push(chunk);
        // Splice in the character-chunks, respecting maxLines
        lines.splice(i, 1);
        for (var ci = 0; ci < chars.length && lines.length < maxLines; ci++) {
          lines.splice(i + ci, 0, chars[ci]);
        }
        break;
      }
    }

    // Truncate final line if it still overflows after splitting
    if (lines.length >= maxLines) {
      var last = lines[maxLines - 1];
      // Conservative truncation: cut to charsPerLine and append ellipsis
      if (last.length > charsPerLine + 2) {
        lines[maxLines - 1] = last.slice(0, charsPerLine - 1) + "\u2026";
      }
      lines = lines.slice(0, maxLines);
    }

    return lines.length ? lines : [text.slice(0, charsPerLine)];
  }

  /**
   * Create the SVG element group for a single node.
   * Renders a public-style rounded-rect with title + verse.
   * Right-click delegates to the edges module's click-click connect flow.
   *
   * @param {Object} node
   * @returns {SVGGElement}
   */
  Nodes.createNodeElement = function (node) {
    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "admin-arbor-node-group");
    g.setAttribute("data-node-id", String(node.id));
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", (node.title || "Untitled") + " — Enter to edit, C to connect");
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

    // Title text — wrapped across multiple <tspan> lines so long titles
    // fit inside the 200px-wide node instead of overflowing the rect.
    var titleText = node.title || "";
    if (titleText.length > 28) titleText = titleText.slice(0, 26) + "\u2026";
    var maxTextWidth = NODE_WIDTH - 16; // 8px padding each side
    var titleLines = wrapTextToWidth(titleText, maxTextWidth, 3);

    var titleEl = document.createElementNS(ns, "text");
    titleEl.setAttribute("class", "admin-arbor-node-title");
    // x is set per-tspan for centering; y is the baseline of the first line
    titleEl.setAttribute("y", String(y + 20));

    for (var tl = 0; tl < titleLines.length; tl++) {
      var tspan = document.createElementNS(ns, "tspan");
      tspan.setAttribute("x", String(x + NODE_WIDTH / 2));
      if (tl > 0) tspan.setAttribute("dy", "1.3em");
      tspan.textContent = titleLines[tl];
      titleEl.appendChild(tspan);
    }
    g.appendChild(titleEl);

    // Verse text (italic, muted) — positioned below the last title line
    var verseText = node.primary_verse || "";
    if (verseText) {
      var verseY = y + 20 + titleLines.length * 22;
      var verseEl = document.createElementNS(ns, "text");
      verseEl.setAttribute("x", String(x + NODE_WIDTH / 2));
      verseEl.setAttribute("y", String(verseY));
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

    // Left-click: select / edit
    g.addEventListener("click", function (e) {
      e.stopPropagation();
      Nodes.selectNode(node.id);
    });

    // Wire mousedown: left for drag, right for connect
    g.addEventListener("mousedown", function (e) {
      Nodes.onNodeMouseDown(e, node);
    });

    // Right-click: arm/complete a connection (click-click gesture)
    g.addEventListener("contextmenu", function (e) {
      if (window.AdminArborEdges && window.AdminArborEdges.onNodeContextMenu) {
        window.AdminArborEdges.onNodeContextMenu(e, node, g);
      } else {
        e.preventDefault();
      }
    });

    // Keyboard support: Enter to edit, C to connect
    g.addEventListener("keydown", function (e) {
      Nodes.onNodeKeyDown(e, node);
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

  /* ── Parent edge creation (called by pen module) ────────────────────────────── */

  /**
   * Create (or update) a parent edge with a specific relationship type.
   *
   * If the child node already has an incoming non-"related" edge, that edge's
   * source_id is re-pointed rather than duplicated. Otherwise a new edge is
   * created with the given relationship type.
   *
   * @param {number} parentId      - the evidence id of the parent node
   * @param {number} childId       - the evidence id of the child node
   * @param {string} relationshipType
   * @param {Object} childNode     - the child node (for error display)
   */
  Nodes.createParentEdge = async function (
    parentId,
    childId,
    relationshipType,
    childNode,
  ) {
    const allEdges =
      window.AdminArborEdges && window.AdminArborEdges.getAllEdges
        ? window.AdminArborEdges.getAllEdges()
        : [];

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
   * Keyboard handler for node keydown.
   * Enter or Space: select and open edit panel.
   * C: start keyboard-driven edge connection.
   *
   * @param {KeyboardEvent} e
   * @param {Object} node
   */
  Nodes.onNodeKeyDown = function (e, node) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      Nodes.selectNode(node.id);
      return;
    }
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      if (window.AdminArborEdges && window.AdminArborEdges.startEdgeConnectFromKeyboard) {
        window.AdminArborEdges.startEdgeConnectFromKeyboard(node, e.currentTarget);
      }
    }
  };

  /**
   * Mouse-down on a node.
   * Left button: start position drag.
   * Right button: no-op — connecting is handled by the node's contextmenu
   * listener (see createNodeElement), not by mousedown.
   *
   * @param {MouseEvent} e
   * @param {Object} node
   */
  Nodes.onNodeMouseDown = function (e, node) {
    if (e.button === 2) return;

    // Left button: drag to move
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
      const rect = el.querySelector("rect.admin-arbor-node, rect");
      const titleEl = el.querySelector("text.admin-arbor-node-title");
      const verseEl = el.querySelector("text.admin-arbor-node-verse");
      const badgeRect = el.querySelector("rect.admin-arbor-node-draft-badge");
      const badgeText = el.querySelector("text.admin-arbor-node-draft-label");
      if (rect) {
        rect.setAttribute("x", String(newX));
        rect.setAttribute("y", String(newY));
      }
      if (titleEl) {
        titleEl.setAttribute("x", String(newX + NODE_WIDTH / 2));
        titleEl.setAttribute("y", String(newY + 20));
      }
      if (verseEl) {
        verseEl.setAttribute("x", String(newX + NODE_WIDTH / 2));
        verseEl.setAttribute("y", String(newY + 40));
      }
      if (badgeRect) {
        badgeRect.setAttribute("x", String(newX + NODE_WIDTH - 52));
        badgeRect.setAttribute("y", String(newY + NODE_HEIGHT - 22));
      }
      if (badgeText) {
        badgeText.setAttribute("x", String(newX + NODE_WIDTH - 30));
        badgeText.setAttribute("y", String(newY + NODE_HEIGHT - 9));
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
   * No longer auto-creates parent edges (dropping a node on another no
   * longer silently rewires it).
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

    const newX = dragState.origX + dx;
    const newY = dragState.origY + dy;
    const nodeId = dragState.node.id;
    const origX = dragState.origX;
    const origY = dragState.origY;

    dragState = null;

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

    Nodes.renderNodes();
    if (window.AdminArborEdges && window.AdminArborEdges.renderEdges) {
      window.AdminArborEdges.renderEdges();
    }
  };

  /* ── Add node to canvas ────────────────────────────────────────────────────── */

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

    let nodeX, nodeY;
    if (diagX !== undefined && diagY !== undefined) {
      nodeX = Math.round(diagX);
      nodeY = Math.round(diagY);
    } else {
      const svgEl = document.querySelector(".admin-arbor-svg");
      let centreScreenX = 300;
      let centreScreenY = 200;
      if (svgEl) {
        const rect = svgEl.getBoundingClientRect();
        centreScreenX = rect.width / 2;
        centreScreenY = rect.height / 2;
      }
      const tx = window.AdminArborCanvas.getTransform();
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
    Nodes.renderNodes();

    // Auto-create parent edge if a parent was specified
    if (parentId !== undefined && parentId !== null) {
      Nodes.createParentEdge(parentId, evidence.id, "supports", node);
    }
  };
})();
