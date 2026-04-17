const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');
const { invalidateByPrefix } = require('../middleware/cache');

// @route   GET /api/admin/coupons
// @desc    Get all coupons (for admin)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const skip = (page - 1) * limit;

        const [coupons, total] = await Promise.all([
            Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Coupon.countDocuments()
        ]);

        res.json({
            success: true,
            count: coupons.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: coupons
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/admin/coupons/:id
// @desc    Get single coupon
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({
            success: true,
            data: coupon
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/admin/coupons
// @desc    Create new coupon
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const coupon = await Coupon.create(req.body);
        invalidateByPrefix('/api/coupons');
        res.status(201).json({
            success: true,
            data: coupon
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   PUT /api/admin/coupons/:id
// @desc    Update coupon
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        invalidateByPrefix('/api/coupons');
        res.json({
            success: true,
            data: coupon
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   DELETE /api/admin/coupons/:id
// @desc    Delete coupon
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        invalidateByPrefix('/api/coupons');
        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
