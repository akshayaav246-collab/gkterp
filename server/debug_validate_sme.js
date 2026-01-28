const mongoose = require('mongoose');
const dotenv = require('dotenv');
// require model directly to test ON DISK schema
const SME = require('./models/SME');

dotenv.config({ path: './server/.env' });

console.log('Testing SME Validation...');

const sme = new SME({
    name: 'Test SME',
    email: 'test@sme.com',
    contactNumber: '1234567890',
    location: 'Test Loc',
    technology: 'Test Tech',
    address: 'Test Addr',
    companyVendor: new mongoose.Types.ObjectId(), // dummy
    createdBy: new mongoose.Types.ObjectId(), // dummy
    // bankDetails MISSING
});

const error = sme.validateSync();
if (error) {
    console.error('❌ Validation Failed:', error.message);
    if (error.errors['bankDetails.ifscCode']) {
        console.error('SPECIFIC ERROR: bankDetails.ifscCode is REQUIRED');
    }
} else {
    console.log('✅ Validation Succeeded (bankDetails is optional)');
}
process.exit(0);
