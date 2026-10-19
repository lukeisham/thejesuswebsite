/**
 * Admin timeline node drag module.
 *
 * Left-click drag (button 0) repositions a timeline dot inside its period slot
 * at every zoom level. A 4px pointer-move threshold separates a click (select
 * the event) from a drag. Right-click drag (button 2) does the same, but only
 * when zoomed in to SPREAD density.
 *
 * The dot follows the pointer one to one. A pointer distance is divided by the
 * zoom scale to get world pixels. Along the time axis those pixels become an
 * offset fraction of one period slot. Across the axis they go through
 * `boxPixelsToCrossAxisPixels`, because the public page places a dot at
 * `top: 50% + y / 2 %`. The drag is measured from the pointer-down position and
 * starts from where the dot is shown, not from the stored offset, so a dot that
 * has never been moved does not jump.
 *
 * While a node is dragged, and when it is dropped, the labels are placed again
 * (`AdminTimelineEvents.relayoutLabels`), so titles move out of each other's way
 * and keep a leader line to their dot as the node moves. A drop stages the offsets with
 * `AdminTimelineStaged.stageOffset`; they are saved by the toolbar button.
 *
 * The offset maths is `window.AdminTimelineOffsets`, the same module the public
 * renderer imports (setup/ARCHITECTURE/node-cluster-logic.md). The scales come
 * from `AdminTimelineGeometry`. Listeners are attached by timeline-events.js
 * after every render. A drag sets `_timelineDragActive` on the dot; the dot's
 * click handler in timeline-events.js reads it, and the next pointer-down clears
 * it, so the click that ends a drag does not open the edit panel.
 *
 * @module admin-timeline/timeline-node-drag
 */

window.AdminTimelineNodeDrag = {};

(function () {
  var self = window.AdminTimelineNodeDrag;

  /* ── Constants ──────────────────────────────────────────────────────────────── */

  /** Minimum pointer movement (px) before a left-click becomes a drag. */
  var CANDIDATE_DRAG_PX = 4;

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
   * Attach left- and right-click drag listeners to all timeline event dots.
   *
   * @returns {void}
   */
  self.attachDragListeners = function () {
    var dots = document.querySelectorAll(".admin-timeline-event");
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      dot.removeEventListener("pointerdown", onDotPointerDown);
      dot.removeEventListener("contextmenu", onDotContextMenu);
      dot.addEventListener("pointerdown", onDotPointerDown);
      dot.addEventListener("contextmenu", onDotContextMenu);
    }
  };

  /* ── Helpers ───────────────────────────────────────────────────────────────── */

  /** The current zoom scale; 1 when the zoom module is not loaded. */
  function currentScale() {
    var scale = window.AdminTimelineZoom ? window.AdminTimelineZoom.getScale() : 1;
    return scale > 0 ? scale : 1;
  }

  /**
   * Record where the dot is shown now, as offsets from its period-slot centre.
   * The drag is measured from this position and from the pointer-down position.
   *
   * @param {Object} state - the drag state
   */
  function captureStart(state) {
    var dot = state.dot;
    var slotCentreX = window.AdminTimelineAxis.periodToX(
      state.event.timeline_period,
      BASE_PX,
    );
    var shownLeft = parseFloat(dot.style.left) || slotCentreX;
    var shownTopPercent = parseFloat(dot.style.top);
    if (!Number.isFinite(shownTopPercent)) shownTopPercent = 50;

    state.slotCentreX = slotCentreX;
    state.startOffsetX = Offsets.pixelsToOffsetX(shownLeft - slotCentreX);
    state.startOffsetY = Offsets.pixelsToOffsetY((shownTopPercent - 50) * 2);
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
    var scale = currentScale();
    var dxWorld = (clientX - state.startX) / scale;
    var dyWorld = (clientY - state.startY) / scale;
    var Bounds = window.AdminTimelineNodeBounds;
    return {
      x: Bounds.clampOffsetX(state.startOffsetX + Offsets.pixelsToOffsetX(dxWorld)),
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

  function onDotContextMenu(e) {
    e.preventDefault();
  }

  function onDotPointerDown(e) {
    var dot = e.currentTarget;
    delete dot._timelineDragActive;

    var eventId = parseInt(dot.dataset.eventId, 10);
    if (!eventId || isNaN(eventId)) return;

    var ev = window.AdminTimelineEvents
      ? window.AdminTimelineEvents.getEventById(eventId)
      : null;
    if (!ev) return;

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

    // ── Right-click drag: only when zoomed in to SPREAD density ─────────────
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();

      var effectivePx = window.AdminTimelineZoom
        ? window.AdminTimelineZoom.effectivePxPerPeriod()
        : BASE_PX;
      var density = window.AdminTimelineClusterDensity.getClusterDensity(
        null,
        effectivePx,
      );
      if (density !== window.AdminTimelineClusterDensity.DENSITY_SPREAD) return;

      dragState = state;
      activate(e);
      listen();
      return;
    }

    // ── Left-click: a candidate until the pointer moves past the threshold ───
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

  /** Turn the candidate into a drag. */
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
    updateDotPosition(dragState.dot, offsets.x, offsets.y);
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
    updateDotPosition(dot, offsets.x, offsets.y);
    window.AdminTimelineStaged.stageOffset(dragState.eventId, offsets.x, offsets.y);

    cancelRelayout();
    window.AdminTimelineEvents.relayoutLabels(true);

    dragState = null;
  }

  /* ── Visual position update ───────────────────────────────────────────────── */

  /**
   * Move the dot to an offset, with the same formulas as `Events.renderEvents`.
   * The label is moved by the layout pass that follows.
   *
   * @param {HTMLElement} dot
   * @param {number} offsetX
   * @param {number} offsetY
   */
  function updateDotPosition(dot, offsetX, offsetY) {
    if (!dot || !dragState) return;

    dot.style.left = dragState.slotCentreX + Offsets.offsetXToPixels(offsetX) + "px";
    var topPercent = Offsets.crossAxisToTopPercent(Offsets.offsetYToPixels(offsetY));
    dot.style.top = topPercent + "%";
  }
})();
