// MLA Sources (bibliography) HTTP routes. Admin-only for writes; admin reads
// for fetching a list of available sources for linking.
// All SQL lives in the model.

const express = require('express');
const mlaSourceModel = require('../models/mla-source.model');
const requireAuth = require('../middleware/auth');
const ERRORS = require('../lib/error-codes');
const { sendError } = require('../lib/error-handler');

const router = express.Router();

// GET /sources — list all MLA sources (admin only, used for citation pickers)
router.get('/', requireAuth, (req, res) => {
  try {
    const items = mlaSourceModel.getAll();
    res.json(items);
  } catch (error) {
    console.error('GET /sources failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// GET /sources/:id — single source by id (admin only)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const item = mlaSourceModel.getById(Number(req.params.id));
    if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'source', id: req.params.id });
    res.json(item);
  } catch (error) {
    console.error('GET /sources/:id failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// POST /sources — create new MLA source (admin only)
router.post('/', requireAuth, (req, res) => {
  try {
    const created = mlaSourceModel.create(req.body);
    if (!created) return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: [] });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /sources failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// PUT /sources/:id — update MLA source (admin only)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const updated = mlaSourceModel.update(Number(req.params.id), req.body);
    if (!updated) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'source', id: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error('PUT /sources/:id failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

// DELETE /sources/:id — remove MLA source (admin only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const removed = mlaSourceModel.remove(Number(req.params.id));
    if (!removed) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'source', id: req.params.id });
    res.status(204).end();
  } catch (error) {
    console.error('DELETE /sources/:id failed:', error);
    sendError(res, ERRORS.SQL_QUERY_FAILURE);
  }
});

module.exports = router;
