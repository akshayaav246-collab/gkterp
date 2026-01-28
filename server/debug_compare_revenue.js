const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Opportunity = require('./models/Opportunity');

dotenv.config();

const checkDates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const vikram = await User.findOne({ email: 'vikram.exec@company.com' });
        if (!vikram) return;

        const currentYear = new Date().getFullYear();
        console.log('Current System Year:', currentYear);

        const vikramOpps = await Opportunity.find({
            createdBy: vikram._id,
            "financeDetails.clientReceivables.invoiceAmount": { $gt: 0 }
        });

        console.log(`\nFound ${vikramOpps.length} valid revenue opportunities for Vikram.`);

        vikramOpps.forEach(opp => {
            console.log(`ID: ${opp._id}`);
            console.log(`Created At: ${opp.createdAt}`);
            console.log(`Invoice Amount: ${opp.financeDetails.clientReceivables.invoiceAmount}`);

            const oppYear = new Date(opp.createdAt).getFullYear();
            if (oppYear !== currentYear) {
                console.log(`⚠️ MISMATCH: Opportunity year is ${oppYear}, Dashboard filters for ${currentYear}`);
            } else {
                console.log('✅ Year matches current year.');
            }
        });

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkDates();
