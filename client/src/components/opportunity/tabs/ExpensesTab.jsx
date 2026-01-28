import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { Upload, Paperclip, Trash2, DollarSign, TrendingUp, Clock, FileText, Eye, Send, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../ui/Card';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

const ExpensesTab = forwardRef(({ opportunity, canEdit, isEditing, refreshData, currency = 'INR' }, ref) => {
    const { addToast } = useToast();
    const { user } = useAuth();
    const [uploading, setUploading] = useState(null);
    const [escalating, setEscalating] = useState(false);
    const [formData, setFormData] = useState({});

    // Currency Constants
    const CONVERSION_RATE = currency === 'USD' ? 84 : 1;
    const CURRENCY_SYMBOL = currency === 'USD' ? '$' : '₹';

    // Helper to Recalculate Totals based on current state
    const recalculateTotals = (data) => {
        const exp = data.expenses || {};
        const common = data.commonDetails || {};

        // Helper to parse currency strings (remove commas)
        const parseCurrency = (val) => {
            if (!val) return 0;
            const strVal = String(val).replace(/,/g, '');
            return parseFloat(strVal) || 0;
        };

        // 1. Calculate OpEx (Sum of manual fields)
        const expenseTypesList = [
            'trainerCost', 'vouchersCost', 'gkRoyalty', 'material', 'labs',
            'venue', 'travel', 'accommodation', 'perDiem', 'localConveyance'
        ];
        const opEx = expenseTypesList.reduce((sum, key) => sum + parseCurrency(exp[key]), 0);

        // 2. Contingency Amount (OpEx * %)
        const contingencyPercent = exp.contingencyPercent ?? 20;
        const contingencyAmount = (opEx * contingencyPercent) / 100;
        exp.contingency = contingencyAmount;

        // 3. Total Expenses (OpEx + Contingency)
        const totalExpenses = opEx + contingencyAmount;

        // 4. GKT Profit (Markup on Total Expenses)
        const gpPercent = exp.targetGpPercent ?? 30; // Use targetGpPercent
        const gktProfit = (totalExpenses * gpPercent) / 100;

        // 5. Base Order Value
        const baseTov = totalExpenses + gktProfit;

        // 6. Marketing Amount (Base TOV * %)
        const marketingPercent = exp.marketingPercent ?? 0;
        const marketingAmount = (baseTov * marketingPercent) / 100;
        exp.marketing = marketingAmount;

        // 7. Final Proposal Value (TOV)
        const finalTov = baseTov + marketingAmount;

        // Update TOV in Common Details
        common.tov = Math.round(finalTov);

        // Update TOV Rate based on Unit
        const days = data.days || common.trainingDays || 1;
        const participants = data.participants || common.totalParticipants || 1;

        if (common.tovUnit === 'Per Day' && days > 0) {
            common.tovRate = (finalTov / days).toFixed(2);
        } else if (common.tovUnit === 'Per Participant' && participants > 0) {
            common.tovRate = (finalTov / participants).toFixed(2);
        } else {
            common.tovRate = Math.round(finalTov);
        }

        return { ...data, expenses: exp, commonDetails: common };
    };

    // Handle Escalation (Push to Manager)
    const handleEscalate = async () => {
        // Confirmation alert removed as per user request

        setEscalating(true);
        try {
            const token = localStorage.getItem('token');
            // Calculate current values
            // Use activeData equivalent logic but since we are inside function we need access to it.
            // We can recalculate or use formData/opportunity. 
            // Better to recalculate safely.
            const data = isEditing ? formData : opportunity;
            const expenseTypes = [
                { key: 'trainerCost' }, { key: 'vouchersCost' }, { key: 'marketing' }, { key: 'contingency' },
                { key: 'gkRoyalty' }, { key: 'material' }, { key: 'labs' }, { key: 'venue' },
                { key: 'travel' }, { key: 'accommodation' }, { key: 'perDiem' }, { key: 'localConveyance' }
            ];

            const currentTov = data.commonDetails?.tov || 0;
            const currentTotalExpenses = expenseTypes.reduce((sum, type) => sum + (Number(data.expenses?.[type.key]) || 0), 0);
            const currentGpPercent = currentTov > 0 ? ((currentTov - currentTotalExpenses) / currentTov) * 100 : 0;

            await axios.post(
                `http://localhost:5000/api/approvals/escalate`,
                {
                    opportunityId: opportunity._id,
                    gpPercent: currentGpPercent,
                    tov: currentTov,
                    totalExpense: currentTotalExpenses
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            addToast('Approval request sent to Manager!', 'success');
            await refreshData(); // Force immediate refresh to show updated status
        } catch (error) {
            console.error('Escalation failed', error);
            addToast(error.response?.data?.message || 'Failed to send approval request', 'error');
        } finally {
            setEscalating(false);
        }
    };



    // Permissions Logic
    const isSales = user?.role === 'Sales Executive' || user?.role === 'Sales Manager';
    const isDelivery = ['Delivery Team', 'Delivery Head', 'Delivery Manager'].includes(user?.role);
    const isAdmin = ['Super Admin', 'Director'].includes(user?.role);

    // Execution Details (TOV, Marketing, Contingency): Editable by Sales, Delivery, Admin
    const canEditExecution = isEditing && (isSales || isDelivery || isAdmin);

    // Operational Expenses Breakdown: Editable by Delivery, Admin (NOT Sales)
    const canEditOpExpenses = isEditing && (isDelivery || isAdmin);

    // Initialize formData
    useEffect(() => {
        if (opportunity) {
            const initialData = JSON.parse(JSON.stringify(opportunity));
            const exp = initialData.expenses || {};

            // DEFAULT VALUES Logic
            // If marketingPercent is undefined/null, default to 0
            if (exp.marketingPercent === undefined || exp.marketingPercent === null) {
                exp.marketingPercent = 0;
            }
            // If contingencyPercent is undefined/null, default to 20
            if (exp.contingencyPercent === undefined || exp.contingencyPercent === null) {
                exp.contingencyPercent = 20;
            }

            // Auto-calculate Marketing & Contingency if values are missing
            const tov = initialData.commonDetails?.tov || 0;

            if ((!exp.marketing || exp.marketing === 0) && exp.marketingPercent >= 0) {
                exp.marketing = (tov * exp.marketingPercent) / 100;
            }

            if ((!exp.contingency || exp.contingency === 0) && exp.contingencyPercent >= 0) {
                exp.contingency = (tov * exp.contingencyPercent) / 100;
            }

            // Ensure commonDetails is initialized for TOV editing
            if (!initialData.commonDetails) initialData.commonDetails = {};

            initialData.expenses = exp;

            // Perform Initial Calculation
            const calculatedData = recalculateTotals(initialData);
            setFormData(calculatedData);
        }
    }, [opportunity]);

    // Expose handleSave and handleCancel to parent
    useImperativeHandle(ref, () => ({
        handleSave: async () => {
            try {
                const token = localStorage.getItem('token');

                // Sanitize commonDetails (only need specific fields but sending whole obj is fine if carefully handled)
                // We specifically care about tov, tovRate, tovUnit here.
                const sanitizedCommonDetails = { ...formData.commonDetails };

                // Payload includes expenses and commonDetails (for TOV)
                const payload = {
                    expenses: formData.expenses,
                    commonDetails: sanitizedCommonDetails
                };

                await axios.put(
                    `http://localhost:5000/api/opportunities/${opportunity._id}`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                addToast('Financial details saved successfully', 'success');
                refreshData();
                return true;
            } catch (error) {
                console.error('Save failed', error);
                addToast('Failed to save details', 'error');
                return false;
            }
        },
        handleCancel: () => {
            setFormData(JSON.parse(JSON.stringify(opportunity)));
        }
    }));




    const handleChange = (section, field, value) => {
        setFormData(prev => {
            const newState = { ...prev };
            if (!newState[section]) newState[section] = {};
            newState[section][field] = value;

            // Trigger Recalculation if modifying calculation inputs
            const calcFields = ['marketingPercent', 'contingencyPercent', 'targetGpPercent',
                'trainerCost', 'vouchersCost', 'gkRoyalty', 'material', 'labs',
                'venue', 'travel', 'accommodation', 'perDiem', 'localConveyance',
                'tovUnit']; // Also re-calc rate if unit changes

            // Or if modifying days/participants (which are root or commonDetails?)
            // We can just always recalculate to be safe and simple.

            return recalculateTotals(newState);
        });
    };

    // Generic upload handler that associates a document with a specific expense category
    const handleProposalUpload = async (e, expenseKey) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(expenseKey);
        try {
            const token = localStorage.getItem('token');
            const uploadFormData = new FormData();

            // Use 'document' as field name matching backend
            uploadFormData.append('document', file);
            uploadFormData.append('category', expenseKey);

            await axios.post(
                `http://localhost:5000/api/opportunities/${opportunity._id}/upload-expense-doc`,
                uploadFormData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            );

            addToast('Document uploaded successfully', 'success');
            refreshData();
        } catch (error) {
            console.error('Upload failed', error);
            addToast('Failed to upload proposal', 'error');
        } finally {
            setUploading(null);
        }
    };

    const expenseTypes = [
        { key: 'trainerCost', label: 'Trainer Cost' },
        { key: 'vouchersCost', label: 'Vouchers Cost' },
        { key: 'gkRoyalty', label: 'GK Royalty' },
        { key: 'material', label: 'Material' },
        { key: 'labs', label: 'Labs' },
        { key: 'venue', label: 'Venue' },
        { key: 'travel', label: 'Travel' },
        { key: 'accommodation', label: 'Accommodation' },
        { key: 'perDiem', label: 'Per Diem' },
        { key: 'localConveyance', label: 'Local Conveyance' },
        // Marketing and Contingency removed from breakdown as requested
    ];

    // Use formData for calculations if editing, else opportunity
    const activeData = isEditing ? formData : opportunity;

    // --- FINANCE-BASED CALCULATIONS (Read-Only from Finance Module) ---
    // TOV: From Finance Client Receivables
    const financeDetails = opportunity.financeDetails || {};
    const clientReceivables = financeDetails.clientReceivables || {};
    const vendorPayables = financeDetails.vendorPayables || {};

    // TOV = Client Invoice Amount (from Finance)
    const tov = clientReceivables.invoiceAmount || 0;
    const tovUnit = activeData.commonDetails?.tovUnit || 'Fixed';

    // Total Expenses: Sum of Vendor Payables (from Finance)
    let totalExpenses = 0;

    // Sum Detailed Categories (Invoice Value Excl Tax)
    if (vendorPayables.detailed) {
        Object.values(vendorPayables.detailed).forEach(cat => {
            totalExpenses += (parseFloat(cat.invoiceValue) || 0);
        });
    }

    // Sum Simple Categories
    totalExpenses += (parseFloat(vendorPayables.perDiem?.amount) || 0);
    totalExpenses += (parseFloat(vendorPayables.other?.amount) || 0);

    // GKT Revenue and GP (from Finance calculations)
    const gktRevenue = tov - totalExpenses;
    const gpPercentage = tov > 0 ? ((gktRevenue / tov) * 100).toFixed(1) : 0;

    // Marketing and Contingency percentages (still from expenses for display)
    const marketingPercent = activeData.expenses?.marketingPercent || 0;
    const contingencyPercent = activeData.expenses?.contingencyPercent || 20;

    // User requested "Cost per day/Cost per participant"
    const totalDays = activeData.days || activeData.commonDetails?.trainingDays || 0; // Fallback attempts
    const totalParticipants = activeData.participants || activeData.commonDetails?.totalParticipants || 0;

    const proposalValue = activeData.commonDetails?.tov || 0;
    const costPerDay = totalDays > 0 ? (proposalValue / totalDays).toFixed(2) : 0;
    const costPerParticipant = totalParticipants > 0 ? (proposalValue / totalParticipants).toFixed(2) : 0;

    // --- LOCAL EXPENSE VALUES (For Expense Breakdown Table Editing) ---
    // Calculate sum of visible operational expenses for table footer
    const opExTotal = expenseTypes.reduce((sum, item) => sum + (parseFloat(activeData.expenses?.[item.key]) || 0), 0);

    // Create expense values object (activeData.expenses is flat)
    const expenseValues = { ...activeData.expenses };

    const inputClass = `w-full text-right bg-transparent border-none focus:ring-0 p-0 text-sm ${!isEditing ? 'cursor-not-allowed text-gray-500' : 'text-gray-900 font-medium'}`;

    return (
        <div className="space-y-6">
            {/* Grid Layout: Execution Details (Left) | Operational Expenses (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Execution Details */}
                <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-primary-blue">Execution Details</h3>
                        </div>

                        {/* TOV Display Section (Automated) - Moved to Top */}
                        <div className="bg-green-50 p-6 rounded-xl border border-green-200 mb-6">
                            <div className="space-y-3">
                                {/* Big Calculated Value */}
                                <div className="text-center">
                                    <label className="block text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Proposal Value</label>
                                    <div className="text-4xl font-extrabold text-green-700">
                                        {CURRENCY_SYMBOL} {((formData.commonDetails?.tov || 0) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                {/* Breakdown */}
                                <div className="space-y-2 pt-3 border-t border-green-200">
                                    <div className="flex justify-between text-base text-green-700 font-medium">
                                        <span>Cost / Day:</span>
                                        <span>{CURRENCY_SYMBOL} {costPerDay ? (Number(costPerDay) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</span>
                                    </div>
                                    <div className="flex justify-between text-base text-green-700 font-medium">
                                        <span>Cost / Pax:</span>
                                        <span>{CURRENCY_SYMBOL} {costPerParticipant ? (Number(costPerParticipant) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 flex-grow">
                            {/* Calculation Controls */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* GP Margin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GP Margin (%)</label>
                                    <select
                                        value={formData.expenses?.targetGpPercent ?? 30}
                                        onChange={(e) => handleChange('expenses', 'targetGpPercent', parseFloat(e.target.value))}
                                        disabled={!canEditExecution}
                                        className={`w-full border p-2 rounded-lg text-sm ${!canEditExecution ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-brand-blue'}`}
                                    >
                                        {Array.from({ length: 16 }, (_, i) => 15 + i).map(p => (
                                            <option key={p} value={p}>{p}%</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Contingency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contingency (%)</label>
                                    <select
                                        value={formData.expenses?.contingencyPercent ?? 20}
                                        onChange={(e) => handleChange('expenses', 'contingencyPercent', parseFloat(e.target.value))}
                                        disabled={!canEditExecution}
                                        className={`w-full border p-2 rounded-lg text-sm ${!canEditExecution ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-primary-blue'}`}
                                    >
                                        {Array.from({ length: 11 }, (_, i) => 10 + i).map(p => (
                                            <option key={p} value={p}>{p}%</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Marketing */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Marketing (%)</label>
                                    <select
                                        value={formData.expenses?.marketingPercent ?? 0}
                                        onChange={(e) => handleChange('expenses', 'marketingPercent', parseFloat(e.target.value))}
                                        disabled={!canEditExecution}
                                        className={`w-full border p-2 rounded-lg text-sm ${!canEditExecution ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 focus:ring-2 focus:ring-primary-blue'}`}
                                    >
                                        {[0, 1, 2, 3, 4, 5].map(p => (
                                            <option key={p} value={p}>{p}%</option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                        </div>
                    </Card>
                </div>

                {/* Right: Operational Expenses Breakdown Table */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-primary-blue">Operational Expenses Breakdown</h3>
                        </div>

                        <div className="flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                {expenseTypes.map(({ key, label, isCalculated }) => (
                                    <div key={key} className="flex justify-between items-center group">
                                        <span className="text-sm font-medium text-gray-900 w-1/3">{label}</span>

                                        <div className="flex items-center justify-end space-x-4 w-2/3">
                                            {/* Amount Input/Display */}
                                            <div className="relative w-32">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-900 font-bold text-sm">{CURRENCY_SYMBOL}</span>
                                                <input
                                                    type="number"
                                                    value={((expenseValues[key] || 0) / CONVERSION_RATE).toFixed(0)}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        if (!isNaN(val)) {
                                                            handleChange('expenses', key, val * CONVERSION_RATE);
                                                        } else if (e.target.value === '') {
                                                            handleChange('expenses', key, 0);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === '.' || e.key === ',') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    disabled={!canEditOpExpenses || isCalculated}
                                                    className={`w-full text-right bg-transparent border-none focus:ring-0 p-0 text-gray-900 font-bold text-sm ${!canEditOpExpenses ? 'cursor-not-allowed' : ''}`}
                                                    placeholder="0"
                                                />
                                            </div>

                                            {/* Actions */}
                                            {/* Actions */}
                                            <div className="flex items-center justify-end space-x-3">
                                                {/* View Action - Eye Icon */}
                                                {opportunity.expenseDocuments?.[key]?.length > 0 ? (
                                                    <a
                                                        href={`http://localhost:5000/${opportunity.expenseDocuments[key][0].replace(/\\/g, '/')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-blue hover:text-blue-800 transition-colors"
                                                        title="View Document"
                                                    >
                                                        <div className="p-2 hover:bg-blue-50 rounded-full">
                                                            <Eye size={20} />
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <div className="p-2" title="No Document">
                                                        <Eye size={20} className="text-gray-300 cursor-default" />
                                                    </div>
                                                )}

                                                {/* Upload Action - Only for Delivery/Admin */}
                                                {canEditOpExpenses && (
                                                    <div className="relative inline-block">
                                                        <input
                                                            type="file"
                                                            id={`upload-${key}`}
                                                            className="hidden"
                                                            onChange={(e) => handleProposalUpload(e, key)}
                                                            disabled={!canEditOpExpenses || uploading === key}
                                                        />
                                                        <label
                                                            htmlFor={`upload-${key}`}
                                                            className={`cursor-pointer transition-colors p-2 rounded-full hover:bg-gray-100 inline-flex items-center justify-center ${uploading === key ? 'text-gray-400' : 'text-gray-500 hover:text-blue-600'}`}
                                                            title="Attach Proposal"
                                                        >
                                                            {uploading === key ? (
                                                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                                                            ) : (
                                                                <Paperclip size={18} />
                                                            )}
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Footer */}
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                            <h4 className="text-lg font-bold text-gray-900">Total Expenses</h4>
                            <div className="text-xl font-bold text-gray-900">
                                {CURRENCY_SYMBOL} {(opExTotal / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
});

export default ExpensesTab;
