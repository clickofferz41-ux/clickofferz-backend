const mongoose = require('mongoose');
require('dotenv').config();

async function verifyConnection() {
    try {
        console.log('Loading .env...');
        console.log('MONGODB_URI from env:', process.env.MONGODB_URI.split('@')[1]); // Print host only for security/verification

        await mongoose.connect(process.env.MONGODB_URI);
        const host = mongoose.connection.host;
        const name = mongoose.connection.name;

        console.log(`✅ Connected to Host: ${host}`);
        console.log(`✅ Database Name: ${name}`);

        if (host.includes('atitqo1')) {
            console.log('🎉 VERIFIED: Using NEW Database Cluster');
        } else {
            console.log('⚠️ WARNING: Using OLD Database Cluster');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Connection Failed:', error);
    }
}

verifyConnection();
