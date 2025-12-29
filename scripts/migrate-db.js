const mongoose = require('mongoose');

// Configuration
const OLD_URI = 'mongodb+srv://khanhaiderali393_db_user:rarfJga5KUF5BqZR@cluster0.ohbfru0.mongodb.net/savingaura?retryWrites=true&w=majority';
const NEW_URI = 'mongodb+srv://muhammaduzairkhan300_db_user:gtE51wgX54GAy1uk@cluster0.atitqo1.mongodb.net/savingaura?appName=Cluster0';

const COLLECTIONS = [
    'admins',
    'stores',
    'coupons',
    'categories',
    'blogs',
    'pages',
    'sitesettings'
];

async function migrate() {
    console.log('🚀 Starting Database Migration...');
    console.log(`📡 Old DB: ${OLD_URI.split('@')[1]}`);
    console.log(`📡 New DB: ${NEW_URI.split('@')[1]}`);

    let oldConnection, newConnection;

    try {
        // 1. Connect to Old Database
        console.log('Connecting to OLD database...');
        oldConnection = await mongoose.createConnection(OLD_URI).asPromise();
        console.log('✅ Connected to OLD database');

        // 2. Connect to New Database
        console.log('Connecting to NEW database...');
        newConnection = await mongoose.createConnection(NEW_URI).asPromise();
        console.log('✅ Connected to NEW database');

        // 3. Migrate Collection by Collection
        for (const collectionName of COLLECTIONS) {
            console.log(`\n📦 Migrating collection: ${collectionName}`);

            try {
                // Fetch from OLD
                // check if collection exists first by listing collections? 
                // faster to just try to access it. native driver access is cleanest for direct copy.
                const oldColl = oldConnection.db.collection(collectionName);
                const documents = await oldColl.find({}).toArray();

                if (documents.length === 0) {
                    console.log(`   ⚠️ No documents found in ${collectionName}. Skipping.`);
                    continue;
                }

                console.log(`   Found ${documents.length} documents.`);

                // Insert into NEW
                const newColl = newConnection.db.collection(collectionName);

                // Clear existing data in NEW (Safety usually determines we shouldn't, but for a fresh migrate request we likely want a clean slate or overwrite. 
                // Let's drop the collection in NEW to avoid duplicates/conflicts)
                try {
                    await newColl.drop();
                    console.log(`   🗑️ Cleared existing ${collectionName} in NEW DB.`);
                } catch (e) {
                    // Ignore error if collection doesn't exist
                }

                const result = await newColl.insertMany(documents);
                console.log(`   ✅ Successfully migrated ${result.insertedCount} documents to ${collectionName}.`);

            } catch (err) {
                console.error(`   ❌ Error migrating ${collectionName}:`, err.message);
            }
        }

        console.log('\n✨ Migration Complete!');

    } catch (error) {
        console.error('🔥 Fatal Migration Error:', error);
    } finally {
        if (oldConnection) await oldConnection.close();
        if (newConnection) await newConnection.close();
        console.log('🔌 Connections closed.');
        process.exit(0);
    }
}

migrate();
