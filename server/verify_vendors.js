const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vendor = require('./models/Vendor');

dotenv.config({ path: './server/.env' });

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        const count = await Vendor.countDocuments();
        console.log(`Vendor Count: ${count}`);
        if (count > 0) {
            const vendors = await Vendor.find({}).limit(3);
            console.log('Sample Vendors:', vendors.map(v => `${v.displayName || v.name} (Active: ${v.isActive})`));
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
