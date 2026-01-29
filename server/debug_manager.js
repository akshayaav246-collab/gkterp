const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find Sales Manager
        const manager = await User.findOne({ role: 'Sales Manager' });
        console.log('\n=== Sales Manager ===');
        console.log('ID:', manager._id);
        console.log('Name:', manager.name);
        console.log('Email:', manager.email);

        // Find team members
        const teamMembers = await User.find({ reportingManager: manager._id });
        console.log('\n=== Team Members ===');
        console.log('Count:', teamMembers.length);
        teamMembers.forEach(member => {
            console.log(`- ${member.name} (${member.email})`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
