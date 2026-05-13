// =============================================================================
//
//   THE JESUS WEBSITE — ARDOR (EVIDENCE) DIAGRAM DISPLAY
//   File:    js/3.0_visualizations/frontend/ardor_display.js
//   Version: 1.2.0
//   Purpose: Fetches published records from the public API, assembles them
//            into a tree by parent_id, and renders an interactive SVG
//            evidence diagram.
//   Source:  guide_function.md §3.0, guide_appearance.md §3.1
//
// =============================================================================

// Trigger: DOMContentLoaded -> renderArdorDiagram('ardor-canvas-area')
// Main:    Fetches /api/public/diagram/tree, groups nodes by parent_id, and
//          renders a recursive SVG tree.
// Output:  Interactive SVG evidence graph injected into the container.

function renderArdorDiagram(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // Show loading state
  container.innerHTML =
    '<p class="state-loading"><span class="state-loading__label">Loading evidence diagram&hellip;</span></p>';

  fetch("/api/public/diagram/tree")
    .then(function (response) {
      if (!response.ok) {
        throw new Error(
          "Failed to fetch diagram data (HTTP " + response.status + ")",
        );
      }
      return response.json();
    })
    .then(function (data) {
      var nodes = data.nodes || [];
      if (nodes.length === 0) {
        container.innerHTML =
          '<p class="state-empty">No evidence records found.</p>';
        return;
      }

      // Build a map of id -> node for quick lookup
      var nodesMap = {};
      nodes.forEach(function (n) {
        nodesMap[n.id] = n;
      });

      // Find root nodes (parent_id is null or parent not in the set)
      var rootNodes = [];
      Object.keys(nodesMap).forEach(function (id) {
        var node = nodesMap[id];
        if (!node.parent_id || !nodesMap[node.parent_id]) {
          rootNodes.push(node);
        }
      });

      // Render the tree
      var svg = buildTreeSVG(rootNodes, nodesMap);
      container.innerHTML = svg;
    })
    .catch(function (err) {
      console.error("Ardor diagram error:", err);
      container.innerHTML =
        '<p class="state-error"><span class="state-error__label">Unable to load evidence diagram.</span></p>';
    });
}

// ---------------------------------------------------------------------------
//  buildTreeSVG
//  Recursively builds an SVG document from root nodes and their children.
//  Uses a simple top-down layout with horizontal positioning per depth level.
// ---------------------------------------------------------------------------

function buildTreeSVG(rootNodes, nodesMap) {
  // Layout constants
  var nodeWidth = 200;
  var nodeHeight = 50;
  var horizontalSpacing = 60;
  var verticalSpacing = 80;
  var startX = 50;
  var startY = 40;

  // First pass: assign positions bottom-up
  var positions = {};

  function layoutTree(nodes, depth) {
    var yPos = startY + depth * (nodeHeight + verticalSpacing);
    var xPos = startX;

    nodes.forEach(function (node) {
      var children = getChildren(node.id, nodesMap);
      if (children.length > 0) {
        // Layout children first to center parent above them
        layoutTree(children, depth + 1);
        // Center parent above children
        var childPositions = children.map(function (c) {
          return positions[c.id];
        });
        var minX = Math.min.apply(
          null,
          childPositions.map(function (p) {
            return p.x;
          }),
        );
        var maxX = Math.max.apply(
          null,
          childPositions.map(function (p) {
            return p.x + nodeWidth;
          }),
        );
        xPos = minX + (maxX - minX) / 2 - nodeWidth / 2;
      } else {
        // Leaf node: simple horizontal layout
        var siblings = nodes;
        var idx = siblings.indexOf(node);
        var totalWidth =
          siblings.length * (nodeWidth + horizontalSpacing) - horizontalSpacing;
        var startOffset = totalWidth < 800 ? (800 - totalWidth) / 2 : 0;
        xPos = startX + startOffset + idx * (nodeWidth + horizontalSpacing);
      }
      positions[node.id] = { x: Math.max(xPos, startX), y: yPos, depth: depth };
    });
  }

  layoutTree(rootNodes, 0);

  // Second pass: render SVG
  var svgWidth = 900;
  var svgHeight =
    (getMaxDepth(positions) + 2) * (nodeHeight + verticalSpacing) + startY;

  var svg = "";
  svg +=
    '<svg class="ardor-svg" viewBox="0 0 ' +
    svgWidth +
    " " +
    svgHeight +
    '" xmlns="http://www.w3.org/2000/svg">';
  svg += "<defs>";
  svg +=
    '<marker id="arrow" viewBox="0 -5 10 10" refX="28" refY="0" markerWidth="6" markerHeight="6" orient="auto">';
  svg += '<path d="M0,-5L10,0L0,5" fill="var(--color-border-strong)"></path>';
  svg += "</marker>";
  svg += "</defs>";

  // Edges
  svg += '<g class="ardor-edges">';
  rootNodes.forEach(function (node) {
    drawEdges(node.id, nodesMap, positions, svgWidth);
  });
  function drawEdges(nodeId, nodesMap, positions, svgWidth) {
    var children = getChildren(nodeId, nodesMap);
    var parentPos = positions[nodeId];
    if (!parentPos) return;
    children.forEach(function (child) {
      var childPos = positions[child.id];
      if (!childPos) return;
      var x1 = parentPos.x + nodeWidth / 2;
      var y1 = parentPos.y + nodeHeight;
      var x2 = childPos.x + nodeWidth / 2;
      var y2 = childPos.y;
      var cy = (y1 + y2) / 2;
      svg +=
        '<path class="ardor-edge" d="M ' +
        x1 +
        " " +
        y1 +
        " C " +
        x1 +
        " " +
        cy +
        ", " +
        x2 +
        " " +
        cy +
        ", " +
        x2 +
        " " +
        y2 +
        '" marker-end="url(#arrow)" />';
      drawEdges(child.id, nodesMap, positions, svgWidth);
    });
  }
  svg += "</g>";

  // Nodes
  svg += '<g class="ardor-nodes">';
  Object.keys(positions).forEach(function (id) {
    var pos = positions[id];
    var node = nodesMap[id];
    if (!node || !pos) return;
    var depthClass = pos.depth === 0 ? " ardor-node--root" : "";
    svg +=
      '<g class="ardor-node' +
      depthClass +
      '" transform="translate(' +
      pos.x +
      ", " +
      pos.y +
      ')">';
    svg +=
      '<rect width="' + nodeWidth + '" height="' + nodeHeight + '"></rect>';
    var title = escapeHtmlAttr(node.title || node.slug || "");
    // Truncate long titles
    if (title.length > 28) {
      title = title.substring(0, 26) + "...";
    }
    svg +=
      '<text class="title" x="' +
      nodeWidth / 2 +
      '" y="' +
      nodeHeight / 2 +
      '" text-anchor="middle" dominant-baseline="middle">' +
      title +
      "</text>";
    var metaLabel = "";
    if (node.primary_verse) {
      try {
        var parsed =
          typeof node.primary_verse === "string"
            ? JSON.parse(node.primary_verse)
            : node.primary_verse;
        if (Array.isArray(parsed) && parsed.length > 0) {
          var v = parsed[0];
          metaLabel =
            (v.book || "") + " " + (v.chapter || "") + ":" + (v.verse || "");
        }
      } catch (e) {
        metaLabel = node.primary_verse;
      }
    }
    if (metaLabel) {
      svg +=
        '<text class="meta" x="' +
        nodeWidth / 2 +
        '" y="' +
        (nodeHeight - 5) +
        '" text-anchor="middle">' +
        escapeHtmlAttr(metaLabel) +
        "</text>";
    }
    svg += "</g>";
  });
  svg += "</g>";

  svg += "</svg>";

  return svg;
}

// ---------------------------------------------------------------------------
//  getChildren
//  Returns all nodes whose parent_id matches the given node id.
// ---------------------------------------------------------------------------

function getChildren(parentId, nodesMap) {
  var children = [];
  Object.keys(nodesMap).forEach(function (id) {
    var node = nodesMap[id];
    if (node.parent_id === parentId) {
      children.push(node);
    }
  });
  return children;
}

// ---------------------------------------------------------------------------
//  getMaxDepth
//  Returns the maximum depth value across all positioned nodes.
// ---------------------------------------------------------------------------

function getMaxDepth(positions) {
  var maxDepth = 0;
  Object.keys(positions).forEach(function (id) {
    if (positions[id].depth > maxDepth) {
      maxDepth = positions[id].depth;
    }
  });
  return maxDepth;
}

// ---------------------------------------------------------------------------
//  escapeHtmlAttr
//  Minimal attribute-escaping for SVG text content.
// ---------------------------------------------------------------------------

function escapeHtmlAttr(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Bootstrap ---
document.addEventListener("DOMContentLoaded", function () {
  renderArdorDiagram("ardor-canvas-area");
});
