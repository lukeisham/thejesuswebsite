// Essays HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.
// POST and PUT run validateJournalFields() first (lib/journal-field-validation.js):
// it checks the slug and the type of every writable column before the model.

const express = require("express");
const essayModel = require("../models/essay.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");
const { parseIdParam, validatePageParams } = require("../lib/request-params");
const { validateJournalFields, ESSAY_COLUMNS } = require("../lib/journal-field-validation");

const router = express.Router();

router.get("/", (req, res) => {
  try {
    if (!validatePageParams(req, res)) return;
    const items = essayModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    console.error("GET /essays failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /essays/admin — full list (published + drafts) for the admin table.
// Auth-gated so drafts never leak on the public /essays route.
// Must be registered before /:slug or Express will treat "admin" as a slug.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = essayModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /essays/admin failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /essays/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const item = essayModel.getAdminById(id);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /essays/admin/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

router.get("/:slug", (req, res) => {
  try {
    const item = essayModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /essays/:slug failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ["slug"] });
    }
    const problem = validateJournalFields(req.body, { allowStrength: false, columns: ESSAY_COLUMNS });
    if (problem) {
      return sendValidationError(res, problem.field, problem.errorDef, problem.extra);
    }
    const created = essayModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /essays failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

router.put("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const stored = essayModel.getById(id);
    const problem = validateJournalFields(req.body, { allowStrength: false, columns: ESSAY_COLUMNS, storedSlug: stored?.slug });
    if (problem) {
      return sendValidationError(res, problem.field, problem.errorDef, problem.extra);
    }
    const updated = essayModel.updateComposite(id, req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /essays/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

router.delete("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const removed = essayModel.remove(id);
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /essays/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
