const mongoose = require('mongoose');

const DeliveryExecutionSchema = new mongoose.Schema({
    opportunity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Opportunity',
        required: true,
        unique: true
    },

    // ===== DELIVERY PHASE FIELDS =====

    // Training Details
    trainingMonth: { type: String }, // e.g., "January"
    trainingYear: { type: Number }, // e.g., 2026

    // Course Details
    courseDetails: {
        courseName: { type: String },
        courseCode: { type: String },
        duration: { type: Number }, // in days
        level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] }
    },

    // Trainer Details
    trainerDetails: {
        name: { type: String },
        email: { type: String },
        contactNumber: { type: String },
        expertise: { type: String }
    },

    // Billing Details
    billingClient: { type: String }, // Company being billed
    endClient: { type: String }, // Actual end user/beneficiary

    // PO and Invoice Details
    poNumber: { type: String },
    poDate: { type: Date },
    poAmount: { type: Number },
    poDocument: { type: String }, // File path

    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
    invoiceAmount: { type: Number },
    invoiceDocument: { type: String }, // File path

    // ===== EXPENSE TRACKING (CHECKPOINT 5) =====

    expenses: {
        // Trainer cost
        trainerCost: { type: Number, default: 0 },

        // GK Royalty (was just "royalty")
        gkRoyalty: { type: Number, default: 0 },

        // Material
        material: { type: Number, default: 0 },

        // Labs
        labs: { type: Number, default: 0 },

        // Venue
        venue: { type: Number, default: 0 },

        // Travel
        travel: { type: Number, default: 0 },

        // Accommodation
        accommodation: { type: Number, default: 0 },

        // Per diem
        perDiem: { type: Number, default: 0 },

        // Local conveyance
        localConveyance: { type: Number, default: 0 },

        // Marketing (%) - stored as percentage, applied to revenue
        marketingPercent: { type: Number, default: 0 },

        // Contingency (%) - stored as percentage, applied to total expense
        contingencyPercent: { type: Number, default: 0 }
    },

    // ===== AUTO-CALCULATED FIELDS =====

    totalExpense: { type: Number, default: 0 },
    costPerDay: { type: Number, default: 0 },

    // Revenue fields
    gktRevenue: { type: Number, default: 0 }, // Client amount
    gktRevenuePerDay: { type: Number, default: 0 },

    // GP calculation
    grossProfit: { type: Number, default: 0 },
    grossProfitPercent: { type: Number, default: 0 },

    // ===== LEGACY FIELDS (for backward compatibility) =====
    // vendors array removed

    otherExpenses: [{
        title: { type: String },
        amount: { type: Number, default: 0 }
    }],

    // ===== STATUS & WORKFLOW =====

    status: {
        type: String,
        enum: ['Draft', 'In Progress', 'Pending Approval', 'Approved', 'Signed Off', 'Invoiced'],
        default: 'Draft'
    },

    approvalRequired: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    signedOffBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedOffAt: { type: Date },

    // Locking mechanism
    isLocked: { type: Boolean, default: false }, // Lock after sign-off

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to calculate totals
DeliveryExecutionSchema.pre('save', function (next) {
    // Calculate base expense from detailed categories (excluding percentages)
    const exp = this.expenses;
    let baseExpense =
        exp.trainerCost + exp.gkRoyalty + exp.material + exp.labs +
        exp.venue + exp.travel + exp.accommodation + exp.perDiem +
        exp.localConveyance;

    // Add legacy vendor and other expenses to base

    if (this.otherExpenses && this.otherExpenses.length > 0) {
        baseExpense += this.otherExpenses.reduce((sum, e) => sum + e.amount, 0);
    }

    // Calculate Marketing amount from percentage of revenue
    const marketingAmount = (this.gktRevenue * exp.marketingPercent) / 100;

    // Calculate Contingency amount from percentage of base expense
    const contingencyAmount = (baseExpense * exp.contingencyPercent) / 100;

    // Total expense = base + marketing + contingency
    this.totalExpense = baseExpense + marketingAmount + contingencyAmount;

    // Calculate cost per day
    const days = this.courseDetails?.duration || 1;
    this.costPerDay = this.totalExpense / days;

    // Calculate revenue per day
    if (this.gktRevenue > 0) {
        this.gktRevenuePerDay = this.gktRevenue / days;
    }

    // Calculate GP
    this.grossProfit = this.gktRevenue - this.totalExpense;
    if (this.gktRevenue > 0) {
        this.grossProfitPercent = (this.grossProfit / this.gktRevenue) * 100;
    }

    // Determine if approval is required (GP < 15%)
    this.approvalRequired = this.grossProfitPercent < 15;

    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('DeliveryExecution', DeliveryExecutionSchema);
