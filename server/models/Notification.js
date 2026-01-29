const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['expense_edit', 'opportunity_created', 'opportunity_update', 'document_upload', 'general', 'approval_request', 'approval_granted', 'approval_rejected', 'target_achieved', 'target_exceeded'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    opportunityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opportunity'
    },
    opportunityNumber: {
        type: String
    },
    documentType: {
        type: String,
        enum: ['Proposal', 'PO', 'Invoice', 'Other']
    },
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    triggeredByName: {
        type: String
    },
    relatedData: {
        target: Number,
        achieved: Number,
        period: String,
        year: Number
    },
    changes: {
        type: mongoose.Schema.Types.Mixed, // Can be array or object describing field changes
        default: null
    },
    targetTab: {
        type: String, // 'requirements', 'expenses', 'revenue', etc.
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Notification', NotificationSchema);
