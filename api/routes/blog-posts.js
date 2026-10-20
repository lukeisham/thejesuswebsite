// Blog Posts HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.
// Mounted at /blog-posts in server.js; the admin editors (admin/blog/) and
// frontend/assets/js/blog-*.js call these paths, and routes/publish.js owns
// the draft-to-published switch.

const express = require("express");
const blogPostModel = require("../models/blog-post.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");
const { parseIdParam, validatePageParams, isIdArray } = require("../lib/request-params");

const router = express.Router();

// Body fields that hold text. A non-string here would reach SQLite as a number
// or object and be stored silently (API-4). null is allowed: it clears the value.
const TEXT_FIELDS = [
  "blog_title",
  "blog_date",
  "blog_content",
  "blog_thumbnail",
  "metadata_keywords",
];

// Body fields that hold a list of row ids for the relation tables written by
// blogPostModel.createComposite/updateComposite. null is allowed: it clears the list.
const ID_ARRAY_FIELDS = ["link_evidence_ids", "mla_source_ids"];

// Returns { field, errorDef } for the first invalid body field, or null.
// published_draft mirrors the CHECK (published_draft IN (0, 1)) in schema.sql;
// if that constraint changes, change it here too.
function findBodyProblem(body) {
  if (body.slug !== undefined && (typeof body.slug !== "string" || !body.slug.trim())) {
    return { field: "slug", errorDef: ERRORS.INVALID_BODY_FIELD };
  }
  for (const field of TEXT_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return { field, errorDef: ERRORS.INVALID_BODY_FIELD };
    }
  }
  for (const field of ID_ARRAY_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && !isIdArray(value)) {
      return { field, errorDef: ERRORS.INVALID_BODY_FIELD };
    }
  }
  if (body.published_draft !== undefined && body.published_draft !== 0 && body.published_draft !== 1) {
    return { field: "published_draft", errorDef: ERRORS.INVALID_BODY_FIELD };
  }
  return null;
}

// GET /blog-posts — public list of published blog posts
router.get("/", (req, res) => {
  try {
    if (!validatePageParams(req, res)) return;
    const items = blogPostModel.getAllPublished(req.query);
    res.json(items);
  } catch (error) {
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
    const id = parseIdParam(req, res);
    if (id === null) return;
    const item = blogPostModel.getAdminById(id);
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
    const problem = findBodyProblem(req.body);
    if (problem) return sendValidationError(res, problem.field, problem.errorDef);
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
    const id = parseIdParam(req, res);
    if (id === null) return;
    const problem = findBodyProblem(req.body);
    if (problem) return sendValidationError(res, problem.field, problem.errorDef);
    const updated = blogPostModel.updateComposite(id, req.body);
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
    const id = parseIdParam(req, res);
    if (id === null) return;
    const removed = blogPostModel.remove(id);
    if (!removed)
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: "blog post", id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /blog-posts/:id failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
