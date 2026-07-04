// News Articles HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const newsArticleModel = require('../models/news-article.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /news-articles — public list of published news articles
router.get('/', (req, res) => {
    try {
        const items = newsArticleModel.getAllPublished();
        res.json(items);
    } catch (error) {
        console.error('GET /news-articles failed:', error);
        res.status(500).json({ error: 'Failed to load news articles.' });
    }
});

// GET /news-articles/:slug — public single news article by slug
router.get('/:slug', (req, res) => {
    try {
        const item = newsArticleModel.getBySlug(req.params.slug);
        if (!item) return res.status(404).json({ error: 'News article not found.' });
        res.json(item);
    } catch (error) {
        console.error('GET /news-articles/:slug failed:', error);
        res.status(500).json({ error: 'Failed to load news article.' });
    }
});

// POST /news-articles — create new news article (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug) {
            return res.status(400).json({ error: 'slug is required.' });
        }
        const created = newsArticleModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /news-articles failed:', error);
        res.status(500).json({ error: 'Failed to create news article.' });
    }
});

// PUT /news-articles/:id — update news article (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = newsArticleModel.update(Number(req.params.id), req.body);
        if (!updated) return res.status(404).json({ error: 'News article not found.' });
        res.json(updated);
    } catch (error) {
        console.error('PUT /news-articles/:id failed:', error);
        res.status(500).json({ error: 'Failed to update news article.' });
    }
});

// DELETE /news-articles/:id — remove news article (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = newsArticleModel.remove(Number(req.params.id));
        if (!removed) return res.status(404).json({ error: 'News article not found.' });
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /news-articles/:id failed:', error);
        res.status(500).json({ error: 'Failed to delete news article.' });
    }
});

module.exports = router;
