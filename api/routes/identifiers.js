// Identifiers HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const identifiersModel = require("../models/identifiers.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");
const { parseIdParam, validatePageParams } = require("../lib/request-params");

const router = express.Router();

// GET /identifiers — list all identifiers
router.get("/", (req, res) => {
  try {
    if (!validatePageParams(req, res)) return;
    const items = identifiersModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    console.error("GET /identifiers failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /identifiers/admin — list all identifiers regardless of publish state (admin only)
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = identifiersModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /identifiers/admin failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /identifiers/:id — single identifier by id
router.get("/:id", (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const item = identifiersModel.getById(id);
    if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "identifier", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /identifiers/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /identifiers — create new identifier (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    const created = identifiersModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /identifiers failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /identifiers/:id — update identifier (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const updated = identifiersModel.update(id, req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "identifier", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /identifiers/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /identifiers/:id — remove identifier (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const id = parseIdParam(req, res);
    if (id === null) return;
    const removed = identifiersModel.remove(id);
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "identifier", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /identifiers/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
