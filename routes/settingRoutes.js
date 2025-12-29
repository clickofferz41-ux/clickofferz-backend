const express = require('express');
const router = express.Router();
const SiteSetting = require('../models/SiteSetting');
const { protect } = require('../middleware/auth');

// @route   GET /api/settings
// @desc    Get site settings (Public)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const settings = await SiteSetting.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   PUT /api/settings
// @desc    Update site settings
// @access  Private (Admin)
router.put('/', protect, async (req, res) => {
    try {
        const { socialLinks, general } = req.body;

        let settings = await SiteSetting.findOne();
        if (!settings) {
            settings = new SiteSetting();
        }

        if (socialLinks) settings.socialLinks = { ...settings.socialLinks, ...socialLinks };
        if (general) settings.general = { ...settings.general, ...general };

        settings.lastUpdatedBy = req.admin._id;

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
