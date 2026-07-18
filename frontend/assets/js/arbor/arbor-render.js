/**
 * Arbor render module.
 *
 * Hand-written tree layout algorithm that positions nodes top-to-bottom,
 * left-to-right by traversal depth/order. Renders `.arbor-node` elements
 * and SVG edges into the `.arbor-edges` layer.
 *
 * No CSS changes — all emitted classes match the existing `arbor.css` contract.
 *
 * @module arbor/arbor-render
 */

import { createElement, batchWrite } from "../utils/dom.js";
import { buildGraph, getChildren, topologicalSort } from "./arbor-data.js";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  H_GAP,
  V_GAP,
  TOP_MARGIN,
  LEFT_MARGIN,
  EDGE_STYLES,
  nodeClassModifier,
} from "./arbor-geometry.js";

// ─── Edge path computation (shared with admin — keep byte-identical) ───────────

/**
 * Vertical gap the path extends below source / above target before turning.
 */
const EDGE_PATH_GAP = 20;

/**
 * Horizontal offset per parallel edge on the same source→target pair (px).
 */
const EDGE_PARALLEL_OFFSET = 12;

/**
 * Compute an SVG path `d` string for an orthogonal edge route with rounded
 * corners.  Edges sharing the same (source, target) pair are offset
 * horizontally so they run parallel instead of overlapping.
 *
 * Anchor points:
 *   source → centre-bottom of source node
 *   target → centre-top of target node
 *
 * Route shape (no waypoints):
 *   source ↓ gap → horizontal → ↑ gap → target
 *   (flipped when target is above source)
 *
 * Route shape (with waypoints): source → straight segments through each
 * waypoint in order → target. Waypoints are user-placed bend points (the
 * re-route feature), so no automatic gap/turn is inserted between them —
 * the admin creates right angles by placing waypoints on the grid.
 * A present `waypoints` array overrides `offsetIndex` entirely: manual
 * routing already avoids overlap, so the parallel-edge offset no longer
 * applies to this edge.
 *
 * @param {number} sx  - source centre-x (diagram coords)
 * @param {number} sy  - source bottom-y
 * @param {number} tx  - target centre-x
 * @param {number} ty  - target top-y
 * @param {number} offsetIndex - 0 for first edge, 1,2,… for parallel edges (ignored if waypoints present)
 * @param {Array<{x: number, y: number}>} [waypoints] - ordered bend points from a re-route
 * @returns {string} SVG path `d` attribute
 */
function computeEdgePath(sx, sy, tx, ty, offsetIndex, waypoints) {
  if (Array.isArray(waypoints) && waypoints.length > 0) {
    var d = "M " + sx + " " + sy;
    for (var w = 0; w < waypoints.length; w++) {
      d += " L " + waypoints[w].x + " " + waypoints[w].y;
    }
    d += " L " + tx + " " + ty;
    return d;
  }

  // Alternate offset direction: 0=straight, 1=+right, 2=-left, 3=+2×right, …
  var dir = offsetIndex % 2 === 0 ? -1 : 1;
  var mag = Math.ceil(offsetIndex / 2);
  var offset = dir * mag * EDGE_PARALLEL_OFFSET;

  // If nodes are vertically aligned, draw straight
  if (Math.abs(sx - tx) < 5) {
    if (offsetIndex === 0) {
      return "M " + sx + " " + sy + " L " + tx + " " + ty;
    }
    // Vertical with offset: slight dog-leg
    var midY = (sy + ty) / 2;
    return (
      "M " + sx + " " + sy +
      " L " + (sx + offset) + " " + midY +
      " L " + (tx + offset) + " " + midY +
      " L " + tx + " " + ty
    );
  }

  // Target below source: route down → across → down
  // Target above source: route up → across → up
  var gap = ty > sy ? EDGE_PATH_GAP : -EDGE_PATH_GAP;

  return (
    "M " + sx + " " + sy +
    " L " + sx + " " + (sy + gap) +
    " L " + (tx + offset) + " " + (sy + gap) +
    " L " + (tx + offset) + " " + (ty - gap) +
    " L " + tx + " " + ty
  );
}

// ─── Configuration ────────────────────────────────────────────────────────────
// Node dimensions, spacing, and margins are imported from arbor-geometry.js
// so the admin editor renders with the same values.

// ─── Cached references (SR-3) ─────────────────────────────────────────────────

/** @type {HTMLElement|null} */
let canvasEl = null;

/** @type {HTMLElement|null} */
let diagramEl = null;

/** @type {SVGSVGElement|null} */
let svgEl = null;

/** @type {HTMLElement|null} */
let loadingEl = null;

/** @type {HTMLElement|null} */
let emptyEl = null;

/** @type {Map<number, { x: number, y: number }>} */
let nodePositions = new Map();

/**
 * Initialise cached references to key DOM nodes.
 */
export function init() {
  canvasEl = document.getElementById("arbor-canvas");
  diagramEl = document.getElementById("arbor-diagram");
  svgEl = document.getElementById("arbor-edges");
  loadingEl = document.getElementById("loading-state");
  emptyEl = document.getElementById("empty-state");
}

/**
 * Show the loading spinner.
 */
export function showLoading() {
  if (loadingEl) loadingEl.hidden = false;
  if (canvasEl) canvasEl.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
}

/**
 * Show the empty state.
 */
export function showEmpty() {
  if (loadingEl) loadingEl.hidden = true;
  if (canvasEl) canvasEl.hidden = true;
  if (emptyEl) emptyEl.hidden = false;
}

/**
 * Traverse the tree BFS by level, returning arrays of node IDs per level.
 *
 * @param {Object} root - The root node.
 * @param {Map} adjacency - Source ID → children array.
 * @returns {Array<Array<number>>} Each element is an array of node IDs at that level.
 */
function bfsLevels(root, adjacency) {
  const levels = [];
  const visited = new Set();
  let current = [root.id];
  visited.add(root.id);

  while (current.length > 0) {
    levels.push([...current]);
    const next = [];
    for (const nodeId of current) {
      for (const child of getChildren(adjacency, nodeId)) {
        // Only follow non-root relationship types for tree layout
        // Skip 'root' edges (they point away from root) and 'related' (cross-edges)
        if (child.relationshipType === "root") continue;
        if (!visited.has(child.targetId)) {
          visited.add(child.targetId);
          next.push(child.targetId);
        }
      }
    }
    current = next;
  }

  return levels;
}

/**
 * Compute positions for all nodes using BFS-level-based layout.
 *
 * @param {Object} root
 * @param {Map} adjacency
 * @param {Map<number, Object>} nodesById
 * @returns {Map<number, { x: number, y: number }>}
 */
function computeLayout(root, adjacency, nodesById) {
  const positions = new Map();

  if (!root) return positions;

  const levels = bfsLevels(root, adjacency);

  // Find the maximum number of nodes in any level
  const maxWidth = Math.max(...levels.map((l) => l.length), 1);
  const levelWidth = maxWidth * (NODE_WIDTH + H_GAP) - H_GAP;

  for (let depth = 0; depth < levels.length; depth++) {
    const levelNodes = levels[depth];
    const rowWidth = levelNodes.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const startX = (levelWidth - rowWidth) / 2;

    for (let i = 0; i < levelNodes.length; i++) {
      const nodeId = levelNodes[i];
      positions.set(nodeId, {
        x: LEFT_MARGIN + startX + i * (NODE_WIDTH + H_GAP),
        y: TOP_MARGIN + depth * (NODE_HEIGHT + V_GAP),
      });
    }
  }

  return positions;
}

/**
 * Check whether the viewport is in vertical (mobile < 768px) mode.
 *
 * @returns {boolean}
 */
export function isVerticalMode() {
  try {
    return window.matchMedia("(max-width: 767px)").matches;
  } catch {
    return false;
  }
}

/**
 * Vertical (mobile) layout: nodes stacked top-to-bottom, full-width.
 * Overrides admin-authored x/y positions — those encode the desktop
 * composition and can't be honoured on a phone-width canvas.
 *
 * @param {Object} root
 * @param {Map} adjacency
 * @param {Map<number, Object>} nodesById
 * @returns {Map<number, { x: number, y: number }>}
 */
function computeVerticalLayout(root, adjacency, nodesById) {
  const positions = new Map();
  const ordered = topologicalSort(root, adjacency, nodesById);
  if (ordered.length === 0) return positions;

  const vw = window.innerWidth;
  // Match CSS calc(100vw - 2 * var(--space-md)), clamped to a max-width
  const nodeWidth = Math.min(vw - 2 * 16, 400);
  const x = (vw - nodeWidth) / 2;
  const rowHeight = NODE_HEIGHT + V_GAP;

  for (let i = 0; i < ordered.length; i++) {
    positions.set(ordered[i].id, {
      x: x,
      y: TOP_MARGIN + i * rowHeight,
    });
  }

  return positions;
}

/**
 * Render the full arbor diagram.
 *
 * When every node has a saved position (non-null x/y from the API), those
 * positions are used verbatim — the layout mirrors the admin editor exactly.
 * Otherwise, the existing BFS tree layout is used for the whole diagram
 * (mixed positions would produce overlapping layouts).
 *
 * On mobile (< 768px) a vertical top-to-bottom layout is always used,
 * overriding saved positions.
 *
 * @param {Array} nodes - Evidence nodes.
 * @param {Array} edges - Arbor edges.
 */
export function renderArbor(nodes, edges) {
  if (!canvasEl || !diagramEl) return;

  const { nodesById, adjacency, root } = buildGraph(nodes, edges);

  if (!root || nodesById.size === 0) {
    showEmpty();
    return;
  }

  const vertical = isVerticalMode();

  // Compute layout
  if (vertical) {
    // Mobile: always use vertical layout
    nodePositions = computeVerticalLayout(root, adjacency, nodesById);
  } else {
    // Desktop: per-node fallback using shared BFS/grid-independent logic.
    //
    // Previously the frontend used an all-or-nothing check: if *any* node
    // lacked a saved x/y, every saved position was discarded and the whole
    // diagram was recomputed via BFS. That caused complete divergence from
    // the admin editor whenever a single unplaced node was present (admin
    // has always used per-node fallback).
    //
    // Per-node fallback is strictly more informative — real positions are
    // never thrown away because an unrelated node lacks one. Nodes WITH
    // saved positions render at their exact admin-authored coordinates;
    // nodes WITHOUT get a BFS-computed fallback laid out in the gaps.
    //
    // Note: the "which nodes lack a position" set can differ between the
    // public page (GET /arbor — published only) and the admin editor
    // (GET /arbor/admin — includes drafts). That is expected — both sides
    // correctly use the same fallback algorithm for whichever nodes they
    // render, and the difference is in data scope, not geometry.
    // (See plan: arbor-frontend-admin-alignment-fix.md)

    // Build saved-positions map for nodes with valid x/y.
    const savedPositions = new Map();
    const unplacedNodeIds = [];
    for (const [nodeId, node] of nodesById) {
      if (
        node.x != null &&
        node.y != null &&
        Number.isFinite(node.x) &&
        Number.isFinite(node.y)
      ) {
        savedPositions.set(nodeId, { x: node.x, y: node.y });
      } else {
        unplacedNodeIds.push(nodeId);
      }
    }

    if (unplacedNodeIds.length === 0) {
      // All nodes have saved positions — use them verbatim.
      nodePositions = savedPositions;
    } else if (savedPositions.size === 0) {
      // No nodes have saved positions — fall back to full BFS layout.
      nodePositions = computeLayout(root, adjacency, nodesById);
    } else {
      // Mixed case: merge saved positions with BFS-computed fallbacks.
      // Compute layout only for unplaced nodes, then merge with saved.
      nodePositions = new Map(savedPositions);
      const fallbackPositions = computeLayout(root, adjacency, nodesById);
      for (const nodeId of unplacedNodeIds) {
        const fallback = fallbackPositions.get(nodeId);
        if (fallback) {
          nodePositions.set(nodeId, fallback);
        }
      }
    }
  }

  // Build a map: childId → parentEdge for node class determination
  const parentEdgeMap = new Map();
  for (const [, targets] of adjacency) {
    for (const t of targets) {
      if (t.relationshipType !== "root" && !parentEdgeMap.has(t.targetId)) {
        parentEdgeMap.set(
          t.targetId,
          t.edge || { relationshipType: t.relationshipType },
        );
      }
    }
  }

  batchWrite(() => {
    // ── Clear existing content ────────────────────────────────────────────
    diagramEl.innerHTML = "";
    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("class", "arbor-edges");
    svgEl.id = "arbor-edges";
    diagramEl.appendChild(svgEl);

    // ── Compute diagram bounds ────────────────────────────────────────────
    let maxX = 0;
    let maxY = 0;
    for (const [, pos] of nodePositions) {
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    }
    maxX += LEFT_MARGIN;
    maxY += TOP_MARGIN;

    if (vertical) {
      // Mobile: diagram grows to content height; canvas scrolls with page
      diagramEl.style.position = "relative";
      diagramEl.style.width = "";
      diagramEl.style.height = `${maxY}px`;
      diagramEl.style.transform = "";
      svgEl.setAttribute("width", String(window.innerWidth));
      svgEl.setAttribute("height", String(maxY));
      svgEl.setAttribute("viewBox", `0 0 ${window.innerWidth} ${maxY}`);
    } else {
      // Desktop: absolute-positioned within the canvas
      diagramEl.style.position = "absolute";
      diagramEl.style.width = `${maxX}px`;
      diagramEl.style.height = `${maxY}px`;
      svgEl.setAttribute("width", String(maxX));
      svgEl.setAttribute("height", String(maxY));
      svgEl.setAttribute("viewBox", `0 0 ${maxX} ${maxY}`);
    }

    // ── Draw edges ────────────────────────────────────────────────────────
    const drawNodeWidth = vertical
      ? Math.min(window.innerWidth - 2 * 16, 400)
      : NODE_WIDTH;

    // Count parallel edges per (sourceId, targetId) for offsetIndex
    const pairCounts = new Map();
    for (const [sourceId, targets] of adjacency) {
      for (const { targetId } of targets) {
        const key = sourceId + "-" + targetId;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
    const pairIndex = new Map();

    for (const [sourceId, targets] of adjacency) {
      const sourcePos = nodePositions.get(sourceId);
      if (!sourcePos) continue;

      for (const { targetId, relationshipType, edge } of targets) {
        const targetPos = nodePositions.get(targetId);
        if (!targetPos) continue;

        const sx = sourcePos.x + drawNodeWidth / 2;
        const sy = sourcePos.y + NODE_HEIGHT;
        const tx = targetPos.x + drawNodeWidth / 2;
        const ty = targetPos.y;

        const pairKey = sourceId + "-" + targetId;
        if (!pairIndex.has(pairKey)) pairIndex.set(pairKey, 0);
        const offsetIdx = pairIndex.get(pairKey);
        pairIndex.set(pairKey, offsetIdx + 1);

        const d = computeEdgePath(sx, sy, tx, ty, offsetIdx, edge && edge.waypoints);

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("d", d);

        // Style by relationship type
        const style = EDGE_STYLES[relationshipType] || EDGE_STYLES.default;
        for (const [attr, value] of Object.entries(style)) {
          path.setAttribute(attr, value);
        }

        svgEl.appendChild(path);
      }
    }

    // ── Render nodes ──────────────────────────────────────────────────────
    for (const [nodeId, pos] of nodePositions) {
      const node = nodesById.get(nodeId);
      if (!node) continue;

      const isRoot = nodeId === root.id;
      const parentEdge = parentEdgeMap.get(nodeId) || null;
      const modifier = nodeClassModifier(parentEdge, isRoot);

      const titleEl = createElement(
        "span",
        {
          className: "arbor-node-title",
        },
        [node.title || ""],
      );

      const verseEl = createElement(
        "span",
        {
          className: "arbor-node-verse",
        },
        [node.primary_verse || ""],
      );

      const nodeEl = createElement(
        "div",
        {
          className: ["arbor-node", modifier].filter(Boolean).join(" "),
          style: vertical
            ? `left:${pos.x}px;top:${pos.y}px;width:${drawNodeWidth}px`
            : `left:${pos.x}px;top:${pos.y}px;width:${NODE_WIDTH}px`,
          tabIndex: "0",
          role: "link",
          ariaLabel: node.title
            ? node.primary_verse
              ? `${node.title}, ${node.primary_verse}`
              : node.title
            : "",
          dataset: {
            nodeId: String(nodeId),
            slug: node.slug || "",
            title: node.title || "",
            description: node.description || "",
            verse: node.primary_verse || "",
          },
        },
        [titleEl, verseEl],
      );

      diagramEl.appendChild(nodeEl);
    }

    // ── State visibility ──────────────────────────────────────────────────
    if (loadingEl) loadingEl.hidden = true;
    canvasEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
  });
}

/**
 * Get the computed positions map (used by interactions for tooltip positioning).
 *
 * @returns {Map<number, { x: number, y: number }>}
 */
export function getNodePositions() {
  return nodePositions;
}
