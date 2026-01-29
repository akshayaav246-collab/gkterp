import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Import Tabs
import OverviewTab from '../components/opportunity/tabs/OverviewTab';
import SalesTab from '../components/opportunity/tabs/SalesTab';
import DeliveryTab from '../components/opportunity/tabs/DeliveryTab';
import ExpensesTab from '../components/opportunity/tabs/ExpensesTab';
import RevenueTab from '../components/opportunity/tabs/RevenueTab';
import VendorPayablesTab from '../components/opportunity/tabs/VendorPayablesTab';

const OpportunityDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();

    // State
    const [opportunity, setOpportunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [tabLoading, setTabLoading] = useState(false); // To prevent double clicks or race conditions during save
    const [currency, setCurrency] = useState('INR'); // Currency Toggle State

    // Refs for tabs to call their internal save/cancel methods
    const salesRef = useRef();
    const deliveryRef = useRef();
    const expensesRef = useRef();
    const revenueRef = useRef();
    const vendorPayablesRef = useRef();

    // Permissions Helper
    // Permissions Helper
    const isOwner = opportunity && (opportunity.createdBy?._id === user.id || opportunity.createdBy === user.id);

    let canEditSales = user.role === 'Super Admin';
    if (user.role === 'Sales Executive') canEditSales = true; // defaulting to true for exec
    if (user.role === 'Sales Manager') canEditSales = isOwner;

    // Use state-based permission if opportunity is loading? No, if loading returns loading div.
    // However, canEditSales is currently defined at top level.
    // I need to replace lines 37-37 entirely.
    const canEditDelivery = user.role === 'Delivery Head' || user.role === 'Delivery Manager' || user.role === 'Delivery Team' || user.role === 'Super Admin';

    // Tab Visibility
    const isDeliveryRole = ['Delivery Team', 'Delivery Head', 'Delivery Manager'].includes(user.role);
    const isSalesRole = ['Sales Executive', 'Sales Manager'].includes(user.role);
    const isAdminOrDirector = ['Super Admin', 'Director'].includes(user.role);

    const showOverviewTab = isAdminOrDirector; // Only Admin/Director can see Overview
    const showSalesTab = !isDeliveryRole || isAdminOrDirector;
    const showDeliveryTab = !isSalesRole || isAdminOrDirector;
    const showVendorPayablesTab = isDeliveryRole || isAdminOrDirector;

    // determine if current tab is editable
    const isCurrentTabEditable = () => {
        if (activeTab === 'sales') return canEditSales;
        if (activeTab === 'delivery') return canEditDelivery;
        if (activeTab === 'expenses') return canEditDelivery || canEditSales;
        if (activeTab === 'vendor') return canEditDelivery;
        if (activeTab === 'revenue') return canEditSales;
        return false;
    };

    // Set default tab based on role
    useEffect(() => {
        if (isDeliveryRole && !isAdminOrDirector && activeTab === 'overview') {
            setActiveTab('delivery');
        }
        if (isSalesRole && !isAdminOrDirector && activeTab === 'overview') {
            setActiveTab('sales');
        }
    }, [isDeliveryRole, isSalesRole, isAdminOrDirector]);

    // Fetch Opportunity Data
    const fetchOpportunity = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/opportunities/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOpportunity(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching opportunity:', error);
            addToast('Failed to load opportunity details', 'error');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunity();
    }, [id]);

    // Separate effect for handling navigation state
    useEffect(() => {
        // Check for tab navigation from notification
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
            // Force refresh to get latest data when coming from notification
            fetchOpportunity();
        }
    }, [location.state]);

    const handleBack = () => {
        navigate('/opportunities');
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!opportunity) return <div className="p-8 text-center">Opportunity not found</div>;




    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        setTabLoading(true);
        let success = false;

        try {
            if (activeTab === 'sales' && salesRef.current) {
                success = await salesRef.current.handleSave();
            } else if (activeTab === 'delivery' && deliveryRef.current) {
                success = await deliveryRef.current.handleSave();
            } else if (activeTab === 'expenses' && expensesRef.current) {
                success = await expensesRef.current.handleSave();
            } else if (activeTab === 'revenue' && revenueRef.current) {
                success = await revenueRef.current.handleSave();
            } else if (activeTab === 'vendor' && vendorPayablesRef.current) {
                success = await vendorPayablesRef.current.handleSave();
            }

            if (success) {
                setIsEditing(false);
                // Refresh is handled by the child tab calling refreshData, but we can also fetch here if needed
            }
        } catch (error) {
            console.error("Error saving tab", error);
        } finally {
            setTabLoading(false);
        }
    };

    const handleCancel = () => {
        if (activeTab === 'sales' && salesRef.current) {
            salesRef.current.handleCancel();
        } else if (activeTab === 'delivery' && deliveryRef.current) {
            deliveryRef.current.handleCancel();
        } else if (activeTab === 'expenses' && expensesRef.current) {
            expensesRef.current.handleCancel();
        } else if (activeTab === 'revenue' && revenueRef.current) {
            revenueRef.current.handleCancel();
        } else if (activeTab === 'vendor' && vendorPayablesRef.current) {
            vendorPayablesRef.current.handleCancel();
        }
        setIsEditing(false);
    };

    // Reset edit mode when changing tabs
    const handleTabChange = (tab) => {
        if (isEditing) {
            if (window.confirm("You have unsaved changes. Are you sure you want to switch tabs? Changes will be lost.")) {
                handleCancel();
                setActiveTab(tab);
            }
        } else {
            setActiveTab(tab);
        }
    };

    // Render Active Tab
    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewTab opportunity={opportunity} user={user} />;
            case 'sales':
                return (
                    <SalesTab
                        ref={salesRef}
                        opportunity={opportunity}
                        canEdit={canEditSales}
                        isEditing={isEditing}
                        refreshData={fetchOpportunity}
                    />
                );
            case 'delivery':
                return (
                    <DeliveryTab
                        ref={deliveryRef}
                        opportunity={opportunity}
                        canEdit={canEditDelivery}
                        isEditing={isEditing}
                        canViewClient={canEditSales} // Sales can see client info
                        refreshData={fetchOpportunity}
                    />
                );
            case 'expenses':
                return (
                    <ExpensesTab
                        ref={expensesRef}
                        opportunity={opportunity}
                        canEdit={canEditDelivery || canEditSales} // Both can edit, specific sections restricted inside
                        isEditing={isEditing}
                        refreshData={fetchOpportunity}
                        currency={currency}
                    />
                );
            case 'vendor':
                return (
                    <VendorPayablesTab
                        ref={vendorPayablesRef}
                        opportunity={opportunity}
                        canEdit={canEditDelivery}
                        isEditing={isEditing}
                        refreshData={fetchOpportunity}
                    />
                );
            case 'revenue':
                return (
                    <RevenueTab
                        ref={revenueRef}
                        opportunity={opportunity}
                        canEdit={canEditSales} // Revenue/PO edits allowed for Sales
                        isEditing={isEditing}
                        refreshData={fetchOpportunity}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-inter">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <button onClick={handleBack} className="mr-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                {opportunity.opportunityNumber}
                                {canEditSales && (
                                    <span className="text-gray-500 font-normal ml-3 border-l border-gray-300 pl-3">
                                        {opportunity.client?.companyName || opportunity.clientName}
                                    </span>
                                )}
                            </h1>
                            {/* Status Badge */}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold 
                                ${opportunity.progressPercentage === 100 ? 'bg-green-100 text-green-800' :
                                    opportunity.progressPercentage >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                {opportunity.progressPercentage}% - {opportunity.statusLabel || 'Scheduled'}
                            </span>
                        </div>

                        <div className="flex items-center mt-2 text-sm text-gray-500 gap-4">
                            {/* Type & Date */}
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700`}>
                                    {opportunity.type}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span>{new Date(opportunity.createdAt).toLocaleDateString()}</span>
                            </div>

                            {(user.role === 'Sales Manager' || user.role === 'Super Admin') && (
                                <p>
                                    Created By: <span className="font-medium text-gray-700">{opportunity.createdBy?.name || 'N/A'}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200 justify-between items-center bg-white px-2">
                    <div className="flex space-x-1">
                        {showOverviewTab && (
                            <button
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'overview' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                                onClick={() => handleTabChange('overview')}
                            >
                                Overview
                            </button>
                        )}
                        {showSalesTab && (
                            <button
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'sales' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                                onClick={() => handleTabChange('sales')}
                            >
                                Requirements
                            </button>
                        )}
                        {showDeliveryTab && (
                            <button
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'delivery' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                                onClick={() => handleTabChange('delivery')}
                            >
                                Requirements
                            </button>
                        )}
                        <button
                            className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'expenses' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                            onClick={() => handleTabChange('expenses')}
                        >
                            {['Delivery Team', 'Delivery Head', 'Delivery Manager'].includes(user?.role) ? 'Expenses' : 'Proposal Calculations'}
                        </button>
                        {showVendorPayablesTab && (
                            <button
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'vendor' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                                onClick={() => handleTabChange('vendor')}
                            >
                                Vendor Payables
                            </button>
                        )}
                        {showSalesTab && (
                            <button
                                className={`px-6 py-4 text-sm font-medium focus:outline-none transition-all ${activeTab === 'revenue' ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold' : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}
                                onClick={() => handleTabChange('revenue')}
                            >
                                PO/Invoice
                            </button>
                        )}
                    </div>

                    {/* Global Edit/Save Actions */}
                    {isCurrentTabEditable() && activeTab !== 'overview' && (
                        <div className="flex items-center gap-2 pr-4">
                            {/* Currency Toggle - Only for Expenses Tab (Proposal Calculations) */}
                            {activeTab === 'expenses' && (
                                <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2 border border-gray-200">
                                    <button
                                        onClick={() => setCurrency('INR')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'INR' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        INR
                                    </button>
                                    <button
                                        onClick={() => setCurrency('USD')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${currency === 'USD' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        USD
                                    </button>
                                </div>
                            )}

                            {!isEditing ? (
                                <button
                                    onClick={handleEdit}
                                    className="flex items-center gap-1.5 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm shadow-sm"
                                >
                                    <Edit size={16} />
                                    Edit Details
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                                        disabled={tabLoading}
                                    >
                                        <X size={16} />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm shadow-sm"
                                        disabled={tabLoading}
                                    >
                                        <Save size={16} />
                                        {tabLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default OpportunityDetailPage;
