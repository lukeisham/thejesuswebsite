// Arbor HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const arborModel = require("../models/arbor.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /arbor — full diagram with nodes and edges
router.get("/", (req, res) => {
  try {
    const data = arborModel.getNodesAndEdges();
    res.json(data);
  } catch (error) {
    console.error("GET /arbor failed:", error);
    res.status(500).json({ error: "Failed to load arbor diagram." });
  }
});

// GET /arbor/:id — single edge by id
router.get("/:id", (req, res) => {
  try {
    const item = arborModel.getById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Arbor edge not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /arbor/:id failed:", error);
    res.status(500).json({ error: "Failed to load arbor edge." });
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
      return res.status(400).json({
        error: "source_id, target_id, and relationship_type are required.",
      });
    }
    const created = arborModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /arbor failed:", error);
    res.status(500).json({ error: "Failed to create arbor edge." });
  }
});

// PUT /arbor/:id — update edge (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = arborModel.update(Number(req.params.id), req.body);
    if (!updated)
      return res.status(404).json({ error: "Arbor edge not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /arbor/:id failed:", error);
    res.status(500).json({ error: "Failed to update arbor edge." });
  }
});

// DELETE /arbor/:id — remove edge (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = arborModel.remove(Number(req.params.id));
    if (!removed)
      return res.status(404).json({ error: "Arbor edge not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /arbor/:id failed:", error);
    res.status(500).json({ error: "Failed to delete arbor edge." });
  }
});

module.exports = router;
