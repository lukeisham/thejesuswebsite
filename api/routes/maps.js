// Maps HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const mapModel = require("../models/map.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /maps — list all maps
router.get("/", (req, res) => {
  try {
    const items = mapModel.getAllMaps();
    res.json(items);
  } catch (error) {
    console.error("GET /maps failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// ── Pin endpoints ────────────────────────────────────────────────────────────
// Registered above GET /:map_key so Express matches the literal "/pins" path
// segments before the wildcard :map_key param.

// POST /maps/pins — create a new pin on a map (admin only)
router.post("/pins", requireAuth, (req, res) => {
  try {
    const { map_id, x, y, lat, lng } = req.body;

    // Either (x, y) or (lat, lng) must be supplied
    const hasPercent = x != null && y != null;
    const hasGeo =
      lat != null &&
      lng != null &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng));

    if (!map_id) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { field: "map_id" });
    }
    if (!hasPercent && !hasGeo) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["x", "y", "lat", "lng"],
      });
    }

    const created = mapModel.createPin(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (error.status === 404) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        detail: error.message,
      });
    }
    if (error.status === 400) {
      return sendError(res, ERRORS.INVALID_COORDINATES, {
        detail: error.message,
      });
    }
    console.error("POST /maps/pins failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /maps/pins/:id — update a pin (admin only)
router.put("/pins/:id", requireAuth, (req, res) => {
  try {
    const updated = mapModel.updatePin(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "pin",
        id: req.params.id,
      });
    res.json(updated);
  } catch (error) {
    if (error.status === 404) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        detail: error.message,
      });
    }
    if (error.status === 400) {
      return sendError(res, ERRORS.INVALID_COORDINATES, {
        detail: error.message,
      });
    }
    console.error("PUT /maps/pins/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /maps/pins/:id — remove a pin (admin only)
router.delete("/pins/:id", requireAuth, (req, res) => {
  try {
    const removed = mapModel.removePin(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "pin",
        id: req.params.id,
      });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /maps/pins/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /maps/pins/by-map/:mapId — list all pins for a given map (published evidence only)
router.get("/pins/by-map/:mapId", (req, res) => {
  try {
    const pins = mapModel.getPinsByMap(Number(req.params.mapId));
    res.json(pins);
  } catch (error) {
    console.error("GET /maps/pins/by-map/:mapId failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /maps/admin/pins/by-map/:mapId — list all pins for a given map including drafts (admin only)
router.get("/admin/pins/by-map/:mapId", requireAuth, (req, res) => {
  try {
    const pins = mapModel.getPinsByMap(Number(req.params.mapId), {
      includeDrafts: true,
    });
    res.json(pins);
  } catch (error) {
    console.error("GET /maps/admin/pins/by-map/:mapId failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /maps/admin/unplaced — list evidence with map_location but no pin on the given map (admin only)
router.get("/admin/unplaced", requireAuth, (req, res) => {
  try {
    const mapId = Number(req.query.map_id);
    if (!mapId || !Number.isFinite(mapId)) {
      return sendError(res, ERRORS.MISSING_QUERY_PARAM, { field: "map_id" });
    }
    const items = mapModel.getUnplacedEvidence(mapId);
    res.json(items);
  } catch (error) {
    console.error("GET /maps/admin/unplaced failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /maps/admin/:map_key — single map including draft-evidence pins (admin only)
// Must be registered above GET /:map_key to avoid Express matching "admin" as a map_key.
router.get("/admin/:map_key", requireAuth, (req, res) => {
  try {
    const item = mapModel.getMapByKey(req.params.map_key, {
      includeDrafts: true,
    });
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "map",
        map_key: req.params.map_key,
      });
    res.json(item);
  } catch (error) {
    console.error("GET /maps/admin/:map_key failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /maps/:map_key — single map by map_key (unique identifier, published evidence only)
router.get("/:map_key", (req, res) => {
  try {
    const item = mapModel.getMapByKey(req.params.map_key);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "map",
        map_key: req.params.map_key,
      });
    res.json(item);
  } catch (error) {
    console.error("GET /maps/:map_key failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /maps — create new map (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.map_key || !req.body.map_name) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["map_key", "map_name"].filter((f) => !req.body[f]),
      });
    }
    const created = mapModel.createMap(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /maps failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        field: "map_name",
      });
    }
    const updated = mapModel.updateMap(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "map",
        id: req.params.id,
      });
    res.json(updated);
  } catch (error) {
    console.error("PUT /maps/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /maps/:id — remove map (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = mapModel.removeMap(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "map",
        id: req.params.id,
      });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /maps/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
