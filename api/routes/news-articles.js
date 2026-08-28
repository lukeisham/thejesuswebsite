// News Articles HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const newsArticleModel = require('../models/news-article.model');
const requireAuth = require('../middleware/auth');
const ERRORS = require('../lib/error-codes');
const { sendError, sendValidationError } = require('../lib/error-handler');

const router = express.Router();

// GET /news-articles — public list of published news articles
router.get('/', (req, res) => {
    try {
        const items = newsArticleModel.getAllPublished(req.query);
        res.json(items);
    } catch (error) {
        if (error.code === ERRORS.INVALID_NUMERIC_PARAM.code) {
            return sendValidationError(res, error.field, ERRORS.INVALID_NUMERIC_PARAM, {
                received: req.query.page,
            });
        }
        console.error('GET /news-articles failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// GET /news-articles/:slug — public single news article by slug
router.get('/:slug', (req, res) => {
    try {
        const item = newsArticleModel.getBySlug(req.params.slug);
        if (!item)
            return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'news article', slug: req.params.slug });
        res.json(item);
    } catch (error) {
        console.error('GET /news-articles/:slug failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// POST /news-articles — create new news article (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug) {
            return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ['slug'] });
        }
        const created = newsArticleModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /news-articles failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// PUT /news-articles/:id — update news article (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = newsArticleModel.update(Number(req.params.id), req.body);
        if (!updated)
            return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'news article', id: req.params.id });
        res.json(updated);
    } catch (error) {
        console.error('PUT /news-articles/:id failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// DELETE /news-articles/:id — remove news article (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = newsArticleModel.remove(Number(req.params.id));
        if (!removed)
            return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'news article', id: req.params.id });
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /news-articles/:id failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

module.exports = router;
