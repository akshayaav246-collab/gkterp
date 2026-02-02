import React, { useState, useEffect } from 'react';
import { Upload, Eye } from 'lucide-react';
import Card from '../../ui/Card';
import { useCurrency } from '../../../context/CurrencyContext';
import { useAuth } from '../../../context/AuthContext';

const OperationalExpensesBreakdown = ({
    activeData,
    handleChange,
    handleProposalUpload,
    uploading,
    isEditing,
    canEdit,
    opportunity
}) => {
    const { currency } = useCurrency();
    const { user } = useAuth();
    const CONVERSION_RATE = currency === 'USD' ? 84 : 1;
    const CURRENCY_SYMBOL = currency === 'USD' ? '$' : '₹';

    // Helper to access breakdown (with fallback)
    const getBreakdown = () => activeData.expenses?.breakdown || {};

    // Helper accessors for days and pax from opportunity root
    // Handle both direct opportunity access or nested in activeData if structure varies
    const days = opportunity.days || 0;
    const pax = opportunity.participants || 0;

    const [localBreakdown, setLocalBreakdown] = useState({});

    // Sync local state on prop change
    useEffect(() => {
        if (activeData.expenses?.breakdown) {
            setLocalBreakdown(activeData.expenses.breakdown);
        }
    }, [activeData.expenses]);

    const updateBreakdown = (category, field, value) => {
        if (!canEdit) return;
        const currentCat = localBreakdown[category] || {};
        const updatedCategory = { ...currentCat, [field]: value };

        const newBreakdown = { ...localBreakdown, [category]: updatedCategory };
        setLocalBreakdown(newBreakdown);

        // Update parent with new breakdown AND calculated total
        const newTotal = calculateTotal(category, updatedCategory);
        handleChange('expenses', 'breakdown', newBreakdown); // Save breakdown
        if (newTotal !== null) {
            handleChange('expenses', category, newTotal); // Save calculated total
        }
    };

    const calculateTotal = (category, data) => {
        const type = data.type;
        const rate = parseFloat(data.rate) || 0;
        const hours = parseFloat(data.hours) || 0;
        const subPax = parseFloat(data.pax) || pax; // Use local pax if specified, else opportunity pax

        switch (category) {
            case 'trainerCost':
                if (type === 'costPerDay') return rate * days;
                if (type === 'costPerHour') return rate * hours * days;
                if (type === 'totalCost') return rate; // Direct entry
                return 0;
            case 'material':
                if (type === 'costPerPax') return rate * subPax;
                if (type === 'overallCost') return rate;
                return 0;
            case 'labs':
                if (type === 'costPerPaxDay') return rate * subPax * days;
                if (type === 'costPerPaxAllDays') return rate * subPax;
                if (type === 'totalCost') return rate;
                return 0;
            case 'gkRoyalty': // Fixed: Cost / Pax / Day
                return rate * pax * days;
            case 'accommodation': // Fixed: Cost / Day
            case 'perDiem':       // Fixed: Cost / Day
                return rate * days;
            default:
                // For other categories, default to direct rate/amount if logic undefined
                return rate;
        }
    };

    // Helper to render label + input group
    const renderInputGroup = (category, label, typeOptions = null, fixedTypeLabel = null) => {
        const data = localBreakdown[category] || {};
        const selectedType = data.type || (typeOptions ? typeOptions[0].value : '');
        const currentTotal = activeData.expenses?.[category] || 0;

        // Auto-initialize type if missing
        useEffect(() => {
            if (!data.type && typeOptions) {
                updateBreakdown(category, 'type', typeOptions[0].value);
            }
        }, []);

        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-sm">{label}</span>
                    <span className="font-bold text-primary-blue text-sm">
                        {CURRENCY_SYMBOL} {(currentTotal / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>

                {/* Type Selection (Dropdown or Fixed Label) */}
                <div className="mb-2">
                    {typeOptions ? (
                        <select
                            value={selectedType}
                            onChange={(e) => updateBreakdown(category, 'type', e.target.value)}
                            disabled={!canEdit}
                            className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    ) : (
                        <div className="text-xs text-gray-500 italic border-b border-gray-200 pb-1 mb-1">{fixedTypeLabel}</div>
                    )}
                </div>

                {/* Dynamic Inputs grid */}
                {canEdit ? (
                    <div className="grid grid-cols-2 gap-2">
                        {/* Render based on selectedType */}
                        {/* Trainer Logic */}
                        {category === 'trainerCost' && (
                            <>
                                {selectedType === 'costPerDay' && (
                                    <div className="col-span-2"><Input label="Rate / Day" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                                {selectedType === 'costPerHour' && (
                                    <>
                                        <Input label="Hours/Day" value={data.hours} onChange={v => updateBreakdown(category, 'hours', v)} />
                                        <Input label="Rate/Hour" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} />
                                    </>
                                )}
                                {selectedType === 'totalCost' && (
                                    <div className="col-span-2"><Input label="Total Cost" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                            </>
                        )}

                        {/* Material Logic */}
                        {category === 'material' && (
                            <>
                                {selectedType === 'costPerPax' && (
                                    <>
                                        <Input label="Pax" value={data.pax || pax} onChange={v => updateBreakdown(category, 'pax', v)} />
                                        <Input label="Rate / Pax" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} />
                                    </>
                                )}
                                {selectedType === 'overallCost' && (
                                    <div className="col-span-2"><Input label="Total Cost" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                            </>
                        )}

                        {/* Lab Logic */}
                        {category === 'labs' && (
                            <>
                                {(selectedType === 'costPerPaxDay' || selectedType === 'costPerPaxAllDays') && (
                                    <>
                                        <Input label="Pax" value={data.pax || pax} onChange={v => updateBreakdown(category, 'pax', v)} />
                                        <Input label={`Rate / Pax${selectedType === 'costPerPaxDay' ? ' / Day' : ''}`} value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} />
                                    </>
                                )}
                                {selectedType === 'totalCost' && (
                                    <div className="col-span-2"><Input label="Total Cost" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                            </>
                        )}

                        {/* Fixed Logic */}
                        {(category === 'gkRoyalty' || category === 'accommodation' || category === 'perDiem') && (
                            <>
                                {category === 'gkRoyalty' && <div className="col-span-2 text-xs text-gray-400 mb-1">Pax: {pax}, Days: {days}</div>}
                                {(category === 'accommodation' || category === 'perDiem') && <div className="col-span-2 text-xs text-gray-400 mb-1">Days: {days}</div>}
                                <div className="col-span-2"><Input label={category === 'gkRoyalty' ? 'Rate / Pax / Day' : 'Rate / Day'} value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                            </>
                        )}

                        {/* Catch-all for others (Travel, Venue, Vouchers, Local Conveyance) if needed later. 
                            For now, keeping them simple or letting them be 0 as per user request scope, 
                            but standardizing input if user wants to use them.
                        */}
                    </div>
                ) : (
                    // Read Only View for Sales - Compact
                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-1">
                        {/* Type/Variant */}
                        <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-medium text-gray-700">
                                {typeOptions ? typeOptions.find(o => o.value === data.type)?.label || data.type : (fixedTypeLabel ? fixedTypeLabel.replace('Fixed: ', '') : 'Fixed')}
                            </span>
                        </div>
                        {/* Rate */}
                        {data.rate > 0 && (
                            <div className="flex justify-between">
                                <span>Rate:</span>
                                <span className="font-medium text-gray-700">{CURRENCY_SYMBOL} {Number(data.rate).toLocaleString()}</span>
                            </div>
                        )}
                        {/* Optional extra fields if relevant */}
                        {data.hours > 0 && <div className="flex justify-between"><span>Hours:</span><span className="font-medium text-gray-700">{data.hours}</span></div>}
                        {data.pax > 0 && <div className="flex justify-between"><span>Pax:</span><span className="font-medium text-gray-700">{data.pax}</span></div>}
                    </div>
                )}

                {/* Footer: Upload (Delivery) or View (Sales) */}
                <div className="flex justify-end mt-1 pt-1 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                        {opportunity.expenseDocuments?.[category]?.length > 0 && (
                            <a
                                href={`http://localhost:5000/${opportunity.expenseDocuments[category][0].replace(/\\/g, '/')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-primary-blue"
                                title="View Document"
                            >
                                <Eye size={16} />
                            </a>
                        )}
                        {/* IMPORTANT: Only allow upload if canEdit (Delivery) */}
                        {isEditing && canEdit && (
                            <>
                                <input
                                    type="file"
                                    id={`upload-${category}`}
                                    className="hidden"
                                    onChange={(e) => handleProposalUpload(e, category)}
                                    disabled={uploading === category}
                                />
                                <button
                                    onClick={() => document.getElementById(`upload-${category}`).click()}
                                    disabled={uploading === category}
                                    className="transition-colors text-gray-400 hover:text-primary-blue"
                                    title="Upload Document"
                                >
                                    <Upload size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const Input = ({ label, value, onChange }) => {
        // Hide currency symbol if label contains "Pax"
        const isPaxOrHours = label.toLowerCase().includes('pax') || label.toLowerCase().includes('hours');
        const { currency } = useCurrency();
        const CURRENCY_SYMBOL = currency === 'USD' ? '$' : '₹';

        return (
            <div>
                {label && <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">{label}</label>}
                <div className="relative">
                    {!isPaxOrHours && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">{CURRENCY_SYMBOL}</span>}
                    <input
                        type="number"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className={`w-full text-right ${!isPaxOrHours ? 'pl-6' : 'pl-2'} pr-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-semibold focus:outline-none focus:border-blue-400 text-gray-800`}
                        placeholder="0"
                    />
                </div>
            </div>
        );
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold text-primary-blue">Operational Expenses Breakdown</h3>
                <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                    Pax: <span className="text-gray-800 font-bold">{pax}</span> &bull; Days: <span className="text-gray-800 font-bold">{days}</span>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-1">
                <div className={`grid gap-4 ${!canEdit ? 'grid-flow-col grid-rows-5 auto-cols-fr' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {/* 1. Trainer Cost */}
                    {renderInputGroup('trainerCost', 'Trainer Cost', [
                        { value: 'costPerDay', label: 'Cost / Day' },
                        { value: 'costPerHour', label: 'Cost / Hour' },
                        { value: 'totalCost', label: 'Total Training Cost' }
                    ])}

                    {/* 2. Material Cost */}
                    {renderInputGroup('material', 'Material Cost', [
                        { value: 'costPerPax', label: 'Cost / Pax' },
                        { value: 'overallCost', label: 'Overall Cost' }
                    ])}

                    {/* 3. Lab Cost */}
                    {renderInputGroup('labs', 'Lab Cost', [
                        { value: 'costPerPaxDay', label: 'Cost / Pax / Day' },
                        { value: 'costPerPaxAllDays', label: 'Cost / Pax (All Days)' },
                        { value: 'totalCost', label: 'Total Cost' }
                    ])}

                    {/* 4. GK Royalty */}
                    {renderInputGroup('gkRoyalty', 'GK Royalty', null, 'Fixed: Cost / Pax / Day')}

                    {/* 5. Accommodation */}
                    {renderInputGroup('accommodation', 'Accommodation', null, 'Fixed: Cost / Day')}

                    {/* 6. Per Diem */}
                    {renderInputGroup('perDiem', 'Per Diem', null, 'Fixed: Cost / Day')}

                    {/* 7-10. Other Expenses (Venue, Travel, Vouchers, Local Conveyance) */}
                    {['venue', 'travel', 'vouchersCost', 'localConveyance'].map(key => (
                        <div key={key} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                                {/* Display Name: Format camelCase to Title Case (e.g., localConveyance -> Local Conveyance) */}
                                <span className="font-bold text-gray-600 text-sm capitalize">
                                    {key.replace('Cost', '').replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-bold text-gray-800 text-sm">
                                    {CURRENCY_SYMBOL} {((activeData.expenses?.[key] || 0) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>

                            {/* Edit Input */}
                            {canEdit && (
                                <Input label="Amount" value={(localBreakdown[key]?.rate || activeData.expenses?.[key] || 0) / (key === 'rate' ? 1 : CONVERSION_RATE)} onChange={v => {
                                    handleChange('expenses', key, v * CONVERSION_RATE);
                                    updateBreakdown(key, 'rate', v);
                                    updateBreakdown(key, 'type', 'manual');
                                }} />
                            )}

                            {/* Read Only View Details */}
                            {!canEdit && (
                                <div className="text-xs text-gray-600 space-y-1 mt-1">
                                    <div className="flex justify-between">
                                        <span className="capitalize">Amount:</span>
                                        <span className="font-medium">{CURRENCY_SYMBOL} {((activeData.expenses?.[key] || 0) / CONVERSION_RATE).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Document Upload / View */}
                            <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                                <div className="flex items-center space-x-2">
                                    {opportunity.expenseDocuments?.[key]?.length > 0 && (
                                        <a
                                            href={`http://localhost:5000/${opportunity.expenseDocuments[key][0].replace(/\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-primary-blue"
                                            title="View Document"
                                        >
                                            <Eye size={16} />
                                        </a>
                                    )}
                                    {isEditing && (
                                        <>
                                            <input
                                                type="file"
                                                id={`upload-${key}`}
                                                className="hidden"
                                                onChange={(e) => handleProposalUpload(e, key)}
                                                disabled={uploading === key}
                                            />
                                            <button
                                                onClick={() => document.getElementById(`upload-${key}`).click()}
                                                disabled={uploading === key}
                                                className={`transition-colors ${activeData.expenses?.[key] ? 'text-gray-400 hover:text-primary-blue' : 'text-gray-300 cursor-not-allowed'}`}
                                            >
                                                <Upload size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm font-bold text-gray-700">Total Expenses</span>
                <span className="text-xl font-bold text-primary-blue">
                    {CURRENCY_SYMBOL} {((Object.keys(activeData.expenses || {}).reduce((sum, key) => {
                        if (key === 'breakdown' || key === 'marketingPercent' || key === 'contingencyPercent' || key === 'targetGpPercent') return sum;
                        return sum + (parseFloat(activeData.expenses[key]) || 0);
                    }, 0)) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
            </div>
        </Card>
    );
};

export default OperationalExpensesBreakdown;
