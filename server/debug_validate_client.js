const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');

// Load env vars
dotenv.config({ path: './server/.env' });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            // Fetch the client IBM
            const client = await Client.findById('696c0fb2bccb572ca0d8b317');
            if (!client) {
                console.log('No client found');
                process.exit(0);
            }

            console.log('Checking Client:', client.companyName);
            console.log('Data:', JSON.stringify(client.toObject(), null, 2));

            const error = client.validateSync();
            if (error) {
                console.error('❌ Validation Failed:');
                console.error(error.message);
                if (error.errors) {
                    Object.keys(error.errors).forEach(key => {
                        console.error(`- Field: ${key}, Error: ${error.errors[key].message}`);
                    });
                }
            } else {
                console.log('✅ Validation Succeeded (Data matches Schema)');
            }

            process.exit(0);
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });
