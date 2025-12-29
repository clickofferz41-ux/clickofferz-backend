// Run this script to clean up store and coupon names in database
// Fix: Remove leading/trailing spaces from store names and coupon store names

const mongoose = require('mongoose');
require('dotenv').config();

const Store = require('./models/Store');
const Coupon = require('./models/Coupon');

async function cleanupStoreNames() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Fix store names
        const stores = await Store.find({});
        let storesFixed = 0;

        for (const store of stores) {
            const trimmedName = store.name.trim();
            if (store.name !== trimmedName) {
                store.name = trimmedName;
                await store.save();
                storesFixed++;
                console.log(`Fixed store: "${store.name}" -> "${trimmedName}"`);
            }
        }

        // Fix coupon store names
        const coupons = await Coupon.find({});
        let couponsFixed = 0;

        for (const coupon of coupons) {
            const trimmedName = coupon.storeName.trim();
            if (coupon.storeName !== trimmedName) {
                coupon.storeName = trimmedName;
                await coupon.save();
                couponsFixed++;
                console.log(`Fixed coupon store name: "${coupon.storeName}" -> "${trimmedName}"`);
            }
        }

        console.log(`\n✅ Cleanup complete!`);
        console.log(`Stores fixed: ${storesFixed}`);
        console.log(`Coupons fixed: ${couponsFixed}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

cleanupStoreNames();
