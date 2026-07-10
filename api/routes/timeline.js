// Timeline HTTP routes. Read-only public view over published evidence arranged in
// narrative order. All SQL lives in the model.

const express = require("express");
const timelineModel = require("../models/timeline.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /timeline — full timeline, optionally narrowed by era (published only)
// e.g. /timeline?timeline_era=beginning
router.get("/", (req, res) => {
  try {
    res.json(timelineModel.getTimelineEvents(req.query));
  } catch (error) {
    console.error("GET /timeline failed:", error);
    res.status(500).json({ error: "Failed to load timeline." });
  }
});

// GET /timeline/admin — full timeline including drafts, or the holding-pen
// of unplaced evidence when ?unplaced=1 (admin only)
router.get("/admin", requireAuth, (req, res) => {
  try {
    if (req.query.unplaced === "1") {
      return res.json(timelineModel.getUnplacedEvents());
    }
    res.json(
      timelineModel.getTimelineEvents({ ...req.query, includeDrafts: true }),
    );
  } catch (error) {
    console.error("GET /timeline/admin failed:", error);
    res.status(500).json({ error: "Failed to load timeline." });
  }
});

// GET /timeline/:era — a single era (published only)
router.get("/:era", (req, res) => {
  try {
    if (!timelineModel.ERA_ORDER.includes(req.params.era)) {
      return res.status(400).json({ error: "Unknown era." });
    }
    res.json(timelineModel.getByEra(req.params.era));
  } catch (error) {
    console.error("GET /timeline/:era failed:", error);
    res.status(500).json({ error: "Failed to load timeline era." });
  }
});

module.exports = router;
