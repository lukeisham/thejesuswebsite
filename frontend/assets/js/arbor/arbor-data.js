/**
 * Arbor data module.
 *
 * Fetches nodes and edges from the API, builds the graph adjacency structure,
 * identifies the root node, and classifies edge types.
 *
 * @module arbor/arbor-data
 */

import { getArbor } from "../api.js";

/**
 * Valid arbor relationship types.
 * @type {string[]}
 */
export const RELATIONSHIP_TYPES = ["root", "supports", "leads_to", "related"];

/**
 * Validate that a node has the required fields.
 *
 * @param {Object} node
 * @returns {boolean}
 */
function isValidNode(node) {
  return (
    node &&
    typeof node.id === "number" &&
    typeof node.title === "string" &&
    typeof node.slug === "string"
  );
}

/**
 * Validate that an edge has the required fields.
 *
 * @param {Object} edge
 * @returns {boolean}
 */
function isValidEdge(edge) {
  return (
    edge &&
    typeof edge.source_id === "number" &&
    typeof edge.target_id === "number" &&
    typeof edge.relationship_type === "string" &&
    RELATIONSHIP_TYPES.includes(edge.relationship_type) &&
    edge.source_id !== edge.target_id
  );
}

/**
 * Fetch the full arbor graph from the API.
 *
 * @returns {Promise<{data: {nodes: Array, edges: Array}|null, error: string|null}>}
 */
export async function fetchArborGraph() {
  return getArbor();
}

/**
 * Build the graph structure from nodes and edges arrays.
 *
 * Returns:
 *   - nodesById: Map<id, node> for O(1) lookup
 *   - adjacency: Map<id, Array<{ targetId, relationshipType }>> outgoing edges
 *   - root: the identified root node (or null)
 *   - edgesByType: Map<relationshipType, Array<edge>>
 *
 * @param {Array} nodes - Evidence nodes from the API.
 * @param {Array} edges - Arbor edges from the API.
 * @returns {{ nodesById: Map, adjacency: Map, root: Object|null, edgesByType: Map }}
 */
export function buildGraph(nodes, edges) {
  const nodesById = new Map();
  const adjacency = new Map(); // sourceId → [{ targetId, relationshipType, edge }]
  const edgesByType = new Map();

  // Initialise edge type buckets
  for (const type of RELATIONSHIP_TYPES) {
    edgesByType.set(type, []);
  }

  // Index valid nodes
  if (Array.isArray(nodes)) {
    for (const node of nodes) {
      if (isValidNode(node)) {
        nodesById.set(node.id, node);
        adjacency.set(node.id, []);
      }
    }
  }

  // Process valid edges
  let rootId = null;

  if (Array.isArray(edges)) {
    for (const edge of edges) {
      if (!isValidEdge(edge)) continue;
      if (!nodesById.has(edge.source_id) || !nodesById.has(edge.target_id))
        continue;

      const type = edge.relationship_type;

      // Track by type
      edgesByType.get(type).push(edge);

      // Identify root: the source of a 'root' relationship edge
      if (type === "root") {
        rootId = edge.source_id;
      }

      // Build adjacency (directed: source → target)
      if (adjacency.has(edge.source_id)) {
        adjacency.get(edge.source_id).push({
          targetId: edge.target_id,
          relationshipType: type,
          edge,
        });
      }
    }
  }

  // Determine root node
  let root = null;
  if (rootId && nodesById.has(rootId)) {
    root = nodesById.get(rootId);
  } else if (nodesById.size > 0) {
    // Fallback: pick the first node with no incoming non-root edges
    const hasIncoming = new Set();
    for (const [, targets] of adjacency) {
      for (const { targetId } of targets) {
        hasIncoming.add(targetId);
      }
    }
    for (const [id, node] of nodesById) {
      if (!hasIncoming.has(id)) {
        root = node;
        break;
      }
    }
    // Last resort: first node
    if (!root) {
      root = nodesById.values().next().value;
    }
  }

  return { nodesById, adjacency, root, edgesByType };
}

/**
 * Get all children of a node from the adjacency structure.
 *
 * @param {Map} adjacency
 * @param {number} nodeId
 * @returns {Array<{ targetId: number, relationshipType: string, edge: Object }>}
 */
export function getChildren(adjacency, nodeId) {
  return adjacency.get(nodeId) || [];
}

/**
 * Topologically order nodes from the root outward using BFS through
 * tree edges (excludes 'root' and 'related' relationship types).
 * Orphan nodes not reachable from root are appended, sorted by
 * `sort_order` then `id`.
 *
 * This is a pure function — it reads adjacency and nodesById without
 * mutating them (SR-3).
 *
 * @param {Object|null} root - The root node.
 * @param {Map<number, Array>} adjacency - Source ID → children array.
 * @param {Map<number, Object>} nodesById - All nodes keyed by id.
 * @returns {Array<Object>} Topologically ordered node objects.
 */
export function topologicalSort(root, adjacency, nodesById) {
  const visited = new Set();
  const result = [];

  // BFS from root, following tree edges only
  if (root && nodesById.has(root.id)) {
    const queue = [root.id];
    visited.add(root.id);

    while (queue.length > 0) {
      const currentId = queue.shift();
      const node = nodesById.get(currentId);
      if (node) result.push(node);

      const children = getChildren(adjacency, currentId);
      // Follow tree-forming edges: skip 'root' (points away from root)
      // and 'related' (cross-edges, not part of the depth tree)
      for (const child of children) {
        if (
          child.relationshipType === "root" ||
          child.relationshipType === "related"
        )
          continue;
        if (!visited.has(child.targetId)) {
          visited.add(child.targetId);
          queue.push(child.targetId);
        }
      }
    }
  }

  // Collect orphan nodes not reached by tree edges
  const orphans = [];
  for (const [id, node] of nodesById) {
    if (!visited.has(id)) {
      orphans.push(node);
    }
  }
  orphans.sort((a, b) => {
    const aOrder = a.sort_order;
    const bOrder = b.sort_order;
    if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.id - b.id;
  });

  return result.concat(orphans);
}
