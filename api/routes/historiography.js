// Historiography HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const historiographyModel = require("../models/historiography.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /historiography — public list of published historiography items
router.get("/", (req, res) => {
  try {
    const items = historiographyModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error("GET /historiography failed:", error);
    res.status(500).json({ error: "Failed to load historiography." });
  }
});

// GET /historiography/admin — full list (published + drafts) for the admin
// table. Auth-gated so drafts never leak on the public /historiography route.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = historiographyModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /historiography/admin failed:", error);
    res.status(500).json({ error: "Failed to load historiography items." });
  }
});

// GET /historiography/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = historiographyModel.getAdminById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "historiography", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /historiography/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load historiography item." });
  }
});

// GET /historiography/:slug — public single item by slug
router.get("/:slug", (req, res) => {
  try {
    const item = historiographyModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "historiography", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /historiography/:slug failed:", error);
    res.status(500).json({ error: "Failed to load historiography item." });
  }
});

// POST /historiography — create new historiography item (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return res.status(400).json({ error: "slug is required." });
    }
    const created = historiographyModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /historiography failed:", error);
    res.status(500).json({ error: "Failed to create historiography item." });
  }
});

// PUT /historiography/:id — update historiography item (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = historiographyModel.updateComposite(
      Number(req.params.id),
      req.body,
    );
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "historiography", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /historiography/:id failed:", error);
    res.status(500).json({ error: "Failed to update historiography item." });
  }
});

// DELETE /historiography/:id — remove historiography item (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = historiographyModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "historiography", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /historiography/:id failed:", error);
    res.status(500).json({ error: "Failed to delete historiography item." });
  }
});

module.exports = router;
