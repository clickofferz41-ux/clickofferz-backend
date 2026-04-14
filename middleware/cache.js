const NodeCache = require('node-cache');

// TTLs in seconds
const TTL = {
    SHORT: 180,   // 3 min — coupons (change more often)
    MEDIUM: 300,  // 5 min — stores, blogs
    LONG: 600,    // 10 min — categories, settings, pages
};

const cache = new NodeCache({ stdTTL: TTL.MEDIUM, checkperiod: 60 });

/**
 * Express middleware factory — caches GET responses by full URL.
 * @param {number} ttl  TTL in seconds (defaults to MEDIUM)
 */
const cacheMiddleware = (ttl = TTL.MEDIUM) => (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    if (cached !== undefined) {
        return res.json(cached);
    }
    // Wrap res.json so we can intercept and store the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
        if (res.statusCode === 200) {
            cache.set(key, data, ttl);
        }
        return originalJson(data);
    };
    next();
};

/**
 * Delete all cache keys whose URL contains the given path prefix.
 * e.g. invalidateByPrefix('/api/stores') clears /api/stores, /api/stores/nike, etc.
 */
const invalidateByPrefix = (...prefixes) => {
    const keys = cache.keys();
    for (const prefix of prefixes) {
        keys
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => cache.del(k));
    }
};

module.exports = { cache, cacheMiddleware, invalidateByPrefix, TTL };
