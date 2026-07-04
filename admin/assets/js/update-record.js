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

/* ── Node position persistence (localStorage until server store exists) ────── */

const POS_KEY_PREFIX = "arbor_pos_";

/**
 * Save the canvas position of an arbor node.
 *
 * @param {number} evidenceId
 * @param {number} x  - diagram-space x coordinate
 * @param {number} y  - diagram-space y coordinate
 */
UpdateRecord.saveNodePosition = function (evidenceId, x, y) {
  try {
    localStorage.setItem(
      POS_KEY_PREFIX + evidenceId,
      JSON.stringify({ x: Math.round(x), y: Math.round(y) }),
    );
  } catch (err) {
    console.error("Failed to save node position:", err);
  }
};

/**
 * Load the saved canvas position of an arbor node.
 *
 * @param {number} evidenceId
 * @returns {{ x: number, y: number }|null}
 */
UpdateRecord.loadNodePosition = function (evidenceId) {
  try {
    var raw = localStorage.getItem(POS_KEY_PREFIX + evidenceId);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
    return null;
  } catch (err) {
    console.error("Failed to load node position:", err);
    return null;
  }
};

/**
 * Remove a saved node position when a node is deleted from the canvas.
 *
 * @param {number} evidenceId
 */
UpdateRecord.removeNodePosition = function (evidenceId) {
  try {
    localStorage.removeItem(POS_KEY_PREFIX + evidenceId);
  } catch (err) {
    console.error("Failed to remove node position:", err);
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
    if (data.timeline_era !== undefined) payload.timeline_era = data.timeline_era;
    if (data.timeline_period !== undefined) payload.timeline_period = data.timeline_period;

    const updated = await Admin.api.put("/evidence/" + evidenceId, payload);
    return updated;
  } catch (err) {
    console.error("Failed to update timeline event:", err);
    throw err;
  }
};
