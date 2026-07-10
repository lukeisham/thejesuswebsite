/**
 * Admin arbor geometry shim.
 *
 * Exposes the same geometry constants used by the public arbor renderer
 * (`frontend/assets/js/arbor/arbor-geometry.js`) on window.AdminArborGeometry
 * so the admin editor renders nodes and edges with identical dimensions.
 *
 * Keep this file in sync with arbor-geometry.js — they must agree on every value.
 *
 * @module admin-arbor/arbor-geometry
 */
window.AdminArborGeometry = {
  NODE_WIDTH: 200,
  NODE_HEIGHT: 80,
  H_GAP: 50,
  V_GAP: 80,
  TOP_MARGIN: 40,
  LEFT_MARGIN: 40,
  RELATED_DASH: "6 4",

  EDGE_STYLES: {
    default: {
      stroke: "var(--border-strong)",
    },
    root: {
      stroke: "var(--accent)",
      "stroke-width": "2",
    },
    related: {
      "stroke-dasharray": "6 4",
      stroke: "var(--border-strong)",
    },
  },
};
