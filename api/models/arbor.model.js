// Arbor edges data access — all SQL for the `arbor_edges` table lives here.
// Functions are synchronous (better-sqlite3) and return plain objects/arrays.
// No HTTP concerns in this file: no req, no res, no status codes.

const db = require("../config");
const evidenceModel = require("./evidence.model");
const { pickWritable, runUpdate } = require("./model-helpers");

// Columns the admin is allowed to write for arbor edge creation/updates.
const WRITABLE_COLUMNS = [
  "source_id",
  "target_id",
  "relationship_type",
  "sort_order",
];

/**
 * Get all edges in the arbor diagram, ordered for rendering.
 * Includes both source and target evidence titles for display.
 */
function getAllEdges() {
  const sql = `
        SELECT
            ae.id,
            ae.source_id,
            ae.target_id,
            ae.relationship_type,
            ae.sort_order,
            ae.created_at,
            s.title AS source_title,
            t.title AS target_title
        FROM arbor_edges ae
        LEFT JOIN evidence s ON ae.source_id = s.id
        LEFT JOIN evidence t ON ae.target_id = t.id
        ORDER BY ae.sort_order, ae.created_at
    `;
  return db.prepare(sql).all();
}

/**
 * Get edges originating from a specific evidence node (parent → children).
 * Includes target evidence titles for display.
 */
function getOutgoingEdges(sourceId) {
  const sql = `
        SELECT
            ae.id,
            ae.source_id,
            ae.target_id,
            ae.relationship_type,
            ae.sort_order,
            ae.created_at,
            t.title AS target_title
        FROM arbor_edges ae
        LEFT JOIN evidence t ON ae.target_id = t.id
        WHERE ae.source_id = ?
        ORDER BY ae.sort_order, ae.created_at
    `;
  return db.prepare(sql).all(sourceId);
}

/**
 * Get edges pointing to a specific evidence node (children → parent).
 * Includes source evidence titles for display.
 */
function getIncomingEdges(targetId) {
  const sql = `
        SELECT
            ae.id,
            ae.source_id,
            ae.target_id,
            ae.relationship_type,
            ae.sort_order,
            ae.created_at,
            s.title AS source_title
        FROM arbor_edges ae
        LEFT JOIN evidence s ON ae.source_id = s.id
        WHERE ae.target_id = ?
        ORDER BY ae.sort_order, ae.created_at
    `;
  return db.prepare(sql).all(targetId);
}

/**
 * Get a single arbor edge by id. Returns the edge with evidence titles included.
 */
function getById(id) {
  const sql = `
        SELECT
            ae.id,
            ae.source_id,
            ae.target_id,
            ae.relationship_type,
            ae.sort_order,
            ae.created_at,
            s.title AS source_title,
            t.title AS target_title
        FROM arbor_edges ae
        LEFT JOIN evidence s ON ae.source_id = s.id
        LEFT JOIN evidence t ON ae.target_id = t.id
        WHERE ae.id = ?
    `;
  return db.prepare(sql).get(id);
}

/**
 * Create a new arbor edge. Returns the created edge with evidence titles included.
 */
function create(data) {
  const row = pickWritable(data, WRITABLE_COLUMNS);

  const columns = Object.keys(row);
  const placeholders = columns.map((column) => `@${column}`);

  const result = db
    .prepare(
      `INSERT INTO arbor_edges (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    )
    .run(row);

  return getById(result.lastInsertRowid);
}

/**
 * Update an existing arbor edge. Only writable fields present in `data` are changed.
 * Returns the updated edge with evidence titles, or undefined if no edge has that id.
 */
function update(id, data) {
  if (!getById(id)) return undefined;

  const row = pickWritable(data, WRITABLE_COLUMNS);
  runUpdate(db, "arbor_edges", row, id);

  return getById(id);
}

/**
 * Delete an arbor edge by id. Returns true if a row was removed.
 */
function remove(id) {
  const result = db.prepare("DELETE FROM arbor_edges WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Reorder edges within a source node (drag-to-reorder in the diagram).
 * Accepts an array of {id, sort_order} objects.
 */
function reorderEdges(edges) {
  const stmt = db.prepare(
    "UPDATE arbor_edges SET sort_order = @sort_order WHERE id = @id",
  );
  const transaction = db.transaction(() => {
    for (const edge of edges) {
      stmt.run(edge);
    }
  });
  transaction();
  return edges.length;
}

/**
 * Get full arbor graph: all edges plus the unique evidence nodes involved.
 * Returns { nodes: Array, edges: Array }.
 * Nodes include id, title, slug, primary_verse, and description.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.includeDrafts=false] - When true, draft evidence is included
 *   alongside published (for admin editors). The public frontend receives only
 *   published evidence.
 */
function getNodesAndEdges({ includeDrafts } = {}) {
  const edges = getAllEdges();

  // Collect unique evidence IDs from both sides of edges
  const idSet = new Set();
  for (const edge of edges) {
    idSet.add(edge.source_id);
    idSet.add(edge.target_id);
  }

  // Fetch all node positions in one query
  const positions = new Map();
  if (idSet.size > 0) {
    const posRows = db
      .prepare(
        `SELECT evidence_id, x, y FROM arbor_nodes WHERE evidence_id IN (${[...idSet].map(() => "?").join(",")})`,
      )
      .all(...idSet);
    for (const row of posRows) {
      positions.set(row.evidence_id, { x: row.x, y: row.y });
    }
  }

  // Fetch full evidence rows for each unique ID
  const nodes = [];
  for (const id of idSet) {
    const evidence = evidenceModel.getById(id);
    // Public: only published evidence. Admin: drafts included.
    if (evidence && (includeDrafts || evidence.published_draft === 1)) {
      const pos = positions.get(id) || null;
      nodes.push({
        id: evidence.id,
        title: evidence.title,
        slug: evidence.slug,
        primary_verse: evidence.primary_verse,
        description: evidence.description,
        published_draft: evidence.published_draft,
        x: pos ? pos.x : null,
        y: pos ? pos.y : null,
      });
    }
  }

  // Filter edges to only those where both source and target are included
  const nodeIds = new Set(nodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id),
  );

  return { nodes, edges: filteredEdges };
}

/* ── Node position persistence ───────────────────────────────────────────────── */

/**
 * Insert or update the canvas position of an arbor node.
 *
 * @param {number} evidenceId
 * @param {number} x
 * @param {number} y
 * @returns {Object} the upserted row
 */
function upsertNodePosition(evidenceId, x, y) {
  const sql = `
        INSERT INTO arbor_nodes (evidence_id, x, y)
        VALUES (?, ?, ?)
        ON CONFLICT(evidence_id) DO UPDATE SET
            x = excluded.x,
            y = excluded.y,
            updated_at = CURRENT_TIMESTAMP
    `;
  db.prepare(sql).run(evidenceId, x, y);
  return db
    .prepare("SELECT * FROM arbor_nodes WHERE evidence_id = ?")
    .get(evidenceId);
}

/**
 * Remove a node from the arbor canvas (does not delete the evidence record).
 *
 * @param {number} evidenceId
 * @returns {boolean} true if a row was removed
 */
function removeNode(evidenceId) {
  const result = db
    .prepare("DELETE FROM arbor_nodes WHERE evidence_id = ?")
    .run(evidenceId);
  return result.changes > 0;
}

/**
 * Get the saved position for a single node.
 *
 * @param {number} evidenceId
 * @returns {{ x: number, y: number }|undefined}
 */
function getNodePosition(evidenceId) {
  return db
    .prepare("SELECT x, y FROM arbor_nodes WHERE evidence_id = ?")
    .get(evidenceId);
}

/**
 * Get evidence records that have no arbor_node row (unplaced on the canvas),
 * ordered by title. Drafts are included so admins can place them from the
 * holding pen. Each row carries id, title, slug, primary_verse, and
 * published_draft for badge rendering.
 *
 * @returns {Array<Object>}
 */
function getUnplacedEvidence() {
  const sql = `
        SELECT e.id, e.title, e.slug, e.primary_verse, e.published_draft
        FROM evidence e
        LEFT JOIN arbor_nodes an ON e.id = an.evidence_id
        WHERE an.evidence_id IS NULL
        ORDER BY e.title COLLATE NOCASE
    `;
  return db.prepare(sql).all();
}

module.exports = {
  getAllEdges,
  getOutgoingEdges,
  getIncomingEdges,
  getById,
  create,
  update,
  remove,
  reorderEdges,
  getNodesAndEdges,
  upsertNodePosition,
  removeNode,
  getNodePosition,
  getUnplacedEvidence,
};
