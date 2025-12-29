const mongoose = require('mongoose');

// OLD DB Connection String
const OLD_URI = 'mongodb+srv://khanhaiderali393_db_user:rarfJga5KUF5BqZR@cluster0.ohbfru0.mongodb.net/savingaura?retryWrites=true&w=majority';

async function inspectOldDB() {
    console.log('🔍 Connecting to OLD Database to inspect all collections...');

    let connection;
    try {
        connection = await mongoose.createConnection(OLD_URI).asPromise();
        console.log('✅ Connected.');

        // List all collections
        const collections = await connection.db.listCollections().toArray();
        console.log(`\nFound ${collections.length} collections in absolute total:`);

        for (const col of collections) {
            const count = await connection.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.close();
        process.exit(0);
    }
}

inspectOldDB();
