const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Load the Client model
const Client = require('./models/Client');

console.log('🔍 Required fields in Client model:');
Object.keys(Client.schema.paths).forEach(path => {
    const schemaType = Client.schema.paths[path];
    if (schemaType.isRequired) {
        console.log(`  ✓ ${path}: REQUIRED`);
    }
});

console.log('\n📋 All fields in Client model:');
Object.keys(Client.schema.paths).forEach(path => {
    console.log(`  - ${path}`);
});

console.log('\n✅ Model loaded successfully');
process.exit(0);
