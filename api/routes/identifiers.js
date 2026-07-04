// Identifiers HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const identifiersModel = require("../models/identifiers.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /identifiers — list all identifiers
router.get("/", (req, res) => {
  try {
    const items = identifiersModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error("GET /identifiers failed:", error);
    res.status(500).json({ error: "Failed to load identifiers." });
  }
});

// GET /identifiers/:id — single identifier by id
router.get("/:id", (req, res) => {
  try {
    const item = identifiersModel.getById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Identifier not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /identifiers/:id failed:", error);
    res.status(500).json({ error: "Failed to load identifier." });
  }
});

// POST /identifiers — create new identifier (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    const created = identifiersModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /identifiers failed:", error);
    res.status(500).json({ error: "Failed to create identifier." });
  }
});

// PUT /identifiers/:id — update identifier (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = identifiersModel.update(Number(req.params.id), req.body);
    if (!updated)
      return res.status(404).json({ error: "Identifier not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /identifiers/:id failed:", error);
    res.status(500).json({ error: "Failed to update identifier." });
  }
});

// DELETE /identifiers/:id — remove identifier (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = identifiersModel.remove(Number(req.params.id));
    if (!removed)
      return res.status(404).json({ error: "Identifier not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /identifiers/:id failed:", error);
    res.status(500).json({ error: "Failed to delete identifier." });
  }
});

module.exports = router;
