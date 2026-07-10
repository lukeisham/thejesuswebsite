// Site Settings HTTP routes. Public read returns the singleton row;
// the admin write is auth-guarded. All SQL lives in the model.

const express = require('express');
const siteSettingsModel = require('../models/site-settings.model');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /site-settings — public: current site branding (title, description, og_image)
router.get('/', (req, res) => {
  try {
    res.json(siteSettingsModel.get());
  } catch (error) {
    console.error('GET /site-settings failed:', error);
    res.status(500).json({ error: 'Failed to load site settings.' });
  }
});

// PUT /site-settings — update site branding (admin only)
router.put('/', requireAuth, (req, res) => {
  try {
    const updated = siteSettingsModel.update(req.body);
    if (!updated) return res.status(400).json({ error: 'No valid fields provided.' });
    res.json(updated);
  } catch (error) {
    console.error('PUT /site-settings failed:', error);
    res.status(500).json({ error: 'Failed to update site settings.' });
  }
});

module.exports = router;
