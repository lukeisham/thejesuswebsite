// Resources HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const resourceModel = require("../models/resource.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /resources — published resources, optionally narrowed to one list
// e.g. /resources?list_key=sermons-and-sayings
router.get("/", (req, res) => {
  try {
    const items = req.query.list_key
      ? resourceModel.getByListKey(req.query.list_key)
      : resourceModel.getAllPublishedByListKey();
    res.json(items);
  } catch (error) {
    console.error("GET /resources failed:", error);
    res.status(500).json({ error: "Failed to load resources." });
  }
});

// POST /resources — create new resource (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.list_key || !req.body.resource_title) {
      return res
        .status(400)
        .json({ error: "list_key and resource_title are required." });
    }
    const created = resourceModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /resources failed:", error);
    res.status(500).json({ error: "Failed to create resource." });
  }
});

// PUT /resources/:id — update resource (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = resourceModel.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Resource not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /resources/:id failed:", error);
    res.status(500).json({ error: "Failed to update resource." });
  }
});

// DELETE /resources/:id — remove resource (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = resourceModel.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Resource not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /resources/:id failed:", error);
    res.status(500).json({ error: "Failed to delete resource." });
  }
});

module.exports = router;
