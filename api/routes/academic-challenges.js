// Academic Challenges HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const challengeModel = require("../models/academic-challenges.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// GET /academic-challenges — public list of published academic challenges
router.get("/", (req, res) => {
  try {
    const items = challengeModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error("GET /academic-challenges failed:", error);
    res.status(500).json({ error: "Failed to load academic challenges." });
  }
});

// GET /academic-challenges/admin — admin list of ALL challenges incl. drafts (admin only).
// Declared before "/:slug" so the literal "admin" path is not captured as a slug.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = challengeModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /academic-challenges/admin failed:", error);
    res.status(500).json({ error: "Failed to load academic challenges." });
  }
});

// GET /academic-challenges/admin/:id — admin detail with citations (admin only)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = challengeModel.getAdminById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "academic challenge", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /academic-challenges/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load challenge detail." });
  }
});

// GET /academic-challenges/:slug — public single challenge by slug
router.get("/:slug", (req, res) => {
  try {
    const item = challengeModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "academic challenge", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /academic-challenges/:slug failed:", error);
    res.status(500).json({ error: "Failed to load challenge." });
  }
});

// POST /academic-challenges — create new academic challenge with MLA links (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return res.status(400).json({ error: "slug is required." });
    }
    const created = challengeModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /academic-challenges failed:", error);
    res.status(500).json({ error: "Failed to create academic challenge." });
  }
});

// PUT /academic-challenges/:id — update academic challenge with MLA links (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = challengeModel.updateComposite(Number(req.params.id), req.body);
    if (!updated)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "academic challenge", id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error("PUT /academic-challenges/:id failed:", error);
    res.status(500).json({ error: "Failed to update academic challenge." });
  }
});

// DELETE /academic-challenges/:id — remove academic challenge (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = challengeModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "academic challenge", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /academic-challenges/:id failed:", error);
    res.status(500).json({ error: "Failed to delete academic challenge." });
  }
});

module.exports = router;
