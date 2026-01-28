const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Opportunity = require('./models/Opportunity');

dotenv.config();

const fixDate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const vikram = await User.findOne({ email: 'vikram.exec@company.com' });
        if (!vikram) return;

        const currentYear = new Date().getFullYear();
        console.log(`Updating Vikram's opportunities to year ${currentYear}...`);

        const vikramOpps = await Opportunity.find({
            createdBy: vikram._id,
        });

        for (const opp of vikramOpps) {
            // Set date to today
            opp.createdAt = new Date();
            // Also ensure updated at is set
            opp.updatedAt = new Date();

            await opp.save();
            console.log(`Updated Opportunity ${opp.opportunityNumber} date to ${opp.createdAt}`);
        }

        console.log('Done!');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixDate();
