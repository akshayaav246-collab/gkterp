const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./models/User');
const Opportunity = require('./models/Opportunity');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find Vikram Das
        const vikram = await User.findOne({ name: 'Vikram Das' });
        console.log('\n=== Vikram Das ===');
        console.log('ID:', vikram._id);
        console.log('Role:', vikram.role);

        // Build query like the backend does
        const userIds = [vikram._id];
        const query = { createdBy: { $in: userIds } };

        console.log('\n=== Query ===');
        console.log(JSON.stringify(query, null, 2));

        // Count opportunities
        const totalOpps = await Opportunity.countDocuments(query);
        console.log('\n=== Total Opportunities ===');
        console.log('Count:', totalOpps);

        // Get all opportunities for this user
        const opps = await Opportunity.find(query);
        console.log('\n=== Opportunities Details ===');
        opps.forEach(opp => {
            console.log({
                number: opp.opportunityNumber,
                statusStage: opp.statusStage,
                progress: opp.progressPercentage,
                createdBy: opp.createdBy
            });
        });

        // Test completed query (NEW SIMPLIFIED VERSION - no status field)
        const completedQuery = {
            ...query,
            progressPercentage: 100
        };
        console.log('\n=== Completed Query (NEW) ===');
        console.log(JSON.stringify(completedQuery, null, 2));
        const completed = await Opportunity.countDocuments(completedQuery);
        console.log('Completed Count:', completed);

        // Test in-progress query (NEW SIMPLIFIED VERSION - no status field)
        const inProgressQuery = {
            ...query,
            progressPercentage: { $lt: 100 }
        };
        console.log('\n=== In Progress Query (NEW) ===');
        console.log(JSON.stringify(inProgressQuery, null, 2));
        const inProgress = await Opportunity.countDocuments(inProgressQuery);
        console.log('In Progress Count:', inProgress);

        console.log('\n✅ Dashboard should show:');
        console.log(`   Completed: ${completed}`);
        console.log(`   In Progress: ${inProgress}`);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
