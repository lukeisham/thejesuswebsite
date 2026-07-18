/**
 * Arbor edge re-route module.
 *
 * Lets the admin manually re-route a connection line: entering re-route
 * mode (via the edge action menu's "Re-route" choice, or the `R` key while
 * an edge is focused) shows draggable, grid-snapped waypoint handles plus a
 * midpoint "add" handle on each segment; dragging an add-handle inserts a
 * new waypoint there. Double-click a waypoint handle removes it. Enter or
 * click-away commits the new routing via UpdateRecord; Escape reverts to
 * the edge's last-persisted routing. Arrow keys nudge the selected waypoint
 * by one grid step, mirroring the pointer drag (Website guide Operable
 * mandate).
 *
 * Depends on AdminArborCanvas for coordinate conversion, AdminArborGeometry
 * for node dimensions, and AdminArborEdges for the shared computeEdgePath
 * (exposed there as Edges.computeEdgePath) and edge persistence helper.
 *
 * @module admin-arbor/arbor-edge-reroute
 */

window.AdminArborEdgeReroute = {};

(function () {
  const Reroute = window.AdminArborEdgeReroute;

  /** Grid step (px, diagram space) — matches EDGE_PARALLEL_OFFSET in arbor-edges.js. */
  const GRID_SIZE = 12;

  /* ── Pure helpers (independently testable — no DOM) ──────────────────────────── */

  /**
   * Snap a single coordinate to the grid.
   *
   * @param {number} value
   * @param {number} [gridSize]
   * @returns {number}
   */
  Reroute.snapToGrid = function (value, gridSize) {
    var g = gridSize || GRID_SIZE;
    return Math.round(value / g) * g;
  };

  /**
   * Insert a new waypoint at a given segment index (0 = between source and
   * the first waypoint, waypoints.length = between the last waypoint and
   * target).
   *
   * @param {Array<{x:number,y:number}>} waypoints
   * @param {number} segmentIndex
   * @param {number} x
   * @param {number} y
   * @returns {Array<{x:number,y:number}>} a new array (input untouched)
   */
  Reroute.insertWaypointAtSegment = function (waypoints, segmentIndex, x, y) {
    var next = waypoints.slice();
    next.splice(segmentIndex, 0, { x: x, y: y });
    return next;
  };

  /**
   * Remove the waypoint at a given index.
   *
   * @param {Array<{x:number,y:number}>} waypoints
   * @param {number} index
   * @returns {Array<{x:number,y:number}>} a new array (input untouched)
   */
  Reroute.removeWaypointAt = function (waypoints, index) {
    var next = waypoints.slice();
    next.splice(index, 1);
    return next;
  };

  /**
   * Move a waypoint to a new position, snapping both axes to the grid.
   *
   * @param {Array<{x:number,y:number}>} waypoints
   * @param {number} index
   * @param {number} x
   * @param {number} y
   * @returns {Array<{x:number,y:number}>} a new array (input untouched)
   */
  Reroute.moveWaypoint = function (waypoints, index, x, y) {
    var next = waypoints.slice();
    next[index] = { x: Reroute.snapToGrid(x), y: Reroute.snapToGrid(y) };
    return next;
  };

  /**
   * Nudge a waypoint by one grid step in a direction (keyboard arrows).
   *
   * @param {Array<{x:number,y:number}>} waypoints
   * @param {number} index
   * @param {number} dx  - -1, 0, or 1
   * @param {number} dy  - -1, 0, or 1
   * @param {number} [gridSize]
   * @returns {Array<{x:number,y:number}>} a new array (input untouched)
   */
  Reroute.nudgeWaypoint = function (waypoints, index, dx, dy, gridSize) {
    var g = gridSize || GRID_SIZE;
    var next = waypoints.slice();
    var p = next[index];
    next[index] = { x: p.x + dx * g, y: p.y + dy * g };
    return next;
  };

  /**
   * Build the PATCH payload for committing a re-route. An empty array clears
   * routing back to null (default orthogonal path) rather than persisting an
   * empty array, matching the model's null-means-default contract.
   *
   * @param {Array<{x:number,y:number}>} waypoints
   * @returns {{waypoints: Array<{x:number,y:number}>|null}}
   */
  Reroute.buildCommitPayload = function (waypoints) {
    return { waypoints: waypoints.length > 0 ? waypoints : null };
  };

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /**
   * @type {{edge: Object, sourceNode: Object, targetNode: Object, working: Array,
   *   group: SVGGElement, handleEls: Array, previewPath: SVGPathElement|null,
   *   selectedIndex: number}|null}
   */
  let active = null;

  /** @type {{index: number}|null} */
  let dragState = null;

  /* ── Enter / render / exit ────────────────────────────────────────────────────── */

  /**
   * Enter re-route mode for an edge.
   *
   * @param {Object} edge
   * @param {Object} sourceNode
   * @param {Object} targetNode
   */
  Reroute.enter = function (edge, sourceNode, targetNode) {
    if (active) Reroute.exit(false); // never stack two active reroutes

    var group = window.AdminArborCanvas.getTransformGroup();
    if (!group || !sourceNode || !targetNode) return;

    active = {
      edge: edge,
      sourceNode: sourceNode,
      targetNode: targetNode,
      working: (edge.waypoints || []).map(function (p) {
        return { x: p.x, y: p.y };
      }),
      group: group,
      handleEls: [],
      previewPath: null,
      selectedIndex: -1,
    };

    Reroute.render();

    document.addEventListener("keydown", Reroute.onKeyDown);
    // Deferred so the click that opened re-route mode (e.g. the menu item)
    // doesn't immediately trigger a click-away commit.
    setTimeout(function () {
      document.addEventListener("click", Reroute.onDocumentClick, true);
    }, 50);

    if (typeof window.showToast === "function") {
      window.showToast(
        "Re-routing — drag handles to bend the line, Enter to save, Esc to cancel.",
        "info",
      );
    }
  };

  /**
   * Compute the source/target anchor points for the active edge.
   *
   * @returns {{sx: number, sy: number, tx: number, ty: number}}
   */
  function anchors() {
    var sx =
      (active.sourceNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
    var sy =
      (active.sourceNode.arbor_y || 0) + window.AdminArborGeometry.NODE_HEIGHT;
    var tx =
      (active.targetNode.arbor_x || 0) + window.AdminArborGeometry.NODE_WIDTH / 2;
    var ty = active.targetNode.arbor_y || 0;
    return { sx: sx, sy: sy, tx: tx, ty: ty };
  }

  /**
   * Re-render the preview path and handles from the current working array.
   * Waypoint handles are appended before midpoint add-handles, so
   * handleEls[0..working.length-1] line up with working[0..working.length-1].
   */
  Reroute.render = function () {
    var ns = "http://www.w3.org/2000/svg";
    var a = anchors();

    for (var i = 0; i < active.handleEls.length; i++) {
      if (active.handleEls[i].parentNode) {
        active.handleEls[i].parentNode.removeChild(active.handleEls[i]);
      }
    }
    active.handleEls = [];
    if (active.previewPath && active.previewPath.parentNode) {
      active.previewPath.parentNode.removeChild(active.previewPath);
    }

    // Hide the real edge path while previewing the in-progress route.
    var realGroup = document.querySelector(
      '.admin-arbor-edge-group[data-edge-id="' + active.edge.id + '"]',
    );
    if (realGroup) realGroup.style.visibility = "hidden";

    var d = window.AdminArborEdges.computeEdgePath(
      a.sx,
      a.sy,
      a.tx,
      a.ty,
      0,
      active.working,
    );
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "admin-arbor-reroute-preview");
    active.group.appendChild(path);
    active.previewPath = path;

    for (var w = 0; w < active.working.length; w++) {
      active.handleEls.push(
        Reroute.createHandle(active.working[w].x, active.working[w].y, w, false),
      );
    }

    var points = [{ x: a.sx, y: a.sy }]
      .concat(active.working)
      .concat([{ x: a.tx, y: a.ty }]);
    for (var s = 0; s < points.length - 1; s++) {
      var midX = (points[s].x + points[s + 1].x) / 2;
      var midY = (points[s].y + points[s + 1].y) / 2;
      active.handleEls.push(Reroute.createHandle(midX, midY, s, true));
    }

    if (active.selectedIndex >= 0 && active.selectedIndex < active.working.length) {
      var toFocus = active.handleEls[active.selectedIndex];
      if (toFocus && typeof toFocus.focus === "function") toFocus.focus();
    }
  };

  /**
   * Create one draggable handle (a real waypoint, or a midpoint "add" handle).
   *
   * @param {number} x
   * @param {number} y
   * @param {number} index  - waypoint index, or segment index for add-handles
   * @param {boolean} isAddHandle
   * @returns {SVGCircleElement}
   */
  Reroute.createHandle = function (x, y, index, isAddHandle) {
    var ns = "http://www.w3.org/2000/svg";
    var handle = document.createElementNS(ns, "circle");
    handle.setAttribute("cx", String(x));
    handle.setAttribute("cy", String(y));
    // Both radii keep the hit target >= 12px diameter (CSS-2 minimum).
    handle.setAttribute("r", isAddHandle ? "6" : "7");
    handle.setAttribute(
      "class",
      isAddHandle
        ? "admin-arbor-reroute-handle admin-arbor-reroute-handle--add"
        : "admin-arbor-reroute-handle",
    );
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("role", "button");
    handle.setAttribute(
      "aria-label",
      isAddHandle
        ? "Add a waypoint here"
        : "Waypoint " + (index + 1) + " — drag to move, double-click to remove",
    );
    handle.style.cursor = "grab";

    handle.addEventListener("mousedown", function (e) {
      Reroute.onHandleMouseDown(e, index, isAddHandle);
    });

    if (!isAddHandle) {
      handle.addEventListener("dblclick", function (e) {
        e.stopPropagation();
        Reroute.removeAt(index);
      });
      handle.addEventListener("focus", function () {
        active.selectedIndex = index;
      });
    }

    active.group.appendChild(handle);
    return handle;
  };

  /**
   * Remove a waypoint (double-click) and re-render.
   *
   * @param {number} index
   */
  Reroute.removeAt = function (index) {
    if (!active) return;
    active.working = Reroute.removeWaypointAt(active.working, index);
    active.selectedIndex = -1;
    Reroute.render();
  };

  /* ── Drag interaction ─────────────────────────────────────────────────────────── */

  /**
   * Mouse-down on a handle: real waypoints start dragging directly; an
   * add-handle first inserts a new waypoint at its current position, then
   * drags that new point.
   *
   * @param {MouseEvent} e
   * @param {number} index
   * @param {boolean} isAddHandle
   */
  Reroute.onHandleMouseDown = function (e, index, isAddHandle) {
    e.preventDefault();
    e.stopPropagation();
    if (!active) return;

    if (isAddHandle) {
      var cx = Number(e.currentTarget.getAttribute("cx"));
      var cy = Number(e.currentTarget.getAttribute("cy"));
      active.working = Reroute.insertWaypointAtSegment(active.working, index, cx, cy);
      active.selectedIndex = index;
      Reroute.render();
    } else {
      active.selectedIndex = index;
    }

    dragState = { index: index };
    document.addEventListener("mousemove", Reroute.onHandleMouseMove);
    document.addEventListener("mouseup", Reroute.onHandleMouseUp);
  };

  /**
   * Mouse-move while dragging a handle — move the working waypoint and
   * re-render the preview.
   *
   * @param {MouseEvent} e
   */
  Reroute.onHandleMouseMove = function (e) {
    if (!dragState || !active) return;
    var tx = window.AdminArborCanvas.getTransform();
    var diag = window.AdminArborCanvas.clientToDiagram(e.clientX, e.clientY, tx);
    active.working = Reroute.moveWaypoint(active.working, dragState.index, diag.x, diag.y);
    Reroute.render();
  };

  /**
   * Mouse-up ends the drag. Nothing persists yet — commit happens on
   * Enter/click-away.
   */
  Reroute.onHandleMouseUp = function () {
    document.removeEventListener("mousemove", Reroute.onHandleMouseMove);
    document.removeEventListener("mouseup", Reroute.onHandleMouseUp);
    dragState = null;
  };

  /* ── Keyboard: nudge / commit / cancel ────────────────────────────────────────── */

  /**
   * While re-route mode is active: Escape reverts, Enter commits, and arrow
   * keys nudge the selected waypoint by one grid step.
   *
   * @param {KeyboardEvent} e
   */
  Reroute.onKeyDown = function (e) {
    if (!active) return;

    if (e.key === "Escape") {
      e.preventDefault();
      Reroute.exit(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      Reroute.exit(true);
      return;
    }

    if (active.selectedIndex < 0 || active.selectedIndex >= active.working.length) {
      return;
    }

    var dx = 0;
    var dy = 0;
    if (e.key === "ArrowLeft") dx = -1;
    else if (e.key === "ArrowRight") dx = 1;
    else if (e.key === "ArrowUp") dy = -1;
    else if (e.key === "ArrowDown") dy = 1;
    else return;

    e.preventDefault();
    active.working = Reroute.nudgeWaypoint(active.working, active.selectedIndex, dx, dy);
    Reroute.render();
  };

  /**
   * Click anywhere outside a handle while active commits the re-route
   * (click-away-to-save, matching the plan's spec).
   *
   * @param {MouseEvent} e
   */
  Reroute.onDocumentClick = function (e) {
    if (!active) return;
    if (
      e.target &&
      e.target.classList &&
      e.target.classList.contains &&
      e.target.classList.contains("admin-arbor-reroute-handle")
    ) {
      return;
    }
    Reroute.exit(true);
  };

  /* ── Commit / revert ──────────────────────────────────────────────────────────── */

  /**
   * Exit re-route mode, cleaning up handles/preview/listeners. Commits the
   * working routing when `commit` is true, otherwise discards it.
   *
   * @param {boolean} commit
   */
  Reroute.exit = function (commit) {
    if (!active) return;

    var edge = active.edge;
    var working = active.working;

    for (var i = 0; i < active.handleEls.length; i++) {
      if (active.handleEls[i].parentNode) {
        active.handleEls[i].parentNode.removeChild(active.handleEls[i]);
      }
    }
    if (active.previewPath && active.previewPath.parentNode) {
      active.previewPath.parentNode.removeChild(active.previewPath);
    }
    var realGroup = document.querySelector(
      '.admin-arbor-edge-group[data-edge-id="' + edge.id + '"]',
    );
    if (realGroup) realGroup.style.visibility = "";

    document.removeEventListener("keydown", Reroute.onKeyDown);
    document.removeEventListener("click", Reroute.onDocumentClick, true);
    document.removeEventListener("mousemove", Reroute.onHandleMouseMove);
    document.removeEventListener("mouseup", Reroute.onHandleMouseUp);
    dragState = null;
    active = null;

    if (!commit) {
      if (typeof window.showToast === "function") {
        window.showToast("Re-route cancelled.", "info");
      }
      return;
    }

    Reroute.commit(edge, working);
  };

  /**
   * Persist the working waypoints via UpdateRecord, then update the shared
   * edges array and re-render through arbor-edges.js.
   *
   * @param {Object} edge
   * @param {Array<{x:number,y:number}>} working
   */
  Reroute.commit = async function (edge, working) {
    var payload = Reroute.buildCommitPayload(working);
    try {
      var updated = await UpdateRecord.updateEdge(edge.id, payload);
      var waypoints =
        updated && updated.waypoints !== undefined ? updated.waypoints : payload.waypoints;
      window.AdminArborEdges.setEdgeWaypoints(edge.id, waypoints);
      if (typeof window.showToast === "function") {
        window.showToast("Re-route saved.", "success");
      }
    } catch (err) {
      console.error("Failed to save edge re-route:", err);
      if (typeof window.showToast === "function") {
        window.showToast("Failed to save re-routing.", "error");
      }
      window.AdminArborEdges.renderEdges();
    }
  };
})();
