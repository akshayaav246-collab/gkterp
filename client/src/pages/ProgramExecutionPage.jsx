import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Truck, DollarSign, FolderOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBar from '../components/opportunity/StatusBar';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import OverviewTab from '../components/opportunity/tabs/OverviewTab';
import DeliveryTab from '../components/opportunity/tabs/DeliveryTab';
import FinanceTab from '../components/opportunity/tabs/FinanceTab';
import DocumentsTab from '../components/opportunity/tabs/DocumentsTab';

const ProgramExecutionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();
    const [opportunity, setOpportunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    // vendors state removed
    const [smes, setSmes] = useState([]);

    useEffect(() => {
        fetchOpportunity();
        // fetchVendors removed
    }, [id]);

    const fetchOpportunity = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/opportunities/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOpportunity(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    // fetchVendors function removed

    const fetchSMEs = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch all SMEs for delivery team (no vendor filtering)
            const res = await axios.get('http://localhost:5000/api/smes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSmes(res.data);
        } catch (err) {
            console.error('Error fetching SMEs:', err);
            setSmes([]);
        }
    };

    // Fetch all SMEs on mount (no vendor dependency for delivery team)
    useEffect(() => {
        fetchSMEs();
    }, []);

    const handleUpdate = (section, field, value) => {
        if (section === 'typeSpecificDetails') {
            setOpportunity({
                ...opportunity,
                typeSpecificDetails: value
            });
        } else if (section) {
            setOpportunity({
                ...opportunity,
                [section]: {
                    ...opportunity[section],
                    [field]: value
                }
            });
        } else {
            setOpportunity({
                ...opportunity,
                [field]: value
            });
        }
    };

    // handleVendorChange removed

    const canEditField = (fieldGroup) => {
        if (fieldGroup === 'overview' || fieldGroup === 'scope') return false;
        return fieldGroup === 'sales' || fieldGroup === 'delivery' || fieldGroup === 'expenses';
    };

    const [activeTab, setActiveTab] = useState('overview');

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');

            const updateData = {
                commonDetails: opportunity.commonDetails,
                expenses: opportunity.expenses,
                selectedSME: opportunity.selectedSME || null // Sanitize empty string
            };

            await axios.put(`http://localhost:5000/api/opportunities/${id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('Opportunity updated successfully!', 'success');
            fetchOpportunity();
            setEditMode(false);
            setActiveTab('overview');
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.message || 'Error updating opportunity', 'error');
        }
    };

    if (loading) return <div className="p-5">Loading...</div>;
    if (!opportunity) return <div className="p-5">Opportunity not found</div>;

    // Define tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: FileText,
            content: (
                <OverviewTab
                    opportunity={opportunity}
                    editMode={editMode}
                    canEditField={canEditField}
                    handleUpdate={handleUpdate}
                />
            )
        },
        {
            id: 'delivery',
            label: 'Delivery',
            icon: Truck,
            content: (
                <DeliveryTab
                    opportunity={opportunity}
                    editMode={editMode}
                    canEditField={canEditField}
                    handleUpdate={handleUpdate}
                    // vendors prop removed
                    smes={smes}
                    fetchSMEs={fetchSMEs}
                />
            )
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: DollarSign,
            content: (
                <FinanceTab
                    opportunity={opportunity}
                    editMode={editMode}
                    canEditField={canEditField}
                    handleUpdate={handleUpdate}
                    user={user}
                />
            )
        },
        {
            id: 'documents',
            label: 'Documents',
            icon: FolderOpen,
            content: <DocumentsTab opportunityId={id} editMode={editMode} />
        }
    ];

    return (
        <div className="h-full bg-bg-page p-5">
            {/* Simplified Header */}
            <div className="sticky top-0 z-10 bg-bg-page pb-3 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link to="/delivery/execution" className="text-text-secondary hover:text-primary-blue transition-colors">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-blue">{opportunity.opportunityNumber}</h1>
                            <p className="text-sm text-gray-600">Created by: {opportunity.createdBy?.name || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                        {!editMode ? (
                            <Button onClick={() => setEditMode(true)} variant="primary" icon={Save}>
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button onClick={handleSave} variant="secondary" icon={Save}>
                                    Save Changes
                                </Button>
                                <Button
                                    onClick={() => {
                                        setEditMode(false);
                                        fetchOpportunity();
                                    }}
                                    variant="outline"
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content: Full Width Tabs */}
            <div className="mt-4">
                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            </div>
        </div>
    );
};

export default ProgramExecutionPage;

