import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Search, Filter, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GPReportSection from '../components/reports/GPReportSection';
import CreateOpportunityModal from '../components/opportunity/CreateOpportunityModal';

const OpportunityPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();

    // Data States
    const [opportunities, setOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCreator, setFilterCreator] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/opportunities', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOpportunities(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching opportunities:', err);
            setLoading(false);
        }
    };



    // Role Helper
    const isDeliveryRole = ['Delivery Team', 'Delivery Head', 'Delivery Manager'].includes(user?.role);
    const isSalesRole = ['Sales Executive', 'Sales Manager', 'Super Admin'].includes(user?.role);

    // Delivery Status Change Handler
    const handleStatusChange = async (oppId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/opportunities/${oppId}`,
                { 'commonDetails.status': newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast('Status updated successfully', 'success');
            fetchOpportunities();
        } catch (error) {
            console.error('Status update failed', error);
            // Display specific validation message from backend (e.g. missing docs)
            const msg = error.response?.data?.message || 'Failed to update status';
            addToast(msg, 'error');
        }
    };

    // Filter Logic
    const filteredOpportunities = opportunities.filter(opp => {
        const matchesSearch = isDeliveryRole
            ? opp.opportunityNumber?.toLowerCase().includes(searchTerm.toLowerCase())
            : (opp.opportunityNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                opp.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                opp.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCreator = filterCreator ? opp.createdBy?.name === filterCreator : true;
        const matchesType = filterType ? opp.type === filterType : true;

        // Filter by Training Month and Year
        const matchesMonth = filterMonth
            ? opp.commonDetails?.monthOfTraining === filterMonth
            : true;
        const matchesYear = filterYear
            ? opp.commonDetails?.year?.toString() === filterYear
            : true;

        return matchesSearch && matchesCreator && matchesType && matchesMonth && matchesYear;
    });

    // Get unique creators for filter (Sales Manager only)
    const uniqueCreators = [...new Set(opportunities.map(o => o.createdBy?.name).filter(Boolean))];

    return (
        <div className="p-5 relative">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => {
                            if (user?.role === 'Sales Executive') navigate('/dashboard/executive');
                            else if (user?.role === 'Sales Manager') navigate('/dashboard/manager');
                            else if (['Delivery Team', 'Delivery Head', 'Delivery Manager'].includes(user?.role)) navigate('/dashboard/delivery');
                            else if (user?.role === 'Director') navigate('/dashboard/businesshead');
                            else navigate('/'); // Default fallack
                        }}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold text-primary-blue">Opportunity Management</h1>
                </div>
                {!isDeliveryRole && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-primary-blue text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-opacity-90 shadow-md"
                    >
                        <Plus size={18} />
                        <span className="font-bold">Create Opportunity</span>
                    </button>
                )}
            </div>

            {/* GP Report Section - Only for Super Admin */}
            {user?.role === 'Super Admin' && (
                <GPReportSection />
            )}

            <CreateOpportunityModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSuccess={fetchOpportunities}
            />

            {/* Opportunity List Container */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {/* Table Header with Search & Count */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white">
                    {/* Left: Count */}
                    <div className="text-gray-600 font-semibold whitespace-nowrap">
                        All Opportunities <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs text-brand-blue ml-1">{filteredOpportunities.length}</span>
                    </div>

                    {/* Right: Search & Filters */}
                    <div className="flex flex-1 items-center justify-end gap-4 w-full md:w-auto">
                        <div className="relative max-w-md w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={isDeliveryRole ? "Search by Opp ID..." : "Search by Opp ID or Client..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm cursor-pointer hover:bg-gray-50"
                                >
                                    <option value="">All Types</option>
                                    <option value="Training">Training</option>
                                    <option value="Vouchers">Vouchers</option>
                                    <option value="Lab Support">Lab Support</option>
                                    <option value="Resource Support">Resource Support</option>
                                    <option value="Content Development">Content Development</option>
                                    <option value="Project Support">Project Support</option>
                                </select>
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm cursor-pointer hover:bg-gray-50"
                                >
                                    <option value="">All Months</option>
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm cursor-pointer hover:bg-gray-50"
                                >
                                    <option value="">All Years</option>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            {(user?.role === 'Sales Manager' || isDeliveryRole) && (
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <select
                                        value={filterCreator}
                                        onChange={(e) => setFilterCreator(e.target.value)}
                                        className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm cursor-pointer hover:bg-gray-50"
                                    >
                                        <option value="">All Creators</option>
                                        {uniqueCreators.map((creator, idx) => (
                                            <option key={idx} value={creator}>{creator}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-center text-sm">
                        <thead className="border-b border-gray-200 bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-center">Opp ID</th>
                                {isDeliveryRole ? (
                                    <th className="px-6 py-3 font-semibold text-gray-900 text-center">Created By</th>
                                ) : (
                                    <>
                                        <th className="px-6 py-3 font-semibold text-gray-900 text-center">Client</th>
                                        <th className="px-6 py-3 font-semibold text-gray-900 text-center">Contact Person</th>
                                        {user?.role === 'Sales Manager' && (
                                            <th className="px-6 py-3 font-semibold text-gray-900 text-center">Created By</th>
                                        )}
                                    </>
                                )}
                                <th className="px-6 py-3 font-semibold text-gray-900 text-center">Type</th>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-center">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-900 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOpportunities.length > 0 ? (
                                filteredOpportunities.map((opp) => {
                                    // Find full contact details from client data
                                    // Fallback to primary contact if specific selection is not found/available
                                    let contactDetails = opp.client?.contactPersons?.find(cp => cp.name === opp.selectedContactPerson);

                                    // If no specific contact found, try to find the primary one
                                    if (!contactDetails && opp.client?.contactPersons?.length > 0) {
                                        contactDetails = opp.client.contactPersons.find(cp => cp.isPrimary) || opp.client.contactPersons[0];
                                    }

                                    return (
                                        <tr key={opp._id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/opportunities/${opp._id}`)}>
                                            <td className="px-6 py-4 font-bold text-gray-900 text-center">
                                                {opp.opportunityNumber}
                                            </td>

                                            {isDeliveryRole ? (
                                                <td className="px-6 py-4 text-center">
                                                    <div className="font-medium text-gray-900">{opp.createdBy?.name || 'N/A'}</div>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="font-medium text-gray-900">{opp.client?.companyName || opp.clientName || 'N/A'}</div>
                                                        <div className="text-xs text-gray-500">{opp.client?.sector}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {contactDetails ? (
                                                            <div className="flex flex-col items-center">
                                                                <div className="font-medium text-gray-900">{contactDetails.name}</div>
                                                                <div className="text-xs text-gray-500">{contactDetails.designation}</div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 italic">{opp.selectedContactPerson || 'N/A'}</div>
                                                        )}
                                                    </td>
                                                    {user?.role === 'Sales Manager' && (
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="font-medium text-gray-900">{opp.createdBy?.name || 'N/A'}</div>
                                                        </td>
                                                    )}
                                                </>
                                            )}
                                            <td className="px-6 py-4 text-gray-700 text-center">{opp.type}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                            <div
                                                                className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                                                                style={{ width: `${opp.progressPercentage || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-600">{opp.progressPercentage || 0}%</span>
                                                    </div>

                                                    {isDeliveryRole ? (
                                                        // Manual Status Dropdown for Delivery Team
                                                        <select
                                                            value={opp.commonDetails?.status || opp.status || 'Scheduled'}
                                                            onChange={(e) => handleStatusChange(opp._id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`text-xs px-2 py-1 rounded-full border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 ${(opp.commonDetails?.status || opp.status) === 'Completed' ? 'bg-green-50 text-green-700' :
                                                                (opp.commonDetails?.status || opp.status) === 'Cancelled' ? 'bg-red-50 text-red-700' :
                                                                    'bg-white text-gray-700'
                                                                }`}
                                                        >
                                                            <option value="Scheduled">Scheduled</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Completed">Completed</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                            <option value="Discontinued">Discontinued</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`text-xs px-2 py-0.5 rounded-full inline-block w-fit ${opp.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            opp.status === 'Closed' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-50 text-brand-blue'
                                                            }`}>
                                                            {opp.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/opportunities/${opp._id}`);
                                                    }}
                                                    className="text-primary-blue hover:text-primary-blue-dark inline-flex items-center space-x-1 justify-center"
                                                >
                                                    <Eye size={16} />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No opportunities found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OpportunityPage;
