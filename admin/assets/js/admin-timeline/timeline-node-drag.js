/**
 * Admin timeline node drag module.
 *
 * Right-click drag (button === 2) repositions timeline event dots within their
 * assigned period slot, only when zoomed in to SPREAD density (pxPerPeriod >= 120).
 *
 * Pointer-event based (captures, prevents default, cleans up properly per JS-6).
 * Clamps movement via AdminTimelineNodeBounds; stages offset changes via
 * AdminTimelineStaged.stageOffset().
 *
 * Contextmenu default is suppressed for dot elements so right-click doesn't show
 * a browser menu.
 *
 * @module admin-timeline/timeline-node-drag
 */

window.AdminTimelineNodeDrag = {};

(function () {
  var self = window.AdminTimelineNodeDrag;

  /* ── State ─────────────────────────────────────────────────────────────────── */

  /** @type {Object|null} Current drag state. */
  var dragState = null;

  /* ── Initialisation ────────────────────────────────────────────────────────── */

  /**
   * Attach right-click drag listeners to all timeline event dots.
   * Called after dots are rendered or whenever the DOM is updated.
   *
   * @returns {void}
   */
  self.attachDragListeners = function () {
    var dots = document.querySelectorAll(".admin-timeline-event");
    for (var i = 0; i < dots.length; i++) {
      var dot = dots[i];
      // Remove old listeners if reattaching
      dot.removeEventListener("pointerdown", onDotPointerDown);
      dot.removeEventListener("contextmenu", onDotContextMenu);
      // Attach fresh listeners
      dot.addEventListener("pointerdown", onDotPointerDown);
      dot.addEventListener("contextmenu", onDotContextMenu);
    }
  };

  /* ── Pointer event handlers ─────────────────────────────────────────────────── */

  /**
   * Contextmenu handler — prevent the browser context menu on dots.
   *
   * @param {PointerEvent} e
   */
  function onDotContextMenu(e) {
    e.preventDefault();
  }

  /**
   * Pointerdown on a dot — check for right-click in SPREAD density, then
   * begin drag if conditions are met.
   *
   * @param {PointerEvent} e
   */
  function onDotPointerDown(e) {
    // Only handle right-click (button === 2)
    if (e.button !== 2) return;

    e.preventDefault();
    e.stopPropagation();

    var pxPerPeriod = window.AdminTimelineAxis
      ? window.AdminTimelineAxis.getPxPerPeriod()
      : 100;
    var density = window.AdminTimelineClusterDensity
      ? window.AdminTimelineClusterDensity.getClusterDensity(null, pxPerPeriod)
      : "normal";

    // Only allow drag in SPREAD density (pxPerPeriod >= 120)
    if (
      density !==
      (window.AdminTimelineClusterDensity
        ? window.AdminTimelineClusterDensity.DENSITY_SPREAD
        : "spread")
    ) {
      return;
    }

    var dot = e.currentTarget;
    var eventId = parseInt(dot.dataset.eventId, 10);
    if (!eventId || isNaN(eventId)) return;

    var ev = window.AdminTimelineEvents
      ? window.AdminTimelineEvents.getEventById(eventId)
      : null;
    if (!ev) return;

    // Capture pointer to this element so we get all move/up events
    dot.setPointerCapture(e.pointerId);

    // Initialize drag state
    dragState = {
      eventId: eventId,
      event: ev,
      dot: dot,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: (ev.timeline_offset_x || 0) +
        (self.getStagedOffsetX(eventId) || 0),
      startOffsetY: (ev.timeline_offset_y || 0) +
        (self.getStagedOffsetY(eventId) || 0),
      pxPerPeriod: pxPerPeriod,
    };

    // Add dragging class for visual feedback
    dot.classList.add("admin-timeline-event--dragging");

    // Attach move/up listeners
    document.addEventListener("pointermove", onDocPointerMove, true);
    document.addEventListener("pointerup", onDocPointerUp, true);
  }

  /**
   * Pointermove during drag — compute new offset and update dot/label position.
   *
   * @param {PointerEvent} e
   */
  function onDocPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;

    // Convert pixel deltas to offset fractions
    var deltaOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetX(dx, dragState.pxPerPeriod)
      : 0;
    var deltaOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetY(dy, 280) // canvas height
      : 0;

    // Compute new offsets
    var newOffsetX = dragState.startOffsetX + deltaOffsetX;
    var newOffsetY = dragState.startOffsetY + deltaOffsetY;

    // Clamp to safe bounds
    newOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetX(newOffsetX)
      : newOffsetX;
    newOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.clampOffsetY(newOffsetY)
      : newOffsetY;

    // Apply offset to visual position
    updateDotPosition(dragState.dot, newOffsetX, newOffsetY);
  }

  /**
   * Pointerup — finalize drag and stage the offset change.
   *
   * @param {PointerEvent} e
   */
  function onDocPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;

    // Clean up listeners
    document.removeEventListener("pointermove", onDocPointerMove, true);
    document.removeEventListener("pointerup", onDocPointerUp, true);

    // Release pointer capture
    if (dragState.dot) {
      dragState.dot.releasePointerCapture(e.pointerId);
      dragState.dot.classList.remove("admin-timeline-event--dragging");
    }

    // Compute final offset
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;

    var deltaOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.pixelToOffsetX(dx, dragState.pxPerPeriod)
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

    // Stage the change
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

  /**
   * Update the visual position of a dot and its label based on offset fractions.
   *
   * @param {HTMLElement} dot
   * @param {number} offsetX - fraction of period slot
   * @param {number} offsetY - fraction of canvas height
   */
  function updateDotPosition(dot, offsetX, offsetY) {
    if (!dot) return;

    var pxPerPeriod = dragState ? dragState.pxPerPeriod : 100;
    var pixelOffsetX = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.offsetXToPixel(offsetX, pxPerPeriod)
      : 0;
    var pixelOffsetY = window.AdminTimelineNodeBounds
      ? window.AdminTimelineNodeBounds.offsetYToPixel(offsetY, 280)
      : 0;

    // Apply offset to dot position
    var currentLeft = parseFloat(dot.style.left) || 0;
    var baseLeft = currentLeft - (dragState ? dragState.pxPerPeriod / 2 : 0);
    dot.style.left = baseLeft + pixelOffsetX + "px";
    dot.style.top = (50 + offsetY * 280 / 2) + "px";

    // Update label if present
    var label = dot.querySelector(".admin-timeline-event-label");
    if (label) {
      var labelLeft = parseFloat(label.style.left) || 0;
      var labelBaseLeft = labelLeft - (dragState ? dragState.pxPerPeriod / 2 : 0);
      label.style.left = labelBaseLeft + pixelOffsetX + "px";
      label.style.top = (50 + offsetY * 280 / 2 + (offsetY <= 0 ? -22 : 8)) + "px";
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
