const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Opportunity = require('./models/Opportunity');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const opportunities = await Opportunity.find({});
        console.log(`Found ${opportunities.length} opportunities to update.`);

        let count = 0;
        for (const opp of opportunities) {
            // The pre('save') hook in Opportunity.js handles:
            // 1. Financial calc (GKT Revenue, Total Expense, etc.)
            // 2. Progress calculation
            // We just need to mark it modified to ensure save processes it, 
            // though Mongoose usually runs pre-save validation anyway.

            // Force a "change" to ensure pre-save runs if needed, 
            // but just calling .save() on a doc usually triggers presave.
            // We can touch 'updatedAt' explicitly.
            opp.updatedAt = Date.now();

            await opp.save();
            count++;
            process.stdout.write(`\rUpdated ${count}/${opportunities.length}: ${opp.opportunityNumber}`);
        }

        console.log('\n\n✅ Migration Complete!');
        console.log('All opportunities have been saved with new Financial and Progress logic.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

migrate();
