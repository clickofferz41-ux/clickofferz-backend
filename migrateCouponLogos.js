require('dotenv').config();
const connectDB = require('./config/database');
const Store = require('./models/Store');
const Coupon = require('./models/Coupon');

const migrateCouponLogos = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to MongoDB');

        // Get all coupons
        const coupons = await Coupon.find({});
        console.log(`Found ${coupons.length} coupons to update`);

        // Get all stores
        const stores = await Store.find({});
        console.log(`Found ${stores.length} stores`);

        let updated = 0;
        let skipped = 0;

        for (const coupon of coupons) {
            // Find matching store by name
            const store = stores.find(s => s.name === coupon.storeName);

            if (store && store.logo) {
                // Update coupon with store logo
                coupon.storeLogo = store.logo;
                coupon.storeLogoType = store.logoType || 'emoji';
                await coupon.save();
                updated++;
                console.log(`✓ Updated coupon: ${coupon.title} with ${store.name} logo`);
            } else {
                skipped++;
                console.log(`✗ Skipped coupon: ${coupon.title} (no matching store found or no logo)`);
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Updated: ${updated} coupons`);
        console.log(`Skipped: ${skipped} coupons`);
        console.log('========================\n');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

// Run migration
migrateCouponLogos();
