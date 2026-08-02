/**
 * Admin timeline node drag module.
 *
 * Left-click drag (button === 0) repositions timeline event dots within their
 * assigned period slot at every zoom level. A 4px pointer-move threshold
 * disambiguates click-to-select (sub-threshold) from drag.
 *
 * Right-click drag (button === 2) repositions dots only when zoomed in to
 * SPREAD density — unchanged from the original behaviour.
 *
 * Coordinates now use the fixed world scale (BASE_PX_PER_PERIOD = 100).
 * Zoom is applied by a CSS transform on the wrapper — drag deltas are
 * screen-space pixels converted to offset fractions using the fixed scale.
 *
 * Pointer-event based (captures, prevents default, cleans up properly per JS-6).
 * Clamps movement via AdminTimelineNodeBounds; stages offset changes via
 * AdminTimelineStaged.stageOffset().
 *
 * @module admin-timeline/timeline-node-drag
 */

window.AdminTimelineNodeDrag = {};

(function () {
  var self = window.AdminTimelineNodeDrag;

  /* ── Constants ──────────────────────────────────────────────────────────────── */

  /** Minimum pointer movement (px) before a left-click becomes a drag. */
  var CANDIDATE_DRAG_PX = 4;

  /** Fixed base pixels per period at world scale. */
  var BASE_PX = 100;

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /** @type {Object|null} Current drag state. */
  var dragState = null;

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

  /* ── Pointer event handlers ─────────────────────────────────────────────────── */

  function onDotContextMenu(e) {
    e.preventDefault();
  }

  function onDotPointerDown(e) {
    var dot = e.currentTarget;
    var eventId = parseInt(dot.dataset.eventId, 10);
    if (!eventId || isNaN(eventId)) return;

    var ev = window.AdminTimelineEvents
      ? window.AdminTimelineEvents.getEventById(eventId)
      : null;
    if (!ev) return;

    // ── Right-click drag ────────────────────────────────────────────────────

    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();

      var effectivePx = window.AdminTimelineZoom
        ? window.AdminTimelineZoom.effectivePxPerPeriod()
        : BASE_PX;

      var density = window.AdminTimelineClusterDensity
        ? window.AdminTimelineClusterDensity.getClusterDensity(null, effectivePx)
        : "normal";

      if (
        density !==
        (window.AdminTimelineClusterDensity
          ? window.AdminTimelineClusterDensity.DENSITY_SPREAD
          : "spread")
      ) {
        return;
      }

      dot.setPointerCapture(e.pointerId);

      var currentLeft = parseFloat(dot.style.left) || 0;
      var currentTop = parseFloat(dot.style.top) || 0;

      var startOffsetXCombined = (ev.timeline_offset_x || 0) +
        (self.getStagedOffsetX(eventId) || 0);
      var startOffsetXToPixels = window.AdminTimelineNodeBounds
        ? window.AdminTimelineNodeBounds.offsetXToPixel(startOffsetXCombined, BASE_PX)
        : 0;

      dragState = {
        eventId: eventId,
        event: ev,
        dot: dot,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: startOffsetXCombined,
        startOffsetY: (ev.timeline_offset_y || 0) +
          (self.getStagedOffsetY(eventId) || 0),
        baseLeftPx: currentLeft - startOffsetXToPixels,
        baseTopPx: 140,
        button: 2,
        _active: true,
      };

      dot.classList.add("admin-timeline-event--dragging");

      document.addEventListener("pointermove", onDocPointerMove, true);
      document.addEventListener("pointerup", onDocPointerUp, true);
      document.addEventListener("pointercancel", onDocPointerUp, true);
      return;
    }

    // ── Left-click candidate drag ───────────────────────────────────────────

    if (e.button !== 0) return;

    dragState = {
      eventId: eventId,
      event: ev,
      dot: dot,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      button: 0,
      _active: false,
      startOffsetX: null,
      startOffsetY: null,
      baseLeftPx: null,
      baseTopPx: null,
    };

    document.addEventListener("pointermove", onDocPointerMove, true);
    document.addEventListener("pointerup", onDocPointerUp, true);
    document.addEventListener("pointercancel", onDocPointerUp, true);
  }

  function onDocPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    // ── Threshold check for left-drag candidates ────────────────────────────

    if (!dragState._active) {
      if (dragState.button !== 0) return;

      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      if (Math.abs(dx) < CANDIDATE_DRAG_PX && Math.abs(dy) < CANDIDATE_DRAG_PX) return;

      // Threshold exceeded — activate the drag now.
      e.preventDefault();
      e.stopPropagation();

      var dot = dragState.dot;
      var eventId = dragState.eventId;
      var ev = dragState.event;

      dragState._active = true;
      dot._timelineDragActive = true;

      dot.setPointerCapture(e.pointerId);
      dot.classList.add("admin-timeline-event--dragging");

      var currentLeft = parseFloat(dot.style.left) || 0;
      var startOffsetXCombined = (ev.timeline_offset_x || 0) +
        (self.getStagedOffsetX(eventId) || 0);
      var startOffsetXToPixels = window.AdminTimelineNodeBounds
        ? window.AdminTimelineNodeBounds.offsetXToPixel(startOffsetXCombined, BASE_PX)
        : 0;

      dragState.startOffsetX = startOffsetXCombined;
      dragState.startOffsetY = (ev.timeline_offset_y || 0) +
        (self.getStagedOffsetY(eventId) || 0);
      dragState.baseLeftPx = currentLeft - startOffsetXToPixels;
      dragState.baseTopPx = 140;

      return;
    }

    // ── Active drag movement ────────────────────────────────────────────────

    var dx2 = e.clientX - dragState.startX;
    var dy2 = e.clientY - dragState.startY;

    var deltaOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetX(dx2, BASE_PX)
      : 0;
    var deltaOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetY(dy2, 280)
      : 0;

    var newOffsetX = dragState.startOffsetX + deltaOffsetX;
    var newOffsetY = dragState.startOffsetY + deltaOffsetY;

    newOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetX(newOffsetX)
      : newOffsetX;
    newOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetY(newOffsetY)
      : newOffsetY;

    updateDotPosition(dragState.dot, newOffsetX, newOffsetY);
  }

  function onDocPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    document.removeEventListener("pointermove", onDocPointerMove, true);
    document.removeEventListener("pointerup", onDocPointerUp, true);
    document.removeEventListener("pointercancel", onDocPointerUp, true);

    if (!dragState._active) {
      dragState = null;
      return;
    }

    if (dragState.dot) {
      dragState.dot.releasePointerCapture(e.pointerId);
      dragState.dot.classList.remove("admin-timeline-event--dragging");
      delete dragState.dot._timelineDragActive;
    }

    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;

    var deltaOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetX(dx, BASE_PX)
      : 0;
    var deltaOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetY(dy, 280)
      : 0;

    var finalOffsetX = dragState.startOffsetX + deltaOffsetX;
    var finalOffsetY = dragState.startOffsetY + deltaOffsetY;

    finalOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetX(finalOffsetX)
      : finalOffsetX;
    finalOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetY(finalOffsetY)
      : finalOffsetY;

    if (
      window.AdminTimelineStaged &&
      window.AdminTimelineStaged.stageOffset
    ) {
      window.AdminTimelineStaged.stageOffset(
        dragState.eventId,
        finalOffsetX,
        finalOffsetY,
      );
    }

    dragState = null;
  }

  /* ── Visual position update ───────────────────────────────────────────────── */

  function updateDotPosition(dot, offsetX, offsetY) {
    if (!dot || !dragState) return;

    var pixelOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.offsetXToPixel(offsetX, BASE_PX)
      : 0;

    dot.style.left = (dragState.baseLeftPx + pixelOffsetX) + "px";

    var finalY = offsetY * 280;
    dot.style.top = 50 + finalY / 2 + "%";

    // Label is now a sibling of the dot (not a child). Update its
    // position to track the dot's new position after drag.
    var eventId = dot.dataset.eventId;
    if (eventId) {
      var label = document.querySelector(
        '.admin-timeline-event-label[data-event-id="' + eventId + '"]'
      );
      if (label) {
        label.style.left = dot.style.left;
        label.style.top = (offsetY <= 0
          ? (50 + finalY / 2 - 10) + "%"
          : (50 + finalY / 2 + 10) + "%");
      }
    }
  }

  /* ── Staged offset helpers ───────────────────────────────────────────────── */

  /**
   * Get the currently staged X offset for an event (if any).
   *
   * @param {number} eventId
   * @returns {number|null}
   */
  self.getStagedOffsetX = function (eventId) {
    if (!window.AdminTimelineStaged || !window.AdminTimelineStaged._offsets) {
      return null;
    }
    var offsets = window.AdminTimelineStaged._offsets;
    for (var i = 0; i < offsets.length; i++) {
      if (offsets[i].id === eventId) {
        return offsets[i].timeline_offset_x;
      }
    }
    return null;
  };

  /**
   * Get the currently staged Y offset for an event (if any).
   *
   * @param {number} eventId
   * @returns {number|null}
   */
  self.getStagedOffsetY = function (eventId) {
    if (!window.AdminTimelineStaged || !window.AdminTimelineStaged._offsets) {
      return null;
    }
    var offsets = window.AdminTimelineStaged._offsets;
    for (var i = 0; i < offsets.length; i++) {
      if (offsets[i].id === eventId) {
        return offsets[i].timeline_offset_y;
      }
    }
    return null;
  };
})();
