require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('./models/Store');
const Coupon = require('./models/Coupon');

const storesData = require('./data/stores.json');
const couponsData = require('./data/coupons.json');

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Store.deleteMany({});
        await Coupon.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Insert stores (remove id field)
        const cleanStores = storesData.map(({ id, ...rest }) => rest);
        const stores = await Store.insertMany(cleanStores);
        console.log(`✅ Inserted ${stores.length} stores`);

        // Insert coupons (remove id and storeId fields)
        const cleanCoupons = couponsData.map(({ id, storeId, ...rest }) => rest);
        const coupons = await Coupon.insertMany(cleanCoupons);
        console.log(`✅ Inserted ${coupons.length} coupons`);

        console.log('🎉 Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();

