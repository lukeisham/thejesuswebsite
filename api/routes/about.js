// About Pages HTTP routes. Public reads return published sections;
// admin writes are auth-guarded. All SQL lives in the model.

const express = require('express');
const aboutModel = require('../models/about.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /about — public list of published about sections
router.get('/', (req, res) => {
  try {
    const items = aboutModel.getAllPublished();
    res.json(items);
  } catch (error) {
    console.error('GET /about failed:', error);
    res.status(500).json({ error: 'Failed to load about sections.' });
  }
});

// GET /about/admin — all about sections regardless of publish state (admin only)
router.get('/admin', requireAuth, (req, res) => {
  try {
    const items = aboutModel.getAll();
    res.json(items);
  } catch (error) {
    console.error('GET /about/admin failed:', error);
    res.status(500).json({ error: 'Failed to load about sections.' });
  }
});

// GET /about/:id — single section by id (admin only)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const item = aboutModel.getById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'About section not found.' });
    res.json(item);
  } catch (error) {
    console.error('GET /about/:id failed:', error);
    res.status(500).json({ error: 'Failed to load about section.' });
  }
});

// POST /about — create new about section (admin only)
router.post('/', requireAuth, (req, res) => {
  try {
    const created = aboutModel.create(req.body);
    if (!created) return res.status(400).json({ error: 'No valid fields provided.' });
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /about failed:', error);
    res.status(500).json({ error: 'Failed to create about section.' });
  }
});

// PUT /about/:id — update about section (admin only)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const updated = aboutModel.update(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: 'About section not found.' });
    res.json(updated);
  } catch (error) {
    console.error('PUT /about/:id failed:', error);
    res.status(500).json({ error: 'Failed to update about section.' });
  }
});

// DELETE /about/:id — remove about section (admin only)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const removed = aboutModel.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'About section not found.' });
    res.status(204).end();
  } catch (error) {
    console.error('DELETE /about/:id failed:', error);
    res.status(500).json({ error: 'Failed to delete about section.' });
  }
});

module.exports = router;
