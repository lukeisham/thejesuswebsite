// Resources HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const resourceModel = require("../models/resource.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

// Map a model error carrying an INVALID_LIST_KEY code to its 400 response;
// anything else falls through to the caller's generic SQL_QUERY_FAILURE.
function isInvalidListKeyError(error) {
  return error && error.code === ERRORS.INVALID_LIST_KEY.code;
}

// Same mapping for an invalid item_type ('item'/'subheading' only).
function isInvalidItemTypeError(error) {
  return error && error.code === ERRORS.INVALID_RESOURCE_ITEM_TYPE.code;
}

// GET /resources — published resources, optionally narrowed to one list
// e.g. /resources?list_key=sermons-and-sayings
router.get("/", (req, res) => {
  try {
    const items = req.query.list_key
      ? resourceModel.getByListKey(req.query.list_key, req.query)
      : resourceModel.getAllPublishedByListKey();
    res.json(items);
  } catch (error) {
    if (error.code === ERRORS.INVALID_NUMERIC_PARAM.code) {
      return sendValidationError(res, error.field, ERRORS.INVALID_NUMERIC_PARAM, {
        received: req.query.page,
      });
    }
    console.error("GET /resources failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /resources/admin/holding-pen — every parked resource, across all lists
// (admin only). Registered above /admin/:list_key... so it isn't shadowed.
router.get("/admin/holding-pen", requireAuth, (req, res) => {
  try {
    const items = resourceModel.getHoldingPen();
    res.json(items);
  } catch (error) {
    console.error("GET /resources/admin/holding-pen failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /resources/admin?list_key=… — all resources for a list, including
// unpublished, excluding parked items (admin only).
router.get("/admin", requireAuth, (req, res) => {
  try {
    if (!req.query.list_key) {
      return sendValidationError(res, "list_key", ERRORS.MISSING_QUERY_PARAM);
    }
    const items = resourceModel.getByListKeyAdmin(req.query.list_key);
    res.json(items);
  } catch (error) {
    console.error("GET /resources/admin failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /resources — create new resource (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.list_key || !req.body.resource_title) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, {
        fields: ["list_key", "resource_title"].filter((f) => !req.body[f]),
      });
    }
    const created = resourceModel.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (isInvalidListKeyError(error)) {
      return sendValidationError(res, "list_key", ERRORS.INVALID_LIST_KEY);
    }
    if (isInvalidItemTypeError(error)) {
      return sendValidationError(res, "item_type", ERRORS.INVALID_RESOURCE_ITEM_TYPE);
    }
    console.error("POST /resources failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /resources/reorder — bulk reorder (admin only).
// Accepts { items: [{id, sort_order}, ...] } and runs a single transaction.
router.post("/reorder", requireAuth, (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendValidationError(res, "items", ERRORS.INVALID_REORDER_PAYLOAD);
    }

    for (const item of items) {
      if (
        typeof item !== "object" ||
        item === null ||
        !Number.isInteger(item.id) ||
        !Number.isInteger(item.sort_order)
      ) {
        return sendValidationError(res, "items", ERRORS.INVALID_REORDER_PAYLOAD);
      }
    }

    const count = resourceModel.reorderList(items);
    res.json({ success: true, count });
  } catch (error) {
    console.error("POST /resources/reorder failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /resources/:id — update resource (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = resourceModel.update(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "resource",
        id: req.params.id,
      });
    res.json(updated);
  } catch (error) {
    if (isInvalidListKeyError(error)) {
      return sendValidationError(res, "list_key", ERRORS.INVALID_LIST_KEY);
    }
    if (isInvalidItemTypeError(error)) {
      return sendValidationError(res, "item_type", ERRORS.INVALID_RESOURCE_ITEM_TYPE);
    }
    console.error("PUT /resources/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /resources/:id — remove resource (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = resourceModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        entity: "resource",
        id: req.params.id,
      });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /resources/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
