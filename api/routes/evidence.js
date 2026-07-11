// Evidence HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const evidenceModel = require("../models/evidence.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// GET /evidence — public list of published items, with optional filters.
// e.g. /evidence?timeline_era=beginning&map_location=Galilee&page=1&limit=20
router.get("/", (req, res) => {
  try {
    const result = evidenceModel.getAllPublished(req.query);
    res.json(result);
  } catch (error) {
    console.error("GET /evidence failed:", error);
    res.status(500).json({ error: "Failed to load evidence." });
  }
});

// GET /evidence/admin — all evidence across all publish states, for the admin
// list page. Must be defined before /admin/:id so Express doesn't match "admin"
// as an :id parameter.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = evidenceModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /evidence/admin failed:", error);
    res.status(500).json({ error: "Failed to load evidence." });
  }
});

// GET /evidence/admin/:id — full detail including relations, any publish state
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "id",
        received: req.params.id,
      });
    }
    const item = evidenceModel.getAdminById(id);
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
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["title", "slug"].filter((f) => !req.body[f]),
      });
    }
    if (!SLUG_PATTERN.test(req.body.slug)) {
      return sendValidationError(res, "slug", ERRORS.INVALID_SLUG, {
        received: req.body.slug,
      });
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "id",
        received: req.params.id,
      });
    }
    if (req.body.slug !== undefined && !SLUG_PATTERN.test(req.body.slug)) {
      return sendValidationError(res, "slug", ERRORS.INVALID_SLUG, {
        received: req.body.slug,
      });
    }
    const updated = evidenceModel.updateComposite(id, req.body);
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return sendError(res, ERRORS.INVALID_NUMERIC_PARAM, {
        field: "id",
        received: req.params.id,
      });
    }
    const removed = evidenceModel.remove(id);
    if (!removed) return res.status(404).json({ error: "Evidence not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /evidence/:id failed:", error);
    res.status(500).json({ error: "Failed to delete evidence." });
  }
});

module.exports = router;
