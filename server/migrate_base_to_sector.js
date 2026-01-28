const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './server/.env' });

// Connect to DB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            // Access the raw collection
            const collection = mongoose.connection.collection('clients');

            // Rename 'base' to 'sector'
            const result = await collection.updateMany(
                { base: { $exists: true } },
                { $rename: { 'base': 'sector' } }
            );

            console.log(`✅ Data Migration Complete: Modified ${result.modifiedCount} documents.`);
            process.exit(0);
        } catch (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });
