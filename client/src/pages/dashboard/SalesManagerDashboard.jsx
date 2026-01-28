import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Briefcase, FileText, Grid, ExternalLink, Edit, Check, X } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const SalesManagerDashboard = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [documentStats, setDocumentStats] = useState({ poCount: 0, invoiceCount: 0 });
    const [monthlyPerformance, setMonthlyPerformance] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [teamOpportunities, setTeamOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState('all');
    const [editingTarget, setEditingTarget] = useState(null);
    const [targetValue, setTargetValue] = useState('');
    const [targetPeriod, setTargetPeriod] = useState('Yearly');
    const [showDocumentModal, setShowDocumentModal] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [selectedMember]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch KPI stats
            const statsRes = await axios.get('http://localhost:5000/api/dashboard/manager/stats', { headers });
            setStats(statsRes.data);

            // Fetch document stats
            const docStatsRes = await axios.get('http://localhost:5000/api/dashboard/manager/document-stats', { headers });
            setDocumentStats(docStatsRes.data);

            // Fetch monthly performance
            const perfUrl = selectedMember === 'all'
                ? 'http://localhost:5000/api/dashboard/manager/monthly-performance'
                : `http://localhost:5000/api/dashboard/manager/monthly-performance?userId=${selectedMember}`;
            const perfRes = await axios.get(perfUrl, { headers });
            setMonthlyPerformance(perfRes.data);

            // Fetch team members for filter
            const teamRes = await axios.get('http://localhost:5000/api/dashboard/manager/team-members', { headers });
            setTeamMembers(teamRes.data || []);

            // Fetch team opportunities for document modal
            const oppsRes = await axios.get('http://localhost:5000/api/opportunities', { headers });
            const formattedOpps = oppsRes.data.map(opp => ({
                ...opp,
                clientName: opp.client?.companyName || 'N/A'
            }));
            setTeamOpportunities(formattedOpps);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setLoading(false);
        }
    };

    const handleEditTarget = (memberId, currentTarget, period = 'Yearly') => {
        setEditingTarget(memberId);
        setTargetValue(currentTarget || '');
        setTargetPeriod(period);
    };

    const handleSaveTarget = async (memberId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `http://localhost:5000/api/dashboard/manager/set-target/${memberId}`,
                {
                    period: targetPeriod,
                    year: new Date().getFullYear(),
                    amount: parseFloat(targetValue)
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            addToast('Target updated successfully', 'success');
            setEditingTarget(null);
            setTargetPeriod('Yearly');
            fetchDashboardData();
        } catch (err) {
            addToast(err.response?.data?.message || 'Failed to update target', 'error');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="p-6 space-y-8 bg-bg-page min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-primary-blue">Welcome, {user?.name}</h1>
                <p className="text-gray-500 mt-1">Sales Manager Dashboard</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Combined Client & Team Members Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 rounded-full bg-blue-100">
                            <Grid size={20} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">Team Overview</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center border-r border-gray-200">
                            <p className="text-2xl font-bold text-blue-600">{stats?.totalClients || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Total Clients</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{stats?.teamMembersCount || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Team Members</p>
                        </div>
                    </div>
                </div>

                {/* Opportunities Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 rounded-full bg-purple-100">
                            <Briefcase size={20} className="text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">Total Opportunities</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="text-center border-r border-gray-200">
                            <p className="text-2xl font-bold text-yellow-600">{stats?.inProgressOpportunities || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">In Progress</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{stats?.completedOpportunities || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Completed</p>
                        </div>
                    </div>
                </div>

                {/* Document Status Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-full bg-indigo-100">
                                <FileText size={20} className="text-indigo-600" />
                            </div>
                            <span className="text-sm text-gray-500 font-medium">Document Status</span>
                        </div>
                        <button
                            onClick={() => setShowDocumentModal(true)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center border-r border-gray-200">
                            <p className="text-2xl font-bold text-blue-600">{documentStats.poCount}</p>
                            <p className="text-xs text-gray-400 mt-1">POs Uploaded</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{documentStats.invoiceCount}</p>
                            <p className="text-xs text-gray-400 mt-1">Invoices</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Team Performance and Set Team Targets Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Team Performance - Takes 2 columns */}
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-bold text-gray-800">Monthly Team Performance</h3>
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1 px-2"
                        >
                            <option value="all">All Team Members</option>
                            {teamMembers.map(member => (
                                <option key={member._id} value={member._id}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Combined Chart: Opportunities (Bars) + Revenue (Line) */}
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={monthlyPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 10 }}
                                label={{ value: 'Opportunities', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                                label={{ value: 'Revenue', angle: 90, position: 'insideRight', style: { fontSize: 10 } }}
                            />
                            <Tooltip
                                formatter={(value, name) => {
                                    if (name === 'Revenue') return `₹${value.toLocaleString()}`;
                                    return value;
                                }}
                                contentStyle={{ fontSize: '11px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar yAxisId="left" dataKey="inProgress" name="In Progress" fill="#FCD34D" stackId="a" />
                            <Bar yAxisId="left" dataKey="completed" name="Completed" fill="#10B981" stackId="a" />
                            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#1e40af" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Set Team Targets - Takes 1 column */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-bold text-gray-800">Set Team Targets</h3>
                        <select
                            value={targetPeriod}
                            onChange={(e) => setTargetPeriod(e.target.value)}
                            className="text-xs border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1 px-2"
                        >
                            <option value="Yearly">Yearly</option>
                            <option value="Half-Yearly">Half-Yearly</option>
                            <option value="Quarterly">Quarterly</option>
                        </select>
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr className="border-b">
                                    <th className="text-left py-1.5 px-1.5 font-semibold text-gray-700">Member</th>
                                    <th className="text-right py-1.5 px-1.5 font-semibold text-gray-700">Target</th>
                                    <th className="text-center py-1.5 px-1.5 font-semibold text-gray-700">Edit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamMembers.map(member => {
                                    const currentTarget = member.targets?.find(t => t.year === new Date().getFullYear() && t.period === targetPeriod)?.amount || 0;
                                    return (
                                        <tr key={member._id} className="border-b hover:bg-gray-50">
                                            <td className="py-1.5 px-1.5 text-xs truncate" title={member.name}>{member.name}</td>
                                            <td className="text-right py-1.5 px-1.5">
                                                {editingTarget === member._id ? (
                                                    <input
                                                        type="number"
                                                        value={targetValue}
                                                        onChange={(e) => setTargetValue(e.target.value)}
                                                        className="w-full text-right border border-gray-300 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="font-medium text-xs">₹{(currentTarget / 1000).toFixed(0)}K</span>
                                                )}
                                            </td>
                                            <td className="text-center py-1.5 px-1.5">
                                                {editingTarget === member._id ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => handleSaveTarget(member._id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingTarget(null)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditTarget(member._id, currentTarget, targetPeriod)}
                                                        className="text-blue-600 hover:text-blue-700"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Document Modal */}
            {showDocumentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-800">Document Status Overview</h2>
                            <button onClick={() => setShowDocumentModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="overflow-auto p-6 flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-3 px-4 font-semibold text-gray-600">Opportunity ID</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600">Client</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600">Created By</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">PO Status</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600 text-center">Invoice Status</th>
                                        <th className="py-3 px-4 font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamOpportunities.map(opp => (
                                        <tr key={opp._id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 font-mono text-brand-blue">{opp.opportunityNumber}</td>
                                            <td className="py-3 px-4 text-gray-800">{opp.clientName}</td>
                                            <td className="py-3 px-4 text-gray-600 text-sm">{opp.createdBy?.name || 'N/A'}</td>
                                            <td className="py-3 px-4 text-center">
                                                {opp.poDocument ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                        <Check size={12} className="mr-1" /> Uploaded
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {opp.invoiceDocument ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                        <Check size={12} className="mr-1" /> Uploaded
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <a href={`/opportunities/${opp._id}`} className="text-brand-blue hover:underline text-sm">
                                                    View
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesManagerDashboard;
