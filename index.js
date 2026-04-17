require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/database');
const Store = require('./models/Store');
const Coupon = require('./models/Coupon');
const Category = require('./models/Category');
const { cacheMiddleware, invalidateByPrefix, publicCache, TTL } = require('./middleware/cache');

const app = express();
const PORT = process.env.PORT || 3000;

function escapeRegExp(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugToReadableName(slug = '') {
    return slug.replace(/-/g, ' ').trim();
}

// Middleware - CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB before each request (serverless-friendly)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'ClickOfferz API is running',
        database: 'MongoDB'
    });
});

// Public API Routes
app.get('/api/stores', publicCache(TTL.MEDIUM), cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        // Avoid $lookup + $expr string matching on every store (does not use indexes; very slow
        // when many coupons only have storeName). Instead: two indexed groupings + one store list.
        const [stores, countsByStoreId, countsByStoreName] = await Promise.all([
            Store.find().sort({ name: 1 }).lean(),
            Coupon.aggregate([
                { $match: { isActive: true, storeId: { $ne: null } } },
                { $group: { _id: '$storeId', count: { $sum: 1 } } }
            ]),
            Coupon.aggregate([
                { $match: { isActive: true, storeId: null } },
                {
                    $group: {
                        _id: { $toLower: { $trim: { input: '$storeName' } } },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const byId = new Map(countsByStoreId.map((d) => [String(d._id), d.count]));
        const byName = new Map(countsByStoreName.map((d) => [d._id, d.count]));

        const storesWithCounts = stores.map((s) => {
            const id = String(s._id);
            const nameKey = String(s.name || '').trim().toLowerCase();
            const fromId = byId.get(id) || 0;
            const fromName = byName.get(nameKey) || 0;
            return { ...s, offers: fromId + fromName };
        });

        res.json(storesWithCounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stores/:slug', publicCache(TTL.MEDIUM), cacheMiddleware(TTL.MEDIUM), async (req, res) => {
    try {
        const slug = req.params.slug;
        // Direct DB lookup by slug field instead of loading all stores
        let store = await Store.findOne({ slug }).lean();

        // Fallback for unmigrated data without loading every store into memory
        if (!store) {
            const readableName = slugToReadableName(slug);
            const match = await Store.findOne({
                name: new RegExp(`^${escapeRegExp(readableName)}$`, 'i')
            }).select('_id').lean();
            if (match) {
                // Migrate: save slug for future fast lookups
                await Store.updateOne({ _id: match._id }, { slug });
                store = await Store.findById(match._id).lean();
            }
        }

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json(store);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/coupons', publicCache(TTL.SHORT, 30), cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const { type, category, store, trending, search, page, limit } = req.query;
        const filter = { isActive: true };

        if (type) filter.type = type;
        if (category) filter.category = new RegExp(`^${category}$`, 'i');

        if (search) {
            filter.$text = { $search: search };
        }

        if (store) {
            // Direct slug lookup instead of loading all stores
            let targetStore = await Store.findOne({ slug: store.trim().toLowerCase().replace(/\s+/g, '-') }).lean();

            // Fallback for unmigrated stores
            if (!targetStore) {
                targetStore = await Store.findOne({
                    name: new RegExp(`^${store.trim()}$`, 'i')
                }).lean();
            }

            if (targetStore) {
                const storeFilter = {
                    $or: [
                        { storeId: targetStore._id },
                        { storeName: targetStore.name }
                    ]
                };
                if (filter.$text) {
                    filter.$and = [{ $text: filter.$text }, { $or: storeFilter.$or }];
                    delete filter.$text;
                } else {
                    Object.assign(filter, storeFilter);
                }
            } else {
                // Unknown store slug/name: avoid broad regex scan on coupons.
                return res.json({
                    coupons: [],
                    pagination: {
                        total: 0,
                        page: parseInt(page) || 1,
                        limit: Math.min(parseInt(limit) || 20, 100),
                        totalPages: 0
                    }
                });
            }
        }
        if (trending === 'true') filter.isTrending = true;

        // Always paginate - default to page 1, limit 20
        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        // Run count and find in parallel
        const [total, coupons] = await Promise.all([
            Coupon.countDocuments(filter),
            Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
        ]);

        res.json({
            coupons,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/coupons/store/:slug', publicCache(TTL.SHORT, 30), cacheMiddleware(TTL.SHORT), async (req, res) => {
    try {
        const slug = req.params.slug;
        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        // Direct slug lookup
        let store = await Store.findOne({ slug }).lean();

        if (!store) {
            const readableName = slugToReadableName(slug);
            const match = await Store.findOne({
                name: new RegExp(`^${escapeRegExp(readableName)}$`, 'i')
            }).select('name slug _id').lean();
            if (match) {
                await Store.updateOne({ _id: match._id }, { slug });
                store = match;
            }
        }

        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const filter = {
            $or: [
                { storeId: store._id },
                { storeName: store.name }
            ],
            isActive: true
        };

        const [total, coupons] = await Promise.all([
            Coupon.countDocuments(filter),
            Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
        ]);

        res.json({
            coupons,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug Route
app.get('/api/debug/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        let robustStore = await Store.findOne({ slug }).lean();

        if (!robustStore) {
            const allStores = await Store.find().select('name slug _id').lean();
            robustStore = allStores.find(s => s.name.trim().toLowerCase().replace(/\s+/g, '-') === slug) || null;
        }

        let relatedCoupons = [];
        if (robustStore) {
            relatedCoupons = await Coupon.find({
                $or: [
                    { storeId: robustStore._id },
                    { storeName: robustStore.name }
                ]
            }).lean();
        }

        const looseMatchCoupons = await Coupon.find({
            storeName: new RegExp(slug.replace(/-/g, ' '), 'i')
        }).limit(5).lean();

        res.json({
            requestedSlug: slug,
            foundStore: robustStore,
            robustCouponsCount: relatedCoupons.length,
            robustCoupons: relatedCoupons,
            looseMatchCoupons: looseMatchCoupons
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/stores', require('./routes/adminStores'));
app.use('/api/admin/coupons', require('./routes/adminCoupons'));

// Blog Routes
app.use('/api/blogs', require('./routes/blogRoutes'));

// Page Routes (Dynamic Static Pages)
app.use('/api/pages', require('./routes/pageRoutes'));

// Site Settings Routes (Social Media, etc.)
app.use('/api/settings', require('./routes/settingRoutes'));

// Message Routes
app.use('/api/messages', require('./routes/messageRoutes'));

// Sitemap Route (Root level)
app.use('/', require('./routes/sitemapRoutes'));

// ===== CATEGORY ROUTES =====
// Get all active categories (public)
app.get('/api/categories', publicCache(TTL.LONG), cacheMiddleware(TTL.LONG), async (req, res) => {
    try {
        // Single aggregation: get coupon counts per category, then merge with category data
        const [categories, couponCounts] = await Promise.all([
            Category.find({ isActive: true }).sort({ name: 1 }).lean(),
            Coupon.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } }
            ])
        ]);

        // Build a map for O(1) lookup
        const countMap = {};
        for (const item of couponCounts) {
            countMap[item._id] = item.count;
        }

        const categoriesWithCounts = categories.map(cat => ({
            ...cat,
            couponCount: countMap[cat.name.toLowerCase()] || 0
        }));

        res.json(categoriesWithCounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all categories (admin)
app.get('/api/admin/categories', require('./middleware/auth').protect, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category (admin)
app.post('/api/admin/categories', require('./middleware/auth').protect, async (req, res) => {
    try {
        console.log("Creating category with body:", { ...req.body, image: req.body.image ? `[Base64 Length: ${req.body.image.length}]` : null });
        const category = await Category.create(req.body);
        invalidateByPrefix('/api/categories');
        res.status(201).json(category);
    } catch (error) {
        console.error("Create category error:", error);
        res.status(400).json({ error: error.message });
    }
});

// Update category (admin)
app.put('/api/admin/categories/:id', require('./middleware/auth').protect, async (req, res) => {
    try {
        console.log(`Updating category ${req.params.id} with body:`, { ...req.body, image: req.body.image ? `[Base64 Length: ${req.body.image.length}]` : null });
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        invalidateByPrefix('/api/categories');
        res.json(category);
    } catch (error) {
        console.error("Update category error:", error);
        res.status(400).json({ error: error.message });
    }
});

// Delete category (admin)
app.delete('/api/admin/categories/:id', require('./middleware/auth').protect, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        invalidateByPrefix('/api/categories');
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Migration endpoint - Populate slugs for existing stores
app.post('/api/admin/migrate-slugs', require('./middleware/auth').protect, async (req, res) => {
    try {
        const stores = await Store.find({ $or: [{ slug: null }, { slug: { $exists: false } }] });
        let updated = 0;
        for (const store of stores) {
            store.slug = store.name.trim().toLowerCase().replace(/\s+/g, '-');
            await store.save();
            updated++;
        }
        invalidateByPrefix('/api/stores');
        res.json({ success: true, updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Migration endpoint - Update all coupons with store logos
app.post('/api/admin/migrate-coupon-logos', require('./middleware/auth').protect, async (req, res) => {
    try {
        const coupons = await Coupon.find({});
        const stores = await Store.find({});

        let updated = 0;
        let skipped = 0;

        for (const coupon of coupons) {
            const store = stores.find(s => s.name === coupon.storeName);

            if (store && store.logo) {
                coupon.storeLogo = store.logo;
                coupon.storeLogoType = store.logoType || 'emoji';
                await coupon.save();
                updated++;
            } else {
                skipped++;
            }
        }

        res.json({
            success: true,
            message: 'Migration completed',
            updated,
            skipped,
            total: coupons.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard Stats
app.get('/api/admin/stats', require('./middleware/auth').protect, async (req, res) => {
    try {
        // Single parallel call instead of 4 sequential queries
        const [totalStores, couponStats] = await Promise.all([
            Store.countDocuments(),
            Coupon.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCoupons: { $sum: 1 },
                        activeCoupons: { $sum: { $cond: ['$isActive', 1, 0] } },
                        expiredCoupons: { $sum: { $cond: ['$isActive', 0, 1] } }
                    }
                }
            ])
        ]);

        const stats = couponStats[0] || { totalCoupons: 0, activeCoupons: 0, expiredCoupons: 0 };

        res.json({
            success: true,
            data: {
                totalStores,
                totalCoupons: stats.totalCoupons,
                activeCoupons: stats.activeCoupons,
                expiredCoupons: stats.expiredCoupons
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
// Start server only if running directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
