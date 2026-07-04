// Collections HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const collectionModel = require('../models/collection.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /collections — public list of published collections
router.get('/', (req, res) => {
    try {
        const items = collectionModel.getAllPublished();
        res.json(items);
    } catch (error) {
        console.error('GET /collections failed:', error);
        res.status(500).json({ error: 'Failed to load collections.' });
    }
});

// GET /collections/:slug — public single collection by slug
router.get('/:slug', (req, res) => {
    try {
        const item = collectionModel.getBySlug(req.params.slug);
        if (!item) return res.status(404).json({ error: 'Collection not found.' });
        res.json(item);
    } catch (error) {
        console.error('GET /collections/:slug failed:', error);
        res.status(500).json({ error: 'Failed to load collection.' });
    }
});

// POST /collections — create new collection (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug || !req.body.title) {
            return res.status(400).json({ error: 'slug and title are required.' });
        }
        const created = collectionModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /collections failed:', error);
        res.status(500).json({ error: 'Failed to create collection.' });
    }
});

// PUT /collections/:id — update collection (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = collectionModel.update(Number(req.params.id), req.body);
        if (!updated) return res.status(404).json({ error: 'Collection not found.' });
        res.json(updated);
    } catch (error) {
        console.error('PUT /collections/:id failed:', error);
        res.status(500).json({ error: 'Failed to update collection.' });
    }
});

// DELETE /collections/:id — remove collection (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = collectionModel.remove(Number(req.params.id));
        if (!removed) return res.status(404).json({ error: 'Collection not found.' });
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /collections/:id failed:', error);
        res.status(500).json({ error: 'Failed to delete collection.' });
    }
});

module.exports = router;
