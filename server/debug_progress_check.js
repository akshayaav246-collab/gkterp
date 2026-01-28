const mongoose = require('mongoose');
require('dotenv').config();
const Opportunity = require('./models/Opportunity');
const { calculateOpportunityProgress } = require('./utils/progressCalculator');

// DB Config
const db = "mongodb+srv://akshayabalu6:Akshaya8220mongo@cluster0.dum4m.mongodb.net/?appName=Cluster01";

mongoose.connect(db)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

async function debugProgress() {
    try {
        const oppNumber = 'GKT26E101005';
        const opp = await Opportunity.findOne({ opportunityNumber: oppNumber });

        if (!opp) {
            console.log(`Opportunity ${oppNumber} not found!`);
            process.exit(1);
        }

        console.log(`\n--- Analyzing Progress for ${oppNumber} ---`);
        console.log(`Current DB Progress: ${opp.progressPercentage}%`);
        console.log(`Current DB Stage: ${opp.statusStage}`);

        // Run Calculator
        const result = calculateOpportunityProgress(opp);
        console.log(`\n--- Calculator Result ---`);
        console.log(`Calculated Progress: ${result.progressPercentage}%`);
        console.log(`Calculated Stage: ${result.statusStage}`);

        console.log('\n--- Field Check ---');
        console.log('Stage 1 (Basic Details):', {
            type: !!opp.type,
            client: !!opp.client,
            participants: !!opp.participants,
            days: !!opp.days,
            requirementSummary: !!opp.requirementSummary
        });

        console.log('Stage 2 (Costing):', {
            selectedVendor: !!opp.selectedVendor,
            selectedSME: !!opp.selectedSME,
            totalExpense: opp.financials?.totalExpense,
            totalExpenseBtn: (opp.financials?.totalExpense > 0)
        });

        console.log('Stage 3 (Proposal):', {
            tov: opp.commonDetails?.tov,
            proposalDocument: opp.proposalDocument
        });

        console.log('Stage 4 (PO):', {
            poDocument: opp.poDocument,
            clientPODate: opp.commonDetails?.clientPODate,
            clientPONumber: opp.commonDetails?.clientPONumber
        });

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
}

debugProgress();
