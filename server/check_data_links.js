const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Client = require('./models/Client');
const Opportunity = require('./models/Opportunity');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const relinkData = async () => {
    try {
        console.log('🔄 Starting data relinking process...\n');

        // Step 1: Get all users
        const users = await User.find({});
        console.log(`📋 Found ${users.length} users in database`);

        // Create a map of email to user ID for easy lookup
        const emailToUserId = {};
        users.forEach(user => {
            emailToUserId[user.email] = user._id;
            console.log(`   - ${user.name} (${user.email}) -> ${user._id}`);
        });

        console.log('\n');

        // Step 2: Get all clients
        const clients = await Client.find({}).populate('createdBy', 'name email');
        console.log(`📋 Found ${clients.length} clients`);

        let clientsUpdated = 0;
        let clientsAlreadyLinked = 0;

        for (const client of clients) {
            if (client.createdBy && mongoose.Types.ObjectId.isValid(client.createdBy._id)) {
                // Check if the createdBy user still exists
                const userExists = await User.findById(client.createdBy._id);
                if (userExists) {
                    console.log(`   ✅ Client "${client.companyName}" already linked to ${userExists.name}`);
                    clientsAlreadyLinked++;
                } else {
                    console.log(`   ⚠️  Client "${client.companyName}" has invalid user reference`);
                }
            } else {
                console.log(`   ❌ Client "${client.companyName}" has no valid createdBy`);
            }
        }

        console.log(`\n📊 Clients Summary:`);
        console.log(`   - Already linked: ${clientsAlreadyLinked}`);
        console.log(`   - Need manual linking: ${clients.length - clientsAlreadyLinked}`);

        // Step 3: Get all opportunities
        const opportunities = await Opportunity.find({}).populate('createdBy', 'name email');
        console.log(`\n📋 Found ${opportunities.length} opportunities`);

        let opportunitiesUpdated = 0;
        let opportunitiesAlreadyLinked = 0;

        for (const opp of opportunities) {
            if (opp.createdBy && mongoose.Types.ObjectId.isValid(opp.createdBy._id)) {
                // Check if the createdBy user still exists
                const userExists = await User.findById(opp.createdBy._id);
                if (userExists) {
                    console.log(`   ✅ Opportunity "${opp.opportunityNumber}" already linked to ${userExists.name}`);
                    opportunitiesAlreadyLinked++;
                } else {
                    console.log(`   ⚠️  Opportunity "${opp.opportunityNumber}" has invalid user reference`);
                }
            } else {
                console.log(`   ❌ Opportunity "${opp.opportunityNumber}" has no valid createdBy`);
            }
        }

        console.log(`\n📊 Opportunities Summary:`);
        console.log(`   - Already linked: ${opportunitiesAlreadyLinked}`);
        console.log(`   - Need manual linking: ${opportunities.length - opportunitiesAlreadyLinked}`);

        console.log('\n✅ Data relinking check complete!');
        console.log('\n💡 Next Steps:');
        console.log('   1. If data is already linked correctly, you\'re good to go!');
        console.log('   2. If you need to manually assign users to clients/opportunities:');
        console.log('      - Use the UI to edit each client/opportunity');
        console.log('      - Or create a custom migration script based on business logic');
        console.log('   3. If you lost all data, you may need to recreate clients and opportunities');

        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

relinkData();
