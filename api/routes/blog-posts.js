// Blog Posts HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const blogPostModel = require("../models/blog-post.model");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// GET /blog-posts — public list of published blog posts
router.get("/", (req, res) => {
  try {
    const items = blogPostModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error("GET /blog-posts failed:", error);
    res.status(500).json({ error: "Failed to load blog posts." });
  }
});

// GET /blog-posts/admin — full list (published + drafts) for the admin table.
// Auth-gated so drafts never leak on the public /blog-posts route.
// Must be registered before /:slug or Express will treat "admin" as a slug.
router.get("/admin", requireAuth, (req, res) => {
  try {
    const items = blogPostModel.getAllAdmin();
    res.json(items);
  } catch (error) {
    console.error("GET /blog-posts/admin failed:", error);
    res.status(500).json({ error: "Failed to load blog posts." });
  }
});

// GET /blog-posts/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = blogPostModel.getAdminById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Blog post not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /blog-posts/admin/:id failed:", error);
    res.status(500).json({ error: "Failed to load blog post." });
  }
});

// GET /blog-posts/:slug — public single blog post by slug
router.get("/:slug", (req, res) => {
  try {
    const item = blogPostModel.getDetailBySlug(req.params.slug);
    if (!item) return res.status(404).json({ error: "Blog post not found." });
    res.json(item);
  } catch (error) {
    console.error("GET /blog-posts/:slug failed:", error);
    res.status(500).json({ error: "Failed to load blog post." });
  }
});

// POST /blog-posts — create new blog post (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return res.status(400).json({ error: "slug is required." });
    }
    const created = blogPostModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error("POST /blog-posts failed:", error);
    res.status(500).json({ error: "Failed to create blog post." });
  }
});

// PUT /blog-posts/:id — update blog post (admin only)
router.put("/:id", requireAuth, (req, res) => {
  try {
    const updated = blogPostModel.updateComposite(
      Number(req.params.id),
      req.body,
    );
    if (!updated)
      return res.status(404).json({ error: "Blog post not found." });
    res.json(updated);
  } catch (error) {
    console.error("PUT /blog-posts/:id failed:", error);
    res.status(500).json({ error: "Failed to update blog post." });
  }
});

// DELETE /blog-posts/:id — remove blog post (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = blogPostModel.remove(Number(req.params.id));
    if (!removed)
      return res.status(404).json({ error: "Blog post not found." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /blog-posts/:id failed:", error);
    res.status(500).json({ error: "Failed to delete blog post." });
  }
});

module.exports = router;
