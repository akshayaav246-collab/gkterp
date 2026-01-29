const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Opportunity = require('./models/Opportunity');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Use findByIdAndUpdate to bypass validation and directly update
        const result = await Opportunity.updateOne(
            { opportunityNumber: 'GKT26E101001' },
            {
                $set: {
                    status: 'Active',
                    statusStage: 'PO Confirmed'
                }
            }
        );

        console.log('Update result:', result);

        // Verify the update
        const opp = await Opportunity.findOne({ opportunityNumber: 'GKT26E101001' });
        console.log('\nVerification:', {
            number: opp.opportunityNumber,
            status: opp.status,
            statusStage: opp.statusStage,
            progress: opp.progressPercentage
        });

        console.log('\n✅ Opportunity updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
