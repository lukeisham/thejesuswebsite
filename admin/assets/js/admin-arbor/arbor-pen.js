/**
 * Admin arbor holding pen module.
 *
 * Fetches unplaced evidence from GET /arbor/admin/unplaced and renders
 * draggable chips in a side panel. Chips can be dragged onto the canvas
 * to place a node. Dropping onto an existing node opens the connect menu
 * to choose the relationship type before creating the parent edge.
 * Uses HTML5 drag-and-drop.
 *
 * @module admin-arbor/arbor-pen
 */

window.AdminArborPen = {};
const Pen = window.AdminArborPen;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>} */
let chips = [];

/** @type {HTMLElement|null} */
let penPanel = null;

/** @type {HTMLElement|null} */
let chipList = null;

/** @type {HTMLElement|null} */
let penEmpty = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Wire DOM events and load the pen contents.
 */
Pen.init = function () {
  penPanel = document.getElementById("arbor-pen-panel");
  chipList = document.getElementById("arbor-pen-list");
  penEmpty = document.getElementById("arbor-pen-empty");

  Pen.loadChips();
};

/* ── Data loading ──────────────────────────────────────────────────────────── */

/**
 * Fetch unplaced evidence and render chips.
 *
 * @returns {Promise<void>}
 */
Pen.loadChips = async function () {
  if (!chipList) return;

  // Loading state — make sure the list is visible in case a previous
  // empty render hid it (loading/error messages render inside it).
  chipList.hidden = false;
  if (penEmpty) penEmpty.hidden = true;
  chipList.innerHTML = "";
  const loading = document.createElement("p");
  loading.className = "admin-arbor-pen__loading";
  loading.textContent = "Loading\u2026";
  chipList.appendChild(loading);

  try {
    const data = await Admin.api.get("/arbor/admin/unplaced");
    chips = data || [];
    Pen.renderChips();
  } catch (err) {
    console.error("Failed to load unplaced evidence:", err);
    chipList.innerHTML = "";
    const error = document.createElement("p");
    error.className = "admin-arbor-pen__error";
    error.textContent = "Failed to load evidence.";
    chipList.appendChild(error);
  }
};

/* ── Rendering ─────────────────────────────────────────────────────────────── */

/**
 * Update the chip list and empty-state visibility.
 */
Pen.renderChips = function () {
  if (!chipList || !penEmpty) return;

  chipList.innerHTML = "";

  if (chips.length === 0) {
    penEmpty.hidden = false;
    chipList.hidden = true;
    return;
  }

  penEmpty.hidden = true;
  chipList.hidden = false;

  for (let i = 0; i < chips.length; i++) {
    const chip = Pen.createChipElement(chips[i]);
    chipList.appendChild(chip);
  }
};

/**
 * Create a single draggable chip for an evidence record.
 *
 * @param {Object} evidence
 * @returns {HTMLButtonElement}
 */
Pen.createChipElement = function (evidence) {
  const chip = document.createElement("button");
  chip.className = "admin-arbor-pen__chip";
  chip.type = "button";
  chip.setAttribute("draggable", "true");
  chip.setAttribute("data-evidence-id", String(evidence.id));

  // Title
  const titleSpan = document.createElement("span");
  titleSpan.className = "admin-arbor-pen__chip-title";
  titleSpan.textContent = evidence.title || "(untitled)";
  chip.appendChild(titleSpan);

  // Status badge
  const badge = document.createElement("span");
  badge.className =
    evidence.published_draft === 1
      ? "admin-arbor-pen__badge admin-arbor-pen__badge--published"
      : "admin-arbor-pen__badge admin-arbor-pen__badge--draft";
  badge.textContent = evidence.published_draft === 1 ? "Published" : "Draft";
  chip.appendChild(badge);

  // ── HTML5 drag events ──────────────────────────────────────────────────
  chip.addEventListener("dragstart", function (e) {
    e.dataTransfer.setData("text/plain", String(evidence.id));
    e.dataTransfer.effectAllowed = "move";
    chip.classList.add("admin-arbor-pen__chip--dragging");
  });

  chip.addEventListener("dragend", function () {
    chip.classList.remove("admin-arbor-pen__chip--dragging");
    // Remove drop highlights from all nodes when the drag ends
    Pen.clearDropHighlights();
  });

  return chip;
};

/* ── Drop target handling ──────────────────────────────────────────────────── */

/**
 * Set up drop listeners on the canvas area. Called from the bootstrap script
 * after the canvas is initialised.
 */
Pen.setupCanvasDropTarget = function () {
  const canvas = document.getElementById("arbor-canvas");
  if (!canvas) return;

  canvas.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  canvas.addEventListener("drop", async function (e) {
    e.preventDefault();
    const evidenceId = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(evidenceId) || evidenceId < 1) return;

    await Pen.handleDrop(e.clientX, e.clientY, evidenceId);
  });
};

/**
 * Handle a chip drop — convert screen coordinates to diagram space, find
 * any node under the cursor, then either create a standalone node or open
 * the connect menu to attach as a child of the chosen relationship type.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} evidenceId
 */
Pen.handleDrop = async function (clientX, clientY, evidenceId) {
  const evidence = Pen.findChip(evidenceId);
  if (!evidence) return;

  // Convert drop point to diagram-space coordinates
  const tx = window.AdminArborCanvas.getTransform();
  const svgEl = document.querySelector(".admin-arbor-svg");
  let diagX = clientX;
  let diagY = clientY;
  if (svgEl) {
    const svgRect = svgEl.getBoundingClientRect();
    const screenX = clientX - svgRect.left;
    const screenY = clientY - svgRect.top;
    const diag = window.AdminArborCanvas.screenToDiagram(screenX, screenY, tx);
    diagX = diag.x;
    diagY = diag.y;
  }

  // Hit-test: is there a node under the drop point?
  let parentId = null;
  let parentNode = null;
  if (
    window.AdminArborNodes &&
    window.AdminArborNodes.getNodeAtDiagramPosition
  ) {
    parentNode = window.AdminArborNodes.getNodeAtDiagramPosition(diagX, diagY);
    if (parentNode) {
      parentId = parentNode.id;
      // Offset the new node just below the parent
      diagX = parentNode.arbor_x || 0;
      diagY =
        (parentNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT + 20;
    }
  }

  // Add the node to the canvas first (standalone)
  if (window.AdminArborNodes && window.AdminArborNodes.addNodeToCanvas) {
    await window.AdminArborNodes.addNodeToCanvas(evidence, diagX, diagY, null);
  }

  // If dropped on an existing node, open the connect menu to choose the
  // relationship type, then create the parent edge.
  if (
    parentNode &&
    window.AdminArborConnectMenu &&
    window.AdminArborConnectMenu.open
  ) {
    var chosenType = await window.AdminArborConnectMenu.open(clientX, clientY);
    if (chosenType && window.AdminArborNodes.createParentEdge) {
      await window.AdminArborNodes.createParentEdge(
        parentNode.id,
        evidence.id,
        chosenType,
        { id: evidence.id },
      );
    }
  }

  // Remove the chip from the pen
  Pen.removeChip(evidenceId);
};

/**
 * Find an unplaced evidence record by id in the chip list.
 *
 * @param {number} id
 * @returns {Object|undefined}
 */
Pen.findChip = function (id) {
  for (let i = 0; i < chips.length; i++) {
    if (chips[i].id === id) return chips[i];
  }
  return undefined;
};

/**
 * Remove a chip from the local list and re-render.
 *
 * @param {number} evidenceId
 */
Pen.removeChip = function (evidenceId) {
  chips = chips.filter(function (c) {
    return c.id !== evidenceId;
  });
  Pen.renderChips();
};

/* ── Drop highlight helpers ─────────────────────────────────────────────────── */

/**
 * Add a drop-highlight class to all canvas nodes (called on dragover).
 */
Pen.highlightDropTargets = function () {
  const groups = document.querySelectorAll(".admin-arbor-node-group");
  for (let i = 0; i < groups.length; i++) {
    groups[i].classList.add("admin-arbor-node--pen-drop");
  }
};

/**
 * Remove drop-highlight from all canvas nodes (called on dragleave/drop/dragend).
 */
Pen.clearDropHighlights = function () {
  const groups = document.querySelectorAll(".admin-arbor-node--pen-drop");
  for (let i = 0; i < groups.length; i++) {
    groups[i].classList.remove("admin-arbor-node--pen-drop");
  }
};

/**
 * Refresh the pen after a node is removed from the canvas (e.g. "Remove from
 * Canvas" in the edit panel) — the evidence may need to reappear in the pen.
 * Callers should re-fetch from the API.
 */
Pen.refresh = function () {
  Pen.loadChips();
};
