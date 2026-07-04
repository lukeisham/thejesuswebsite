// Evidence HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const evidenceModel = require("../models/evidence.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /evidence — public list of published items, with optional filters
// e.g. /evidence?timeline_era=beginning&map_location=Galilee
router.get("/", (req, res) => {
  try {
    const items = evidenceModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    console.error("GET /evidence failed:", error);
    res.status(500).json({ error: "Failed to load evidence." });
  }
});

// GET /evidence/admin/:id — full detail including relations, any publish state
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = evidenceModel.getAdminById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Evidence not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /evidence/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load evidence detail." });
  }
});

// GET /evidence/:slug — public single item by slug with full relations
router.get("/:slug", (req, res) => {
  try {
    const item = evidenceModel.getDetailBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: "Evidence not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /evidence/:slug failed:", error);
    res.status(500).json({ error: "Failed to load evidence." });
  }
});

// POST /evidence — create (admin only), accepts related arrays
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.title || !req.body.slug) {
      return res.status(400).json({ error: "title and slug are required." });
    }
    const created = evidenceModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /evidence failed:", error);
    res.status(500).json({ error: "Failed to create evidence." });
  }
});

// PUT /evidence/:id — update (admin only), accepts related arrays
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = evidenceModel.updateComposite(
      Number(req.params.id),
      req.body,
    );
    if (!updated) return res.status(404).json({ error: "Evidence not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /evidence/:id failed:", error);
    res.status(500).json({ error: "Failed to update evidence." });
  }
});

// DELETE /evidence/:id — remove (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = evidenceModel.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Evidence not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /evidence/:id failed:", error);
    res.status(500).json({ error: "Failed to delete evidence." });
  }
});

module.exports = router;
