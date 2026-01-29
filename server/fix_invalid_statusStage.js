const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Opportunity = require('./models/Opportunity');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all opportunities with invalid statusStage
        const invalidOpps = await Opportunity.find({
            statusStage: { $nin: ['Creation', 'Costing', 'Proposal', 'PO Confirmed'] }
        });

        console.log(`\nFound ${invalidOpps.length} opportunities with invalid statusStage`);

        for (const opp of invalidOpps) {
            console.log(`\nOpportunity: ${opp.opportunityNumber}`);
            console.log(`Current statusStage: ${opp.statusStage}`);
            console.log(`Progress: ${opp.progressPercentage}%`);

            // Update to valid value based on progress
            let newStage = 'Creation';
            if (opp.progressPercentage >= 75) {
                newStage = 'PO Confirmed';
            } else if (opp.progressPercentage >= 50) {
                newStage = 'Proposal';
            } else if (opp.progressPercentage >= 25) {
                newStage = 'Costing';
            }

            // Use updateOne to bypass validation
            await Opportunity.updateOne(
                { _id: opp._id },
                { $set: { statusStage: newStage } }
            );

            console.log(`✅ Updated to: ${newStage}`);
        }

        console.log('\n✅ All opportunities fixed!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
