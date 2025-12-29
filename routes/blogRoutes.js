const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const protect = require('../middleware/auth').protect;

// Get all blogs (Public)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const blogs = await Blog.find({ isActive: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments({ isActive: true });

        res.json({
            blogs,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalBlogs: total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single blog by slug (Public)
router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, isActive: true });
        if (!blog) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Increment views
        blog.views += 1;
        await blog.save();

        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN ROUTES ---

// Get all blogs including inactive (Admin)
router.get('/admin/all', protect, async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single blog by ID (Admin)
router.get('/admin/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create blog (Admin)
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, image, excerpt, tags, isActive } = req.body;

        // Generate slug from title
        let slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

        // Check if slug exists
        let slugExists = await Blog.findOne({ slug });
        if (slugExists) {
            slug = `${slug}-${Date.now()}`;
        }

        const blog = await Blog.create({
            title,
            slug,
            content,
            image,
            excerpt,
            tags,
            isActive
        });

        res.status(201).json(blog);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update blog (Admin)
router.put('/:id', protect, async (req, res) => {
    try {
        const { title, content, image, excerpt, tags, isActive } = req.body;
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        blog.title = title || blog.title;
        blog.content = content || blog.content;
        blog.image = image || blog.image;
        blog.excerpt = excerpt || blog.excerpt;
        blog.tags = tags || blog.tags;
        blog.isActive = isActive !== undefined ? isActive : blog.isActive;

        // Only update slug if title changed significantly (optional, keeping stable URLs is usually better)

        await blog.save();
        res.json(blog);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete blog (Admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
