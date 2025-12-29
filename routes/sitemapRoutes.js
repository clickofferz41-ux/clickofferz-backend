const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const Coupon = require('../models/Coupon');
const Blog = require('../models/Blog');

router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = 'https://tripcoupon.store'; // Update with actual domain
        const stores = await Store.find({}).select('slug updatedAt');
        const blogs = await Blog.find({}).select('slug updatedAt');
        // You might want dynamic pages for categories too if they have slugs

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/stores</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/coupons</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
     <url>
        <loc>${baseUrl}/blog</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
`;

        // Add Stores
        stores.forEach(store => {
            sitemap += `    <url>
        <loc>${baseUrl}/store/${store.slug}</loc>
        <lastmod>${new Date(store.updatedAt).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        });

        // Add Blogs
        blogs.forEach(blog => {
            sitemap += `    <url>
        <loc>${baseUrl}/blog/${blog.slug}</loc>
        <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
`;
        });

        sitemap += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;
