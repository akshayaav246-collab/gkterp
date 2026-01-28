import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import { useAuth } from '../context/AuthContext';

const DeliveryDashboard = () => {
    const { updateUserRole } = useAuth();

    useEffect(() => {
        updateUserRole('Delivery Team');
    }, []);

    const [opportunities, setOpportunities] = useState([]);
    // vendorStats removed
    const [gpStats, setGpStats] = useState([]); // Added
    const [selectedYear, setSelectedYear] = useState('2025-2026'); // Financial year
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0, active: 0, pendingApproval: 0, signedOff: 0, inProgress: 0, completed: 0
    });

    useEffect(() => {
        fetchDashboardData();
    }, [selectedYear]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Opportunities
            const oppsRes = await axios.get('http://localhost:5000/api/opportunities', { headers });
            setOpportunities(oppsRes.data);

            // Calculate stats
            const total = oppsRes.data.length;
            const completed = oppsRes.data.filter(o => o.commonDetails?.status === 'Completed' || o.progressPercentage === 100).length;
            const inProgress = oppsRes.data.length - completed;

            // Legacy/Other stats if needed
            const pendingApproval = oppsRes.data.filter(o => o.approvalRequired && o.approvalStatus !== 'Approved').length;

            setStats({ total, inProgress, completed, pendingApproval });

            // Vendor stats fetch removed

            // Fetch GP Stats with year filter
            const gpRes = await axios.get(`http://localhost:5000/api/dashboard/delivery/gp-stats?year=${selectedYear}`, { headers });
            setGpStats(gpRes.data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Analytics...</div>;

    return (
        <div className="p-6 bg-bg-page min-h-screen space-y-8">
            <h1 className="text-3xl font-bold text-primary-blue">Welcome, {useAuth().user?.name || 'User'}</h1>

            {/* Dashboard Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Primary KPI: Total Opportunities (Full Width on Mobile, Small on Desktop if needed, or keeping styling) */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-80">
                    <div>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Activity className="text-primary-blue" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700">Total Opportunities</h3>
                        </div>
                        <p className="text-5xl font-bold text-gray-900 mb-2">{stats.total}</p>
                        <p className="text-sm text-gray-500">Assigned Workload</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary-blue">{stats.inProgress}</p>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Progress</p>
                        </div>
                        <div className="text-center border-l border-gray-100">
                            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completed</p>
                        </div>
                    </div>
                </div>

                {/* 2. Top 5 Vendors by Revenue */}
                {/* Vendor Chart Removed */}
            </div>

            {/* Row 2: Average GP Trend */}
            <div className="grid grid-cols-1 gap-8">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="text-primary-blue" size={20} />
                            <h3 className="text-lg font-bold text-gray-700">Average GP % (Monthly)</h3>
                        </div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="2024-2025">2024-2025</option>
                            <option value="2025-2026">2025-2026</option>
                            <option value="2026-2027">2026-2027</option>
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gpStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value) => [`${value}%`, 'Avg GP']}
                                />
                                <Bar dataKey="gp" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default DeliveryDashboard;
