// Maps HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const mapModel = require("../models/map.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /maps — list all maps
router.get("/", (req, res) => {
  try {
    const items = mapModel.getAllMaps();
    res.json(items);
  } catch (error) {
    console.error("GET /maps failed:", error);
    res.status(500).json({ error: "Failed to load maps." });
  }
});

// ── Pin endpoints ────────────────────────────────────────────────────────────
// Registered above GET /:map_key so Express matches the literal "/pins" path
// segments before the wildcard :map_key param.

// POST /maps/pins — create a new pin on a map (admin only)
router.post("/pins", requireAuth, (req, res) => {
  try {
    const { map_id, x, y } = req.body;
    if (map_id == null || x == null || y == null) {
      return res.status(400).json({ error: "map_id, x, and y are required." });
    }
    const created = mapModel.createPin(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /maps/pins failed:", error);
    res.status(500).json({ error: "Failed to create pin." });
  }
});

// PUT /maps/pins/:id — update a pin (admin only)
router.put("/pins/:id", requireAuth, (req, res) => {
  try {
    const updated = mapModel.updatePin(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Pin not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /maps/pins/:id failed:", error);
    res.status(500).json({ error: "Failed to update pin." });
  }
});

// DELETE /maps/pins/:id — remove a pin (admin only)
router.delete("/pins/:id", requireAuth, (req, res) => {
  try {
    const removed = mapModel.removePin(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Pin not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /maps/pins/:id failed:", error);
    res.status(500).json({ error: "Failed to delete pin." });
  }
});

// GET /maps/pins/by-map/:mapId — list all pins for a given map
router.get("/pins/by-map/:mapId", (req, res) => {
  try {
    const pins = mapModel.getPinsByMap(Number(req.params.mapId));
    res.json(pins);
  } catch (error) {
    console.error("GET /maps/pins/by-map/:mapId failed:", error);
    res.status(500).json({ error: "Failed to load pins." });
  }
});

// GET /maps/:map_key — single map by map_key (unique identifier)
router.get("/:map_key", (req, res) => {
  try {
    const item = mapModel.getMapByKey(req.params.map_key);
    if (!item) return res.status(404).json({ error: "Map not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /maps/:map_key failed:", error);
    res.status(500).json({ error: "Failed to load map." });
  }
});

// POST /maps — create new map (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.map_key || !req.body.map_name) {
      return res
        .status(400)
        .json({ error: "map_key and map_name are required." });
    }
    const created = mapModel.createMap(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /maps failed:", error);
    res.status(500).json({ error: "Failed to create map." });
  }
});

// PUT /maps/:id — update map (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    // Reject empty map_name (JS-2: validate inputs)
    if (
      req.body.map_name !== undefined &&
      String(req.body.map_name).trim() === ""
    ) {
      return res.status(400).json({ error: "map_name cannot be empty." });
    }
    const updated = mapModel.updateMap(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Map not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /maps/:id failed:", error);
    res.status(500).json({ error: "Failed to update map." });
  }
});

// DELETE /maps/:id — remove map (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = mapModel.removeMap(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Map not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /maps/:id failed:", error);
    res.status(500).json({ error: "Failed to delete map." });
  }
});

module.exports = router;
