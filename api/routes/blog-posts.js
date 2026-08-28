// Blog Posts HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require("express");
const blogPostModel = require("../models/blog-post.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

// GET /blog-posts — public list of published blog posts
router.get("/", (req, res) => {
  try {
    const items = blogPostModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
    if (error.code === ERRORS.INVALID_NUMERIC_PARAM.code) {
      return sendValidationError(res, error.field, ERRORS.INVALID_NUMERIC_PARAM, {
        received: req.query.page,
      });
    }
    console.error("GET /blog-posts failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /blog-posts/admin/:id — admin detail by id (must come before /:slug)
router.get("/admin/:id", requireAuth, (req, res) => {
  try {
    const item = blogPostModel.getAdminById(Number(req.params.id));
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "blog post", id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error("GET /blog-posts/admin/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /blog-posts/:slug — public single blog post by slug
router.get("/:slug", (req, res) => {
  try {
    const item = blogPostModel.getDetailBySlug(req.params.slug);
    if (!item)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "blog post", slug: req.params.slug });
    res.json(item);
  } catch (error) {
    console.error("GET /blog-posts/:slug failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /blog-posts — create new blog post (admin only)
router.post("/", requireAuth, (req, res) => {
  try {
    if (!req.body.slug) {
      return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ["slug"] });
    }
    const created = blogPostModel.createComposite(req.body);
    res.status(201).json(created);
  } catch (error) {
    if (error.code === ERRORS.INVALID_SLUG.code) {
      return sendValidationError(res, "slug", ERRORS.INVALID_SLUG);
    }
    console.error("POST /blog-posts failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
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
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "blog post", id: req.params.id });
    res.json(updated);
  } catch (error) {
    if (error.code === ERRORS.INVALID_SLUG.code) {
      return sendValidationError(res, "slug", ERRORS.INVALID_SLUG);
    }
    console.error("PUT /blog-posts/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /blog-posts/:id — remove blog post (admin only)
router.delete("/:id", requireAuth, (req, res) => {
  try {
    const removed = blogPostModel.remove(Number(req.params.id));
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "blog post", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /blog-posts/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
