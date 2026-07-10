/**
 * Arbor geometry constants — shared between the public frontend renderer
 * and the admin diagram editor so both surfaces render nodes and edges
 * with identical dimensions, spacing, and styling hooks.
 *
 * @module arbor/arbor-geometry
 */

/** Estimated node dimensions used for layout computation. */
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;

/** Spacing between nodes. */
export const H_GAP = 50;
export const V_GAP = 80;

/** Top/left margins for the diagram. */
export const TOP_MARGIN = 40;
export const LEFT_MARGIN = 40;

/** Edge dash pattern for "related" relationship edges. */
export const RELATED_DASH = "6 4";

/** Stroke colours by relationship type (CSS custom-property references). */
export const EDGE_STYLES = {
  /** Supports / leads_to edges. */
  default: {
    stroke: "var(--border-strong)",
  },
  /** Root → child edges. */
  root: {
    stroke: "var(--accent)",
    "stroke-width": "2",
  },
  /** Cross-edges between collateral branches. */
  related: {
    "stroke-dasharray": RELATED_DASH,
    stroke: "var(--border-strong)",
  },
};

/** CSS class modifiers for node relationship types. */
export const NODE_CLASSES = {
  root: "root",
  related: "related",
};

/**
 * Determine the CSS class modifier for a node based on its relationship
 * to its parent edge.
 *
 * @param {Object|null} parentEdge - The edge from parent to this node.
 * @param {boolean} isRoot - Whether this is the root node.
 * @returns {string}
 */
export function nodeClassModifier(parentEdge, isRoot) {
  if (isRoot) return NODE_CLASSES.root;
  if (parentEdge && parentEdge.relationshipType === "related")
    return NODE_CLASSES.related;
  return "";
}
