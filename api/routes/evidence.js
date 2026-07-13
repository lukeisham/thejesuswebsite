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
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "evidence", id });
    res.json(item);
  } catch (error) {
    console.error("GET /evidence/admin/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /evidence/:slug — public single item by slug with full relations
router.get("/:slug", (req, res) => {
  try {
    const item = evidenceModel.getDetailBySlug(req.params.slug);
    if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "evidence", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /evidence/:slug failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    if (!updated) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "evidence", id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /evidence/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    if (!removed) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "evidence", id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /evidence/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
