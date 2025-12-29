const mongoose = require('mongoose');
require('dotenv').config();
const SiteSetting = require('../models/SiteSetting');

async function verifySettings() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const setting = await SiteSetting.findOne();
        console.log('Current Settings:', JSON.stringify(setting, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected.');
    }
}

verifySettings();
