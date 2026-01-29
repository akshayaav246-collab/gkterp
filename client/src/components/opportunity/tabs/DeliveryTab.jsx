import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import { Upload, CheckCircle } from 'lucide-react';
import Card from '../../ui/Card';
import { useToast } from '../../../context/ToastContext';

const DeliveryTab = forwardRef(({ opportunity, canEdit, isEditing, refreshData }, ref) => {
    const { addToast } = useToast();
    // vendors state removed
    const [smes, setSmes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({});

    // Fetch Vendors and SMEs
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [smesRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/smes', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                // vendorsRes removed
                // Populate companyVendor if needed
                const populatedSMEs = smesRes.data.map(sme => ({
                    ...sme,
                    companyName: sme.companyName || 'N/A'
                }));
                setSmes(populatedSMEs);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching vendors/smes:', error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Initialize formData when opportunity changes or edit mode starts
    useEffect(() => {
        if (opportunity) {
            // Smart Logic for Days and Pax
            let initialDays = opportunity.days;
            if (opportunity.typeSpecificDetails?.duration) {
                const durationStr = opportunity.typeSpecificDetails.duration.toLowerCase();
                const match = durationStr.match(/(\d+)/);
                if (match) {
                    const num = parseInt(match[0]);
                    if (durationStr.includes('month')) {
                        const calculatedDays = num * 30;
                        // If stored days is exactly the number of months (e.g. 3) or 0, assume it was wrongly parsed or init, so fix it.
                        if (!initialDays || initialDays === num) {
                            initialDays = calculatedDays;
                        }
                    }
                }
            }

            let initialPax = opportunity.participants;
            if (opportunity.type === 'Lab Support' && opportunity.typeSpecificDetails?.numberOfIDs) {
                initialPax = opportunity.typeSpecificDetails.numberOfIDs;
            }

            setFormData({
                ...opportunity,
                // Ensure nested objects are handled correctly
                commonDetails: {
                    ...opportunity.commonDetails,
                    year: opportunity.commonDetails?.year || new Date().getFullYear()
                },
                expenses: { ...opportunity.expenses },
                // Handle populated fields by taking _id if object, else value
                // selectedVendor removed
                selectedSME: typeof opportunity.selectedSME === 'object' ? opportunity.selectedSME?._id : opportunity.selectedSME,
                days: initialDays,
                participants: initialPax
            });
        }
    }, [opportunity]);

    // Expose handleSave to parent
    useImperativeHandle(ref, () => ({
        handleSave: async () => {
            try {
                const token = localStorage.getItem('token');
                const payload = {
                    expenses: formData.expenses,
                    commonDetails: formData.commonDetails,
                    // selectedVendor removed
                    selectedSME: formData.selectedSME,
                    days: formData.days,
                    participants: formData.participants
                };

                await axios.put(
                    `http://localhost:5000/api/opportunities/${opportunity._id}`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                addToast('Changes saved successfully', 'success');
                refreshData();
                return true;
            } catch (error) {
                console.error('Save failed', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to save changes';
                addToast(errorMessage, 'error');
                return false;
            }
        },
        handleCancel: () => {
            setFormData({
                ...opportunity,
                commonDetails: {
                    ...opportunity.commonDetails,
                    year: opportunity.commonDetails?.year || new Date().getFullYear()
                },
                expenses: { ...opportunity.expenses },
                // selectedVendor removed
                selectedSME: typeof opportunity.selectedSME === 'object' ? opportunity.selectedSME?._id : opportunity.selectedSME
            });
        }
    }));


    const handleChange = (section, field, value) => {
        setFormData(prev => {
            if (section === 'root') {
                return { ...prev, [field]: value };
            }
            return {
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            };
        });
    };

    // handleVendorChange removed

    const handleInvoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const uploadFormData = new FormData();
            uploadFormData.append('invoice', file);

            await axios.post(
                `http://localhost:5000/api/opportunities/${opportunity._id}/upload-invoice`,
                uploadFormData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            );

            addToast('Invoice uploaded successfully', 'success');
            refreshData();
        } catch (error) {
            console.error('Upload failed', error);
            const errorMessage = error.response?.data?.message || 'Failed to upload invoice';
            addToast(errorMessage, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDeliveryDocUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const uploadFormData = new FormData();
            uploadFormData.append('document', file);
            uploadFormData.append('type', type);

            await axios.post(
                `http://localhost:5000/api/opportunities/${opportunity._id}/upload-delivery-doc`,
                uploadFormData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            );

            addToast(`${type} uploaded successfully`, 'success');
            refreshData();
        } catch (error) {
            console.error('Upload failed', error);
            const errorMessage = error.response?.data?.message || `Failed to upload ${type}`;
            addToast(errorMessage, 'error');
        } finally {
            setUploading(false);
        }
    };

    const inputClass = `w-full border p-2 rounded-lg ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary-blue'}`;
    const selectClass = `w-full border p-2 rounded-lg ${!isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary-blue'}`;

    if (loading) return <div>Loading data...</div>;

    // Show all SMEs (no vendor filtering for delivery team)
    const filteredSMEs = smes;

    return (
        <div className="space-y-6">

            {/* Trainer Details */}
            <Card>
                <h3 className="text-lg font-bold text-primary-blue mb-4">Trainer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Row 1: Support Type, SME */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trainer Support</label>
                        <select
                            value={formData.commonDetails?.trainingSupporter || 'GKT'}
                            onChange={(e) => handleChange('commonDetails', 'trainingSupporter', e.target.value)}
                            disabled={!isEditing}
                            className={selectClass}
                        >
                            <option value="GKT">GKT</option>
                            <option value="GKCS">GKCS</option>
                            <option value="MCT">MCT</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select SME</label>
                        <div className={`flex items-center border rounded-lg overflow-hidden ${!isEditing ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-200 focus-within:ring-2 focus-within:ring-primary-blue'}`}>
                            <select
                                value={formData.selectedSME || ''}
                                onChange={(e) => handleChange('root', 'selectedSME', e.target.value)}
                                disabled={!isEditing}
                                className={`flex-1 p-2 border-none bg-transparent focus:ring-0 outline-none ${!isEditing ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}`}
                            >
                                <option value="">-- Select SME --</option>
                                {filteredSMEs.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} - {s.companyName || 'N/A'}
                                    </option>
                                ))}
                            </select>

                            {/* Integrated Upload Trigger */}
                            <div className="flex items-center px-2 border-l border-gray-200 bg-gray-100 h-full">
                                {opportunity.deliveryDocuments?.sme_profile ? (
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`http://localhost:5000/${opportunity.deliveryDocuments.sme_profile.replace(/\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-blue hover:text-blue-700"
                                            title="View Profile"
                                        >
                                            <CheckCircle size={16} />
                                        </a>
                                        {isEditing && (
                                            <label className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 font-medium">
                                                Replace
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => handleDeliveryDocUpload(e, 'sme_profile')}
                                                    disabled={uploading}
                                                />
                                            </label>
                                        )}
                                    </div>
                                ) : (
                                    isEditing && (
                                        <label className={`cursor-pointer flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors ${uploading ? 'text-gray-400' : 'text-primary-blue hover:bg-blue-50'}`}>
                                            <Upload size={14} />
                                            <span>Upload</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleDeliveryDocUpload(e, 'sme_profile')}
                                                disabled={uploading}
                                            />
                                        </label>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
                        <input
                            type="text"
                            value={opportunity.typeSpecificDetails?.technology || 'N/A'}
                            disabled
                            className="w-full border p-2 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                            placeholder="Technology from Opportunity"
                        />
                    </div>

                    {/* Row 2: Course Details, Year/Month */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                        <input
                            type="text"
                            value={formData.commonDetails?.courseCode || ''}
                            onChange={(e) => handleChange('commonDetails', 'courseCode', e.target.value)}
                            disabled={!isEditing}
                            className={inputClass}
                            placeholder="Enter Code"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                        <input
                            type="text"
                            value={formData.commonDetails?.courseName || ''}
                            onChange={(e) => handleChange('commonDetails', 'courseName', e.target.value)}
                            disabled={!isEditing}
                            className={inputClass}
                            placeholder="Enter Name"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Yr</label>
                            <select
                                value={formData.commonDetails?.year || new Date().getFullYear()}
                                onChange={(e) => handleChange('commonDetails', 'year', parseInt(e.target.value))}
                                disabled={!isEditing}
                                className={selectClass}
                            >
                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mo</label>
                            <select
                                value={formData.commonDetails?.monthOfTraining || ''}
                                onChange={(e) => handleChange('commonDetails', 'monthOfTraining', e.target.value)}
                                disabled={!isEditing}
                                className={selectClass}
                            >
                                <option value="">Month</option>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Schedule & Participants */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No. of Days</label>
                        <input
                            type="number"
                            value={formData.days || ''}
                            onChange={(e) => handleChange('root', 'days', e.target.value)}
                            disabled={!isEditing}
                            className={inputClass}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.commonDetails?.startDate ? formData.commonDetails.startDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('commonDetails', 'startDate', e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.commonDetails?.endDate ? formData.commonDetails.endDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('commonDetails', 'endDate', e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Pax</label>
                            <input
                                type="number"
                                value={formData.participants || ''}
                                onChange={(e) => handleChange('root', 'participants', e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attended</label>
                            <input
                                type="number"
                                value={formData.commonDetails?.attendanceParticipants || ''}
                                onChange={(e) => handleChange('commonDetails', 'attendanceParticipants', e.target.value)}
                                disabled={!isEditing}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* 4. Billing Details */}
            <Card>
                <h3 className="text-lg font-bold text-primary-blue mb-4">Billing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* 1. PO Details */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-3 border-b pb-1">PO Details</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">PO Number</label>
                                <input
                                    type="text"
                                    value={opportunity.commonDetails?.clientPONumber || 'N/A'}
                                    disabled
                                    className="w-full border p-2 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">PO Date</label>
                                <input
                                    type="text"
                                    value={opportunity.commonDetails?.clientPODate ? new Date(opportunity.commonDetails.clientPODate).toLocaleDateString() : 'N/A'}
                                    disabled
                                    className="w-full border p-2 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">PO Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                                    <input
                                        type="text"
                                        value={opportunity.poValue ? opportunity.poValue.toLocaleString() : '0'}
                                        disabled
                                        className="w-full border p-2 pl-6 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">PO Document</label>
                                <div className="flex items-center p-2 border border-gray-100 rounded-lg bg-gray-50 h-[38px]">
                                    {opportunity.poDocument ? (
                                        <a
                                            href={`http://localhost:5000/${opportunity.poDocument.replace(/\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline flex items-center text-sm font-medium"
                                        >
                                            <CheckCircle size={14} className="mr-1" /> View PO
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 text-sm italic">Not Uploaded</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Invoice Details */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-3 border-b pb-1">Invoice Details</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
                                <input
                                    type="text"
                                    value={formData.commonDetails?.clientInvoiceNumber || ''}
                                    disabled
                                    className="w-full border p-2 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                    placeholder="N/A"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date</label>
                                <input
                                    type="text"
                                    value={formData.commonDetails?.clientInvoiceDate ? new Date(formData.commonDetails.clientInvoiceDate).toLocaleDateString() : ''}
                                    disabled
                                    className="w-full border p-2 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                    placeholder="N/A"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                                    <input
                                        type="text"
                                        value={opportunity.invoiceValue ? opportunity.invoiceValue.toLocaleString() : '0'}
                                        disabled
                                        className="w-full border p-2 pl-6 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Document</label>
                                <div className="flex items-center space-x-2 h-[38px]">
                                    {opportunity.invoiceDocument ? (
                                        <a
                                            href={`http://localhost:5000/${opportunity.invoiceDocument.replace(/\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 text-xs font-bold flex items-center hover:underline"
                                        >
                                            <CheckCircle size={14} className="mr-1" /> View Invoice
                                        </a>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No File</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Client Details */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-3 border-b pb-1">Client Details</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Billing Client</label>
                                <input
                                    type="text"
                                    value={formData.commonDetails?.billingClientName || ''}
                                    onChange={(e) => handleChange('commonDetails', 'billingClientName', e.target.value)}
                                    disabled={!isEditing}
                                    className={inputClass}
                                    placeholder="Enter Billing Client"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">End Client</label>
                                <input
                                    type="text"
                                    value={formData.commonDetails?.endClientName || ''}
                                    onChange={(e) => handleChange('commonDetails', 'endClientName', e.target.value)}
                                    disabled={!isEditing}
                                    className={inputClass}
                                    placeholder="Enter End Client"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </Card>

            {/* 5. Delivery Documents */}
            <Card>
                <h3 className="text-lg font-bold text-primary-blue mb-4">Delivery Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['attendance', 'feedback', 'assessment', 'performance'].map(docType => (
                        <div key={docType} className="border border-gray-200 p-3 rounded-lg bg-gray-50 flex flex-col justify-between">
                            <h4 className="font-semibold text-gray-700 capitalize text-sm mb-2">{docType}</h4>
                            <div className="flex flex-col gap-2">
                                {opportunity.deliveryDocuments?.[docType] ? (
                                    <a
                                        href={`http://localhost:5000/${opportunity.deliveryDocuments[docType].replace(/\\/g, '/')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:underline flex items-center text-xs font-medium"
                                    >
                                        <CheckCircle size={14} className="mr-1" /> View
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-400 italic">Not Uploaded</span>
                                )}

                                {canEdit && (
                                    <div className="relative mt-1">
                                        <input
                                            type="file"
                                            id={`doc-upload-${docType}`}
                                            className="hidden"
                                            onChange={(e) => handleDeliveryDocUpload(e, docType)}
                                            accept=".pdf,.doc,.docx,.xlsx"
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor={`doc-upload-${docType}`}
                                            className={`cursor-pointer block w-full text-center py-1.5 rounded text-xs text-white transition-colors ${uploading ? 'bg-gray-400' : 'bg-brand-blue hover:bg-blue-700'}`}
                                        >
                                            {opportunity.deliveryDocuments?.[docType] ? 'Replace' : 'Upload'}
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
});

export default DeliveryTab;
