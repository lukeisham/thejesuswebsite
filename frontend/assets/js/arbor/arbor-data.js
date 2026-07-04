/**
 * Arbor data module.
 *
 * Fetches nodes and edges from the API, builds the graph adjacency structure,
 * identifies the root node, and classifies edge types.
 *
 * @module arbor/arbor-data
 */

import { getArbor } from '../api.js';

/**
 * Valid arbor relationship types.
 * @type {string[]}
 */
export const RELATIONSHIP_TYPES = ['root', 'supports', 'leads_to', 'related'];

/**
 * Validate that a node has the required fields.
 *
 * @param {Object} node
 * @returns {boolean}
 */
function isValidNode(node) {
  return (
    node &&
    typeof node.id === 'number' &&
    typeof node.title === 'string' &&
    typeof node.slug === 'string'
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
    typeof edge.source_id === 'number' &&
    typeof edge.target_id === 'number' &&
    typeof edge.relationship_type === 'string' &&
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
      if (!nodesById.has(edge.source_id) || !nodesById.has(edge.target_id)) continue;

      const type = edge.relationship_type;

      // Track by type
      edgesByType.get(type).push(edge);

      // Identify root: the source of a 'root' relationship edge
      if (type === 'root') {
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
