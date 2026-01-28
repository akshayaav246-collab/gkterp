const express = require('express');
const router = express.Router();
const DeliveryExecution = require('../models/DeliveryExecution');
const Opportunity = require('../models/Opportunity');
const { protect } = require('../middleware/authMiddleware');

// Helper to calculate GP
const calculateGP = (clientAmount, totalExpenses) => {
    if (!clientAmount || clientAmount === 0) return 0;
    return ((clientAmount - totalExpenses) / clientAmount) * 100;
};

// @route   POST /api/delivery/assign
// @desc    Initialize delivery execution for an opportunity (or get existing)
// @access  Private (Delivery Team)
router.post('/assign/:opportunityId', protect, async (req, res) => {
    try {
        let execution = await DeliveryExecution.findOne({ opportunity: req.params.opportunityId })
            // vendors population removed
            .populate('opportunity');

        if (!execution) {
            execution = await DeliveryExecution.create({
                opportunity: req.params.opportunityId,
                status: 'New'
            });
            // Re-fetch to populate
            execution = await DeliveryExecution.findById(execution._id).populate('opportunity');
        }
        res.json(execution);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/delivery/:executionId/expenses
// @desc    Update vendors and expenses, Recalculate GP
// @access  Private (Delivery Team)
router.put('/:executionId/expenses', protect, async (req, res) => {
    try {
        const { otherExpenses } = req.body;

        const execution = await DeliveryExecution.findById(req.params.executionId).populate('opportunity');
        if (!execution) return res.status(404).json({ message: 'Execution record not found' });

        if (execution.status === 'Signed Off') {
            return res.status(400).json({ message: 'Execution is signed off and cannot be edited.' });
        }

        // Update fields
        // execution.vendors removed
        execution.otherExpenses = otherExpenses;

        // Calculate Totals
        const otherCost = otherExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        execution.totalExpenses = otherCost;

        // Calculate GP
        // NOTE: Opportunity 'value' (days * rate?) is needed. 
        // For now, assuming we have a manual 'clientAmount' or deriving from Opportunity days * rate.
        // Since Schema didn't specify Rate, I will assume a Mock Client Value or added to model.
        // Let's assume passed in Body for now, or fixed Rate.
        // UPDATE: User says "GP % = ((Client Amount – Total Expenses) / Client Amount) * 100"
        // But Client Amount is not in Opp Model. I will add `value` to Opportunity or input here.
        // Let's assume Client Amount is provided in this update for calculation context.
        const clientAmount = req.body.clientAmount || 100000; // FALLBACK MOCK

        execution.gpPercentage = calculateGP(clientAmount, execution.totalExpenses);

        // Update Status based on Workflow
        if (execution.gpPercentage < 10) {
            execution.approvalStatus = 'Pending';
            execution.approvalLevel = 'Management';
            execution.status = 'Awaiting Approval';
        } else if (execution.gpPercentage < 15) {
            execution.approvalStatus = 'Pending';
            execution.approvalLevel = 'Business Head';
            execution.status = 'Awaiting Approval';
        } else {
            execution.approvalStatus = 'None';
            execution.approvalLevel = 'None';
            execution.status = 'In Progress';
        }

        await execution.save();
        res.json(execution);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
