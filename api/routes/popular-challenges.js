// Popular Challenges HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const challengeModel = require("../models/popular-challenges.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

// GET /popular-challenges — public list of published popular challenges
router.get("/", (req, res) => {
  try {
    const items = challengeModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    if (error.code === ERRORS.INVALID_NUMERIC_PARAM.code) {
      return sendValidationError(res, error.field, ERRORS.INVALID_NUMERIC_PARAM, {
        received: req.query.page,
      });
    }
    console.error("GET /popular-challenges failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /popular-challenges/admin — admin list of ALL challenges incl. drafts (admin only).
// Declared before "/:slug" so the literal "admin" path is not captured as a slug.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = challengeModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /popular-challenges/admin failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /popular-challenges/admin/:id — admin detail with citations (admin only)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = challengeModel.getAdminById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "popular challenge", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /popular-challenges/admin/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /popular-challenges/:slug — public single challenge by slug
router.get("/:slug", (req, res) => {
  try {
    const item = challengeModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "popular challenge", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /popular-challenges/:slug failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /popular-challenges — create new popular challenge with MLA links (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ["slug"] });
    }
    const created = challengeModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /popular-challenges failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /popular-challenges/:id — update popular challenge with MLA links (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = challengeModel.updateComposite(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "popular challenge", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /popular-challenges/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /popular-challenges/:id — remove popular challenge (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = challengeModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "popular challenge", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /popular-challenges/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
