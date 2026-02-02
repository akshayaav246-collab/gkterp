import React, { useState, useEffect, useRef } from 'react';
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
    const initializedTypes = useRef(new Set());

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

        const typeLabel = typeOptions
            ? (typeOptions.find(o => o.value === data.type)?.label || data.type)
            : (fixedTypeLabel ? fixedTypeLabel.replace('Fixed: ', '') : 'Fixed');

        // Initialize type if missing (only once per category)
        if (!data.type && typeOptions && canEdit && !initializedTypes.current.has(category)) {
            initializedTypes.current.add(category);
            setTimeout(() => {
                updateBreakdown(category, 'type', typeOptions[0].value);
            }, 0);
        }

        return (
            <div className={`bg-gray-50 border border-gray-200 rounded-lg ${!canEdit ? 'p-2' : 'p-3'} mb-4 last:mb-0`}>
                <div className={`flex justify-between items-center ${!canEdit ? 'mb-1' : 'mb-2'}`}>
                    <span className={`font-bold text-gray-800 ${!canEdit ? 'text-xs' : 'text-sm'}`}>{label}</span>
                    <span className={`font-bold text-primary-blue ${!canEdit ? 'text-xs' : 'text-sm'}`}>
                        {CURRENCY_SYMBOL} {(currentTotal / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                </div>

                {/* Type Selection (Dropdown or Fixed Label) - Only for Edit Mode */}
                {canEdit && (
                    <div className="mb-2">
                        {typeOptions ? (
                            <select
                                value={selectedType}
                                onChange={(e) => updateBreakdown(category, 'type', e.target.value)}
                                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:border-blue-500"
                            >
                                {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        ) : (
                            <div className="text-xs text-gray-500 italic border-b border-gray-200 pb-1 mb-1">{fixedTypeLabel}</div>
                        )}
                    </div>
                )}

                {/* Dynamic Inputs grid - Edit Mode */}
                {canEdit ? (
                    <div className="grid grid-cols-2 gap-2">
                        {/* Trainer Logic */}
                        {category === 'trainerCost' && (
                            <>
                                {selectedType === 'costPerDay' && (
                                    <div className="col-span-2"><Input label="Rate / Day" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                                {selectedType === 'costPerHour' && <><Input label="Hours" value={data.hours} onChange={v => updateBreakdown(category, 'hours', v)} /><Input label="Rate/Hour" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></>}
                                {selectedType === 'totalCost' && (
                                    <div className="col-span-2"><Input label="Total Cost" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                            </>
                        )}

                        {/* Material Logic */}
                        {category === 'material' && (
                            <>
                                {selectedType === 'costPerPax' && <><Input label="Pax" value={data.pax || pax} onChange={v => updateBreakdown(category, 'pax', v)} /><Input label="Rate / Pax" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></>}
                                {selectedType === 'overallCost' && (
                                    <div className="col-span-2"><Input label="Total Cost" value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></div>
                                )}
                            </>
                        )}

                        {/* Lab Logic */}
                        {category === 'labs' && (
                            <>
                                {(selectedType === 'costPerPaxDay' || selectedType === 'costPerPaxAllDays') && <><Input label="Pax" value={data.pax || pax} onChange={v => updateBreakdown(category, 'pax', v)} /><Input label={`Rate / Pax${selectedType === 'costPerPaxDay' ? ' / Day' : ''}`} value={data.rate} onChange={v => updateBreakdown(category, 'rate', v)} /></>}
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
                    </div>
                ) : (
                    // Read Only View - Compact single line format
                    <div className="flex justify-between items-center text-[11px] text-gray-600">
                        <span className="text-gray-500">{typeLabel}</span>
                        <span className="font-medium text-gray-800">
                            {CURRENCY_SYMBOL} {Number(data.rate || 0).toLocaleString()}
                        </span>
                    </div>
                )}

                {/* Footer: Upload (Delivery only) or View */}
                {(canEdit || opportunity.expenseDocuments?.[category]?.length > 0) && (
                    <div className={`flex justify-end ${!canEdit ? 'mt-1 pt-1' : 'mt-1 pt-1'} border-t border-gray-100`}>
                        <div className="flex items-center space-x-2">
                            {opportunity.expenseDocuments?.[category]?.length > 0 && (
                                <a
                                    href={`http://localhost:5000/${opportunity.expenseDocuments[category][0].replace(/\\/g, '/')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-primary-blue"
                                    title="View Document"
                                >
                                    <Eye size={14} />
                                </a>
                            )}
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
                )}
            </div>
        );
    };

    const Input = ({ label, value, onChange }) => {
        // Show currency for all Rate fields, hide only for Pax and Hours fields
        const isNonCurrencyField = (label.toLowerCase() === 'pax' || label.toLowerCase() === 'hours' || label.toLowerCase() === 'hours/day');

        return (
            <div>
                {label && <label className="block text-[10px] uppercase font-bold text-gray-500 mb-0.5">{label}</label>}
                <div className="relative">
                    {!isNonCurrencyField && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 text-xs font-semibold">{CURRENCY_SYMBOL}</span>}
                    <input
                        type="number"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        className={`w-full text-right ${!isNonCurrencyField ? 'pl-6' : 'pl-2'} pr-2 py-1.5 bg-white border-2 border-blue-300 rounded text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
                </div>

                {/* Other Expenses Row - 4 columns in edit mode, 5-column flow in view mode */}
                <div className={`grid gap-4 ${canEdit ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-flow-col grid-rows-5 auto-cols-fr'} mt-4`}>
                    {['venue', 'travel', 'vouchersCost', 'localConveyance'].map(key => (
                        <div key={key} className={`bg-white border border-gray-200 rounded-lg ${!canEdit ? 'p-2' : 'p-3'}`}>
                            <div className={`flex justify-between items-center ${!canEdit ? 'mb-1' : 'mb-2'}`}>
                                <span className={`font-bold text-gray-600 ${!canEdit ? 'text-xs' : 'text-sm'} capitalize`}>
                                    {key.replace('Cost', '').replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className={`font-bold text-gray-800 ${!canEdit ? 'text-xs' : 'text-sm'}`}>
                                    {CURRENCY_SYMBOL} {((activeData.expenses?.[key] || 0) / CONVERSION_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>

                            {/* Edit Input (Delivery Only) */}
                            {canEdit && (
                                <Input label="Amount" value={(localBreakdown[key]?.rate || activeData.expenses?.[key] || 0) / (key === 'rate' ? 1 : CONVERSION_RATE)} onChange={v => {
                                    handleChange('expenses', key, v * CONVERSION_RATE);
                                    updateBreakdown(key, 'rate', v);
                                    updateBreakdown(key, 'type', 'manual');
                                }} />
                            )}

                            {/* Read Only View - Compact single line */}
                            {!canEdit && (
                                <div className="flex justify-between items-center text-[11px] text-gray-600">
                                    <span className="text-gray-500">Adhoc</span>
                                    <span className="font-medium text-gray-800">
                                        {CURRENCY_SYMBOL} {((activeData.expenses?.[key] || 0) / CONVERSION_RATE).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Document Upload / View */}
                            {(canEdit || opportunity.expenseDocuments?.[key]?.length > 0) && (
                                <div className={`flex justify-end ${!canEdit ? 'mt-1 pt-1' : 'mt-2 pt-2'} border-t border-gray-100`}>
                                    <div className="flex items-center space-x-2">
                                        {opportunity.expenseDocuments?.[key]?.length > 0 && (
                                            <a
                                                href={`http://localhost:5000/${opportunity.expenseDocuments[key][0].replace(/\\/g, '/')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-400 hover:text-primary-blue"
                                                title="View Document"
                                            >
                                                <Eye size={14} />
                                            </a>
                                        )}
                                        {isEditing && canEdit && (
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
                                                    className="transition-colors text-gray-400 hover:text-primary-blue"
                                                    title="Upload Document"
                                                >
                                                    <Upload size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
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
