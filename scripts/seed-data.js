const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Coupon = require('../models/Coupon');
const Store = require('../models/Store');

const categories = ['Fashion', 'Electronics', 'Travel', 'Beauty', 'Home', 'Food', 'Software', 'Health', 'Automotive', 'Finance'];

const dummyCoupons = [
    { title: '50% Off First Order', code: 'SAVE50', type: 'Code', description: 'Get half off your first purchase.' },
    { title: 'Free Shipping', code: '', type: 'Deal', description: 'Free shipping on all orders over $50.' },
    { title: '20% Off Everything', code: 'ALL20', type: 'Code', description: 'Site-wide discount for a limited time.' },
    { title: 'Buy 1 Get 1 Free', code: 'BOGO', type: 'Code', description: 'Buy one item, get the second of equal or lesser value for free.' },
    { title: '$10 Off $100', code: 'TENOFF', type: 'Code', description: 'Save $10 when you spend $100 or more.' }
];

async function seedData() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. Seed Categories
        console.log('🌱 Seeding Categories...');
        // await Category.deleteMany({}); // Optional: Clear existing if needed, but safer to upsert
        for (const name of categories) {
            const exists = await Category.findOne({ name });
            if (!exists) {
                await Category.create({
                    name,
                    slug: name.toLowerCase(),
                    isActive: true,
                    description: `Best deals on ${name}`,
                    icon: '🏷️' // Default icon
                });
                console.log(`   + Created Category: ${name}`);
            }
        }

        // 2. Seed Coupons (linked to existing stores)
        console.log('🌱 Seeding Coupons...');
        const stores = await Store.find({});
        if (stores.length === 0) {
            console.log('⚠️ No stores found to attach coupons to. Skipping coupons.');
            return;
        }

        // Check if we already have coupons
        const count = await Coupon.countDocuments();
        if (count > 5) {
            console.log('   Coupons already exist. Skipping seed to exist duplicates.');
        } else {
            let createdCount = 0;
            for (const cat of categories) {
                const store = stores[Math.floor(Math.random() * stores.length)];
                // Create 3 coupons per category
                for (let i = 0; i < 3; i++) {
                    const template = dummyCoupons[i % dummyCoupons.length];
                    await Coupon.create({
                        title: `${template.title} at ${store.name}`,
                        code: template.code,
                        type: template.type,
                        description: template.description,
                        storeName: store.name,
                        storeLogo: store.logo,
                        storeLogoType: store.logoType || 'emoji',
                        storeUrl: store.affiliateLink || '#',
                        category: cat,
                        isActive: true,
                        isTrending: Math.random() > 0.7,
                        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                    });
                    createdCount++;
                }
            }
            console.log(`   ✅ Created ${createdCount} new coupons.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    }
}

seedData();
