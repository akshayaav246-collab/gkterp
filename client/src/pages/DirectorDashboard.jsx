import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

const DirectorDashboard = () => {
    // Mock financial data
    const financialMetrics = {
        weeklyInvoiceValue: 125000,
        pendingReceivables: 87500,
        upcomingPayables: 45000,
        netCashFlow: 80500
    };

    const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color }) => (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend && (
                    <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span className="ml-1 font-medium">{trendValue}</span>
                    </div>
                )}
            </div>
            <div className="text-sm text-gray-500 mb-1">{title}</div>
            <div className="text-3xl font-bold text-gray-900">${value.toLocaleString()}</div>
        </div>
    );

    return (
        <div className="p-5">
            <h1 className="text-3xl font-bold text-primary-blue mb-8">Director Dashboard</h1>

            {/* Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Weekly Invoice Value"
                    value={financialMetrics.weeklyInvoiceValue}
                    icon={DollarSign}
                    trend="up"
                    trendValue="+12%"
                    color="bg-blue-600"
                />
                <MetricCard
                    title="Pending Receivables"
                    value={financialMetrics.pendingReceivables}
                    icon={AlertCircle}
                    trend="down"
                    trendValue="-5%"
                    color="bg-yellow-600"
                />
                <MetricCard
                    title="Upcoming Payables"
                    value={financialMetrics.upcomingPayables}
                    icon={TrendingDown}
                    color="bg-red-600"
                />
                <MetricCard
                    title="Net Cash Flow"
                    value={financialMetrics.netCashFlow}
                    icon={TrendingUp}
                    trend="up"
                    trendValue="+8%"
                    color="bg-green-600"
                />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="text-sm text-gray-500 mb-1">Total Revenue (MTD)</div>
                    <div className="text-2xl font-bold text-gray-900">$450,000</div>
                    <div className="text-xs text-green-600 mt-1">+18% from last month</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="text-sm text-gray-500 mb-1">Total Expenses (MTD)</div>
                    <div className="text-2xl font-bold text-gray-900">$280,000</div>
                    <div className="text-xs text-red-600 mt-1">+8% from last month</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="text-sm text-gray-500 mb-1">Profit Margin</div>
                    <div className="text-2xl font-bold text-green-600">37.8%</div>
                    <div className="text-xs text-gray-500 mt-1">Healthy margin</div>
                </div>
            </div>
        </div>
    );
};

export default DirectorDashboard;

