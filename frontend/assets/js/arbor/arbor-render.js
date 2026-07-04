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

import { createElement, batchWrite } from '../utils/dom.js';
import {
  buildGraph,
  getChildren,
} from './arbor-data.js';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Estimated node dimensions (used before layout measurement). */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/** Spacing between nodes. */
const H_GAP = 50;
const V_GAP = 80;

/** Top/left margins for the diagram. */
const TOP_MARGIN = 40;
const LEFT_MARGIN = 40;

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
  canvasEl = document.getElementById('arbor-canvas');
  diagramEl = document.getElementById('arbor-diagram');
  svgEl = document.getElementById('arbor-edges');
  loadingEl = document.getElementById('loading-state');
  emptyEl = document.getElementById('empty-state');
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
        if (child.relationshipType === 'root') continue;
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
 * Determine the CSS class modifier for a node based on its relationship to its parent.
 *
 * @param {Object|null} parentEdge - The edge from parent to this node.
 * @param {boolean} isRoot - Whether this is the root node.
 * @returns {string}
 */
function nodeClassModifier(parentEdge, isRoot) {
  if (isRoot) return 'root';
  if (parentEdge && parentEdge.relationshipType === 'related') return 'related';
  return '';
}

/**
 * Render the full arbor diagram.
 *
 * @param {Array} nodes - Evidence nodes.
 * @param {Array} edges - Arbor edges.
 */
export function renderArbor(nodes, edges) {
  if (!canvasEl || !diagramEl || !svgEl) return;

  const { nodesById, adjacency, root } = buildGraph(nodes, edges);

  if (!root || nodesById.size === 0) {
    showEmpty();
    return;
  }

  // Compute layout
  nodePositions = computeLayout(root, adjacency, nodesById);

  // Build a map: childId → parentEdge for node class determination
  const parentEdgeMap = new Map();
  for (const [, targets] of adjacency) {
    for (const t of targets) {
      if (t.relationshipType !== 'root' && !parentEdgeMap.has(t.targetId)) {
        parentEdgeMap.set(t.targetId, t.edge || { relationshipType: t.relationshipType });
      }
    }
  }

  batchWrite(() => {
    // ── Clear existing content ────────────────────────────────────────────
    diagramEl.innerHTML = '';
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('class', 'arbor-edges');
    svgEl.id = 'arbor-edges';
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

    // Size the SVG and diagram container
    svgEl.setAttribute('width', String(maxX));
    svgEl.setAttribute('height', String(maxY));
    diagramEl.style.width = `${maxX}px`;
    diagramEl.style.height = `${maxY}px`;

    // ── Draw edges ────────────────────────────────────────────────────────
    for (const [sourceId, targets] of adjacency) {
      const sourcePos = nodePositions.get(sourceId);
      if (!sourcePos) continue;

      for (const { targetId, relationshipType } of targets) {
        const targetPos = nodePositions.get(targetId);
        if (!targetPos) continue;

        const x1 = sourcePos.x + NODE_WIDTH / 2;
        const y1 = sourcePos.y + NODE_HEIGHT;
        const x2 = targetPos.x + NODE_WIDTH / 2;
        const y2 = targetPos.y;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));

        // Style by relationship type
        if (relationshipType === 'related') {
          line.setAttribute('stroke-dasharray', '6 4');
          line.setAttribute('stroke', 'var(--border-strong)');
        } else if (relationshipType === 'root') {
          line.setAttribute('stroke', 'var(--accent)');
          line.setAttribute('stroke-width', '2');
        } else {
          // supports / leads_to
          line.setAttribute('stroke', 'var(--border-strong)');
        }

        svgEl.appendChild(line);
      }
    }

    // ── Render nodes ──────────────────────────────────────────────────────
    for (const [nodeId, pos] of nodePositions) {
      const node = nodesById.get(nodeId);
      if (!node) continue;

      const isRoot = nodeId === root.id;
      const parentEdge = parentEdgeMap.get(nodeId) || null;
      const modifier = nodeClassModifier(parentEdge, isRoot);

      const titleEl = createElement('span', {
        className: 'arbor-node-title',
      }, [node.title || '']);

      const verseEl = createElement('span', {
        className: 'arbor-node-verse',
      }, [node.primary_verse || '']);

      const nodeEl = createElement('div', {
        className: ['arbor-node', modifier].filter(Boolean).join(' '),
        style: `left:${pos.x}px;top:${pos.y}px;width:${NODE_WIDTH}px`,
        dataset: {
          nodeId: String(nodeId),
          slug: node.slug || '',
          title: node.title || '',
          description: node.description || '',
          verse: node.primary_verse || '',
        },
      }, [titleEl, verseEl]);

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
