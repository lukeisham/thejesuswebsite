// Responses HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const responseModel = require("../models/response.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /responses — public list of published responses, with optional filter by challenge_id
// e.g. /responses?challenge_id=1
router.get("/", (req, res) => {
  try {
    const items = responseModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    console.error("GET /responses failed:", error);
    res.status(500).json({ error: "Failed to load responses." });
  }
});

// GET /responses/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = responseModel.getAdminById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Response not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /responses/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load response." });
  }
});

// GET /responses/:slug — public single response by slug
router.get("/:slug", (req, res) => {
  try {
    const item = responseModel.getDetailBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: "Response not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /responses/:slug failed:", error);
    res.status(500).json({ error: "Failed to load response." });
  }
});

// POST /responses — create new response (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return res.status(400).json({ error: "slug is required." });
    }
    const created = responseModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /responses failed:", error);
    res.status(500).json({ error: "Failed to create response." });
  }
});

// PUT /responses/:id — update response (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = responseModel.updateComposite(
      Number(req.params.id),
      req.body,
    );
    if (!updated) return res.status(404).json({ error: "Response not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /responses/:id failed:", error);
    res.status(500).json({ error: "Failed to update response." });
  }
});

// DELETE /responses/:id — remove response (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = responseModel.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Response not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /responses/:id failed:", error);
    res.status(500).json({ error: "Failed to delete response." });
  }
});

module.exports = router;
