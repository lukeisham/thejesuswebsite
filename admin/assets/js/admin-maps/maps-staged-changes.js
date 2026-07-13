/**
 * Admin maps staged-changes store.
 *
 * Collects pin creates (from holding-pen drops) and moves (from drag-reposition)
 * until the user clicks Save. Batch-persists via POST/PUT with explicit
 * per-item failure reporting (JS-2).
 *
 * @module admin-maps/maps-staged-changes
 */

window.AdminMapsStaged = {};
const Staged = window.AdminMapsStaged;

/* ── State ────────────────────────────────────────────────────────────────── */

/** @type {Array<Object>}  { map_id, evidence_id, x, y, label, _tempId } */
let stagedCreates = [];

/** @type {Array<Object>}  { pinId, x, y } */
let stagedMoves = [];

/** @type {number}  Counter for generating temporary IDs. */
let tempIdCounter = 0;

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * Stage a new pin creation (from holding-pen drop or add-mode click).
 *
 * @param {number} mapId
 * @param {Object} evidence - evidence row with at least id, title, timeline_era
 * @param {number} x - percentage x
 * @param {number} y - percentage y
 * @returns {Object} the staged pin object (includes _tempId for DOM tracking)
 */
Staged.stageCreate = function (mapId, evidence, x, y) {
  const staged = {
    _tempId: "staged-" + ++tempIdCounter,
    map_id: mapId,
    evidence_id: evidence.id,
    evidence_title: evidence.title,
    evidence_slug: evidence.slug,
    timeline_era: evidence.timeline_era,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    label: evidence.title,
  };
  stagedCreates.push(staged);
  Staged._updateUI();
  return staged;
};

/**
 * Stage a pin move (reposition). Replaces any prior staged move for the same pin.
 *
 * @param {number} pinId
 * @param {number} x - percentage x
 * @param {number} y - percentage y
 */
Staged.stageMove = function (pinId, x, y) {
  // Remove any prior staged move for this pin
  stagedMoves = stagedMoves.filter((m) => m.pinId !== pinId);
  stagedMoves.push({
    pinId: pinId,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  });
  Staged._updateUI();
};

/**
 * Remove a staged create by its temporary ID without hitting the API.
 *
 * @param {string} tempId
 */
Staged.unstageCreate = function (tempId) {
  stagedCreates = stagedCreates.filter((sc) => sc._tempId !== tempId);
  Staged._updateUI();
};

/**
 * Update a staged create's position in place (for drag-before-save).
 *
 * @param {string} tempId
 * @param {number} x - percentage x
 * @param {number} y - percentage y
 */
Staged.updateStagedPosition = function (tempId, x, y) {
  for (var i = 0; i < stagedCreates.length; i++) {
    if (stagedCreates[i]._tempId === tempId) {
      stagedCreates[i].x = Math.round(x * 100) / 100;
      stagedCreates[i].y = Math.round(y * 100) / 100;
      break;
    }
  }
  Staged._updateUI();
};

/**
 * Return all staged creates (for rendering staged pins on the canvas).
 * @returns {Array<Object>}
 */
Staged.getCreates = function () {
  return stagedCreates.slice();
};

/**
 * Return all staged moves.
 * @returns {Array<Object>}
 */
Staged.getMoves = function () {
  return stagedMoves.slice();
};

/**
 * Total count of all pending changes.
 * @returns {number}
 */
Staged.count = function () {
  return stagedCreates.length + stagedMoves.length;
};

/**
 * Are there any unsaved changes?
 * @returns {boolean}
 */
Staged.hasChanges = function () {
  return Staged.count() > 0;
};

/**
 * Save all staged changes to the API. Returns an array of per-item results.
 * Each result has { success: boolean, type: 'create'|'move', [error]: string }.
 *
 * @returns {Promise<Array<Object>>}
 */
Staged.saveAll = async function () {
  const results = [];
  const saveBtn = document.getElementById("holding-pen-save");
  if (saveBtn) saveBtn.disabled = true;

  // Save creates
  for (let i = 0; i < stagedCreates.length; i++) {
    const c = stagedCreates[i];
    try {
      await Admin.api.post("/maps/pins", {
        map_id: c.map_id,
        evidence_id: c.evidence_id,
        x: c.x,
        y: c.y,
        label: c.label,
      });
      results.push({ success: true, type: "create", _tempId: c._tempId });
    } catch (e) {
      results.push({
        success: false,
        type: "create",
        _tempId: c._tempId,
        error: e.message,
      });
    }
  }

  // Save moves
  for (let j = 0; j < stagedMoves.length; j++) {
    const m = stagedMoves[j];
    try {
      await Admin.api.put("/maps/pins/" + m.pinId, {
        x: m.x,
        y: m.y,
      });
      results.push({ success: true, type: "move", pinId: m.pinId });
    } catch (e) {
      results.push({
        success: false,
        type: "move",
        pinId: m.pinId,
        error: e.message,
      });
    }
  }

  // Clear only the successfully saved items
  const failedCreates = [];
  for (let k = 0; k < results.length; k++) {
    if (results[k].type === "create" && results[k].success) {
      // Remove from stagedCreates by _tempId
      stagedCreates = stagedCreates.filter(
        (sc) => sc._tempId !== results[k]._tempId,
      );
    }
    if (results[k].type === "create" && !results[k].success) {
      failedCreates.push(results[k]);
    }
  }
  stagedMoves = stagedMoves.filter((sm) => {
    for (let r = 0; r < results.length; r++) {
      if (results[r].type === "move" && results[r].pinId === sm.pinId) {
        return !results[r].success; // keep if failed
      }
    }
    return false; // successful moves are removed
  });

  if (saveBtn) saveBtn.disabled = false;
  Staged._updateUI();

  // Reload pins from the server to get real IDs for newly created pins
  if (window.AdminMapsPins && window.AdminMapsPins.loadPins) {
    const mapId = Staged._getCurrentMapId();
    if (mapId) await window.AdminMapsPins.loadPins(mapId);
  }

  // Surface partial failures
  if (failedCreates.length > 0) {
    const msg =
      failedCreates.length +
      " pin(s) failed to save: " +
      failedCreates.map((f) => f.error).join("; ");
    const errorEl = document.getElementById("holding-pen-error");
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      // Auto-hide after 8 seconds
      setTimeout(() => {
        errorEl.textContent = "";
        errorEl.hidden = true;
      }, 8000);
    }
  } else {
    // Clear any previous error on successful save
    const errorEl = document.getElementById("holding-pen-error");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.hidden = true;
    }
  }

  return results;
};

/* ── UI helpers ───────────────────────────────────────────────────────────── */

/**
 * Update the save button count badge and beforeunload guard.
 */
Staged._updateUI = function () {
  const count = Staged.count();

  // Staged-count segment
  const badge = document.getElementById("holding-pen-badge");
  if (badge) {
    badge.textContent = String(count);
    badge.classList.toggle("admin-maps-toolbar__btn-count--active", count > 0);
  }

  // beforeunload guard
  if (count > 0) {
    if (!Staged._beforeUnloadWired) {
      window.addEventListener("beforeunload", Staged._onBeforeUnload);
      Staged._beforeUnloadWired = true;
    }
  } else {
    if (Staged._beforeUnloadWired) {
      window.removeEventListener("beforeunload", Staged._onBeforeUnload);
      Staged._beforeUnloadWired = false;
    }
  }
};

/**
 * beforeunload handler — warn about unsaved changes.
 *
 * @param {BeforeUnloadEvent} e
 */
Staged._onBeforeUnload = function (e) {
  if (Staged.hasChanges()) {
    e.preventDefault();
    // Modern browsers show a generic message; setting returnValue is for older ones.
    e.returnValue = "";
  }
};

Staged._beforeUnloadWired = false;

/**
 * Get the current map ID from AdminMapsRegions.
 * @returns {number|null}
 */
Staged._getCurrentMapId = function () {
  const maps =
    window.AdminMapsRegions && window.AdminMapsRegions.getMaps
      ? window.AdminMapsRegions.getMaps()
      : [];
  const currentKey =
    window.AdminMapsRegions && window.AdminMapsRegions.getCurrentMapKey
      ? window.AdminMapsRegions.getCurrentMapKey()
      : null;
  for (let i = 0; i < maps.length; i++) {
    if (maps[i].map_key === currentKey) return maps[i].id;
  }
  return null;
};
