/**
 * Admin arbor canvas module.
 *
 * Renders the arbor diagram as an SVG with zoom/pan and exposes pure coordinate
 * helpers to convert between screen pixels and diagram-space coordinates.
 * All math functions are DOM-free and exported so tests can exercise them
 * without a browser (see admin/tests/admin-arbor.test.js).
 *
 * @module admin-arbor/arbor-canvas
 */

window.AdminArborCanvas = {};
const Canvas = window.AdminArborCanvas;

/* ── State ─────────────────────────────────────────────────────────────────── */

/** @type {SVGSVGElement|null} */
let svg = null;

/** @type {SVGGElement|null} */
let transformGroup = null;

/** @type {{ x: number, y: number, scale: number }} */
let transform = { x: 0, y: 0, scale: 1 };

/** Minimum and maximum zoom levels. */
const MIN_SCALE = 0.05;
const MAX_SCALE = 1.0;

/** @type {boolean} */
let panning = false;

/** @type {{ startX: number, startY: number, origX: number, origY: number }|null} */
let panState = null;

/* ── Initialisation ────────────────────────────────────────────────────────── */

/**
 * Create the SVG canvas inside a container element and wire zoom/pan events.
 * Call once on page load.
 *
 * @param {HTMLElement} container  - the DOM element that will hold the SVG
 */
Canvas.init = function (container) {
  if (!container) return;

  var ns = "http://www.w3.org/2000/svg";
  svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "admin-arbor-svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.overflow = "hidden";

  transformGroup = document.createElementNS(ns, "g");
  transformGroup.setAttribute("class", "admin-arbor-transform-group");
  svg.appendChild(transformGroup);

  // Zoom via wheel
  svg.addEventListener("wheel", Canvas.onWheel, { passive: false });

  // Pan via mouse drag on background
  svg.addEventListener("mousedown", Canvas.onSvgMouseDown);
  document.addEventListener("mousemove", Canvas.onSvgMouseMove);
  document.addEventListener("mouseup", Canvas.onSvgMouseUp);

  container.appendChild(svg);
  Canvas.applyTransform();
};

/**
 * Return the <g> element that contains all rendered nodes and edges.
 * Other modules append their DOM to this group so zoom/pan applies to everything.
 *
 * @returns {SVGGElement|null}
 */
Canvas.getTransformGroup = function () {
  return transformGroup;
};

/**
 * Return the current transform state.
 *
 * @returns {{ x: number, y: number, scale: number }}
 */
Canvas.getTransform = function () {
  return { x: transform.x, y: transform.y, scale: transform.scale };
};

/* ── Rendering helpers ─────────────────────────────────────────────────────── */

/**
 * Create an SVG circle element for an arbor node.
 *
 * @param {number} cx    - diagram-space x
 * @param {number} cy    - diagram-space y
 * @param {number} r     - radius
 * @param {string} className
 * @returns {SVGCircleElement}
 */
Canvas.createNodeCircle = function (cx, cy, r, className) {
  var ns = "http://www.w3.org/2000/svg";
  var circle = document.createElementNS(ns, "circle");
  circle.setAttribute("cx", String(cx));
  circle.setAttribute("cy", String(cy));
  circle.setAttribute("r", String(r));
  circle.setAttribute("class", className || "admin-arbor-node");
  return circle;
};

/**
 * Create an SVG text element for a node label.
 *
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {string} className
 * @returns {SVGTextElement}
 */
Canvas.createNodeLabel = function (x, y, text, className) {
  var ns = "http://www.w3.org/2000/svg";
  var textEl = document.createElementNS(ns, "text");
  textEl.setAttribute("x", String(x));
  textEl.setAttribute("y", String(y));
  textEl.setAttribute("text-anchor", "middle");
  textEl.setAttribute("class", className || "admin-arbor-node-label");
  textEl.textContent = text;
  return textEl;
};

/**
 * Create an SVG line element for an arbor edge.
 *
 * @param {number} x1  - source node diagram-space x
 * @param {number} y1  - source node diagram-space y
 * @param {number} x2  - target node diagram-space x
 * @param {number} y2  - target node diagram-space y
 * @param {string} className
 * @returns {SVGLineElement}
 */
Canvas.createEdgeLine = function (x1, y1, x2, y2, className) {
  var ns = "http://www.w3.org/2000/svg";
  var line = document.createElementNS(ns, "line");
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
  line.setAttribute("class", className || "admin-arbor-edge");
  return line;
};

/* ── Pure coordinate helpers ───────────────────────────────────────────────── */

/**
 * Convert a screen (client) coordinate relative to the SVG element into
 * diagram-space coordinates, accounting for the current pan/zoom transform.
 *
 * @param {number} screenX  - mouse clientX relative to SVG
 * @param {number} screenY  - mouse clientY relative to SVG
 * @param {{ x: number, y: number, scale: number }} tx  - current transform
 * @returns {{ x: number, y: number }}
 */
Canvas.screenToDiagram = function (screenX, screenY, tx) {
  if (!tx || tx.scale === 0) return { x: screenX, y: screenY };
  return {
    x: (screenX - tx.x) / tx.scale,
    y: (screenY - tx.y) / tx.scale,
  };
};

/**
 * Convert a diagram-space coordinate to a screen coordinate within the SVG,
 * accounting for the current pan/zoom transform.
 *
 * @param {number} diagX
 * @param {number} diagY
 * @param {{ x: number, y: number, scale: number }} tx
 * @returns {{ x: number, y: number }}
 */
Canvas.diagramToScreen = function (diagX, diagY, tx) {
  if (!tx) return { x: diagX, y: diagY };
  return {
    x: diagX * tx.scale + tx.x,
    y: diagY * tx.scale + tx.y,
  };
};

/* ── Zoom / Pan ────────────────────────────────────────────────────────────── */

/**
 * Zoom in by a factor, centred on the current view.
 */
Canvas.zoomIn = function () {
  var newScale = Math.min(transform.scale * 1.25, MAX_SCALE);
  if (newScale === transform.scale) return;
  transform.scale = newScale;
  Canvas.applyTransform();
};

/**
 * Zoom out by a factor, centred on the current view.
 */
Canvas.zoomOut = function () {
  var newScale = Math.max(transform.scale / 1.25, MIN_SCALE);
  if (newScale === transform.scale) return;
  transform.scale = newScale;
  Canvas.applyTransform();
};

/**
 * Handle mouse wheel for zoom.
 *
 * @param {WheelEvent} e
 */
Canvas.onWheel = function (e) {
  e.preventDefault();
  var rect = svg.getBoundingClientRect();
  var mouseX = e.clientX - rect.left;
  var mouseY = e.clientY - rect.top;

  var diag = Canvas.screenToDiagram(mouseX, mouseY, transform);

  var factor = e.deltaY < 0 ? 1.1 : 0.9;
  var newScale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, transform.scale * factor),
  );

  // Adjust pan so the point under the cursor stays fixed
  transform.x = mouseX - diag.x * newScale;
  transform.y = mouseY - diag.y * newScale;
  transform.scale = newScale;

  Canvas.applyTransform();
};

/* ── Pan ───────────────────────────────────────────────────────────────────── */

/**
 * Mouse-down on SVG background begins panning.
 *
 * @param {MouseEvent} e
 */
Canvas.onSvgMouseDown = function (e) {
  // Only pan if we clicked on the background, not a node or edge
  if (e.target !== svg && e.target !== transformGroup) return;

  panning = true;
  panState = {
    startX: e.clientX,
    startY: e.clientY,
    origX: transform.x,
    origY: transform.y,
  };
};

/**
 * Mouse-move while panning.
 *
 * @param {MouseEvent} e
 */
Canvas.onSvgMouseMove = function (e) {
  if (!panning || !panState) return;
  transform.x = panState.origX + (e.clientX - panState.startX);
  transform.y = panState.origY + (e.clientY - panState.startY);
  Canvas.applyTransform();
};

/**
 * Mouse-up ends panning.
 */
Canvas.onSvgMouseUp = function () {
  panning = false;
  panState = null;
};

/* ── Internal ──────────────────────────────────────────────────────────────── */

/**
 * Apply the current transform to the inner <g> element.
 */
Canvas.applyTransform = function () {
  if (!transformGroup) return;
  var t =
    "translate(" +
    transform.x +
    ", " +
    transform.y +
    ") scale(" +
    transform.scale +
    ")";
  transformGroup.setAttribute("transform", t);
};
