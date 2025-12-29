const mongoose = require('mongoose');
require('dotenv').config();

const SiteSetting = require('../models/SiteSetting');

async function seedSettings() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // Check if settings exist
        const setting = await SiteSetting.findOne();
        if (setting) {
            console.log('Settings already exist. Updating social links...');
            setting.socialLinks = {
                facebook: 'https://facebook.com/clickofferz',
                instagram: 'https://instagram.com/clickofferz',
                twitter: 'https://twitter.com/clickofferz',
                youtube: 'https://youtube.com/clickofferz',
                linkedin: 'https://linkedin.com/company/clickofferz',
                tiktok: 'https://tiktok.com/@clickofferz'
            };
            await setting.save();
            console.log('✅ Updated existing settings with social links.');
        } else {
            console.log('Creating new settings...');
            await SiteSetting.create({
                siteName: 'ClickOfferz',
                description: 'Best coupons and deals',
                socialLinks: {
                    facebook: 'https://facebook.com/clickofferz',
                    instagram: 'https://instagram.com/clickofferz',
                    twitter: 'https://twitter.com/clickofferz',
                    youtube: 'https://youtube.com/clickofferz',
                    linkedin: 'https://linkedin.com/company/clickofferz',
                    tiktok: 'https://tiktok.com/@clickofferz'
                }
            });
            console.log('✅ Created new settings with social links.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    }
}

seedSettings();
