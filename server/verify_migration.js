const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './server/.env' });

// Connect to DB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            const collection = mongoose.connection.collection('clients');
            const clients = await collection.find({}).limit(5).toArray();

            console.log('--- Client Data Inspection ---');
            clients.forEach(client => {
                console.log(`ID: ${client._id}`);
                console.log(`Name: ${client.companyName}`);
                console.log(`Sector: ${client.sector}`);
                console.log(`Base (should be undefined): ${client.base}`);
                console.log('------------------------------');
            });

            process.exit(0);
        } catch (error) {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });
