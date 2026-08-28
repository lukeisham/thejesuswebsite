// Collections HTTP routes. This file only handles the request/response layer:
// parse input, call the model, shape the response. All SQL lives in the model.

const express = require('express');
const collectionModel = require('../models/collection.model');
const requireAuth = require('../middleware/auth');
const ERRORS = require('../lib/error-codes');
const { sendError, sendValidationError } = require('../lib/error-handler');

const router = express.Router();

// GET /collections — public list of published collections
router.get('/', (req, res) => {
    try {
        const items = collectionModel.getAllPublished(req.query);
        res.json(items);
    } catch (error) {
        if (error.code === ERRORS.INVALID_NUMERIC_PARAM.code) {
            return sendValidationError(res, error.field, ERRORS.INVALID_NUMERIC_PARAM, {
                received: req.query.page,
            });
        }
        console.error('GET /collections failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// GET /collections/:slug — public single collection by slug
router.get('/:slug', (req, res) => {
    try {
        const item = collectionModel.getBySlug(req.params.slug);
        if (!item) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'collection', slug: req.params.slug });
        res.json(item);
    } catch (error) {
        console.error('GET /collections/:slug failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// POST /collections — create new collection (admin only)
router.post('/', requireAuth, (req, res) => {
    try {
        if (!req.body.slug || !req.body.title) {
            return sendError(res, ERRORS.MISSING_BODY_FIELD, { fields: ['slug', 'title'] });
        }
        const created = collectionModel.create(req.body);
        res.status(201).json(created);
    } catch (error) {
        console.error('POST /collections failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// PUT /collections/:id — update collection (admin only)
router.put('/:id', requireAuth, (req, res) => {
    try {
        const updated = collectionModel.update(Number(req.params.id), req.body);
        if (!updated) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'collection', id: req.params.id });
        res.json(updated);
    } catch (error) {
        console.error('PUT /collections/:id failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

// DELETE /collections/:id — remove collection (admin only)
router.delete('/:id', requireAuth, (req, res) => {
    try {
        const removed = collectionModel.remove(Number(req.params.id));
        if (!removed) return sendError(res, ERRORS.SQL_RECORD_NOT_FOUND, { entity: 'collection', id: req.params.id });
        res.status(204).end();
    } catch (error) {
        console.error('DELETE /collections/:id failed:', error);
        sendError(res, ERRORS.SQL_QUERY_FAILURE);
    }
});

module.exports = router;
