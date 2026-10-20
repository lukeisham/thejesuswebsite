/**
 * Admin timeline node drag module.
 *
 * Left-click drag (button 0) repositions a timeline dot inside its period slot
 * at every zoom level. A pointer move of `CANDIDATE_DRAG_PX` separates a click
 * (select the event) from a drag. Right-click drag (button 2) does the same,
 * but only when zoomed in to SPREAD density.
 *
 * The dot follows the pointer one to one. A pointer distance is divided by the
 * zoom scale to get world pixels. Along the time axis those pixels become an
 * offset fraction of one period slot. Across the axis they go through
 * `boxPixelsToCrossAxisPixels`, because the public page places a dot with
 * `crossAxisToTopPercent`. The drag starts from where the dot is shown (read
 * back with `topPercentToCrossAxis`), not from the stored offset, so a dot
 * that has never been moved does not jump.
 *
 * While a node is dragged, and when it is dropped, the labels are placed again
 * (`AdminTimelineEvents.relayoutLabels`), so titles move out of each other's
 * way and keep a leader line to their dot. A drop stages the offsets with
 * `AdminTimelineStaged.stageOffset`; the toolbar button saves them.
 *
 * Connections:
 * - `window.AdminTimelineOffsets` (cluster-logic-bridge/timeline-bridge.js) is
 *   the offset maths the public renderer imports. A private copy here would
 *   make a dropped node show at another spot on the public page
 *   (setup/ARCHITECTURE/timeline.md, row 3).
 * - Reads `AdminTimelineZoom`, `AdminTimelineAxis`, `AdminTimelineGeometry`,
 *   `AdminTimelineNodeBounds` and `AdminTimelineClusterDensity`; all load
 *   before this file (admin/diagrams/timeline.html).
 * - timeline-events.js calls `attachDragListeners` after every render and
 *   supplies `getEventById` and `relayoutLabels`.
 * - Click suppression: a drag sets `dot._timelineDragActive`. The dot's click
 *   handler in timeline-events.js reads and deletes it, so the click that ends
 *   a drag does not select the event. The next pointer-down clears it, for a
 *   drag that ended with no click. Rename it in both files together.
 *
 * @module admin-timeline/timeline-node-drag
 */

window.AdminTimelineNodeDrag = {};

(function () {
  var NodeDrag = window.AdminTimelineNodeDrag;

  /* ── Constants ──────────────────────────────────────────────────────────────── */

  /** Pointer movement (px) before a left-click press becomes a drag. */
  var CANDIDATE_DRAG_PX = 4;

  var DOT_SELECTOR = ".admin-timeline-event";

  /** World pixels per period slot. */
  var BASE_PX = window.AdminTimelineGeometry.BASE_PX_PER_PERIOD;

  /** The offset-to-pixel and offset-to-percentage maths, shared with the public renderer. */
  var Offsets = window.AdminTimelineOffsets;

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /** @type {Object|null} Current drag state. */
  var dragState = null;

  /** Id of the queued animation frame that lays the labels out, or 0. */
  var relayoutFrame = 0;

  /* ── Initialisation ────────────────────────────────────────────────────────── */

  /**
   * Listen for drags on every dot, through two listeners on `#timeline-axis`.
   * Delegation keeps the listeners alive when timeline-events.js re-renders the
   * dots; adding the same function again is a no-op, so calling this after each
   * render is safe.
   *
   * @returns {void}
   */
  NodeDrag.attachDragListeners = function () {
    var axisEl = document.getElementById("timeline-axis");
    if (!axisEl) {
      console.warn("AdminTimelineNodeDrag.attachDragListeners: #timeline-axis not found");
      return;
    }
    axisEl.addEventListener("pointerdown", onAxisPointerDown);
    axisEl.addEventListener("contextmenu", onAxisContextMenu);
  };

  /* ── Helpers ───────────────────────────────────────────────────────────────── */

  /**
   * Record where the dot is shown now, as offsets from its period-slot centre.
   * The drag is measured from this position and from the pointer-down position.
   *
   * @param {Object} state - the drag state
   * @returns {void}
   */
  function captureStart(state) {
    var dot = state.dot;
    var slotCentreX = window.AdminTimelineAxis.periodToX(
      state.event.timeline_period,
      BASE_PX,
    );
    var shownLeft = parseFloat(dot.style.left);
    var shownTopPercent = parseFloat(dot.style.top);
    if (!Number.isFinite(shownLeft) || !Number.isFinite(shownTopPercent)) {
      console.warn(
        "AdminTimelineNodeDrag: dot has no position, starting from the slot centre",
        { eventId: state.eventId, left: dot.style.left, top: dot.style.top },
      );
      if (!Number.isFinite(shownLeft)) shownLeft = slotCentreX;
      if (!Number.isFinite(shownTopPercent)) shownTopPercent = Offsets.crossAxisToTopPercent(0);
    }

    state.slotCentreX = slotCentreX;
    state.startOffsetX = Offsets.pixelsToOffsetX(shownLeft - slotCentreX);
    state.startOffsetY = Offsets.pixelsToOffsetY(Offsets.topPercentToCrossAxis(shownTopPercent));
  }

  /**
   * Offsets for a pointer position, clamped to what an edit may store.
   *
   * @param {Object} state - the drag state
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x: number, y: number}}
   */
  function offsetsForPointer(state, clientX, clientY) {
    var scale = window.AdminTimelineZoom.getScale();
    var dxWorld = (clientX - state.startX) / scale;
    var dyWorld = (clientY - state.startY) / scale;
    var Bounds = window.AdminTimelineNodeBounds;
    return {
      x: Bounds.clampOffsetX(
        state.startOffsetX + Offsets.pixelsToOffsetX(dxWorld),
        state.startOffsetX,
      ),
      y: Bounds.clampOffsetY(
        state.startOffsetY +
          Offsets.pixelsToOffsetY(Offsets.boxPixelsToCrossAxisPixels(dyWorld)),
      ),
    };
  }

  /** Lay the labels out again once per animation frame while a node moves. */
  function scheduleRelayout() {
    if (relayoutFrame) return;
    relayoutFrame = requestAnimationFrame(function () {
      relayoutFrame = 0;
      window.AdminTimelineEvents.relayoutLabels(true);
    });
  }

  function cancelRelayout() {
    if (!relayoutFrame) return;
    cancelAnimationFrame(relayoutFrame);
    relayoutFrame = 0;
  }

  /* ── Pointer event handlers ─────────────────────────────────────────────────── */

  /** The dot under a pointer event on the axis, or null for the axis line, a label or a leader. */
  function dotFromEvent(e) {
    return e.target.closest(DOT_SELECTOR);
  }

  // The browser menu would open on a right-click drag.
  function onAxisContextMenu(e) {
    if (dotFromEvent(e)) e.preventDefault();
  }

  function onAxisPointerDown(e) {
    var dot = dotFromEvent(e);
    if (!dot) return;
    delete dot._timelineDragActive;

    var eventId = parseInt(dot.dataset.eventId, 10);
    if (!eventId) {
      console.warn("AdminTimelineNodeDrag: dot has no valid data-event-id", {
        eventId: dot.dataset.eventId,
      });
      return;
    }

    var ev = window.AdminTimelineEvents.getEventById(eventId);
    if (!ev) {
      console.warn("AdminTimelineNodeDrag: no event for the pressed dot", { eventId: eventId });
      return;
    }

    var state = {
      eventId: eventId,
      event: ev,
      dot: dot,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      button: e.button,
      active: false,
    };
    captureStart(state);

    if (e.button === 2) {
      // Swallowed even outside SPREAD density, so the press neither pans the canvas nor opens a menu.
      e.preventDefault();
      e.stopPropagation();

      // The density tier depends only on the px-per-period; the first argument is unused.
      var density = window.AdminTimelineClusterDensity.getClusterDensity(
        null,
        window.AdminTimelineZoom.effectivePxPerPeriod(),
      );
      if (density !== window.AdminTimelineClusterDensity.DENSITY_SPREAD) return;

      dragState = state;
      activate(e);
      listen();
      return;
    }

    // A left press is only a candidate until the pointer moves CANDIDATE_DRAG_PX.
    if (e.button !== 0) return;
    dragState = state;
    listen();
  }

  function listen() {
    document.addEventListener("pointermove", onDocPointerMove, true);
    document.addEventListener("pointerup", onDocPointerUp, true);
    document.addEventListener("pointercancel", onDocPointerUp, true);
  }

  function unlisten() {
    document.removeEventListener("pointermove", onDocPointerMove, true);
    document.removeEventListener("pointerup", onDocPointerUp, true);
    document.removeEventListener("pointercancel", onDocPointerUp, true);
  }

  /** Turn the candidate into a drag and set the click-suppression flag (see the header). */
  function activate(e) {
    var dot = dragState.dot;
    dragState.active = true;
    dot._timelineDragActive = true;

    dot.setPointerCapture(e.pointerId);
    dot.classList.add("admin-timeline-event--dragging");
  }

  function onDocPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    if (!dragState.active) {
      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      if (Math.abs(dx) < CANDIDATE_DRAG_PX && Math.abs(dy) < CANDIDATE_DRAG_PX) return;

      e.preventDefault();
      e.stopPropagation();
      activate(e);
    }

    var offsets = offsetsForPointer(dragState, e.clientX, e.clientY);
    updateDotPosition(dragState, offsets.x, offsets.y);
    scheduleRelayout();
  }

  function onDocPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    unlisten();

    if (!dragState.active) {
      dragState = null;
      return;
    }

    var dot = dragState.dot;
    dot.releasePointerCapture(e.pointerId);
    dot.classList.remove("admin-timeline-event--dragging");

    var offsets = offsetsForPointer(dragState, e.clientX, e.clientY);
    updateDotPosition(dragState, offsets.x, offsets.y);
    window.AdminTimelineStaged.stageOffset(dragState.eventId, offsets.x, offsets.y);

    cancelRelayout();
    window.AdminTimelineEvents.relayoutLabels(true);

    dragState = null;
  }

  /* ── Visual position update ───────────────────────────────────────────────── */

  /**
   * Move the dragged dot to an offset, with the same mapping as
   * `Events.renderEvents`. The label is moved by the layout pass that follows.
   *
   * @param {Object} state - the drag state; supplies the dot and its slot centre
   * @param {number} offsetX
   * @param {number} offsetY
   * @returns {void}
   */
  function updateDotPosition(state, offsetX, offsetY) {
    state.dot.style.left = state.slotCentreX + Offsets.offsetXToPixels(offsetX) + "px";
    var topPercent = Offsets.crossAxisToTopPercent(Offsets.offsetYToPixels(offsetY));
    state.dot.style.top = topPercent + "%";
  }
})();
