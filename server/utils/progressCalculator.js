/**
 * Progress Calculator Utility for Opportunity Status Bar
 * Updated Logic (Jan 2026)
 * - Scheduled (15%) -> Created with basic details
 * - Scheduled (30%) -> Sales tab details filled
 * - In Progress (50%) -> PO uploaded
 * - In Progress (75%) -> Invoice uploaded
 * - Completed (100%) -> All delivery documents uploaded
 */

/**
 * Calculate opportunity progress percentage
 * @param {Object} opportunity - Mongoose opportunity document
 * @returns {Object} { progressPercentage, statusStage, statusLabel }
 */
function calculateOpportunityProgress(opportunity) {
    let progress = 15;
    let stage = 'Scheduled';
    let label = 'Scheduled';

    // Check Manual Status first (for Cancelled/Discontinued)
    const status = opportunity.commonDetails?.status;

    if (status === 'Cancelled') {
        return {
            progressPercentage: 0,
            statusStage: 'Cancelled',
            statusLabel: 'Cancelled'
        };
    } else if (status === 'Discontinued') {
        return {
            progressPercentage: 0,
            statusStage: 'Discontinued',
            statusLabel: 'Discontinued'
        };
    }

    // Stage 1: Basic details (15%) - Default on creation
    progress = 15;
    stage = 'Scheduled';
    label = 'Scheduled';

    // Stage 2: Sales details filled (30%)
    // Check if any sales tab details are filled
    const hasSalesDetails = (
        (opportunity.commonDetails?.tov && opportunity.commonDetails.tov > 0) ||
        opportunity.expenses?.marketingPercent !== undefined ||
        opportunity.commonDetails?.courseCode ||
        opportunity.commonDetails?.startDate
    );

    if (hasSalesDetails) {
        progress = 30;
        stage = 'Scheduled';
        label = 'Scheduled';
    }

    // Stage 3: PO uploaded (50%)
    if (opportunity.poDocument) {
        progress = 50;
        stage = 'In Progress';
        label = 'In Progress';
    }

    // Stage 4: Invoice uploaded (75%)
    if (opportunity.invoiceDocument) {
        progress = 75;
        stage = 'In Progress';
        label = 'In Progress';
    }

    // Stage 5: All delivery documents uploaded (100%)
    const docs = opportunity.deliveryDocuments || {};
    const allDocsUploaded = docs.attendance && docs.feedback && docs.assessment && docs.performance;

    if (allDocsUploaded) {
        progress = 100;
        stage = 'Completed';
        label = 'Completed';
    }

    // Manual override: If Delivery Team manually set to Completed and all docs are uploaded
    if (status === 'Completed' && allDocsUploaded) {
        progress = 100;
        stage = 'Completed';
        label = 'Completed';
    }

    return {
        progressPercentage: progress,
        statusStage: stage,
        statusLabel: label
    };
}

/**
 * Get required fields for next stage
 * @param {Object} opportunity - Mongoose opportunity document
 * @returns {Array} Array of required field names
 */
function getRequiredFieldsForNextStage(opportunity) {
    const { progressPercentage } = calculateOpportunityProgress(opportunity);

    if (progressPercentage < 50) {
        return ['Financial Details (Expenses & TOV)'];
    } else if (progressPercentage < 100) {
        return ['Delivery Documents (Attendance, Feedback, Assessment, Performance)', 'Manual Verification'];
    }

    return ['All stages complete!'];
}

module.exports = {
    calculateOpportunityProgress,
    getRequiredFieldsForNextStage
};
