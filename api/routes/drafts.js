// Drafts HTTP routes. Admin dashboard view of everything awaiting publication.
// Read-only here; publishing happens via /publish. All SQL lives in the model.

const express = require("express");
const draftsModel = require("../models/drafts.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /drafts — every unpublished item across all entities (admin only)
router.get("/", requireAuth, (req, res) => {
  try {
    res.json(draftsModel.getAllDrafts());
  } catch (error) {
    console.error("GET /drafts failed:", error);
    res.status(500).json({ error: "Failed to load drafts." });
  }
});

// GET /drafts/counts — pending-draft count per entity, for dashboard badges
router.get("/counts", requireAuth, (req, res) => {
  try {
    res.json(draftsModel.getDraftCounts());
  } catch (error) {
    console.error("GET /drafts/counts failed:", error);
    res.status(500).json({ error: "Failed to load draft counts." });
  }
});

module.exports = router;
