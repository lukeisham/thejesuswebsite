/**
 * Admin maps grid overlay module.
 *
 * Creates a 20x20 reference grid overlay on the map editor canvas.
 * The grid is 20 columns (A-T, each 5% width) × 20 rows (1-20, each 5% height).
 * Grid cells are referenced as letter+number (e.g. "M12").
 *
 * The grid is built once at init and left in the DOM, automatically staying
 * aligned with the map image since it uses percentage-based positioning within
 * the canvas container.
 *
 * @module admin-maps/maps-grid
 */

window.AdminMapsGrid = {};
const Grid = window.AdminMapsGrid;

/* ── Constants ───────────────────────────────────────────────────────────── */

/** Grid has 20 columns, 20 rows, each cell is 5% of the canvas dimension. */
const GRID_COLUMNS = 20;
const GRID_ROWS = 20;
const CELL_PERCENT = 5; // Each cell is 5% of the canvas width/height

/* ── DOM initialization ──────────────────────────────────────────────────── */

/**
 * Initialize the grid overlay. Creates a 20×20 grid layer with vertical and
 * horizontal lines, column labels (A-T), and row labels (1-20).
 *
 * Called once at page bootstrap via DOMContentLoaded.
 */
Grid.init = function () {
  const mapCanvas = document.getElementById("map-canvas");
  if (!mapCanvas) {
    console.error("Map canvas element not found; grid initialization skipped.");
    return;
  }

  // Create the grid container layer (position: absolute; inset: 0).
  const gridLayer = document.createElement("div");
  gridLayer.id = "map-grid-layer";
  gridLayer.className = "admin-map-grid-layer";
  gridLayer.setAttribute("aria-hidden", "true");

  // Append grid layer as the first child, so it renders behind the image and pins.
  mapCanvas.insertBefore(gridLayer, mapCanvas.firstChild);

  // Build vertical lines (21 lines: one per boundary, including both edges).
  _createVerticalLines(gridLayer);

  // Build horizontal lines (21 lines: one per boundary, including both edges).
  _createHorizontalLines(gridLayer);

  // Build column labels (A-T, positioned at each column's center).
  _createColumnLabels(gridLayer);

  // Build row labels (1-20, positioned at each row's center).
  _createRowLabels(gridLayer);
};

/* ── Internal helpers ────────────────────────────────────────────────────── */

/**
 * Create 21 vertical lines at 0%, 5%, 10%, ..., 100%.
 *
 * @param {HTMLElement} container - The grid layer container.
 */
function _createVerticalLines(container) {
  for (var i = 0; i <= GRID_COLUMNS; i++) {
    var line = document.createElement("div");
    line.className = "admin-map-grid-line admin-map-grid-line--v";
    line.style.left = i * CELL_PERCENT + "%";
    container.appendChild(line);
  }
}

/**
 * Create 21 horizontal lines at 0%, 5%, 10%, ..., 100%.
 *
 * @param {HTMLElement} container - The grid layer container.
 */
function _createHorizontalLines(container) {
  for (var i = 0; i <= GRID_ROWS; i++) {
    var line = document.createElement("div");
    line.className = "admin-map-grid-line admin-map-grid-line--h";
    line.style.top = i * CELL_PERCENT + "%";
    container.appendChild(line);
  }
}

/**
 * Create 20 column labels (A-T) positioned at each column's center.
 * Each label is centered horizontally on its column (2.5%, 7.5%, ..., 97.5%).
 *
 * @param {HTMLElement} container - The grid layer container.
 */
function _createColumnLabels(container) {
  for (var i = 0; i < GRID_COLUMNS; i++) {
    var label = document.createElement("span");
    label.className = "admin-map-grid-label admin-map-grid-label--col";
    // Position at column center: 2.5%, 7.5%, etc.
    label.style.left = i * CELL_PERCENT + CELL_PERCENT / 2 + "%";
    // Text: A (65) through T (84)
    label.textContent = String.fromCharCode(65 + i);
    container.appendChild(label);
  }
}

/**
 * Create 20 row labels (1-20) positioned at each row's center.
 * Each label is centered vertically on its row (2.5%, 7.5%, ..., 97.5%).
 *
 * @param {HTMLElement} container - The grid layer container.
 */
function _createRowLabels(container) {
  for (var i = 0; i < GRID_ROWS; i++) {
    var label = document.createElement("span");
    label.className = "admin-map-grid-label admin-map-grid-label--row";
    // Position at row center: 2.5%, 7.5%, etc.
    label.style.top = i * CELL_PERCENT + CELL_PERCENT / 2 + "%";
    // Text: 1 through 20
    label.textContent = String(i + 1);
    container.appendChild(label);
  }
}

/* ── Pure coordinate helper ──────────────────────────────────────────────── */

/**
 * Convert a percentage-based coordinate to a grid cell reference.
 *
 * Given an x/y position as percentages (0-100) on the map, returns a cell
 * reference string like "M12" (column M, row 12). This is a pure function
 * with no DOM dependencies, suitable for unit testing.
 *
 * @param {number} pctX - X position as a percentage (0-100).
 * @param {number} pctY - Y position as a percentage (0-100).
 * @returns {string} - Cell reference (e.g., "M12").
 */
Grid.percentToCell = function (pctX, pctY) {
  // Clamp to [0, 100] and determine which column (0-19) and row (0-19).
  var colIndex = Math.max(0, Math.min(19, Math.floor(pctX / CELL_PERCENT)));
  var rowIndex = Math.max(0, Math.min(19, Math.floor(pctY / CELL_PERCENT)));

  // Convert to letter (A-T) and row number (1-20).
  var letter = String.fromCharCode(65 + colIndex);
  var rowNumber = rowIndex + 1;

  return letter + rowNumber;
};
