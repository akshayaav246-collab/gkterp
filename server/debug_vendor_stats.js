const mongoose = require('mongoose');
const Opportunity = require('./models/Opportunity');
const Vendor = require('./models/Vendor');

// Connect to DB
const MONGODB_URI = 'mongodb+srv://akshayabalu6:Akshaya8220mongo@cluster0.dum4m.mongodb.net/?appName=Cluster01';
console.log('Attempting to connect to:', MONGODB_URI);
mongoose.connect(MONGODB_URI).then(async () => {
    console.log('Connected to DB');

    try {
        // 1. Find the vendor
        const vendor = await Vendor.findOne({ companyName: /Tech Trainers/i });
        if (!vendor) {
            console.log('Vendor "Tech Trainers" not found in DB.');
        } else {
            console.log('Found Vendor:', vendor.companyName, vendor._id);

            // 2. Find opportunities for this vendor
            const opps = await Opportunity.find({ selectedVendor: vendor._id });
            console.log(`Found ${opps.length} opportunities for this vendor.`);

            opps.forEach(o => {
                console.log(`- Opp ${o.opportunityNumber}: selectedVendor=${o.selectedVendor}, trainerCost=${o.expenses?.trainerCost}`);
            });

            if (opps.length === 0) {
                // Check if there are ANY opps with ANY selectedVendor
                const anyVendorOpps = await Opportunity.find({ selectedVendor: { $ne: null } }).limit(5);
                console.log('Sample opps with any vendor linked:', anyVendorOpps.map(o => ({ id: o._id, vendor: o.selectedVendor })));
            }
        }

        // 3. Run the aggregation
        console.log('Running Aggregation...');
        const stats = await Opportunity.aggregate([
            {
                $match: {
                    selectedVendor: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$selectedVendor',
                    totalRevenue: { $sum: '$expenses.trainerCost' }
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vendor'
                }
            },
            {
                $unwind: '$vendor'
            },
            {
                $sort: { totalRevenue: -1 }
            },
            {
                $limit: 3
            },
            {
                $project: {
                    name: {
                        $cond: {
                            if: { $eq: ['$vendor.vendorType', 'Company'] },
                            then: '$vendor.companyName',
                            else: '$vendor.name'
                        }
                    },
                    revenue: '$totalRevenue'
                }
            }
        ]);

        console.log('Aggregation Result:', JSON.stringify(stats, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.connection.close();
    }
}).catch(err => console.error('DB Connection Error:', err));
