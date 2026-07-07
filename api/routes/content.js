// All-content HTTP route. Admin dashboard view of every content record
// (published + draft) across every entity except Wikipedia and News Articles.
// Read-only here; editing and publishing happen via each entity's own route.
// All SQL lives in the model.

const express = require("express");
const contentModel = require("../models/content.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /content — every content item across all entities (admin only)
router.get("/", requireAuth, (req, res) => {
  try {
    res.json(contentModel.getAllContent());
  } catch (error) {
    console.error("GET /content failed:", error);
    res.status(500).json({ error: "Failed to load content." });
  }
});

module.exports = router;
