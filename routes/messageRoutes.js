const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   POST /api/messages
// @desc    Create a new message (Contact Us form)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const newMessage = await Message.create({
            name,
            email,
            subject,
            message
        });

        res.status(201).json({
            success: true,
            data: newMessage,
            message: 'Message sent successfully!'
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/messages
// @desc    Get all messages
// @access  Private (Admin)
router.get('/', protect, async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private (Admin)
router.put('/:id/read', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        message.status = 'read';
        await message.save();

        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private (Admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await message.deleteOne();
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
