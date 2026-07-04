// MLA Sources (bibliography) HTTP routes. Admin-only for writes; admin reads
// for fetching a list of available sources for linking.
// All SQL lives in the model.

const express = require('express');
const mlaSourceModel = require('../models/mla-source.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /sources — list all MLA sources (admin only, used for citation pickers)
router.get('/', requireAuth, (req, res) => {
  try {
    const items = mlaSourceModel.getAll();
    res.json(items);
  } catch (error) {
    console.error('GET /sources failed:', error);
    res.status(500).json({ error: 'Failed to load sources.' });
  }
});

// GET /sources/:id — single source by id (admin only)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const item = mlaSourceModel.getById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Source not found.' });
    res.json(item);
  } catch (error) {
    console.error('GET /sources/:id failed:', error);
    res.status(500).json({ error: 'Failed to load source.' });
  }
});

// POST /sources — create new MLA source (admin only)
router.post('/', requireAuth, (req, res) => {
  try {
    const created = mlaSourceModel.create(req.body);
    if (!created) return res.status(400).json({ error: 'No valid fields provided.' });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /sources failed:', error);
    res.status(500).json({ error: 'Failed to create source.' });
  }
});

// PUT /sources/:id — update MLA source (admin only)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const updated = mlaSourceModel.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'Source not found.' });
    res.json(updated);
  } catch (error) {
    console.error('PUT /sources/:id failed:', error);
    res.status(500).json({ error: 'Failed to update source.' });
  }
});

// DELETE /sources/:id — remove MLA source (admin only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const removed = mlaSourceModel.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Source not found.' });
    res.status(204).end();
  } catch (error) {
    console.error('DELETE /sources/:id failed:', error);
    res.status(500).json({ error: 'Failed to delete source.' });
  }
});

module.exports = router;
