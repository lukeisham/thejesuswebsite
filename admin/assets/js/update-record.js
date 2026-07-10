/**
 * Shared persistence helper for the admin diagram editors.
 *
 * Wraps POST/PUT/DELETE calls to the arbor, timeline, and evidence endpoints
 * so the Arbor and Timeline editors share one write path (SR-1: split by concern).
 * Every method uses async/await + try/catch (JS-5).
 *
 * Node positions are stored in localStorage until a server-side position store
 * is added; the public API surface is designed so callers never need to change.
 *
 * @module update-record
 */

window.UpdateRecord = {};
const UpdateRecord = window.UpdateRecord;

/* ── Arbor edge persistence ────────────────────────────────────────────────── */

/**
 * Create a new arbor edge.
 *
 * @param {{ source_id: number, target_id: number, relationship_type: string }} edge
 * @returns {Promise<Object>} the created edge row
 */
UpdateRecord.saveEdge = async function (edge) {
  try {
    const created = await Admin.api.post("/arbor", {
      source_id: edge.source_id,
      target_id: edge.target_id,
      relationship_type: edge.relationship_type,
    });
    return created;
  } catch (err) {
    console.error("Failed to save arbor edge:", err);
    throw err;
  }
};

/**
 * Update an existing arbor edge.
 *
 * @param {number} id
 * @param {{ relationship_type?: string, sort_order?: number }} data
 * @returns {Promise<Object>} the updated edge row
 */
UpdateRecord.updateEdge = async function (id, data) {
  try {
    const updated = await Admin.api.put("/arbor/" + id, data);
    return updated;
  } catch (err) {
    console.error("Failed to update arbor edge:", err);
    throw err;
  }
};

/**
 * Delete an arbor edge.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
UpdateRecord.deleteEdge = async function (id) {
  try {
    await Admin.api.del("/arbor/" + id);
  } catch (err) {
    console.error("Failed to delete arbor edge:", err);
    throw err;
  }
};

/* ── Node position persistence (server-side via API) ─────────────────────── */

const POS_KEY_PREFIX = "arbor_pos_";

/**
 * Save the canvas position of an arbor node to the server.
 *
 * @param {number} evidenceId
 * @param {number} x  - diagram-space x coordinate
 * @param {number} y  - diagram-space y coordinate
 * @returns {Promise<Object>} the saved position row
 */
UpdateRecord.saveNodePosition = async function (evidenceId, x, y) {
  try {
    const result = await Admin.api.put("/arbor/nodes/" + evidenceId, {
      x: Math.round(x),
      y: Math.round(y),
    });
    return result;
  } catch (err) {
    console.error("Failed to save node position:", err);
    throw err;
  }
};

/**
 * Remove a saved node position when a node is deleted from the canvas.
 *
 * @param {number} evidenceId
 * @returns {Promise<void>}
 */
UpdateRecord.removeNodePosition = async function (evidenceId) {
  try {
    await Admin.api.del("/arbor/nodes/" + evidenceId);
  } catch (err) {
    console.error("Failed to remove node position:", err);
    throw err;
  }
};

/**
 * One-time migration: push any legacy localStorage positions to the server,
 * then clear the localStorage keys on success. Best-effort — a failed PUT
 * leaves the local key intact.
 *
 * @returns {Promise<void>}
 */
UpdateRecord.migrateLocalPositions = async function () {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith(POS_KEY_PREFIX)) {
      keys.push(key);
    }
  }

  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    try {
      var raw = localStorage.getItem(key);
      if (!raw) continue;
      var parsed = JSON.parse(raw);
      var evidenceId = Number(key.slice(POS_KEY_PREFIX.length));
      if (
        !Number.isFinite(evidenceId) ||
        typeof parsed.x !== "number" ||
        typeof parsed.y !== "number" ||
        !Number.isFinite(parsed.x) ||
        !Number.isFinite(parsed.y)
      ) {
        localStorage.removeItem(key);
        continue;
      }
      await Admin.api.put("/arbor/nodes/" + evidenceId, {
        x: Math.round(parsed.x),
        y: Math.round(parsed.y),
      });
      localStorage.removeItem(key);
    } catch (err) {
      // Keep the local key — migration is best-effort
      console.warn("localStorage migration failed for key " + key + ":", err);
    }
  }
};

/* ── Evidence event persistence (timeline editor) ──────────────────────────── */

/**
 * Update an evidence record's timeline fields (used by the timeline editor).
 *
 * @param {number} evidenceId
 * @param {{ title?: string, timeline_era?: string, timeline_period?: string }} data
 * @returns {Promise<Object>} the updated evidence row
 */
UpdateRecord.saveEvent = async function (evidenceId, data) {
  try {
    var payload = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.timeline_era !== undefined)
      payload.timeline_era = data.timeline_era;
    if (data.timeline_period !== undefined)
      payload.timeline_period = data.timeline_period;

    const updated = await Admin.api.put("/evidence/" + evidenceId, payload);
    return updated;
  } catch (err) {
    console.error("Failed to update timeline event:", err);
    throw err;
  }
};
