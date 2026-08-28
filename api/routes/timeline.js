// Timeline HTTP routes. Read-only public view over published evidence arranged in
// narrative order. All SQL lives in the model.

const express = require("express");
const timelineModel = require("../models/timeline.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /timeline — full timeline, optionally narrowed by era (published only)
// e.g. /timeline?timeline_era=beginning
router.get("/", (req, res) => {
  try {
    // Forward only the era filter. Spreading req.query here would let an
    // anonymous caller set includeDrafts and unpublish the draft guard
    // (API-5: the model decides published-only, never the query string).
    res.json(
      timelineModel.getTimelineEvents({ timeline_era: req.query.timeline_era }),
    );
  } catch (error) {
    console.error("GET /timeline failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /timeline/:era — a single era (published only)
router.get("/:era", (req, res) => {
  try {
    if (!timelineModel.ERA_ORDER.includes(req.params.era)) {
      return sendError(res, ERRORS.INVALID_URL_PARAM, { field: "era", received: req.params.era });
    }
    res.json(timelineModel.getByEra(req.params.era));
  } catch (error) {
    console.error("GET /timeline/:era failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
