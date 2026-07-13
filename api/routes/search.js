// Search HTTP routes. Thin layer over the FTS model: validate the query string,
// delegate, return ranked results. All SQL lives in the model.

const express = require("express");
const searchModel = require("../models/search.model");
const rateLimit = require("../middleware/rate-limit");
const ERRORS = require("../lib/error-codes");
const { sendError } = require("../lib/error-handler");

const router = express.Router();

// Tighter per-IP limit on search (60 req/min) in addition to the shared
// public-read budget (300 req/min) applied in server.js. Search fans out
// across four FTS tables and is the most expensive + abuse-attractive endpoint.
const searchLimit = rateLimit({ maxAttempts: 60, windowMs: 60_000 });

// GET /search?q=term&type=evidence&limit=25
// `type` is optional; when omitted (or unknown) every searchable entity is queried.
router.get("/", searchLimit, (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return sendError(res, ERRORS.EMPTY_SEARCH_QUERY);
    }
    const type = Object.hasOwn(searchModel.SEARCHABLE, req.query.type)
      ? req.query.type
      : null;
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    res.json(searchModel.search(query, type, limit));
  } catch (error) {
    console.error("GET /search failed:", error);
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("fts5") || msg.includes("syntax error")) {
      return sendError(res, ERRORS.FTS_SYNTAX_ERROR);
    }
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
