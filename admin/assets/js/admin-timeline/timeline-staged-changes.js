/**
 * Admin timeline staged-changes store.
 *
 * Local buffer for timeline edits that the toolbar "Save Changes" button
 * (`#timeline-save-btn`, in the toolbar; the edit panel's own Save button saves
 * one event's title and era through `Events.onSaveEvent`) flushes in one go.
 * `admin/diagrams/timeline.html` wires that button to `save()`.
 *
 * The only production caller that stages a change is timeline-node-drag.js,
 * which calls `stageOffset` when a dot is dropped. `stagePlacement`,
 * `stageMove` and `stageUnassign` have no caller outside
 * admin/tests/admin-timeline-staged.test.js. timeline-events.js reads
 * `getOffset` so a dot that was dropped but not yet saved keeps its place when
 * the canvas re-renders.
 *
 * Each item is saved with `UpdateRecord.saveEvent` (admin/assets/js/update-record.js),
 * which sends `PUT /evidence/:id`; `validateOffsets` in api/models/evidence.model.js
 * clamps the offsets there (x to -0.5..0.5, y to -0.4..0.4). After a save with no
 * failures the store calls `AdminTimelineEvents.loadEvents` to redraw the canvas.
 *
 * Four collections (placements, moves, unassigns, offsets) are saved separately;
 * `pendingCount` / `hasChanges` sum them and drive the save button's label and
 * enabled state.
 *
 * @module admin-timeline/timeline-staged-changes
 */
window.AdminTimelineStaged = {};

(function () {
  var Staged = window.AdminTimelineStaged;

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

  /* ── Save button ────────────────────────────────────────────────────────── */

  /**
   * Show the number of staged changes on the toolbar's save button, and enable
   * the button only while something is staged. Runs after every stage call.
   * `save()` disables the button while it runs and writes its own text, so
   * this must also re-enable it: without that, the first save leaves the button
   * disabled for every later change.
   */
  function refreshSaveButton() {
    if (_saving || typeof document === "undefined") return;
    var saveBtn = document.getElementById("timeline-save-btn");
    if (!saveBtn) return;
    saveBtn.disabled = !Staged.hasChanges();
    saveBtn.textContent = Staged.hasChanges()
      ? "Save Changes (" + Staged.pendingCount() + ")"
      : "Save Changes";
  }

  /* ── Public helpers ─────────────────────────────────────────────────────── */

  /**
   * Total staged items across all four collections.
   *
   * @returns {number}
   */
  Staged.pendingCount = function () {
    return (
      _placements.length + _moves.length + _unassigns.length + _offsets.length
    );
  };

  /**
   * True when at least one change is waiting to be saved.
   *
   * @returns {boolean}
   */
  Staged.hasChanges = function () {
    return Staged.pendingCount() > 0;
  };

  /* ── Stage helpers ──────────────────────────────────────────────────────── */

  /**
   * Stage a new placement (evidence without a period gets one).
   * Not de-duplicated: staging the same id twice saves it twice.
   *
   * @param {number} id  evidence id
   * @param {string} period  timeline_period value
   * @param {string} era  timeline_era value
   * @returns {void}
   */
  Staged.stagePlacement = function (id, period, era) {
    _placements.push({ id: id, timeline_period: period, timeline_era: era });
    refreshSaveButton();
  };

  /**
   * Stage a period move for an already-placed event.
   * Replaces any prior move for the same id (last move wins).
   *
   * @param {number} id  evidence id
   * @param {string} period  timeline_period value
   * @returns {void}
   */
  Staged.stageMove = function (id, period) {
    for (var i = 0; i < _moves.length; i++) {
      if (_moves[i].id === id) {
        _moves[i].timeline_period = period;
        refreshSaveButton();
        return;
      }
    }
    _moves.push({ id: id, timeline_period: period });
    refreshSaveButton();
  };

  /**
   * Stage an unassignment: saving sets the event's timeline_period to null.
   * Not de-duplicated: staging the same id twice saves it twice.
   *
   * @param {number} id  evidence id
   * @returns {void}
   */
  Staged.stageUnassign = function (id) {
    _unassigns.push({ id: id });
    refreshSaveButton();
  };

  /**
   * Stage a placement offset adjustment for an already-placed event.
   * Replaces any prior offset for the same id (last offset wins).
   * Values are saved as given. A null is a staged value, not a removal of the
   * entry, and is stored as null by the API. Called with numbers only, by
   * timeline-node-drag.js.
   *
   * @param {number} id  evidence id
   * @param {number} offsetX  fraction of the period slot width
   * @param {number} offsetY  fraction of the canvas height
   * @returns {void}
   */
  Staged.stageOffset = function (id, offsetX, offsetY) {
    for (var i = 0; i < _offsets.length; i++) {
      if (_offsets[i].id === id) {
        _offsets[i].timeline_offset_x = offsetX;
        _offsets[i].timeline_offset_y = offsetY;
        refreshSaveButton();
        return;
      }
    }
    _offsets.push({
      id: id,
      timeline_offset_x: offsetX,
      timeline_offset_y: offsetY,
    });
    refreshSaveButton();
  };

  /**
   * Get the currently staged offset for an event (if any).
   * Returns both offsetX and offsetY, or null if no staged offset exists.
   * Read by timeline-events.js on every render.
   *
   * @param {number} id
   * @returns {{timeline_offset_x: number, timeline_offset_y: number}|null}
   */
  Staged.getOffset = function (id) {
    for (var i = 0; i < _offsets.length; i++) {
      if (_offsets[i].id === id) {
        return {
          timeline_offset_x: _offsets[i].timeline_offset_x,
          timeline_offset_y: _offsets[i].timeline_offset_y,
        };
      }
    }
    return null;
  };

  /* ── Save ───────────────────────────────────────────────────────────────── */

  /**
   * Send every item of one collection with `UpdateRecord.saveEvent`, one request
   * at a time, and record each failure.
   *
   * @param {Array<{id: number}>} items  the staged collection
   * @param {string} collectionName  reported in `failed` and in the error toast
   * @param {function(object): object} buildPayload  maps a staged item to the saveEvent body
   * @param {Array<{collection: string, id: number, error: *}>} failed  failures are appended here
   * @returns {Promise<Array<{id: number}>>}  the items that did not save
   */
  async function saveCollection(items, collectionName, buildPayload, failed) {
    var succeededIds = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      try {
        await UpdateRecord.saveEvent(item.id, buildPayload(item));
        succeededIds.push(item.id);
      } catch (err) {
        failed.push({ collection: collectionName, id: item.id, error: err });
      }
    }
    return items.filter(function (item) {
      return succeededIds.indexOf(item.id) === -1;
    });
  }

  /**
   * Persist all staged changes via the API.
   *
   * Successfully persisted items are removed from their collection; failed items
   * remain so the user can retry. A call while a save is running, or with
   * nothing staged, does nothing and reports no failures.
   *
   * @returns {Promise<{failed: Array<{collection: string, id: number, error: *}>}>}  items that could not be saved
   */
  Staged.save = async function () {
    if (_saving) return { failed: [] };
    if (Staged.pendingCount() === 0) return { failed: [] };

    var saveBtn = document.getElementById("timeline-save-btn");
    _saving = true;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }

    var failed = [];

    _placements = await saveCollection(
      _placements,
      "placements",
      function (p) {
        return {
          timeline_period: p.timeline_period,
          timeline_era: p.timeline_era,
        };
      },
      failed,
    );
    Staged._placements = _placements;

    _moves = await saveCollection(
      _moves,
      "moves",
      function (m) {
        return { timeline_period: m.timeline_period };
      },
      failed,
    );
    Staged._moves = _moves;

    _unassigns = await saveCollection(
      _unassigns,
      "unassigns",
      function () {
        return { timeline_period: null };
      },
      failed,
    );
    Staged._unassigns = _unassigns;

    _offsets = await saveCollection(
      _offsets,
      "offsets",
      function (o) {
        return {
          timeline_offset_x: o.timeline_offset_x,
          timeline_offset_y: o.timeline_offset_y,
        };
      },
      failed,
    );
    Staged._offsets = _offsets;

    _saving = false;

    if (saveBtn) {
      saveBtn.disabled = !Staged.hasChanges();
      saveBtn.textContent = Staged.hasChanges()
        ? "Save Changes (" + Staged.pendingCount() + " remaining)"
        : "Save Changes";
    }

    // Skipped on partial failure: the canvas keeps showing the unsaved positions
    // (through getOffset) of the items that are still staged.
    if (failed.length === 0) {
      try {
        if (
          typeof AdminTimelineEvents !== "undefined" &&
          AdminTimelineEvents.loadEvents
        ) {
          await AdminTimelineEvents.loadEvents();
        }
      } catch (err) {
        console.error(
          "Timeline reload after a successful save failed; the changes are saved:",
          err,
        );
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

  /* ── Clear ──────────────────────────────────────────────────────────────── */

  /**
   * Drop every staged item without saving. Used by the tests; no page code calls it.
   *
   * @returns {void}
   */
  Staged.clear = function () {
    _placements.length = 0;
    _moves.length = 0;
    _unassigns.length = 0;
    _offsets.length = 0;
    refreshSaveButton();
  };

  /* ── Internals read by the tests ────────────────────────────────────────── */

  Staged._placements = _placements;
  Staged._moves = _moves;
  Staged._unassigns = _unassigns;
  Staged._offsets = _offsets;

  // The toolbar markup ships an enabled button; this disables it until something is staged.
  refreshSaveButton();
})();
