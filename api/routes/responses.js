// Responses HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.
// POST and PUT run validateJournalFields() first (lib/journal-field-validation.js):
// it checks the slug and the type of every writable column before the model.

const express = require("express");
const responseModel = require("../models/response.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");
const { parseIdParam, validatePageParams } = require("../lib/request-params");
const { validateJournalFields, RESPONSE_COLUMNS } = require("../lib/journal-field-validation");

const router = express.Router();

// GET /responses — public list of published responses, with optional filter by challenge_id
// e.g. /responses?challenge_id=1
router.get("/", (req, res) => {
  try {
    if (!validatePageParams(req, res)) return;
    const items = responseModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    console.error("GET /responses failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /responses/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const item = responseModel.getAdminById(id);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "response", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /responses/admin/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /responses/:slug — public single response by slug
router.get("/:slug", (req, res) => {
  try {
    const item = responseModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "response", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /responses/:slug failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// Mirrors the responses CHECK (published_draft = 0 OR challenge_id IS NOT NULL)
// in schema.sql. On PUT a key missing from the body keeps the stored value, so
// the effective values are the body's, else the stored row's. POST has no stored row.
function isPublishedWithoutChallenge(body, stored) {
  const published = body.published_draft ?? stored?.published_draft;
  const challengeId = "challenge_id" in body ? body.challenge_id : stored?.challenge_id;
  return published === 1 && challengeId == null;
}

// POST /responses — create new response (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ["slug"] });
    }
    const problem = validateJournalFields(req.body, { allowStrength: true, columns: RESPONSE_COLUMNS });
    if (problem) {
      return sendValidationError(res, problem.field, problem.errorDef, problem.extra);
    }
    const publishedWithoutChallenge = isPublishedWithoutChallenge(req.body);
    if (publishedWithoutChallenge) {
      return sendValidationError(res, "challenge_id", ERRORS.INVALID_BODY_FIELD);
    }
    const created = responseModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /responses failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /responses/:id — update response (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const stored = responseModel.getById(id);
    const problem = validateJournalFields(req.body, { allowStrength: true, columns: RESPONSE_COLUMNS, storedSlug: stored?.slug });
    if (problem) {
      return sendValidationError(res, problem.field, problem.errorDef, problem.extra);
    }
    const publishedWithoutChallenge = isPublishedWithoutChallenge(req.body, stored);
    if (publishedWithoutChallenge) {
      return sendValidationError(res, "challenge_id", ERRORS.INVALID_BODY_FIELD);
    }
    const updated = responseModel.updateComposite(
      id,
      req.body,
    );
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "response", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /responses/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /responses/:id — remove response (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const removed = responseModel.remove(id);
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "response", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /responses/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
