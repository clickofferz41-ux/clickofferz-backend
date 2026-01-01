require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createDefaultAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@clickofferz.com' });

        if (existingAdmin) {
            console.log('⚠️  Default admin already exists');
            process.exit(0);
        }

        // Create default admin
        const admin = await Admin.create({
            name: 'ClickOfferz Admin',
            email: 'admin@clickofferz.com',
            password: 'Admin@123',
            role: 'super-admin'
        });

        console.log('✅ Default admin created successfully!');
        console.log('📧 Email: admin@clickofferz.com');
        console.log('🔑 Password: Admin@123');
        console.log('⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createDefaultAdmin();
