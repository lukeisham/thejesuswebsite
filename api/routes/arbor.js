// Arbor HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const arborModel = require("../models/arbor.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

// GET /arbor — full diagram with nodes and edges (published only)
router.get("/", (req, res) => {
  try {
    const data = arborModel.getNodesAndEdges();
    res.json(data);
  } catch (error) {
    console.error("GET /arbor failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /arbor/admin — full diagram including drafts (admin only)
router.get("/admin", requireAuth, (req, res) => {
  try {
    const data = arborModel.getNodesAndEdges({ includeDrafts: true });
    res.json(data);
  } catch (error) {
    console.error("GET /arbor/admin failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /arbor/admin/unplaced — evidence not yet on the canvas (holding pen; admin only)
// MUST be mounted before GET /arbor/:id to avoid the catch-all swallowing the path.
router.get("/admin/unplaced", requireAuth, (req, res) => {
  try {
    const data = arborModel.getUnplacedEvidence();
    res.json(data);
  } catch (error) {
    console.error("GET /arbor/admin/unplaced failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /arbor/nodes/:evidenceId — save node position (admin only)
router.put("/nodes/:evidenceId", requireAuth, (req, res) => {
  try {
    const evidenceId = Number(req.params.evidenceId);
    if (!Number.isFinite(evidenceId) || evidenceId < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "evidenceId",
        received: req.params.evidenceId,
      });
    }

    const x = Number(req.body.x);
    const y = Number(req.body.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "x/y",
      });
    }

    // Verify the evidence record exists
    const evidence = require("../models/evidence.model").getById(evidenceId);
    if (!evidence) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "evidence",
        id: evidenceId,
      });
    }

    const result = arborModel.upsertNodePosition(evidenceId, x, y);
    res.json(result);
  } catch (error) {
    console.error("PUT /arbor/nodes/:evidenceId failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /arbor/nodes/:evidenceId — remove node from canvas (admin only)
router.delete("/nodes/:evidenceId", requireAuth, (req, res) => {
  try {
    const evidenceId = Number(req.params.evidenceId);
    if (!Number.isFinite(evidenceId) || evidenceId < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "evidenceId",
        received: req.params.evidenceId,
      });
    }

    const removed = arborModel.removeNode(evidenceId);
    if (!removed) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "arbor_node",
        id: evidenceId,
      });
    }
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /arbor/nodes/:evidenceId failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /arbor/:id — single edge by id
router.get("/:id", (req, res) => {
  try {
    const item = arborModel.getById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "arbor_edge",
        id: req.params.id,
      });
    res.json(item);
  } catch (error) {
    console.error("GET /arbor/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /arbor — create new edge (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (
      !req.body.source_id ||
      !req.body.target_id ||
      !req.body.relationship_type
    ) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["source_id", "target_id", "relationship_type"].filter(
          (f) => !req.body[f],
        ),
      });
    }
    const created = arborModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === ERRORS.INVALID_JSON.code) {
      return sendValidationError(res, "waypoints", ERRORS.INVALID_JSON);
    }
    console.error("POST /arbor failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /arbor/:id — update edge (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = arborModel.update(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "arbor_edge",
        id: req.params.id,
      });
    res.json(updated);
  } catch (error) {
    if (error.code === ERRORS.INVALID_JSON.code) {
      return sendValidationError(res, "waypoints", ERRORS.INVALID_JSON);
    }
    console.error("PUT /arbor/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /arbor/:id — remove edge (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = arborModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "arbor_edge",
        id: req.params.id,
      });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /arbor/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
