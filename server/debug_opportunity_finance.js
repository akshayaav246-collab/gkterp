const mongoose = require('mongoose');
const Opportunity = require('./models/Opportunity');

mongoose.connect('mongodb://localhost:27017/erp_project');

async function checkOpportunityData() {
    try {
        console.log('Checking opportunity data...\n');

        const year = new Date().getFullYear();

        // Get all opportunities for current year
        const opps = await Opportunity.find({
            'commonDetails.year': year
        }).limit(5);

        console.log(`Found ${opps.length} opportunities for year ${year}\n`);

        opps.forEach((opp, index) => {
            console.log(`\n=== Opportunity ${index + 1} ===`);
            console.log(`ID: ${opp._id}`);
            console.log(`Opportunity Number: ${opp.opportunityNumber}`);
            console.log(`Training Month: ${opp.commonDetails?.monthOfTraining}`);
            console.log(`Training Year: ${opp.commonDetails?.year}`);
            console.log(`Total Order Value: ${opp.totalOrderValue}`);
            console.log(`Invoice Amount (financeDetails): ${opp.financeDetails?.clientReceivables?.invoiceAmount || 'NOT SET'}`);
            console.log(`Finance Details exists: ${!!opp.financeDetails}`);
            if (opp.financeDetails) {
                console.log(`Client Receivables exists: ${!!opp.financeDetails.clientReceivables}`);
                if (opp.financeDetails.clientReceivables) {
                    console.log(`Invoice Amount: ${opp.financeDetails.clientReceivables.invoiceAmount}`);
                }
            }
        });

        // Check total revenue
        const allOpps = await Opportunity.find({
            'commonDetails.year': year
        });

        let totalFromInvoiceAmount = 0;
        let totalFromTOV = 0;
        let oppsWithInvoiceAmount = 0;

        allOpps.forEach(opp => {
            const invoiceAmount = opp.financeDetails?.clientReceivables?.invoiceAmount || 0;
            const tov = opp.totalOrderValue || 0;

            totalFromInvoiceAmount += invoiceAmount;
            totalFromTOV += tov;

            if (invoiceAmount > 0) oppsWithInvoiceAmount++;
        });

        console.log(`\n\n=== SUMMARY ===`);
        console.log(`Total opportunities: ${allOpps.length}`);
        console.log(`Opportunities with invoice amount > 0: ${oppsWithInvoiceAmount}`);
        console.log(`Total revenue from Invoice Amount: ₹${totalFromInvoiceAmount.toLocaleString()}`);
        console.log(`Total revenue from TOV: ₹${totalFromTOV.toLocaleString()}`);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
    }
}

checkOpportunityData();
