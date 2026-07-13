/**
 * Admin timeline staged-changes store.
 *
 * Centralised local-staging buffer for timeline edits.  The holding pen,
 * timeline drag-move, and remove-from-timeline actions all push into this
 * store.  The toolbar "Save Changes" button flushes everything via the API.
 *
 * Three independent collections so the UI can distinguish new placements,
 * period moves, and removals, but a single `pendingCount` / `hasChanges`
 * drives the save-button affordance.
 *
 * @module admin-timeline/timeline-staged-changes
 */
window.AdminTimelineStaged = {};

(function () {
  var self = window.AdminTimelineStaged;

  /* ── Internal state ─────────────────────────────────────────────────────── */

  /** @type {Array<{id: number, timeline_period: string, timeline_era: string}>} */
  var _placements = [];

  /** @type {Array<{id: number, timeline_period: string}>} */
  var _moves = [];

  /** @type {Array<{id: number}>} */
  var _unassigns = [];

  /** @type {Array<{id: number, timeline_offset_x: number, timeline_offset_y: number}>} */
  var _offsets = [];

  var _saving = false;

  /* ── Public helpers ─────────────────────────────────────────────────────── */

  /** Total staged items across all four collections. */
  self.pendingCount = function () {
    return (
      _placements.length + _moves.length + _unassigns.length + _offsets.length
    );
  };

  /** True when there is at least one change waiting to be saved. */
  self.hasChanges = function () {
    return self.pendingCount() > 0;
  };

  /* ── Stage helpers ──────────────────────────────────────────────────────── */

  /**
   * Stage a new placement (evidence previously without a period now gets one).
   */
  self.stagePlacement = function (id, period, era) {
    _placements.push({ id: id, timeline_period: period, timeline_era: era });
  };

  /**
   * Stage a period move for an already-placed event.
   * Replaces any prior move for the same id (last move wins).
   */
  self.stageMove = function (id, period) {
    for (var i = 0; i < _moves.length; i++) {
      if (_moves[i].id === id) {
        _moves[i].timeline_period = period;
        return;
      }
    }
    _moves.push({ id: id, timeline_period: period });
  };

  /**
   * Stage an unassignment (event removed from timeline — period set to null).
   */
  self.stageUnassign = function (id) {
    _unassigns.push({ id: id });
  };

  /**
   * Stage a placement offset adjustment for an already-placed event.
   * Replaces any prior offset for the same id (last offset wins).
   * Both offsets are optional; omit/null to clear.
   */
  self.stageOffset = function (id, offsetX, offsetY) {
    for (var i = 0; i < _offsets.length; i++) {
      if (_offsets[i].id === id) {
        _offsets[i].timeline_offset_x = offsetX;
        _offsets[i].timeline_offset_y = offsetY;
        return;
      }
    }
    _offsets.push({
      id: id,
      timeline_offset_x: offsetX,
      timeline_offset_y: offsetY,
    });
  };

  /* ── Save ───────────────────────────────────────────────────────────────── */

  /**
   * Persist all staged changes via the API.
   *
   * Each item is sent individually with UpdateRecord.saveEvent.  Successfully
   * persisted items are removed from their collection; failed items remain
   * so the user can retry.
   *
   * @returns {Promise<{failed: Array}>}  list of items that could not be saved
   */
  self.save = async function () {
    if (_saving) return { failed: [] };
    if (self.pendingCount() === 0) return { failed: [] };

    var saveBtn = document.getElementById("timeline-save-btn");
    _saving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }

    var failed = [];

    // ── Placements ──────────────────────────────────────────────────────
    var succeededPlacements = [];
    for (var i = 0; i < _placements.length; i++) {
      var p = _placements[i];
      try {
        await UpdateRecord.saveEvent(p.id, {
          timeline_period: p.timeline_period,
          timeline_era: p.timeline_era,
        });
        succeededPlacements.push(p.id);
      } catch (err) {
        failed.push({ collection: "placements", id: p.id, error: err });
      }
    }
    _placements = _placements.filter(function (p) {
      return succeededPlacements.indexOf(p.id) === -1;
    });
    self._placements = _placements;

    // ── Moves ───────────────────────────────────────────────────────────
    var succeededMoves = [];
    for (var j = 0; j < _moves.length; j++) {
      var m = _moves[j];
      try {
        await UpdateRecord.saveEvent(m.id, {
          timeline_period: m.timeline_period,
        });
        succeededMoves.push(m.id);
      } catch (err) {
        failed.push({ collection: "moves", id: m.id, error: err });
      }
    }
    _moves = _moves.filter(function (m) {
      return succeededMoves.indexOf(m.id) === -1;
    });
    self._moves = _moves;

    // ── Unassigns ───────────────────────────────────────────────────────
    var succeededUnassigns = [];
    for (var k = 0; k < _unassigns.length; k++) {
      var u = _unassigns[k];
      try {
        await UpdateRecord.saveEvent(u.id, { timeline_period: null });
        succeededUnassigns.push(u.id);
      } catch (err) {
        failed.push({ collection: "unassigns", id: u.id, error: err });
      }
    }
    _unassigns = _unassigns.filter(function (u) {
      return succeededUnassigns.indexOf(u.id) === -1;
    });
    self._unassigns = _unassigns;

    // ── Offsets ──────────────────────────────────────────────────────────
    var succeededOffsets = [];
    for (var l = 0; l < _offsets.length; l++) {
      var o = _offsets[l];
      try {
        await UpdateRecord.saveEvent(o.id, {
          timeline_offset_x: o.timeline_offset_x,
          timeline_offset_y: o.timeline_offset_y,
        });
        succeededOffsets.push(o.id);
      } catch (err) {
        failed.push({ collection: "offsets", id: o.id, error: err });
      }
    }
    _offsets = _offsets.filter(function (o) {
      return succeededOffsets.indexOf(o.id) === -1;
    });
    self._offsets = _offsets;

    // ── Post-save ───────────────────────────────────────────────────────
    _saving = false;

    if (saveBtn) {
      saveBtn.disabled = self.pendingCount() === 0;
      saveBtn.textContent = self.hasChanges()
        ? "Save Changes (" + self.pendingCount() + " remaining)"
        : "Save Changes";
    }

    // Refresh the timeline and holding pen after successful save
    if (failed.length === 0) {
      try {
        if (
          typeof AdminTimelineEvents !== "undefined" &&
          AdminTimelineEvents.loadEvents
        ) {
          await AdminTimelineEvents.loadEvents();
        }
      } catch (_) {
        /* best-effort */
      }
      try {
        if (
          typeof AdminTimelineHoldingPen !== "undefined" &&
          AdminTimelineHoldingPen.refresh
        ) {
          await AdminTimelineHoldingPen.refresh();
        }
      } catch (_) {
        /* best-effort */
      }
    }

    if (failed.length > 0) {
      var msg =
        "Failed to save " +
        failed.length +
        " change(s): " +
        failed
          .map(function (f) {
            return "ID " + f.id + " (" + f.collection + ")";
          })
          .join(", ");
      if (typeof showToast === "function") {
        showToast(msg, "error");
      }
    }

    return { failed: failed };
  };

  /* ── Clear (for testing / reset) ────────────────────────────────────────── */

  self.clear = function () {
    _placements.length = 0;
    _moves.length = 0;
    _unassigns.length = 0;
    _offsets.length = 0;
  };

  /* ── Expose internals for testing ───────────────────────────────────────── */

  self._placements = _placements;
  self._moves = _moves;
  self._unassigns = _unassigns;
  self._offsets = _offsets;
})();
