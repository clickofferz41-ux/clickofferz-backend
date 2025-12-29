const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');

async function checkAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admins = await Admin.find({});
        console.log(`Found ${admins.length} admins:`);
        admins.forEach(admin => {
            console.log(`- Email: ${admin.email}, Name: ${admin.name}, ID: ${admin._id}`);
        });

        if (admins.length === 0) {
            console.log('No admins found. Creating default admin...');
            // Optional: Create default admin if none exists
            // const defaultAdmin = await Admin.create({ ... });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdmins();
