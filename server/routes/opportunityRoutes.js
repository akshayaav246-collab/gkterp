const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const Client = require('../models/Client');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/authMiddleware');
const { calculateOpportunityProgress } = require('../utils/progressCalculator');
const multer = require('multer');
const path = require('path');

// File Upload Config
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        cb(null, true);
    }
});

// Helper to get accessible user IDs
const getAccessibleUserIds = async (user) => {
    if (user.role === 'Sales Executive') {
        return [user._id];
    } else if (user.role === 'Sales Manager') {
        const team = await User.find({ reportingManager: user._id });
        return [user._id, ...team.map(u => u._id)];
    } else {
        return []; // Director sees all
    }
};

// @route   POST /api/opportunities
// @desc    Create new opportunity (Sales only - Base details)
// @access  Private (Sales Executive, Sales Manager)
router.post('/', protect, authorize('Sales Executive', 'Sales Manager'), async (req, res) => {
    const {
        type, clientId, participants, days, requirementSummary,
        typeSpecificDetails, selectedContactPerson
    } = req.body;

    try {
        // GENERATE OPPORTUNITY ID: GKT-YY-CODE-MM-XXX
        const today = new Date();
        const yy = today.getFullYear().toString().substr(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, '0');

        // Use first two letters of creator name (or 'XX' fallback)
        const code = (req.user.name ? req.user.name.substring(0, 2) : 'XX').toUpperCase();

        const prefix = `GKT${yy}${code}${mm}`;

        const lastOpp = await Opportunity.findOne({ opportunityNumber: new RegExp(`^${prefix}`) })
            .sort({ opportunityNumber: -1 });

        let serial = '001';
        if (lastOpp) {
            const lastSerial = parseInt(lastOpp.opportunityNumber.slice(-3));
            serial = (lastSerial + 1).toString().padStart(3, '0');
        }

        const opportunityNumber = `${prefix}${serial}`;

        // Fetch client to get base/training sector
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const opportunity = await Opportunity.create({
            opportunityNumber,
            type,
            client: clientId,
            participants,
            days,
            requirementSummary,
            selectedContactPerson, // Added field
            typeSpecificDetails: typeSpecificDetails || {},
            commonDetails: {
                trainingSector: client.sector, // Auto-fetch from client
                sales: req.user._id // Auto-fill
            },
            createdBy: req.user._id,
            activityLog: [{
                action: 'Opportunity Created',
                by: req.user._id,
                role: req.user.role,
                details: `New ${type} opportunity created via dashboard.`
            }]
        });

        // NOTIFICATION: Notify Delivery Team about new opportunity
        try {
            const deliveryTeam = await User.find({ role: 'Delivery Team' });
            const notifications = deliveryTeam.map(user => ({
                recipientId: user._id,
                type: 'opportunity_created',
                message: `New opportunity ${opportunityNumber} created by ${req.user.name}`,
                opportunityId: opportunity._id,
                opportunityNumber: opportunityNumber,
                triggeredBy: req.user._id,
                triggeredByName: req.user.name
            }));

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
            // Don't fail the request if notification fails
        }

        res.status(201).json(opportunity);
    } catch (err) {
        console.error('Error creating opportunity:', err);
        // Clean up Mongoose validation errors for frontend
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: err.message, detailed: err });
    }
});

// @route   GET /api/opportunities
// @desc    Get all accessible opportunities
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let filter = {};

        if (req.user.role !== 'Director' && req.user.role !== 'Delivery Team' && req.user.role !== 'Finance') {
            const accessibleUserIds = await getAccessibleUserIds(req.user);
            if (accessibleUserIds.length > 0) {
                filter.createdBy = { $in: accessibleUserIds };
            }
        }

        const opportunities = await Opportunity.find(filter)
            .populate('client', 'companyName location sector contactPersons')
            .populate('createdBy', 'name role creatorCode')
            .populate('commonDetails.sales', 'name email')
            .sort({ createdAt: -1 });

        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/opportunities/:id
// @desc    Get single opportunity with full details
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id)
            .populate('client')
            .populate('createdBy', 'name role creatorCode')
            .populate('commonDetails.sales', 'name email')
            .populate('approvedBy', 'name role')
            .populate('rejectedBy', 'name role')
            // .populate('selectedVendor') removed
            .populate('selectedSME');

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/opportunities/:id
// @desc    Update opportunity (role-based field restrictions)
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        // Director cannot edit
        if (req.user.role === 'Director') {
            return res.status(403).json({ message: 'Directors have view-only access' });
        }

        const updates = req.body;

        // Validate field-level permissions
        console.log(`User ${req.user.name} (${req.user.role}) attempting to update opportunity ${req.params.id}`);
        console.log('Update payload keys:', Object.keys(updates));

        for (const fieldPath in updates) {
            const isAllowed = opportunity.canEdit(fieldPath, req.user.role);
            console.log(`Checking permission for field '${fieldPath}': Allowed=${isAllowed}`);

            if (!isAllowed) {
                console.log(`❌ Permission denied for field: ${fieldPath}`);
                return res.status(403).json({
                    message: `You do not have permission to edit field: ${fieldPath}`
                });
            }
        }

        // Special Handling for Status Changes (Delivery Team Only)
        // Detect status from flat key or nested object
        const newStatus = updates['commonDetails.status'] || (updates.commonDetails && updates.commonDetails.status);
        const currentStatus = opportunity.commonDetails.status;

        if (newStatus) {
            console.log(`Status Check: New='${newStatus}', Current='${currentStatus}'`);
            console.log(`Comparison (newStatus !== currentStatus): ${newStatus !== currentStatus}`);
        }

        if (newStatus && newStatus !== currentStatus) {
            console.log(`Status update detected: ${newStatus} by ${req.user.name}`);

            if (req.user.role !== 'Delivery Team' && req.user.role !== 'Director' && req.user.role !== 'Finance') {
                console.log('❌ Status update blocked for non-Delivery user');
                return res.status(403).json({ message: 'Only Delivery Team can change status.' });
            }

            // Validate "Completed" Status
            if (newStatus === 'Completed') {
                const docs = opportunity.deliveryDocuments || {};
                const missingDocs = [];
                // Check strictly for path existence
                if (!docs.attendance) missingDocs.push('Attendance');
                if (!docs.feedback) missingDocs.push('Feedback');
                if (!docs.assessment) missingDocs.push('Assessment');
                if (!docs.performance) missingDocs.push('Performance');

                if (missingDocs.length > 0) {
                    console.log(`Block Completed Status: Missing ${missingDocs.join(', ')}`);
                    return res.status(400).json({
                        message: `Cannot mark Completed. Missing documents: ${missingDocs.join(', ')}`
                    });
                }
            }
        }

        // Apply updates
        Object.keys(updates).forEach(key => {
            if (key.includes('.')) {
                // Handle nested fields
                const keys = key.split('.');
                let current = opportunity;
                for (let i = 0; i < keys.length - 1; i++) {
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = updates[key];
            } else {
                opportunity[key] = updates[key];
            }
        });

        opportunity.lastModifiedBy = req.user._id;

        // Log Activity
        opportunity.activityLog.push({
            action: 'Opportunity Updated',
            by: req.user._id,
            role: req.user.role,
            details: `Updated fields: ${Object.keys(updates).join(', ')}`
        });

        // NOTIFICATION LOGIC
        try {
            const Notification = require('../models/Notification');
            let notifType = null;
            let notifMessage = '';
            let recipientId = null;
            let changes = {};
            let targetTab = null;

            // 1. Requirements Update (Sales <-> Delivery)
            const reqFields = ['requirementSummary', 'typeSpecificDetails', 'days', 'participants', 'commonDetails.trainingSupporter', 'commonDetails.courseCode', 'commonDetails.courseName'];
            const isReqUpdated = reqFields.some(field => {
                // Check if field exists in updates (either flat or nested in updates object)
                return updates[field] !== undefined || (updates.typeSpecificDetails && field.startsWith('typeSpecificDetails')) || (updates.commonDetails && field.startsWith('commonDetails'));
            });

            // Capture changes for specific fields to show in preview
            if (isReqUpdated) {
                reqFields.forEach(f => {
                    const val = updates[f] !== undefined ? updates[f] : (f.includes('.') ? updates[f.split('.')[0]]?.[f.split('.')[1]] : undefined);
                    if (val !== undefined) changes[f] = val;
                });
            }

            if (isReqUpdated) {
                targetTab = 'delivery'; // Mapping Requirements to 'delivery' tab internally (UI calls it Requirements)
                if (req.user.role === 'Delivery Team') {
                    // Update by Delivery -> Notify Sales
                    if (opportunity.commonDetails?.sales) {
                        recipientId = opportunity.commonDetails.sales;
                        notifMessage = `Requirement details has been updated by ${req.user.name} for ${opportunity.opportunityNumber}`;
                        notifType = 'general'; // Using general or specific type
                    }
                } else {
                    // Update by Sales/Admin -> Notify Delivery Team
                    // Find all delivery team members
                    const deliveryUsers = await User.find({ role: 'Delivery Team' });
                    if (deliveryUsers.length > 0) {
                        const notifs = deliveryUsers.map(u => ({
                            recipientId: u._id,
                            type: 'general',
                            message: `Requirement details has been updated by ${req.user.name} for ${opportunity.opportunityNumber}`,
                            opportunityId: opportunity._id,
                            opportunityNumber: opportunity.opportunityNumber,
                            triggeredBy: req.user._id,
                            triggeredByName: req.user.name,
                            changes: changes,
                            targetTab: 'delivery'
                        }));
                        await Notification.insertMany(notifs);
                        recipientId = null; // Handled bulk
                    }
                }
            }

            // 2. Expenses Update (Delivery -> Sales)
            if (updates.expenses && req.user.role === 'Delivery Team') {
                targetTab = 'expenses';
                if (opportunity.commonDetails?.sales) {
                    recipientId = opportunity.commonDetails.sales;
                    notifMessage = `Expenses has been updated by ${req.user.name} for ${opportunity.opportunityNumber}`;
                    notifType = 'expense_edit';
                    changes = updates.expenses;
                }
            }

            // Send Single Notification if recipientId is determined
            if (recipientId && notifMessage) {
                await Notification.create({
                    recipientId: recipientId,
                    type: notifType || 'opportunity_update',
                    message: notifMessage,
                    opportunityId: opportunity._id,
                    opportunityNumber: opportunity.opportunityNumber,
                    triggeredBy: req.user._id,
                    triggeredByName: req.user.name,
                    changes: changes,
                    targetTab: targetTab
                });
            }

        } catch (notifErr) {
            console.error('Notification Error:', notifErr);
        }

        // --- TARGET ACHIEVEMENT CHECK ---
        // Only run if revenue-related fields might have changed
        if (updates.financeDetails || updates['financeDetails.clientReceivables.invoiceAmount']) {
            try {
                const updatedOpp = await Opportunity.findById(opportunity._id); // Re-fetch to get latest state
                const ownerId = updatedOpp.commonDetails.sales || updatedOpp.createdBy; // Sales Person
                const owner = await User.findById(ownerId);

                if (owner && owner.reportingManager) {
                    const year = new Date().getFullYear();
                    // Get Yearly Target
                    const targetObj = owner.targets.find(t => t.year === year && t.period === 'Yearly');

                    if (targetObj && targetObj.amount > 0) {
                        // Calculate Total Achieved for User
                        const startOfYear = new Date(year, 0, 1);
                        const endOfYear = new Date(year, 11, 31);

                        const userOpps = await Opportunity.find({
                            createdBy: owner._id,
                            createdAt: { $gte: startOfYear, $lte: endOfYear }
                        });

                        const totalAchieved = userOpps.reduce((sum, opp) => {
                            return sum + (opp.financeDetails?.clientReceivables?.invoiceAmount || 0);
                        }, 0);

                        // Check if Target Met
                        if (totalAchieved >= targetObj.amount) {
                            // Check if already notified for this cycle
                            const alreadyNotified = owner.achievedTargets?.some(at => at.year === year && at.period === 'Yearly');

                            if (!alreadyNotified) {
                                // 1. Notify Manager
                                const Notification = require('../models/Notification');
                                await Notification.create({
                                    recipientId: owner.reportingManager,
                                    type: 'target_achieved',
                                    message: `🎯 ${owner.name} has achieved their Yearly Revenue Target of ₹${targetObj.amount.toLocaleString()}!`,
                                    triggeredBy: owner._id,
                                    triggeredByName: owner.name
                                });

                                // 2. Mark as Notified
                                if (!owner.achievedTargets) owner.achievedTargets = [];
                                owner.achievedTargets.push({ year, period: 'Yearly' });
                                await owner.save();

                                console.log(`✅ Target Achievement Notification sent for ${owner.name}`);
                            }
                        }
                    }
                }
            } catch (targetErr) {
                console.error('Target Check Error:', targetErr);
            }
        }

        // Calculate and update progress
        const { progressPercentage, statusStage, statusLabel } = calculateOpportunityProgress(opportunity);
        opportunity.progressPercentage = progressPercentage;
        opportunity.statusStage = statusStage;
        opportunity.statusLabel = statusLabel;

        await opportunity.save();

        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/opportunities/:id/type-specific
// @desc    Update type-specific details (Sales only)
// @access  Private (Sales Executive, Sales Manager)
router.put('/:id/type-specific', protect, authorize('Sales Executive', 'Sales Manager'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        opportunity.typeSpecificDetails = {
            ...opportunity.typeSpecificDetails,
            ...req.body
        };

        opportunity.lastModifiedBy = req.user._id;
        await opportunity.save();

        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// @route   PUT /api/opportunities/:id/expenses
// @desc    Update expenses (Delivery only)
// @access  Private (Delivery Team)
router.put('/:id/expenses', protect, authorize('Delivery Team'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        opportunity.expenses = {
            ...opportunity.expenses,
            ...req.body
        };

        opportunity.lastModifiedBy = req.user._id;

        // Log Activity
        opportunity.activityLog.push({
            action: 'Expenses Updated',
            by: req.user._id,
            role: req.user.role,
            details: 'Delivery team updated expense details.'
        });

        await opportunity.save();

        // NOTIFICATION: Notify Sales Team (Creator) about breakdown update
        try {
            // Check if any breakdown fields were modified
            const breakdownFields = [
                'trainerCost', 'vouchersCost', 'gkRoyalty', 'material', 'labs',
                'venue', 'travel', 'accommodation', 'perDiem', 'localConveyance'
            ];

            const isBreakdownUpdated = breakdownFields.some(field => req.body[field] !== undefined);

            // Notify only if breakdown updated
            if (isBreakdownUpdated) {
                const salesPersonId = opportunity.createdBy;
                if (salesPersonId) {
                    await Notification.create({
                        recipientId: salesPersonId,
                        type: 'expense_edit',
                        message: `Operational expenses breakdown updated for ${opportunity.opportunityNumber} by ${req.user.name}`,
                        opportunityId: opportunity._id,
                        opportunityNumber: opportunity.opportunityNumber,
                        triggeredBy: req.user._id,
                        triggeredByName: req.user.name
                    });
                }
            }
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        // Check if approval is needed
        if (opportunity.approvalRequired) {
            // Create approval request (integrate with approval system)
            // This would trigger the approval workflow
        }

        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/opportunities/:id
// @desc    Delete opportunity (Sales only, if not in delivery)
// @access  Private (Sales Executive, Sales Manager)
router.delete('/:id', protect, authorize('Sales Executive', 'Sales Manager'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        // Check if user has permission (creator or their manager)
        const accessibleUserIds = await getAccessibleUserIds(req.user);
        if (!accessibleUserIds.includes(opportunity.createdBy.toString()) && req.user.role !== 'Sales Manager') {
            return res.status(403).json({ message: 'Not authorized to delete this opportunity' });
        }

        // Prevent deletion if in delivery phase
        if (opportunity.commonDetails.status === 'In Progress' || opportunity.commonDetails.status === 'Completed') {
            return res.status(400).json({ message: 'Cannot delete opportunity in delivery phase' });
        }

        await opportunity.deleteOne();
        res.json({ message: 'Opportunity deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/opportunities/:id/progress
// @desc    Get detailed progress breakdown for an opportunity
// @access  Private
router.get('/:id/progress', protect, async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        const progressData = opportunity.calculateProgress();
        const requiredFields = opportunity.getRequiredFieldsForNextStage();

        res.json({
            ...progressData,
            requiredFieldsForNextStage: requiredFields
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-proposal
// @desc    Upload proposal document (Stage 3)
// @access  Private (Sales Executive, Sales Manager)
router.post('/:id/upload-proposal', protect, authorize('Sales Executive', 'Sales Manager'), upload.single('proposal'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        // Check if user has permission to edit this opportunity
        if (req.user.role === 'Sales Executive' && opportunity.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this opportunity' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        opportunity.proposalDocument = req.file.path;
        opportunity.proposalUploadedAt = new Date();

        opportunity.activityLog.push({
            action: 'Proposal Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `Proposal uploaded by ${req.user.name}`
        });

        await opportunity.save();

        res.json({
            message: 'Proposal uploaded successfully',
            proposalDocument: opportunity.proposalDocument,
            progress: opportunity.progressPercentage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-po
// @desc    Upload PO document (Stage 4)
// @access  Private (Sales Executive, Sales Manager)
router.post('/:id/upload-po', protect, authorize('Sales Executive', 'Sales Manager'), upload.single('po'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        // Check if user has permission to edit this opportunity
        if (req.user.role === 'Sales Executive' && opportunity.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to edit this opportunity' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { poValue, poDate } = req.body;

        if (!poValue || !poDate) {
            return res.status(400).json({ message: 'PO value and date are required' });
        }

        opportunity.poDocument = req.file.path;
        opportunity.poValue = Number(poValue);
        opportunity.poDate = new Date(poDate);

        opportunity.activityLog.push({
            action: 'PO Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `PO uploaded. Value: ${poValue}`
        });

        await opportunity.save();

        // NOTIFICATION: Sales -> Finance
        try {
            const financeUsers = await User.find({ role: 'Finance' });
            // Fallback to Director if no Finance user
            const recipients = financeUsers.length > 0 ? financeUsers : await User.find({ role: 'Director' });

            if (recipients.length > 0) {
                const Notification = require('../models/Notification');
                const notifs = recipients.map(u => ({
                    recipientId: u._id,
                    type: 'document_upload',
                    message: `Client PO has been uploaded by ${req.user.name} for ${opportunity.opportunityNumber}`,
                    opportunityId: opportunity._id,
                    opportunityNumber: opportunity.opportunityNumber,
                    triggeredBy: req.user._id,
                    triggeredByName: req.user.name,
                    targetTab: 'revenue' // PO tab
                }));
                await Notification.insertMany(notifs);
            }
        } catch (err) {
            console.error('Notification error:', err);
        }

        res.json({
            message: 'PO uploaded successfully',
            poDocument: opportunity.poDocument,
            progress: opportunity.progressPercentage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-sow
// @desc    Upload SOW document (Stage 3/4)
// @access  Private (Sales Executive, Sales Manager)
router.post('/:id/upload-sow', protect, authorize('Sales Executive', 'Sales Manager'), upload.single('sow'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        opportunity.sowDocument = req.file.path;

        opportunity.activityLog.push({
            action: 'SOW Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `SOW uploaded by ${req.user.name}`
        });

        await opportunity.save();

        res.json({
            message: 'SOW uploaded successfully',
            sowDocument: opportunity.sowDocument,
            progress: opportunity.progressPercentage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-finance-doc
// @desc    Upload finance-related document (PO, Invoice, etc.)
// @access  Private (Sales Executive, Sales Manager, Delivery Team, Finance)
router.post('/:id/upload-finance-doc', protect, authorize('Sales Executive', 'Sales Manager', 'Delivery Team', 'Finance'), upload.single('document'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { category, docType } = req.body;
        // category: 'trainer', 'travel', ... OR 'perDiem', 'other'
        // docType: 'poDocument', 'invoiceDocument' (for detailed) OR 'document' (for simple)

        if (!category || !docType) {
            return res.status(400).json({ message: 'Category and DocType are required' });
        }

        const finance = opportunity.financeDetails || {};
        if (!finance.vendorPayables) finance.vendorPayables = {};

        // Helper to ensure nested path exists
        const ensurePath = (obj, path) => {
            return path.split('.').reduce((o, i) => {
                if (!o[i]) o[i] = {};
                return o[i];
            }, obj);
        };

        if (['perDiem', 'other'].includes(category)) {
            // Simple Category
            if (!finance.vendorPayables[category]) finance.vendorPayables[category] = {};
            finance.vendorPayables[category].document = req.file.path;
        } else {
            // Detailed Category
            if (!finance.vendorPayables.detailed) finance.vendorPayables.detailed = {};
            if (!finance.vendorPayables.detailed[category]) finance.vendorPayables.detailed[category] = {};

            finance.vendorPayables.detailed[category][docType] = req.file.path;
        }

        opportunity.markModified('financeDetails');

        opportunity.activityLog.push({
            action: 'Finance Doc Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `${docType} uploaded for ${category} by ${req.user.name}`
        });

        await opportunity.save();

        // Notification Logic for Vendor Payables
        const Notification = require('../models/Notification');
        let recipientId = null;
        let message = '';

        if (docType === 'poDocument') {
            // PO Uploaded (usually by Finance) -> Notify Delivery Team
            // Since Delivery Team is a role, finding one or all? Usually notification goes to 'Delivery Team' role users.
            // Or specifically distinct users. Let's send to all Delivery Team members for visibility.
            const deliveryUsers = await User.find({ role: 'Delivery Team' });
            if (deliveryUsers.length > 0) {
                const notifs = deliveryUsers.map(u => ({
                    recipientId: u._id,
                    type: 'document_upload',
                    message: `Vendor PO uploaded for ${category} in ${opportunity.opportunityNumber} by ${req.user.name}`,
                    opportunityId: opportunity._id,
                    opportunityNumber: opportunity.opportunityNumber,
                    triggeredBy: req.user._id,
                    triggeredByName: req.user.name
                }));
                await Notification.insertMany(notifs);
            }
        } else if (docType === 'invoiceDocument') {
            // Invoice Uploaded (usually by Delivery) -> Notify Finance (Director)
            const director = await User.findOne({ role: 'Director' });
            if (director) {
                await Notification.create({
                    recipientId: director._id,
                    type: 'document_upload',
                    message: `Vendor Invoice uploaded for ${category} in ${opportunity.opportunityNumber} by ${req.user.name}`,
                    opportunityId: opportunity._id,
                    opportunityNumber: opportunity.opportunityNumber,
                    triggeredBy: req.user._id,
                    triggeredByName: req.user.name
                });
            }
        }
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ message: err.message });
    }
});




// @route   POST /api/opportunities/:id/upload-invoice
// @desc    Upload Invoice Document
// @access  Private (Delivery Team, Sales Manager)
router.post('/:id/upload-invoice', protect, authorize('Delivery Team', 'Sales Manager'), upload.single('invoice'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        opportunity.invoiceDocument = req.file.path;

        opportunity.activityLog.push({
            action: 'Invoice Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `Invoice document uploaded by ${req.user.name}`
        });

        await opportunity.save();

        // NOTIFICATION: Finance -> Sales
        try {
            if (opportunity.commonDetails?.sales) {
                const Notification = require('../models/Notification');
                await Notification.create({
                    recipientId: opportunity.commonDetails.sales,
                    type: 'document_upload',
                    message: `Client invoice has been uploaded by ${req.user.name} for ${opportunity.opportunityNumber}`,
                    opportunityId: opportunity._id,
                    opportunityNumber: opportunity.opportunityNumber,
                    triggeredBy: req.user._id,
                    triggeredByName: req.user.name,
                    targetTab: 'revenue'
                });
            }
        } catch (err) {
            console.error('Notification error:', err);
        }

        res.json({
            message: 'Invoice uploaded successfully',
            invoiceDocument: opportunity.invoiceDocument,
            progress: opportunity.progressPercentage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-delivery-doc
router.post('/:id/upload-delivery-doc', protect, authorize('Delivery Team', 'Sales Manager'), upload.single('document'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { type } = req.body; // 'attendance', 'feedback', 'assessment', 'performance', 'sme_profile'
        const validTypes = ['attendance', 'feedback', 'assessment', 'performance', 'sme_profile'];

        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid document type' });
        }

        // Initialize deliveryDocuments if null (though schema default is not set, it might be undefined)
        if (!opportunity.deliveryDocuments) {
            opportunity.deliveryDocuments = {};
        }

        opportunity.deliveryDocuments[type] = req.file.path;

        opportunity.activityLog.push({
            action: 'Delivery Doc Uploaded',
            by: req.user._id,
            role: req.user.role,
            details: `${type} document uploaded by ${req.user.name}`
        });

        // Mark as modified to ensure mixed type/nested object is saved
        opportunity.markModified('deliveryDocuments');
        await opportunity.save();

        res.json({
            message: `${type} uploaded successfully`,
            deliveryDocuments: opportunity.deliveryDocuments,
            progress: opportunity.progressPercentage
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/opportunities/:id/upload-expense-doc
// @desc    Upload operational expense proposal document
// @access  Private (Delivery Team, Sales Manager)
router.post('/:id/upload-expense-doc', protect, authorize('Delivery Team', 'Delivery Head', 'Delivery Manager', 'Sales Manager', 'Super Admin'), upload.single('document'), async (req, res) => {
    try {
        const opportunity = await Opportunity.findById(req.params.id);

        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { category } = req.body;
        if (!category) {
            return res.status(400).json({ message: 'Expense category is required' });
        }

        // Initialize expenseDocuments if it doesn't exist
        if (!opportunity.expenseDocuments) {
            opportunity.expenseDocuments = new Map();
        }

        // Logic for Map type in Mongoose:
        // Getting the array (or creating if undefined)
        let currentDocs = opportunity.expenseDocuments.get(category) || [];
        currentDocs.push(req.file.path);
        opportunity.expenseDocuments.set(category, currentDocs);

        // Notify Sales Creator about Proposal Upload in Expenses
        const salesPersonId = opportunity.createdBy;
        if (salesPersonId && req.user.role === 'Delivery Team') {
            const Notification = require('../models/Notification'); // Ensure import
            await Notification.create({
                recipientId: salesPersonId,
                type: 'document_upload',
                message: `Proposal document uploaded for ${category} in ${opportunity.opportunityNumber} by ${req.user.name}`,
                opportunityId: opportunity._id,
                opportunityNumber: opportunity.opportunityNumber,
                triggeredBy: req.user._id,
                triggeredByName: req.user.name
            });
        }

        // Mark as modified since Map changes might not be detected automatically in some cases
        opportunity.markModified('expenseDocuments');

        await opportunity.save();

        res.json({
            message: 'Expense document uploaded successfully',
            filePath: req.file.path,
            expenseDocuments: opportunity.expenseDocuments
        });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

