require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string - loaded from .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db';

// Month mapping from 3-letter to full name
const monthMapping = {
    'Jan': 'January',
    'Feb': 'February',
    'Mar': 'March',
    'Apr': 'April',
    'May': 'May',
    'Jun': 'June',
    'Jul': 'July',
    'Aug': 'August',
    'Sep': 'September',
    'Oct': 'October',
    'Nov': 'November',
    'Dec': 'December'
};

async function migrateMonths() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const Opportunity = mongoose.model('Opportunity', new mongoose.Schema({}, { strict: false }));

        // Find all opportunities with 3-letter month format
        const opportunities = await Opportunity.find({
            'commonDetails.monthOfTraining': { $in: Object.keys(monthMapping) }
        });

        console.log(`Found ${opportunities.length} opportunities to migrate`);

        let migratedCount = 0;
        for (const opp of opportunities) {
            const oldMonth = opp.commonDetails.monthOfTraining;
            const newMonth = monthMapping[oldMonth];

            if (newMonth) {
                opp.commonDetails.monthOfTraining = newMonth;
                await opp.save();
                migratedCount++;
                console.log(`Migrated ${opp.opportunityNumber}: ${oldMonth} → ${newMonth}`);
            }
        }

        console.log(`\nMigration complete! Migrated ${migratedCount} opportunities.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run migration
migrateMonths();
