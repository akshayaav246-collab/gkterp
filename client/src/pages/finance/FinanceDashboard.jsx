import React from 'react';
import { useAuth } from '../../context/AuthContext';
import GPReportSection from '../../components/reports/GPReportSection';
import ClientWiseGPChart from '../../components/charts/ClientWiseGPChart';


const FinanceDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-primary-blue mb-8">Welcome, {user?.name || 'Finance Team'}</h1>

            {/* GP Report Section */}
            <GPReportSection />

            {/* Client-wise GP Graph */}
            <ClientWiseGPChart />

            {/* Vendor-wise Graph */}
            {/* Vendor-wise Graph Removed */}
        </div>
    );
};

export default FinanceDashboard;
