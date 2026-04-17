const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');
const { invalidateByPrefix } = require('../middleware/cache');

// @route   GET /api/admin/stores
// @desc    Get all stores (for admin)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const stores = await Store.find().sort({ createdAt: -1 }).lean();
        res.json({
            success: true,
            count: stores.length,
            data: stores
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/admin/stores
// @desc    Create new store
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({ error: 'Store name is required.' });
        }
        // Auto-generate slug from name
        if (!req.body.slug) {
            req.body.slug = req.body.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
        // Provide fallback logo so required field never blocks creation
        if (!req.body.logo) {
            req.body.logo = req.body.logoType === 'text' ? req.body.name.trim() : '🏪';
            req.body.logoType = req.body.logoType || 'emoji';
        }
        const store = await Store.create(req.body);
        invalidateByPrefix('/api/stores');
        res.status(201).json({
            success: true,
            data: store
        });
    } catch (error) {
        // Duplicate key (name or slug already exists)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'name';
            return res.status(400).json({ error: `A store with this ${field} already exists.` });
        }
        // Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        res.status(500).json({ error: error.message });
    }
});

// @route   PUT /api/admin/stores/:id
// @desc    Update store
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        invalidateByPrefix('/api/stores');
        res.json({
            success: true,
            data: store
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'name';
            return res.status(400).json({ error: `A store with this ${field} already exists.` });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        res.status(500).json({ error: error.message });
    }
});

// @route   DELETE /api/admin/stores/:id
// @desc    Delete store
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const store = await Store.findByIdAndDelete(req.params.id);

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        invalidateByPrefix('/api/stores');
        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
