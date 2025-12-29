const express = require('express');
const router = express.Router();
const Page = require('../models/Page');
const protect = require('../middleware/auth').protect;

// Get all pages (Admin - for list view)
router.get('/admin/all', protect, async (req, res) => {
    try {
        // Ensure default pages exist (simple seed logic)
        const defaultPages = [
            { title: 'About Us', slug: 'about-us' },
            { title: 'Privacy Policy', slug: 'privacy-policy' },
            { title: 'Terms and Conditions', slug: 'terms-conditions' },
            { title: 'Cookie Policy', slug: 'cookie-policy' },
            { title: 'Contact Us', slug: 'contact-us' }
        ];

        for (const p of defaultPages) {
            const exists = await Page.findOne({ slug: p.slug });
            if (!exists) {
                await Page.create({ ...p, content: `<p>Default content for ${p.title}. Edit me!</p>` });
            }
        }

        const pages = await Page.find().sort({ title: 1 });
        res.json(pages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update page content (Admin)
router.put('/:slug', protect, async (req, res) => {
    try {
        const { content } = req.body;
        const page = await Page.findOneAndUpdate(
            { slug: req.params.slug },
            { content },
            { new: true, upsert: true } // Create if doesn't exist
        );
        res.json(page);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get single page by slug (Public)
router.get('/:slug', async (req, res) => {
    try {
        const page = await Page.findOne({ slug: req.params.slug });
        if (!page) {
            // Return a temporary placeholder if not found in DB yet
            return res.json({
                title: req.params.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                content: '<p>This page content is not yet configured.</p>'
            });
        }
        res.json(page);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
