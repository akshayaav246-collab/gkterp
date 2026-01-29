const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const addFinanceUser = async () => {
    try {
        // Check if Finance user already exists
        const existingFinance = await User.findOne({ email: 'finance@company.com' });

        if (existingFinance) {
            console.log('✅ Finance user already exists!');
            console.log('Email: finance@company.com');
            console.log('Password: password123');
            mongoose.connection.close();
            return;
        }

        // Find Director to set as reporting manager
        const director = await User.findOne({ role: 'Director' });

        if (!director) {
            console.log('❌ No Director found. Please run seed.js first to create all users.');
            mongoose.connection.close();
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const financeUser = new User({
            name: 'Finance Manager',
            email: 'finance@company.com',
            password: hashedPassword,
            role: 'Finance',
            creatorCode: 'F1',
            reportingManager: director._id
        });

        await financeUser.save();
        console.log('✅ Finance User created successfully!');
        console.log('Email: finance@company.com');
        console.log('Password: password123');

        mongoose.connection.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

addFinanceUser();
