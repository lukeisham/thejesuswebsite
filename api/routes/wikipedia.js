// Wikipedia HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const wikipediaModel = require('../models/wikipedia.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /wikipedia — public list of published Wikipedia articles
router.get('/', (req, res) => {
    try {
        const items = wikipediaModel.getAllPublished();
        res.json(items);
    } catch (error) {
        console.error('GET /wikipedia failed:', error);
        res.status(500).json({ error: 'Failed to load Wikipedia articles.' });
    }
});

// GET /wikipedia/admin — all articles regardless of publish state (admin only)
router.get('/admin', requireAuth, (req, res) => {
    try {
        const items = wikipediaModel.getAllAdmin();
        res.json(items);
    } catch (error) {
        console.error('GET /wikipedia/admin failed:', error);
        res.status(500).json({ error: 'Failed to load Wikipedia articles.' });
    }
});

// GET /wikipedia/:slug — public single Wikipedia article by slug
router.get('/:slug', (req, res) => {
    try {
        const item = wikipediaModel.getBySlug(req.params.slug);
        if (!item) return res.status(404).json({ error: 'Wikipedia article not found.' });
        res.json(item);
    } catch (error) {
        console.error('GET /wikipedia/:slug failed:', error);
        res.status(500).json({ error: 'Failed to load Wikipedia article.' });
    }
});

// POST /wikipedia — create new Wikipedia article (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug) {
            return res.status(400).json({ error: 'slug is required.' });
        }
        const created = wikipediaModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /wikipedia failed:', error);
        res.status(500).json({ error: 'Failed to create Wikipedia article.' });
    }
});

// PUT /wikipedia/:id — update Wikipedia article (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = wikipediaModel.update(Number(req.params.id), req.body);
        if (!updated) return res.status(404).json({ error: 'Wikipedia article not found.' });
        res.json(updated);
    } catch (error) {
        console.error('PUT /wikipedia/:id failed:', error);
        res.status(500).json({ error: 'Failed to update Wikipedia article.' });
    }
});

// DELETE /wikipedia/:id — remove Wikipedia article (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = wikipediaModel.remove(Number(req.params.id));
        if (!removed) return res.status(404).json({ error: 'Wikipedia article not found.' });
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /wikipedia/:id failed:', error);
        res.status(500).json({ error: 'Failed to delete Wikipedia article.' });
    }
});

module.exports = router;
