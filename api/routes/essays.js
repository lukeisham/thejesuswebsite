// Essays HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const essayModel = require("../models/essay.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /essays — public list of published essays
router.get("/", (req, res) => {
  try {
    const items = essayModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error("GET /essays failed:", error);
    res.status(500).json({ error: "Failed to load essays." });
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
    res.status(500).json({ error: "Failed to load essays." });
  }
});

// GET /essays/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = essayModel.getAdminById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /essays/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load essay." });
  }
});

// GET /essays/:slug — public single essay by slug
router.get("/:slug", (req, res) => {
  try {
    const item = essayModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /essays/:slug failed:", error);
    res.status(500).json({ error: "Failed to load essay." });
  }
});

// POST /essays — create new essay (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return res.status(400).json({ error: "slug is required." });
    }
    const created = essayModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /essays failed:", error);
    res.status(500).json({ error: "Failed to create essay." });
  }
});

// PUT /essays/:id — update essay (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = essayModel.updateComposite(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /essays/:id failed:", error);
    res.status(500).json({ error: "Failed to update essay." });
  }
});

// DELETE /essays/:id — remove essay (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = essayModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "essay", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /essays/:id failed:", error);
    res.status(500).json({ error: "Failed to delete essay." });
  }
});

module.exports = router;
