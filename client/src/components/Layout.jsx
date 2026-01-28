import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './layout/Sidebar';
import NotificationDropdown from './notifications/NotificationDropdown';
import { LogOut } from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-bg-page">
            {/* New Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header Bar - Compact for 100% zoom */}
                <header className="h-16 bg-bg-card shadow-sm flex items-center justify-between px-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        {/* Globe Logo */}
                        <img
                            src="/gk-globe-logo.png"
                            alt="Global Knowledge"
                            className="h-10 w-10 object-contain"
                        />
                        {/* Company Name */}
                        <h1 className="text-lg font-bold text-primary-blue">
                            Global Knowledge Technologies
                        </h1>
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center space-x-2">
                        {/* Notification Bell */}
                        <NotificationDropdown />

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-primary-blue hover:bg-primary-blue-light/10 rounded-lg transition-all"
                        >
                            <LogOut size={18} />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
