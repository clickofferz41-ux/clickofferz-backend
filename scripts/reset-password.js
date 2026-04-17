const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('../models/Admin');

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const admin = await Admin.findOne({ email: 'admin@savingaura.com' });
        if (!admin) {
            console.log('Admin not found!');
            return;
        }

        // Force password reset (triggers pre-save hook to hash)
        admin.password = 'Admin@123';
        await admin.save();

        console.log('✅ Password reset successfully for admin@savingaura.com');
        console.log('New Password: Admin@123');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword();
