const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const DeliveryExecution = require('../models/DeliveryExecution');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/approvals
// @desc    Get approvals based on user role
// @access  Private (Director, Sales Manager)
router.get('/', protect, authorize('Director', 'Sales Manager'), async (req, res) => {
    try {
        let filter = { status: 'Pending' };

        if (req.user.role === 'Director') {
            // Director sees only GP < 10% approvals
            filter.approvalLevel = 'Director';
        } else if (req.user.role === 'Sales Manager') {
            // Manager sees only GP 10-15% approvals assigned to them
            filter.approvalLevel = 'Manager';
            filter.assignedTo = req.user._id;
        }

        const approvals = await Approval.find(filter)
            .populate('opportunity', 'opportunityNumber type client participants days')
            .populate({
                path: 'opportunity',
                populate: { path: 'client', select: 'companyName' }
            })
            .populate('deliveryExecution')
            .populate('requestedBy', 'name email')
            .sort({ requestedAt: -1 });

        res.json(approvals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/approvals/:id/approve
// @desc    Approve a pending approval
// @access  Private (Director, Sales Manager)
router.post('/:id/approve', protect, authorize('Director', 'Sales Manager'), async (req, res) => {
    try {
        const approval = await Approval.findById(req.params.id);

        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        if (approval.status !== 'Pending') {
            return res.status(400).json({ message: 'Approval already processed' });
        }

        // Verify user has permission to approve this level
        if (approval.approvalLevel === 'Director' && req.user.role !== 'Director') {
            return res.status(403).json({ message: 'Only Director can approve GP < 10%' });
        }

        if (approval.approvalLevel === 'Manager' && req.user.role !== 'Sales Manager') {
            return res.status(403).json({ message: 'Only Sales Manager can approve GP 10-15%' });
        }

        // Update approval
        approval.status = 'Approved';
        approval.approvedBy = req.user._id;
        approval.approvedAt = new Date();
        await approval.save();

        // Update Opportunity Status
        const opportunity = await Opportunity.findById(approval.opportunity);
        if (opportunity) {
            opportunity.approvalStatus = 'Approved';
            opportunity.approvedBy = req.user._id;
            opportunity.approvedAt = new Date();
            await opportunity.save();
        }

        // Update DeliveryExecution status (if exists)
        if (approval.deliveryExecution) {
            const execution = await DeliveryExecution.findById(approval.deliveryExecution);
            if (execution) {
                execution.status = 'Approved';
                execution.approvedBy = req.user._id;
                execution.approvedAt = new Date();
                await execution.save();
            }
        }

        // Notification for Requester
        const Notification = require('../models/Notification');
        await Notification.create({
            recipientId: approval.requestedBy,
            triggeredBy: req.user._id,
            triggeredByName: req.user.name,
            type: 'approval_granted',
            message: `Approval Granted: Opportunity ${approval.snapshot?.gktRevenue ? 'GP ' + approval.gpPercent.toFixed(1) + '%' : ''} approved by ${req.user.name}`,
            opportunityId: approval.opportunity,
            opportunityNumber: opportunity ? opportunity.opportunityNumber : 'Unknown',
            isRead: false,
            createdAt: Date.now()
        });

        res.json({ message: 'Approval granted', approval });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/approvals/:id/reject
// @desc    Reject a pending approval
// @access  Private (Director, Sales Manager)
router.post('/:id/reject', protect, authorize('Director', 'Sales Manager'), async (req, res) => {
    try {
        const { reason } = req.body;
        const approval = await Approval.findById(req.params.id);

        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        if (approval.status !== 'Pending') {
            return res.status(400).json({ message: 'Approval already processed' });
        }

        // Update approval
        approval.status = 'Rejected';
        approval.rejectedBy = req.user._id;
        approval.rejectedAt = new Date();
        approval.rejectionReason = reason || 'No reason provided';
        await approval.save();

        // Update Opportunity Status
        const opportunity = await Opportunity.findById(approval.opportunity);
        if (opportunity) {
            opportunity.approvalStatus = 'Rejected';
            opportunity.rejectedBy = req.user._id;
            opportunity.rejectedAt = new Date();
            opportunity.rejectionReason = reason || 'No reason provided';
            await opportunity.save();
        }

        // Update DeliveryExecution status
        if (approval.deliveryExecution) {
            const execution = await DeliveryExecution.findById(approval.deliveryExecution);
            if (execution) {
                execution.status = 'Rejected';
                await execution.save();
            }
        }

        // Notification for Requester
        const Notification = require('../models/Notification');
        await Notification.create({
            recipientId: approval.requestedBy,
            triggeredBy: req.user._id,
            triggeredByName: req.user.name,
            type: 'approval_rejected',
            message: `Approval Rejected: ${reason || 'No reason provided'}`,
            opportunityId: approval.opportunity,
            opportunityNumber: opportunity ? opportunity.opportunityNumber : 'Unknown',
            isRead: false,
            createdAt: Date.now()
        });

        res.json({ message: 'Approval rejected', approval });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/approvals/request
// @desc    Create approval request (called by Delivery team when saving with GP < 15%)
// @access  Private (Delivery Team)
router.post('/request', protect, authorize('Delivery Team'), async (req, res) => {
    try {
        const { deliveryExecutionId, opportunityId, gpPercent, totalExpense, gktRevenue, grossProfit } = req.body;

        // Determine approval level based on GP
        let approvalLevel;
        let assignedTo = null;

        if (gpPercent < 10) {
            approvalLevel = 'Director';
            // Find the Director
            const director = await User.findOne({ role: 'Director' });
            assignedTo = director?._id;
        } else if (gpPercent >= 10 && gpPercent < 15) {
            approvalLevel = 'Manager';
            // Find the Sales Manager who created the opportunity
            const opportunity = await Opportunity.findById(opportunityId).populate('createdBy');
            if (opportunity && opportunity.createdBy) {
                // If created by Executive, find their manager
                if (opportunity.createdBy.role === 'Sales Executive') {
                    const manager = await User.findById(opportunity.createdBy.reportingManager);
                    assignedTo = manager?._id;
                } else if (opportunity.createdBy.role === 'Sales Manager') {
                    assignedTo = opportunity.createdBy._id;
                }
            }
        } else {
            return res.status(400).json({ message: 'No approval required for GP >= 15%' });
        }

        // Create approval request
        const approval = new Approval({
            deliveryExecution: deliveryExecutionId,
            opportunity: opportunityId,
            gpPercent,
            approvalLevel,
            assignedTo,
            requestedBy: req.user._id,
            snapshot: {
                totalExpense,
                gktRevenue,
                grossProfit
            }
        });

        await approval.save();

        res.status(201).json({ message: 'Approval request created', approval });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/approvals/escalate
// @desc    Escalate opportunity with low GP to Manager (called by Sales Executive)
// @access  Private (Sales Executive)
router.post('/escalate', protect, authorize('Sales Executive'), async (req, res) => {
    try {
        const { opportunityId, gpPercent, tov, totalExpense } = req.body;

        // Verify opportunity ownership
        const opportunity = await Opportunity.findById(opportunityId);
        if (!opportunity) {
            return res.status(404).json({ message: 'Opportunity not found' });
        }
        if (opportunity.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Identify Approval Level & Assignee
        let approvalLevel = 'Manager';
        let assignedTo = null;
        let nextStatus = 'Pending Manager';

        if (gpPercent < 10) {
            approvalLevel = 'Director';
            nextStatus = 'Pending Director';
            const director = await User.findOne({ role: 'Director' });
            assignedTo = director?._id;
        } else {
            // Manager Approval (10-15%)
            const user = await User.findById(req.user._id);
            if (!user.reportingManager) {
                return res.status(400).json({ message: 'No reporting manager assigned' });
            }
            assignedTo = user.reportingManager;
        }

        // Create approval request
        const approval = new Approval({
            opportunity: opportunityId,
            gpPercent,
            approvalLevel,
            assignedTo,
            requestedBy: req.user._id,
            snapshot: {
                totalExpense,
                tov, // Added for display
                gktRevenue: tov - totalExpense, // Corrected: GKT Revenue is TOV - Expenses
                grossProfit: tov - totalExpense
            }
        });

        await approval.save();

        // Force Update Opportunity Status to match the Escalation
        opportunity.approvalStatus = nextStatus;
        opportunity.approvalRequired = true;
        await opportunity.save();

        // Dynamic import if not global
        const Notification = require('../models/Notification');

        // Create Notification for Approver (Manager or Director)
        await Notification.create({
            recipientId: assignedTo,
            triggeredBy: req.user._id,
            triggeredByName: req.user.name,
            type: 'approval_request',
            message: `Approval Request: Opportunity ${opportunity.opportunityNumber} by ${req.user.name} (GP: ${gpPercent.toFixed(1)}%)`,
            opportunityId: opportunity._id,
            opportunityNumber: opportunity.opportunityNumber,
            isRead: false,
            createdAt: Date.now()
        });

        res.status(201).json({ message: `Escalation sent to ${approvalLevel}`, approval });
    } catch (error) {
        console.error('Escalation error:', error);
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/approvals/:id/read
// @desc    Mark approval as read
// @access  Private (Director, Sales Manager)
router.put('/:id/read', protect, authorize('Director', 'Sales Manager'), async (req, res) => {
    try {
        const approval = await Approval.findById(req.params.id);
        if (!approval) {
            return res.status(404).json({ message: 'Approval not found' });
        }

        // Authorization: Only assigned approver can mark as read
        if (approval.assignedTo && approval.assignedTo.toString() !== req.user._id.toString()) {
            // Managers might view team approvals, but "Mark as read" implies handling it. 
            // Let's strictly allow only assigned user or Director (if level is Director).
            if (req.user.role === 'Director' && approval.approvalLevel !== 'Director') {
                // Director viewing manager's approval? Maybe. For now stick to strict assignment.
            }
            // For simplicity, if you can see it (via GET), you can mark it read? 
            // Let's stick to: if it's assigned to you.
            if (approval.approvalLevel === 'Director' && req.user.role !== 'Director') return res.status(403).json({ message: 'Not authorized' });
            if (approval.approvalLevel === 'Manager' && approval.assignedTo.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
        }

        approval.isRead = true;
        await approval.save();
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
