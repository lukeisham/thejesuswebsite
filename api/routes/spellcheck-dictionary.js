// Spellcheck dictionary HTTP routes — admin-only CRUD for the global
// learned/ignored words list. All SQL lives in the model.

const express = require("express");
const model = require("../models/spellcheck-dictionary.model");
const requireAuth = require("../middleware/auth");
const ERRORS = require("../lib/error-codes");
const { sendError, sendValidationError } = require("../lib/error-handler");

const router = express.Router();

// Every route on this router requires authentication — the dictionary is
// admin-only. Mount the guard once at the router level.
router.use(requireAuth);

// GET /api/spellcheck-dictionary — list all words for bulk client sync.
router.get("/", (req, res) => {
  try {
    res.json({ words: model.getAll() });
  } catch (error) {
    console.error("GET /spellcheck-dictionary failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /api/spellcheck-dictionary — add a learned or ignored word.
router.post("/", (req, res) => {
  try {
    const { word, status } = req.body;

    if (!word || typeof word !== "string" || !word.trim()) {
      return sendValidationError(res, "word", ERRORS.MISSING_BODY_FIELD);
    }

    if (!status || !["learned", "ignored"].includes(status)) {
      return sendValidationError(res, "status", ERRORS.INVALID_SPELLCHECK_STATUS);
    }

    const trimmedWord = word.trim();
    if (/\s/.test(trimmedWord)) {
      return sendValidationError(res, "word", ERRORS.SPELLCHECK_MULTI_WORD);
    }

    const row = model.add(trimmedWord, status);
    res.status(201).json(row);
  } catch (error) {
    console.error("POST /spellcheck-dictionary failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /api/spellcheck-dictionary/:word — remove a word from the dictionary.
router.delete("/:word", (req, res) => {
  try {
    const removed = model.remove(req.params.word);
    if (!removed) {
      return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, {
        word: req.params.word,
      });
    }
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /spellcheck-dictionary failed:", error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
